import { createHmac } from 'node:crypto'
import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const PRIMARY_MODEL = '@cf/black-forest-labs/flux-2-klein-4b'
const FALLBACK_MODEL = '@cf/black-forest-labs/flux-1-schnell'
const PREVIEW_BUCKET = 'atelier-previews'

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
})

type FlowerRow = {
  id: string
  name: string
  name_ar: string | null
  color: string | null
}

type GreeneryRow = {
  id: string
  name: string
  name_ar: string | null
}

type ContainerRow = {
  id: string
  name: string
  name_ar: string | null
  container_type: string | null
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
}

type CloudflarePayload = {
  success?: boolean
  result?: { image?: string }
  errors?: Array<{ code?: number; message?: string }>
}

type GeneratedImage = {
  buffer: Buffer
  model: string
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
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'flore-atelier-ai'

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
  timeoutMs: number
): Promise<GeneratedImage> {
  const form = new FormData()
  form.set('prompt', prompt)
  form.set('width', '768')
  form.set('height', '1024')
  form.set('guidance', '4')
  form.set('seed', String(seed))

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
  }
}

async function generateWithPollinations(
  prompt: string,
  seed: number,
  timeoutMs: number
): Promise<GeneratedImage> {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=768&height=1024&seed=${seed}&nologo=true&enhance=true`
  const response = await fetchWithTimeout(
    url,
    { headers: { Accept: 'image/*' } },
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

  return { buffer, model: 'Pollinations fallback' }
}

async function generateImage(prompt: string, seed: number) {
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
        remainingTime()
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
    return generateWithPollinations(prompt, seed, remainingTime())
  }

  if (lastCloudflareError) throw lastCloudflareError
  throw new AiConfigurationError()
}

function colorDescription(color: string | null) {
  const cleaned = cleanPromptText(color, 30).toLowerCase()
  const knownColors: Record<string, string> = {
    '#c41e3a': 'natural crimson red',
    '#e11d48': 'natural deep red',
    '#ffffff': 'clean ivory white',
    '#f8fafc': 'clean ivory white',
    '#f7c6d9': 'soft blush pink',
    '#ff6b9d': 'soft natural pink',
    '#ffc72c': 'warm sunflower yellow',
    '#fbbf24': 'warm sunflower yellow',
    '#b497d6': 'soft lavender purple',
    '#a855f7': 'rich natural purple',
  }

  if (!cleaned) return 'its natural botanical color'
  return knownColors[cleaned] || `the natural color reference ${cleaned}`
}

function containerDescription(container: ContainerRow | null) {
  if (!container)
    return 'a refined hand-tied bouquet in matte ivory florist paper'

  const name = cleanPromptText(container.name || container.name_ar, 80)

  switch (container.container_type) {
    case 'basket':
      return `a premium ${name || 'natural woven flower basket'}`
    case 'glass_vase':
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

function buildBouquetPrompt(selection: BouquetSelection) {
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
      : 'minimal subtle florist foliage only where structurally necessary'

  return [
    'Ultra-photorealistic vertical luxury e-commerce product photograph of ONE real florist-made bouquet, centered and fully visible.',
    'Exactly one bouquet. No people, hands, text, letters, logo, watermark, price tag, duplicate bouquet, extra container, illustration, CGI, or surreal elements.',
    `Bouquet scale: ${bouquetScale(selection.size, selectedStems)}.`,
    `Required flower recipe: ${flowerRecipe}.`,
    `Greenery recipe: ${greeneryRecipe}.`,
    `Presentation: ${containerDescription(selection.container)}.`,
    'Closely preserve the listed flower species, colors, relative quantities, greenery, and container. Do not invent other flower species or colors.',
    'Natural botanical anatomy, individually distinct petals, believable stems and leaves, tiny organic imperfections, fresh hydrated flowers, professional Jordanian luxury florist craftsmanship.',
    'Eye-level 85mm product photography, f/8, soft diffused window light from the left, realistic contact shadow, warm ivory micro-cement studio background, neutral color grade, crisp true-to-life detail, premium editorial catalog quality.',
    'No plastic-looking petals, heavy bokeh, cropped bouquet, floating objects, artificial symmetry, or oversaturated colors.',
  ]
    .join(' ')
    .slice(0, 2040)
}

function providerConfigured() {
  const cloudflareConfigured = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
    process.env.CLOUDFLARE_API_TOKEN?.trim()
  )
  return cloudflareConfigured || publicFallbackEnabled()
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

  const { flowers, greenery, containerId, sizeKey } = parsed.data
  const totalFlowers = flowers.reduce((sum, flower) => sum + flower.qty, 0)
  const flowerIds = flowers.map((flower) => flower.id)
  const greeneryIds = greenery.map((item) => item.id)

  if (
    totalFlowers > 200 ||
    new Set(flowerIds).size !== flowerIds.length ||
    new Set(greeneryIds).size !== greeneryIds.length
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

  const limit = dailyLimit()
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

  const usedCount = count || 0
  if (usedCount >= limit) {
    return NextResponse.json(
      { error: 'انتهت معايناتك المجانية لهذا اليوم.', remaining: 0 },
      { status: 429 }
    )
  }

  const [flowersResult, greeneryResult, containerResult, sizeResult] =
    await Promise.all([
      serviceClient
        .from('flower_types')
        .select('id, name, name_ar, color')
        .in('id', flowerIds)
        .eq('in_stock', true),
      greeneryIds.length
        ? serviceClient
            .from('greenery_options')
            .select('id, name, name_ar')
            .in('id', greeneryIds)
            .eq('in_stock', true)
        : Promise.resolve({ data: [], error: null }),
      containerId
        ? serviceClient
            .from('vase_options')
            .select('id, name, name_ar, container_type')
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
  }

  const prompt = buildBouquetPrompt(selection)
  const seed = Math.floor(Math.random() * 2_147_483_647)
  let generated: GeneratedImage

  try {
    generated = await generateImage(prompt, seed)
  } catch (error) {
    console.error('[atelier-ai] generation failed', error)
    const userError = userFacingProviderError(error)
    return NextResponse.json(
      {
        error: userError.message,
        remaining: Math.max(0, limit - usedCount),
      },
      { status: userError.status }
    )
  }

  let normalizedBuffer: Buffer
  try {
    normalizedBuffer = await sharp(generated.buffer)
      .rotate()
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
  const fileName = `${dateFolder}/preview-${Date.now()}-${seed}.jpg`
  const { error: uploadError } = await serviceClient.storage
    .from(PREVIEW_BUCKET)
    .upload(fileName, normalizedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '604800',
      upsert: false,
    })

  if (uploadError) {
    console.error('[atelier-ai] image upload failed', uploadError)
    return NextResponse.json(
      { error: 'تم إنشاء الصورة لكن تعذر حفظها. حاول مرة أخرى.' },
      { status: 503 }
    )
  }

  const { error: logError } = await serviceClient
    .from('ai_generation_logs')
    .insert({ identifier })

  if (logError) {
    console.error('[atelier-ai] usage log failed', logError)
    await serviceClient.storage.from(PREVIEW_BUCKET).remove([fileName])
    return NextResponse.json(
      { error: 'تعذر تسجيل المعاينة. حاول مرة أخرى.' },
      { status: 503 }
    )
  }

  const {
    data: { publicUrl },
  } = serviceClient.storage.from(PREVIEW_BUCKET).getPublicUrl(fileName)

  return NextResponse.json(
    {
      imageUrl: publicUrl,
      model: generated.model,
      remaining: Math.max(0, limit - usedCount - 1),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    }
  )
}
