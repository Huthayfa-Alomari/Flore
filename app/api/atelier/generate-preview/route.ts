import { createHash, createHmac } from 'node:crypto'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  checkRateLimit,
  consumeAtelierDailyQuota,
  getAtelierDailyQuota,
  getClientIp,
} from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PRIMARY_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
const FALLBACK_MODEL = '@cf/black-forest-labs/flux-1-schnell'
const PREVIEW_BUCKET = 'atelier-previews'
const PROMPT_VERSION = 'atelier-v5-strict-provider-references'
const MAX_REFERENCE_BYTES = 6 * 1024 * 1024
const REFERENCE_SIZE = 448

const GeneratePreviewSchema = z.object({
  flowers: z
    .array(
      z.object({
        id: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(12),
  greenery: z
    .array(
      z.object({
        id: z.string().uuid(),
        qty: z.number().int().min(1).max(30),
      })
    )
    .max(8)
    .default([]),
  containerId: z.string().uuid().nullable().optional(),
  sizeKey: z.string().trim().min(1).max(50).optional(),
  greeneryPreference: z.enum(['less', 'as_is', 'more']).default('as_is'),
  spacingPreference: z.enum(['compact', 'as_is', 'airy']).default('as_is'),
  regenerate: z.boolean().default(false),
  previousImageUrl: z.string().url().max(2048).optional(),
})

type FlowerRow = {
  id: string
  name: string
  name_ar: string | null
  color: string | null
  image: string | null
}

type GreeneryRow = {
  id: string
  name: string
  name_ar: string | null
  image: string | null
}

type ContainerRow = {
  id: string
  name: string
  name_ar: string | null
  container_type: string | null
  image: string | null
}

type SizeRow = {
  key: string
  label_ar: string
  stem_count: number
}

type BouquetSelection = {
  flowers: Array<FlowerRow & { qty: number }>
  greenery: Array<GreeneryRow & { qty: number }>
  container: ContainerRow | null
  size: SizeRow | null
  greeneryPreference: 'less' | 'as_is' | 'more'
  spacingPreference: 'compact' | 'as_is' | 'airy'
}

type CloudflarePayload = {
  success?: boolean
  result?: { image?: string }
  errors?: Array<{ code?: number; message?: string }>
}

type GeneratedImage = {
  buffer: Buffer
  model: string
  referencesUsed: number
}

type ReferencePurpose = 'flowers' | 'greenery' | 'container' | 'previous'

type PreparedReference = {
  buffer: Buffer
  purpose: ReferencePurpose
}

type PublicReference = {
  url: string
  purpose: ReferencePurpose
}

class AiProviderError extends Error {
  status: number
  code?: number

  constructor(message: string, status: number, code?: number) {
    super(message)
    this.name = 'AiProviderError'
    this.status = status
    this.code = code
  }
}

class AiConfigurationError extends Error {
  constructor() {
    super('No image provider is configured')
    this.name = 'AiConfigurationError'
  }
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function dailyLimit() {
  return numberInRange(process.env.ATELIER_AI_DAILY_LIMIT, 1, 20, 5)
}

function publicFallbackEnabled() {
  return process.env.ATELIER_AI_PUBLIC_FALLBACK !== 'false'
}

function cleanPromptText(value: string | null | undefined, maxLength = 80) {
  return (value || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s_#.'’,-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function anonymizeIdentifier(value: string) {
  const secret =
    process.env.AI_RATE_LIMIT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!secret) {
    throw new AiConfigurationError()
  }

  return createHmac('sha256', secret).update(value).digest('hex')
}

async function usageIdentifier(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const rawIdentifier = user?.id
    ? `user:${user.id}`
    : `ip:${getClientIp(request)}`

  return anonymizeIdentifier(rawIdentifier)
}

function usageWindowStart() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
}

function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true

  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (!host) return false

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function cloudflareEndpoint(accountId: string, model: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function cloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
    process.env.CLOUDFLARE_API_TOKEN?.trim()
  )
}

function referenceHostAllowlist() {
  const hosts = new Set<string>()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname.toLowerCase())
    } catch {
      // createServiceClient will surface the invalid Supabase URL separately.
    }
  }

  for (const entry of (process.env.ATELIER_AI_REFERENCE_HOSTS || '').split(
    ','
  )) {
    const value = entry.trim()
    if (!value) continue

    try {
      const url = new URL(value.includes('://') ? value : `https://${value}`)
      hosts.add(url.hostname.toLowerCase())
    } catch {
      console.warn('[atelier-ai] ignored invalid reference host', value)
    }
  }

  return hosts
}

function trustedReferenceUrl(value: string | null | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !referenceHostAllowlist().has(url.hostname.toLowerCase())
    ) {
      return null
    }

    return url.toString()
  } catch {
    return null
  }
}

function trustedPreviousPreviewUrl(value: string | undefined) {
  const trusted = trustedReferenceUrl(value)
  if (!trusted) return null

  const url = new URL(trusted)
  return url.pathname.startsWith(`/storage/v1/object/public/${PREVIEW_BUCKET}/`)
    ? trusted
    : null
}

