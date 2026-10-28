import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp, isRateLimitConfigured } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sharp from 'sharp'

export const maxDuration = 60

const DAILY_LIMIT = 5
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image-preview'

const GeneratePreviewSchema = z.object({
  flowers: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(20) })).min(1).max(10),
  greenery: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(20) })).max(10).optional(),
  containerId: z.string().uuid().nullable().optional(),
  sizeKey: z.string().max(50).optional(),
})

const CONTAINER_PROMPT_LABELS: Record<string, string> = {
  basket: 'a woven basket',
  glass_vase: 'a clear glass vase',
  wrap: 'elegant paper wrapping',
  luxury_box: 'a luxury flower box',
}

const FLOWER_VISUALS: Record<string, string> = {
  'Red Rose': 'velvety deep-red garden roses with lush layered petals',
  'White Rose': 'creamy ivory-white roses with soft ruffled petals',
  'Pink Peony': 'lush ruffled blush-pink peonies in full bloom',
  Sunflower: 'golden sunflowers with dark centers',
  Lavender: 'violet lavender sprigs',
}

type FlowerRow = { id: string; name: string; color: string | null; image: string | null }
type GreeneryRow = { id: string; name: string }

function describeFlower(name: string, qty: number, color: string | null) {
  const visual = FLOWER_VISUALS[name]
  return visual ? `${qty} ${visual}` : `${qty} ${name} flowers${color ? ` in ${color}` : ''}`
}

function buildPrompt(flowerDesc: string, greeneryDesc: string, containerDesc: string, sizeKey?: string) {
  return [
    `Create a photorealistic luxury florist arrangement of ${flowerDesc}`,
    greeneryDesc ? `accented with ${greeneryDesc}` : '',
    `arranged in ${containerDesc}${sizeKey ? `, ${sizeKey} size` : ''}, hand-crafted by a master florist.`,
    'When reference photos are attached, preserve the exact flower variety, petal shape, and color tone shown.',
    'High-end editorial product photography, 85mm lens, soft diffused studio light, warm ivory background, realistic botanical detail, subtle natural shadows.',
    'No text, no logo, no watermark, no people, no hands, no extra bouquets.',
  ].filter(Boolean).join(' ')
}