function publicReferencesForSelection(
  selection: BouquetSelection,
  previousImageUrl: string | undefined
) {
  const flowerReferences = [...selection.flowers]
    .sort((a, b) => b.qty - a.qty)
    .map((item) => trustedReferenceUrl(item.image))
    .filter((url): url is string => !!url)
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .slice(0, previousImageUrl ? 1 : 2)
  const greenery = selection.greenery
    .map((item) => trustedReferenceUrl(item.image))
    .find((url): url is string => !!url)
  const container = trustedReferenceUrl(selection.container?.image)
  const previous = trustedPreviousPreviewUrl(previousImageUrl)

  const candidates: Array<PublicReference | null> = previous
    ? [
        { url: previous, purpose: 'previous' },
        flowerReferences[0]
          ? { url: flowerReferences[0], purpose: 'flowers' }
          : null,
        greenery ? { url: greenery, purpose: 'greenery' } : null,
        container ? { url: container, purpose: 'container' } : null,
      ]
    : [
        ...flowerReferences.map(
          (url): PublicReference => ({ url, purpose: 'flowers' })
        ),
        greenery ? { url: greenery, purpose: 'greenery' } : null,
        container ? { url: container, purpose: 'container' } : null,
      ]

  const seen = new Set<string>()
  return candidates
    .filter((reference): reference is PublicReference => {
      if (!reference || seen.has(reference.url)) return false
      seen.add(reference.url)
      return true
    })
    .slice(0, 4)
}

async function downloadReferenceImage(value: string) {
  const trusted = trustedReferenceUrl(value)
  if (!trusted) return null

  const response = await fetchWithTimeout(
    trusted,
    {
      headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png' },
      redirect: 'error',
    },
    6_000
  )
  const contentType = response.headers.get('content-type') || ''
  const contentLength = Number(response.headers.get('content-length') || '0')

  if (
    !response.ok ||
    !contentType.startsWith('image/') ||
    contentLength > MAX_REFERENCE_BYTES
  ) {
    return null
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length === 0 || buffer.length > MAX_REFERENCE_BYTES) return null

  return buffer
}

async function normalizeReferenceImage(
  source: Buffer,
  width = REFERENCE_SIZE,
  height = REFERENCE_SIZE
) {
  return sharp(source, { limitInputPixels: 20_000_000 })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(width, height, {
      fit: 'contain',
      background: '#ffffff',
      withoutEnlargement: false,
    })
    .jpeg({ quality: 86, chromaSubsampling: '4:4:4' })
    .toBuffer()
}

async function buildReferenceBoard(values: Array<string | null | undefined>) {
  const urls = Array.from(
    new Set(
      values.map(trustedReferenceUrl).filter((url): url is string => !!url)
    )
  ).slice(0, 4)

  if (urls.length === 0) return null

  const downloads = await Promise.allSettled(urls.map(downloadReferenceImage))
  const images: Buffer[] = []

  for (const result of downloads) {
    if (result.status === 'fulfilled' && result.value) {
      images.push(Buffer.from(result.value))
    }
  }

  if (images.length === 0) return null

  const columns = images.length === 1 ? 1 : 2
  const rows = Math.ceil(images.length / columns)
  const tileWidth = Math.floor(REFERENCE_SIZE / columns)
  const tileHeight = Math.floor(REFERENCE_SIZE / rows)
  const padding = 6
  const tiles = await Promise.all(
    images.map((image) =>
      normalizeReferenceImage(
        image,
        tileWidth - padding * 2,
        tileHeight - padding * 2
      )
    )
  )

  return sharp({
    create: {
      width: REFERENCE_SIZE,
      height: REFERENCE_SIZE,
      channels: 3,
      background: '#f7f3ed',
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: (index % columns) * tileWidth + padding,
        top: Math.floor(index / columns) * tileHeight + padding,
      }))
    )
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toBuffer()
}

async function prepareReferences(
  selection: BouquetSelection,
  previousImageUrl: string | undefined
) {
  const dominantFlowers = [...selection.flowers]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4)
  const containerUrl = trustedReferenceUrl(selection.container?.image)
  const previousUrl = trustedPreviousPreviewUrl(previousImageUrl)

  const prepareSingle = async (
    url: string | null,
    purpose: PreparedReference['purpose']
  ): Promise<PreparedReference | null> => {
    if (!url) return null

    try {
      const downloaded = await downloadReferenceImage(url)
      return downloaded
        ? { buffer: await normalizeReferenceImage(downloaded), purpose }
        : null
    } catch (error) {
      console.warn(`[atelier-ai] ${purpose} reference failed`, error)
      return null
    }
  }

  const [flowerBoard, greeneryBoard, containerReference, previousReference] =
    await Promise.all([
      buildReferenceBoard(dominantFlowers.map((item) => item.image)),
      buildReferenceBoard(selection.greenery.map((item) => item.image)),
      prepareSingle(containerUrl, 'container'),
      prepareSingle(previousUrl, 'previous'),
    ])

  const references: PreparedReference[] = []
  if (flowerBoard) references.push({ buffer: flowerBoard, purpose: 'flowers' })
  if (greeneryBoard)
    references.push({ buffer: greeneryBoard, purpose: 'greenery' })
  if (containerReference) references.push(containerReference)
  if (previousReference) references.push(previousReference)

  return references.slice(0, 4)
}

function selectionCacheHash(
  selection: BouquetSelection,
  publicReferences: PublicReference[]
) {
  const stableSelection = {
    version: PROMPT_VERSION,
    provider: cloudflareConfigured()
      ? PRIMARY_MODEL
      : publicReferences.length > 0
        ? 'pollinations-gptimage-references'
        : 'pollinations-flux',
    flowers: [...selection.flowers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, qty, name, color, image }) => ({
        id,
        qty,
        name: cleanPromptText(name),
        color: cleanPromptText(color, 30),
        image,
      })),
    greenery: [...selection.greenery]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, qty, name, image }) => ({
        id,
        qty,
        name: cleanPromptText(name),
        image,
      })),
    container: selection.container
      ? {
          id: selection.container.id,
          name: cleanPromptText(selection.container.name),
          type: selection.container.container_type,
          image: selection.container.image,
        }
      : null,
    size: selection.size
      ? { key: selection.size.key, stemCount: selection.size.stem_count }
      : null,
    greeneryPreference: selection.greeneryPreference,
    spacingPreference: selection.spacingPreference,
  }

  return createHash('sha256')
    .update(JSON.stringify(stableSelection))
    .digest('hex')
}

function cacheFolder() {
  return `cache/${PROMPT_VERSION}`
}

function cachedFilePath(hash: string) {
  return `${cacheFolder()}/${hash}.jpg`
}

async function findCachedPreview(
  serviceClient: ReturnType<typeof createServiceClient>,
  hash: string
) {
  const fileName = `${hash}.jpg`
  const { data, error } = await serviceClient.storage
    .from(PREVIEW_BUCKET)
    .list(cacheFolder(), { limit: 1, search: fileName })

  if (error) {
    console.warn('[atelier-ai] cache lookup failed', error)
    return null
  }

  return data?.some((item) => item.name === fileName)
    ? cachedFilePath(hash)
    : null
}

function publicPreviewUrl(
  serviceClient: ReturnType<typeof createServiceClient>,
  path: string
) {
  return serviceClient.storage.from(PREVIEW_BUCKET).getPublicUrl(path).data
    .publicUrl
}

function decodeBase64Image(value: string) {
  const encoded = value.includes(',')
    ? value.slice(value.indexOf(',') + 1)
    : value
  const buffer = Buffer.from(encoded, 'base64')

  if (buffer.length === 0) {
    throw new AiProviderError('The provider returned an empty image', 502)
  }

  return buffer
}

async function readCloudflareImage(response: Response) {
  const raw = await response.text()
  let payload: CloudflarePayload

  try {
    payload = JSON.parse(raw) as CloudflarePayload
  } catch {
    throw new AiProviderError(
      'Cloudflare returned an invalid response',
      response.status
    )
  }

  const firstError = payload.errors?.[0]

  if (!response.ok || payload.success === false || !payload.result?.image) {
    throw new AiProviderError(
      firstError?.message || 'Cloudflare image generation failed',
      response.status,
      firstError?.code
    )
  }

  return decodeBase64Image(payload.result.image)
}

async function generateWithFlux2(
  accountId: string,
  apiToken: string,
  prompt: string,
  seed: number,
  timeoutMs: number,
  references: PreparedReference[]
): Promise<GeneratedImage> {
  const form = new FormData()
  form.set('prompt', prompt)
  form.set('width', '1024')
  form.set('height', '1024')
  form.set('guidance', '4')
  form.set('seed', String(seed))
  references.forEach((reference, index) => {
    form.set(
      `input_image_${index}`,
      new Blob([new Uint8Array(reference.buffer)], { type: 'image/jpeg' }),
      `${reference.purpose}.jpg`
    )
  })

  const response = await fetchWithTimeout(
    cloudflareEndpoint(accountId, PRIMARY_MODEL),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
    },
    timeoutMs
  )

  return {
    buffer: await readCloudflareImage(response),
    model: 'FLUX.2 Klein 4B',
    referencesUsed: references.length,
  }
}

async function generateWithFlux1(
  accountId: string,
  apiToken: string,
  prompt: string,
  seed: number,
  timeoutMs: number
): Promise<GeneratedImage> {
  const response = await fetchWithTimeout(
    cloudflareEndpoint(accountId, FALLBACK_MODEL),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, seed, steps: 8 }),
    },
    timeoutMs
  )

  return {
    buffer: await readCloudflareImage(response),
    model: 'FLUX.1 Schnell',
    referencesUsed: 0,
  }
}