async function generateWithOpenRouter(prompt: string, refImages: string[]): Promise<Buffer | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || apiKey.includes('...')) return null
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }]
  for (const url of refImages.slice(0, 3)) content.push({ type: 'image_url', image_url: { url } })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://flore.jo',
        'X-Title': 'FLORÉ Luxury Atelier',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
      }),
    })
    if (!response.ok) {
      console.error('[atelier] OpenRouter image generation failed:', response.status)
      return null
    }
    const data = await response.json()
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) return null
    const base64 = imageUrl.split(',')[1]
    if (!base64) return null
    return Buffer.from(base64, 'base64')
  } catch (error) {
    console.error('[atelier] OpenRouter request failed:', error instanceof Error ? error.message : 'unknown')
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function generateWithPollinations(prompt: string): Promise<Buffer> {
  const seed = Math.floor(Math.random() * 1_000_000)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=704&height=1024&seed=${seed}&nologo=true`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 40_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok || (response.headers.get('content-type') || '').includes('json')) {
      throw new Error(`Image fallback failed with status ${response.status}`)
    }
    const length = Number(response.headers.get('content-length') || 0)
    if (length > 15 * 1024 * 1024) throw new Error('Generated image is too large')
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > 15 * 1024 * 1024) throw new Error('Generated image is too large')
    return buffer
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !isRateLimitConfigured()) {
    return NextResponse.json({ error: 'معاينة الباقة غير متاحة مؤقتًا. يرجى المحاولة لاحقًا.' }, { status: 503 })
  }
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const identifier = user?.id || getClientIp(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = GeneratePreviewSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { flowers, greenery = [], containerId, sizeKey } = parsed.data
  const serviceClient = createServiceClient()

  // Atomic reservation prevents concurrent requests from bypassing the five-per-day quota.
  const { data: remaining, error: quotaError } = await serviceClient.rpc('claim_ai_generation', {
    p_identifier: identifier,
    p_daily_limit: DAILY_LIMIT,
  })
  if (quotaError || typeof remaining !== 'number') {
    console.error('[atelier] Quota reservation failed:', quotaError?.message || 'invalid response')
    return NextResponse.json({ error: 'تعذر التحقق من حد المعاينات. حاول لاحقًا.' }, { status: 503 })
  }
  if (remaining < 0) {
    return NextResponse.json({ error: 'وصلت للحد الأقصى من المعاينات اليوم، حاول غدًا 🌸', remaining: 0 }, { status: 429 })
  }

  const flowerIds = flowers.map((flower) => flower.id)
  const greeneryIds = greenery.map((item) => item.id)
  const [flowersRes, greeneryRes, containerRes] = await Promise.all([
    supabase.from('flower_types').select('id, name, color, image').in('id', flowerIds),
    greeneryIds.length
      ? supabase.from('greenery_options').select('id, name').in('id', greeneryIds)
      : Promise.resolve({ data: [] as GreeneryRow[] }),
    containerId
      ? supabase.from('vase_options').select('id, name, container_type').eq('id', containerId).single()
      : Promise.resolve({ data: null }),
  ])

  const flowerRows = (flowersRes.data || []) as FlowerRow[]
  if (flowersRes.error || flowerRows.length !== new Set(flowerIds).size) {
    return NextResponse.json({ error: 'اختيار الزهور غير صالح أو لم يعد متاحًا.' }, { status: 400 })
  }

  const flowerDesc = flowers.map((selected) => {
    const row = flowerRows.find((flower) => flower.id === selected.id)!
    return describeFlower(row.name, selected.qty, row.color)
  }).join(', ')
  const greeneryRows = (greeneryRes.data || []) as GreeneryRow[]
  const greeneryDesc = greenery.map((selected) => {
    const row = greeneryRows.find((item) => item.id === selected.id)
    return row ? `${selected.qty} ${row.name}` : null
  }).filter(Boolean).join(', ')

  const containerType = (containerRes.data as { container_type?: string } | null)?.container_type
  const containerDesc = containerType ? CONTAINER_PROMPT_LABELS[containerType] || 'a bouquet wrap' : 'a bouquet wrap'
  const prompt = buildPrompt(flowerDesc, greeneryDesc, containerDesc, sizeKey)
  const referenceImages = [...new Set(flowerRows.map((flower) => flower.image).filter((url): url is string => !!url && url.startsWith('https://')))]

  let imageBuffer = await generateWithOpenRouter(prompt, referenceImages)
  if (!imageBuffer) {
    try {
      imageBuffer = await generateWithPollinations(prompt)
    } catch (error) {
      console.error('[atelier] Fallback image generation failed:', error instanceof Error ? error.message : 'unknown')
      return NextResponse.json({ error: 'تعذر توليد الصورة الآن. حاول مرة أخرى لاحقًا.' }, { status: 502 })
    }
  }

  let normalizedBuffer: Buffer
  try {
    normalizedBuffer = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
      .resize({ width: 1400, height: 1800, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
  } catch (error) {
    console.error('[atelier] Image normalization failed:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json({ error: 'تعذر معالجة صورة المعاينة.' }, { status: 502 })
  }

  const fileName = `preview-${Date.now()}-${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await serviceClient.storage
    .from('atelier-previews')
    .upload(fileName, normalizedBuffer, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) {
    console.error('[atelier] Preview upload failed:', uploadError.message)
    return NextResponse.json({ error: 'فشل حفظ صورة المعاينة.' }, { status: 500 })
  }

  const { data: { publicUrl } } = serviceClient.storage.from('atelier-previews').getPublicUrl(fileName)
  const { error: logError } = await serviceClient.from('ai_generation_logs').insert({ identifier })
  if (logError) console.error('[atelier] Usage log insert failed:', logError.message)

  return NextResponse.json({ imageUrl: publicUrl, remaining })
}