async function generateWithPollinations(
  prompt: string,
  seed: number,
  timeoutMs: number,
  references: PublicReference[]
): Promise<GeneratedImage> {
  const referenceUrls = references.map((reference) => reference.url)
  const model = referenceUrls.length > 0 ? 'gptimage' : 'flux'
  const imageQuery = referenceUrls.length
    ? `&image=${referenceUrls.map(encodeURIComponent).join(',')}`
    : ''
  const referer = (() => {
    try {
      return new URL(
        process.env.NEXT_PUBLIC_APP_URL || 'https://flore.jo'
      ).origin
    } catch {
      return 'https://flore.jo'
    }
  })()
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt.slice(0, 1_600)
    )}/?model=${model}` +
    `${imageQuery}&width=1024&height=1024&seed=${seed}` +
    '&nologo=true&enhance=true&referer=flore-atelier'
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Accept: 'image/*',
        Referer: referer,
        'User-Agent': 'FLORE-Atelier/1.0',
      },
    },
    timeoutMs
  )
  const contentType = response.headers.get('content-type') || ''

  if (!response.ok || !contentType.startsWith('image/')) {
    throw new AiProviderError(
      'Pollinations image generation failed',
      response.status
    )
  }

  const contentLength = Number(response.headers.get('content-length') || '0')
  if (contentLength > 12 * 1024 * 1024) {
    throw new AiProviderError('The generated image is too large', 502)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length === 0 || buffer.length > 12 * 1024 * 1024) {
    throw new AiProviderError('The provider returned an invalid image', 502)
  }

  return {
    buffer,
    model:
      referenceUrls.length > 0
        ? 'Pollinations reference fallback'
        : 'Pollinations fallback',
    referencesUsed: referenceUrls.length,
  }
}

async function generateImage(
  prompt: string,
  publicFallbackPrompt: string,
  seed: number,
  references: PreparedReference[],
  publicReferences: PublicReference[]
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()
  const allowPublicFallback = publicFallbackEnabled()
  const deadline = Date.now() + 52_000
  let lastCloudflareError: unknown

  const remainingTime = () => {
    const remaining = deadline - Date.now()

    if (remaining < 1_500) {
      throw new DOMException('Image generation timed out', 'AbortError')
    }

    return remaining
  }

  if (accountId && apiToken) {
    try {
      return await generateWithFlux2(
        accountId,
        apiToken,
        prompt,
        seed,
        remainingTime(),
        references
      )
    } catch (primaryError) {
      console.warn('[atelier-ai] FLUX.2 generation failed', primaryError)
      lastCloudflareError = primaryError

      if (
        primaryError instanceof DOMException &&
        primaryError.name === 'AbortError'
      ) {
        throw primaryError
      }

      const canTryCloudflareFallback =
        primaryError instanceof AiProviderError &&
        (primaryError.status === 404 || primaryError.status >= 500)

      if (canTryCloudflareFallback) {
        try {
          return await generateWithFlux1(
            accountId,
            apiToken,
            prompt,
            seed,
            remainingTime()
          )
        } catch (fallbackError) {
          console.warn('[atelier-ai] FLUX.1 fallback failed', fallbackError)
          lastCloudflareError = fallbackError

          if (
            fallbackError instanceof DOMException &&
            fallbackError.name === 'AbortError'
          ) {
            throw fallbackError
          }
        }
      }

      if (!allowPublicFallback) throw lastCloudflareError
    }
  }

  if (allowPublicFallback) {
    return generateWithPollinations(
      publicFallbackPrompt,
      seed,
      remainingTime(),
      publicReferences
    )
  }

  if (lastCloudflareError) throw lastCloudflareError
  throw new AiConfigurationError()
}

function colorFamily(name: string, color: string | null) {
  const normalizedName = name.normalize('NFKC').toLowerCase()
  const namedColors: Array<[RegExp, string]> = [
    [/\b(red)\b|(?:أحمر|احمر)/u, 'red'],
    [/\b(pink|blush)\b|(?:وردي|زهري)/u, 'pink'],
    [/\b(white|ivory)\b|(?:أبيض|ابيض)/u, 'white'],
    [/\b(yellow)\b|(?:أصفر|اصفر)/u, 'yellow'],
    [/\b(orange)\b|برتقالي/u, 'orange'],
    [/\b(purple|violet|lavender)\b|بنفسجي/u, 'purple'],
  ]

  for (const [pattern, family] of namedColors) {
    if (pattern.test(normalizedName)) return family
  }

  const cleaned = cleanPromptText(color, 30).toLowerCase()
  const knownColors: Record<string, string> = {
    '#c41e3a': 'red',
    '#e11d48': 'red',
    '#ffffff': 'white',
    '#f8fafc': 'white',
    '#f7c6d9': 'pink',
    '#ff6b9d': 'pink',
    '#ffc72c': 'yellow',
    '#fbbf24': 'yellow',
    '#b497d6': 'purple',
    '#a855f7': 'purple',
  }

  return knownColors[cleaned] || null
}

function colorDescription(name: string, color: string | null) {
  const family = colorFamily(name, color)
  const descriptions: Record<string, string> = {
    red: 'natural crimson red',
    pink: 'natural hot pink',
    white: 'clean ivory white',
    yellow: 'warm sunflower yellow',
    orange: 'natural warm orange',
    purple: 'natural rich purple',
  }

  if (family) return descriptions[family]

  const cleaned = cleanPromptText(color, 30).toLowerCase()
  return cleaned
    ? `the natural color reference ${cleaned}`
    : 'its natural botanical color'
}

function containerDescription(container: ContainerRow | null) {
  if (!container)
    return 'a refined hand-tied bouquet in matte ivory florist paper'

  const name = cleanPromptText(container.name || container.name_ar, 80)

  switch (container.container_type) {
    case 'basket':
      return `a premium ${name || 'natural woven flower basket'}`
    case 'glass_vase':
    case 'vase':
      return `a clean premium ${name || 'clear glass vase'}`
    case 'luxury_box':
      return `an elegant ${name || 'luxury flower box'}`
    default:
      return `a hand-tied bouquet wrapped in ${name || 'premium matte florist paper'}`
  }
}

function bouquetScale(size: SizeRow | null, selectedStems: number) {
  const stems = size?.stem_count || selectedStems
  if (stems <= 9) return 'compact and delicate'
  if (stems <= 20) return 'balanced and medium-full'
  if (stems <= 35) return 'full and generous'
  return 'abundant and statement-sized'
}

function buildBouquetPrompt(
  selection: BouquetSelection,
  references: Array<{ purpose: ReferencePurpose }>
) {
  const selectedStems = selection.flowers.reduce(
    (sum, flower) => sum + flower.qty,
    0
  )
  const flowerRecipe = selection.flowers
    .map((flower) => {
      const share = Math.max(1, Math.round((flower.qty / selectedStems) * 100))
      const name =
        cleanPromptText(flower.name || flower.name_ar, 80) || 'flower'
      return `${flower.qty} stems of ${name} in ${colorDescription(
        `${flower.name} ${flower.name_ar || ''}`,
        flower.color
      )}, approximately ${share}% of the visible flower heads`
    })
    .join('; ')
    .slice(0, 700)

  const greeneryRecipe =
    selection.greenery.length > 0
      ? selection.greenery
          .map((item) => {
            const name =
              cleanPromptText(item.name || item.name_ar, 80) || 'greenery'
            return `${item.qty} stems of ${name}`
          })
          .join('; ')
          .slice(0, 240)
      : 'NO decorative greenery. Do not add eucalyptus, baby’s breath, fern, ruscus, filler flowers, or unlisted foliage'

  const greeneryAdjustment =
    selection.greenery.length === 0
      ? 'Keep decorative greenery completely absent.'
      : selection.greeneryPreference === 'less'
        ? 'Use visibly less greenery than a typical florist arrangement while keeping every selected greenery species.'
        : selection.greeneryPreference === 'more'
          ? 'Use a fuller amount of the selected greenery species without hiding the flower heads.'
          : 'Use the selected greenery in a balanced natural amount.'

  const spacingAdjustment =
    selection.spacingPreference === 'compact'
      ? 'Arrange flower heads closer together in a compact florist silhouette.'
      : selection.spacingPreference === 'airy'
        ? 'Create a slightly wider, airier florist silhouette with believable spacing and no missing stems.'
        : 'Use balanced professional florist spacing.'

  const referenceInstructions = references.map((reference, index) => {
    const imageNumber = index + 1

    switch (reference.purpose) {
      case 'flowers':
        return `Reference image ${imageNumber} is a flower identity board. Match its real petal shapes, species, and colors; do not reproduce the board layout or background.`
      case 'greenery':
        return `Reference image ${imageNumber} is a greenery identity board. Match only the selected leaf shapes and natural colors.`
      case 'container':
        return `Reference image ${imageNumber} shows the exact container or wrapping style. Preserve its material, color, and recognizable silhouette.`
      case 'previous':
        return `Reference image ${imageNumber} is the previous generated bouquet. Preserve its camera angle, container, flower identities, and overall composition; change only the requested greenery density or spacing and keep the result photographic.`
    }
  })

  return [
    'Ultra-photorealistic square luxury e-commerce product photograph of ONE real florist-made bouquet, centered and fully visible.',
    'Exactly one bouquet. No people, hands, text, letters, logo, watermark, price tag, duplicate bouquet, extra container, illustration, CGI, or surreal elements.',
    ...referenceInstructions,
    `Bouquet scale: ${bouquetScale(selection.size, selectedStems)}.`,
    `Required flower recipe: ${flowerRecipe}.`,
    `Greenery recipe: ${greeneryRecipe}.`,
    greeneryAdjustment,
    spacingAdjustment,
    `Presentation: ${containerDescription(selection.container)}.`,
    'Closely preserve the listed flower species, colors, relative quantities, greenery, and container. Do not invent other flower species or colors.',
    'Natural botanical anatomy, individually distinct petals, believable stems and leaves, tiny organic imperfections, fresh hydrated flowers, professional Jordanian luxury florist craftsmanship.',
    'Eye-level 85mm product photography, f/8, soft diffused window light from the left, realistic contact shadow, warm ivory micro-cement studio background, neutral color grade, crisp true-to-life detail, premium editorial catalog quality.',
    'No plastic-looking petals, heavy bokeh, cropped bouquet, floating objects, artificial symmetry, or oversaturated colors.',
  ]
    .join(' ')
    .slice(0, 2040)
}

function buildPollinationsPrompt(
  selection: BouquetSelection,
  references: PublicReference[]
) {
  const selectedStems = selection.flowers.reduce(
    (sum, flower) => sum + flower.qty,
    0
  )
  const flowerRecipe = selection.flowers
    .map((flower) => {
      const name =
        cleanPromptText(flower.name || flower.name_ar, 70) || 'flower'
      return `${flower.qty} ${colorDescription(
        `${flower.name} ${flower.name_ar || ''}`,
        flower.color
      )} ${name} stems`
    })
    .join('; ')

  const greeneryRecipe = selection.greenery.length
    ? selection.greenery
        .map((item) => {
          const name = cleanPromptText(item.name || item.name_ar, 60)
          return `${item.qty} ${name || 'greenery'} stems`
        })
        .join('; ')
    : 'none'

  const selectedNames = selection.flowers
    .map((flower) => `${flower.name} ${flower.name_ar || ''}`.toLowerCase())
    .join(' ')
  const forbiddenSpecies = [
    { tokens: ['rose'], label: 'roses' },
    { tokens: ['peony'], label: 'peonies' },
    { tokens: ['lily', 'lilium'], label: 'lilies' },
    { tokens: ['tulip'], label: 'tulips' },
    { tokens: ['sunflower'], label: 'sunflowers' },
    { tokens: ['orchid'], label: 'orchids' },
    { tokens: ['carnation'], label: 'carnations' },
    { tokens: ['chrysanthemum', 'santini'], label: 'chrysanthemums' },
    { tokens: ['gerbera'], label: 'gerbera daisies' },
    { tokens: ['calla'], label: 'calla lilies' },
  ]
    .filter(({ tokens }) => !tokens.some((token) => selectedNames.includes(token)))
    .map(({ label }) => label)
    .slice(0, 6)

  const selectedColors = new Set(
    selection.flowers
      .map((flower) =>
        colorFamily(`${flower.name} ${flower.name_ar || ''}`, flower.color)
      )
      .filter((family): family is string => !!family)
  )
  const forbiddenColors = ['red', 'pink', 'white', 'yellow', 'orange', 'purple']
    .filter((family) => !selectedColors.has(family))
    .map((family) => `${family} flowers`)
    .slice(0, 4)

  const referenceLegend = references
    .map((reference, index) => {
      const labels: Record<ReferencePurpose, string> = {
        flowers: 'flower species and petal color',
        greenery: 'greenery leaf identity',
        container: 'exact container material and silhouette',
        previous: 'previous bouquet composition to preserve',
      }
      return `reference ${index + 1} = ${labels[reference.purpose]}`
    })
    .join('; ')

  const greeneryDirection =
    selection.greenery.length === 0
      ? 'Do not add any decorative greenery or filler flowers.'
      : selection.greeneryPreference === 'less'
        ? 'Keep the selected greenery sparse and restrained.'
        : selection.greeneryPreference === 'more'
          ? 'Use fuller selected greenery without hiding flower heads.'
          : 'Use the selected greenery in a balanced restrained amount.'
  const spacingDirection =
    selection.spacingPreference === 'compact'
      ? 'Keep flower heads close in a compact florist silhouette.'
      : selection.spacingPreference === 'airy'
        ? 'Use a natural airy florist silhouette with believable spacing.'
        : 'Use balanced professional florist spacing.'
  const exclusions = [...forbiddenSpecies, ...forbiddenColors]

  return [
    'Photorealistic luxury florist catalog product photo of exactly ONE bouquet.',
    `Required flower recipe: ${flowerRecipe}. Preserve these exact species, colors, and their ${selectedStems}-stem relative ratio.`,
    `Greenery: ${greeneryRecipe}. ${greeneryDirection}`,
    `${spacingDirection} Bouquet scale: ${bouquetScale(selection.size, selectedStems)}.`,
    `Presentation: ${containerDescription(selection.container)}.`,
    referenceLegend ? `Image references: ${referenceLegend}.` : '',
    'Use ONLY the listed flowers and colors.',
    exclusions.length ? `Absolutely do not add ${exclusions.join(', ')}.` : '',
    'Centered complete bouquet, true botanical anatomy, realistic petals and stems, natural imperfections, soft diffused window light, warm ivory studio background, square composition.',
    'No hands, people, text, letters, price tags, logos, watermark, duplicate bouquet, extra container, illustration, CGI, or plastic-looking petals.',
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1_600)
}

function providerConfigured() {
  return cloudflareConfigured() || publicFallbackEnabled()
}

function userFacingProviderError(error: unknown) {
  if (error instanceof AiConfigurationError) {
    return { status: 503, message: 'خدمة المعاينة الواقعية لم تُفعّل بعد.' }
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      status: 504,
      message: 'استغرق إنشاء الصورة وقتاً أطول من المتوقع. حاول مرة أخرى.',
    }
  }

  if (error instanceof AiProviderError && error.status === 429) {
    return {
      status: 429,
      message: 'تم استهلاك الحصة المجانية لخدمة الصور اليوم. جرّب لاحقاً.',
    }
  }

  if (
    error instanceof AiProviderError &&
    (error.status === 401 || error.status === 403)
  ) {
    return {
      status: 503,
      message: 'إعدادات خدمة الصور غير صحيحة. تحقق من مفاتيح Cloudflare.',
    }
  }

  return {
    status: 502,
    message: 'خدمة الصور مشغولة حالياً. حاول مرة أخرى بعد قليل.',
  }
}

export async function GET(request: NextRequest) {
  const limit = dailyLimit()

  if (!providerConfigured()) {
    return NextResponse.json(
      { configured: false, remaining: 0, limit },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  try {
    const identifier = await usageIdentifier(request)
    const atomicQuota = await getAtelierDailyQuota(identifier)

    if (atomicQuota) {
      return NextResponse.json(
        {
          configured: true,
          remaining: atomicQuota.remaining,
          limit: atomicQuota.limit,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const serviceClient = createServiceClient()
    const { count, error } = await serviceClient
      .from('ai_generation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', usageWindowStart())

    if (error) throw error

    return NextResponse.json(
      {
        configured: true,
        remaining: Math.max(0, limit - (count || 0)),
        limit,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    console.error('[atelier-ai] failed to read usage', error)
    return NextResponse.json(
      { configured: false, remaining: 0, limit },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!providerConfigured()) {
    return NextResponse.json(
      { error: 'خدمة المعاينة الواقعية لم تُفعّل بعد.' },
      { status: 503 }
    )
  }

  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: 'الطلب غير مسموح.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > 32_768) {
    return NextResponse.json(
      { error: 'بيانات الباقة أكبر من الحد المسموح.' },
      { status: 413 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الباقة غير صالحة.' },
      { status: 400 }
    )
  }

  const parsed = GeneratePreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'اختيارات الباقة غير صالحة.' },
      { status: 400 }
    )
  }

  const {
    flowers,
    greenery,
    containerId,
    sizeKey,
    greeneryPreference,
    spacingPreference,
    regenerate,
    previousImageUrl,
  } = parsed.data
  const totalFlowers = flowers.reduce((sum, flower) => sum + flower.qty, 0)
  const flowerIds = flowers.map((flower) => flower.id)
  const greeneryIds = greenery.map((item) => item.id)

  if (
    totalFlowers > 200 ||
    new Set(flowerIds).size !== flowerIds.length ||
    new Set(greeneryIds).size !== greeneryIds.length ||
    !containerId ||
    (previousImageUrl && !regenerate) ||
    (previousImageUrl && !trustedPreviousPreviewUrl(previousImageUrl))
  ) {
    return NextResponse.json(
      { error: 'اختيارات الباقة غير صالحة.' },
      { status: 400 }
    )
  }

  let identifier: string
  let serviceClient: ReturnType<typeof createServiceClient>

  try {
    identifier = await usageIdentifier(request)
    serviceClient = createServiceClient()
  } catch (error) {
    console.error('[atelier-ai] Supabase configuration failed', error)
    return NextResponse.json(
      { error: 'خدمة المعاينة غير مكتملة الإعداد.' },
      { status: 503 }
    )
  }

  const rateLimitResponse = await checkRateLimit(identifier, 'ai')
  if (rateLimitResponse) return rateLimitResponse

  const [flowersResult, greeneryResult, containerResult, sizeResult] =
    await Promise.all([
      serviceClient
        .from('flower_types')
        .select('id, name, name_ar, color, image')
        .in('id', flowerIds)
        .eq('in_stock', true),
      greeneryIds.length
        ? serviceClient
            .from('greenery_options')
            .select('id, name, name_ar, image')
            .in('id', greeneryIds)
            .eq('in_stock', true)
        : Promise.resolve({ data: [], error: null }),
      containerId
        ? serviceClient
            .from('vase_options')
            .select('id, name, name_ar, container_type, image')
            .eq('id', containerId)
            .eq('in_stock', true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sizeKey
        ? serviceClient
            .from('bouquet_sizes')
            .select('key, label_ar, stem_count')
            .eq('key', sizeKey)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

  const lookupError =
    flowersResult.error ||
    greeneryResult.error ||
    containerResult.error ||
    sizeResult.error

  if (lookupError) {
    console.error('[atelier-ai] selection lookup failed', lookupError)
    return NextResponse.json(
      { error: 'تعذر التحقق من مكونات الباقة.' },
      { status: 503 }
    )
  }

  const flowerRows = (flowersResult.data || []) as FlowerRow[]
  const greeneryRows = (greeneryResult.data || []) as GreeneryRow[]
  const container = (containerResult.data || null) as ContainerRow | null
  const size = (sizeResult.data || null) as SizeRow | null

  if (
    flowerRows.length !== flowerIds.length ||
    greeneryRows.length !== greeneryIds.length ||
    (containerId && !container) ||
    (sizeKey && !size)
  ) {
    return NextResponse.json(
      { error: 'بعض المكونات غير متوفرة حالياً. حدّث الصفحة وحاول مجدداً.' },
      { status: 400 }
    )
  }

  const selection: BouquetSelection = {
    flowers: flowers.map((item) => ({
      ...flowerRows.find((row) => row.id === item.id)!,
      qty: item.qty,
    })),
    greenery: greenery.map((item) => ({
      ...greeneryRows.find((row) => row.id === item.id)!,
      qty: item.qty,
    })),
    container,
    size,
    greeneryPreference,
    spacingPreference,
  }

  const publicReferences = publicReferencesForSelection(
    selection,
    regenerate ? previousImageUrl : undefined
  )
  const cacheHash = selectionCacheHash(selection, publicReferences)

  if (!regenerate) {
    const cachedPath = await findCachedPreview(serviceClient, cacheHash)

    if (cachedPath) {
      const atomicQuota = await getAtelierDailyQuota(identifier)
      let limit = atomicQuota?.limit || dailyLimit()
      let remaining = atomicQuota?.remaining

      if (remaining === undefined) {
        const { count, error: countError } = await serviceClient
          .from('ai_generation_logs')
          .select('id', { count: 'exact', head: true })
          .eq('identifier', identifier)
          .gte('created_at', usageWindowStart())

        if (!countError) {
          remaining = Math.max(0, limit - (count || 0))
        } else {
          console.warn('[atelier-ai] cached quota lookup failed', countError)
          remaining = limit
        }
      }

      return NextResponse.json(
        {
          imageUrl: publicPreviewUrl(serviceClient, cachedPath),
          model: cloudflareConfigured()
            ? 'FLUX.2 Klein 4B'
            : publicReferences.length > 0
              ? 'Pollinations reference fallback'
              : 'Pollinations fallback',
          remaining,
          limit,
          cached: true,
          referencesUsed: publicReferences.length,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      )
    }
  }

  let limit = dailyLimit()
  let usedCount = 0
  let remainingAfterAttempt: number
  let quotaIsAtomic = false
  const atomicReservation = await consumeAtelierDailyQuota(identifier)

  if (atomicReservation) {
    limit = atomicReservation.limit
    remainingAfterAttempt = atomicReservation.remaining
    quotaIsAtomic = true

    if (!atomicReservation.success) {
      return NextResponse.json(
        { error: 'انتهت معايناتك المجانية لهذا اليوم.', remaining: 0 },
        { status: 429 }
      )
    }
  } else {
    const { count, error: countError } = await serviceClient
      .from('ai_generation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('created_at', usageWindowStart())

    if (countError) {
      console.error('[atelier-ai] usage query failed', countError)
      return NextResponse.json(
        { error: 'تعذر التحقق من المحاولات المتبقية.' },
        { status: 503 }
      )
    }

    usedCount = count || 0
    if (usedCount >= limit) {
      return NextResponse.json(
        { error: 'انتهت معايناتك المجانية لهذا اليوم.', remaining: 0 },
        { status: 429 }
      )
    }

    remainingAfterAttempt = Math.max(0, limit - usedCount - 1)
  }

  let references: PreparedReference[] = []
  try {
    references = await prepareReferences(
      selection,
      regenerate ? previousImageUrl : undefined
    )
  } catch (error) {
    console.warn('[atelier-ai] reference preparation failed', error)
  }

  const prompt = buildBouquetPrompt(
    selection,
    cloudflareConfigured() ? references : publicReferences
  )
  const publicFallbackPrompt = buildPollinationsPrompt(
    selection,
    publicReferences
  )
  const seed = Math.floor(Math.random() * 2_147_483_647)
  let generated: GeneratedImage

  try {
    generated = await generateImage(
      prompt,
      publicFallbackPrompt,
      seed,
      references,
      publicReferences
    )
  } catch (error) {
    console.error('[atelier-ai] generation failed', error)
    const userError = userFacingProviderError(error)
    return NextResponse.json(
      {
        error: userError.message,
        remaining: quotaIsAtomic
          ? remainingAfterAttempt
          : Math.max(0, limit - usedCount),
      },
      { status: userError.status }
    )
  }

  let normalizedBuffer: Buffer
  try {
    normalizedBuffer = await sharp(generated.buffer)
      .rotate()
      .resize(1024, 1024, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
      .toBuffer()
  } catch (error) {
    console.error('[atelier-ai] image normalization failed', error)
    return NextResponse.json(
      { error: 'تعذر معالجة الصورة، حاول مرة أخرى.' },
      { status: 502 }
    )
  }

  const dateFolder = new Date().toISOString().slice(0, 10)
  const shouldCache =
    !regenerate &&
    (generated.model === 'FLUX.2 Klein 4B' || !cloudflareConfigured())
  let fileName = shouldCache
    ? cachedFilePath(cacheHash)
    : `previews/${dateFolder}/preview-${Date.now()}-${seed}.jpg`
  let servedFromExistingCache = false
  const { error: uploadError } = await serviceClient.storage
    .from(PREVIEW_BUCKET)
    .upload(fileName, normalizedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: shouldCache ? '31536000' : '604800',
      upsert: false,
    })

  if (uploadError) {
    const existingPath = shouldCache
      ? await findCachedPreview(serviceClient, cacheHash)
      : null

    if (existingPath) {
      fileName = existingPath
      servedFromExistingCache = true
    } else {
      console.error('[atelier-ai] image upload failed', uploadError)
      return NextResponse.json(
        {
          error: 'تم إنشاء الصورة لكن تعذر حفظها. حاول مرة أخرى.',
          remaining: remainingAfterAttempt,
        },
        { status: 503 }
      )
    }
  }

  const { error: logError } = await serviceClient
    .from('ai_generation_logs')
    .insert({ identifier })

  if (logError) {
    console.error('[atelier-ai] usage log failed', logError)
    if (!quotaIsAtomic) {
      if (!servedFromExistingCache) {
        await serviceClient.storage.from(PREVIEW_BUCKET).remove([fileName])
      }
      return NextResponse.json(
        { error: 'تعذر تسجيل المعاينة. حاول مرة أخرى.' },
        { status: 503 }
      )
    }
  }

  return NextResponse.json(
    {
      imageUrl: publicPreviewUrl(serviceClient, fileName),
      model: generated.model,
      remaining: remainingAfterAttempt,
      limit,
      cached: servedFromExistingCache,
      referencesUsed: generated.referencesUsed,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  )
}
