import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { normalizeContainerType } from '@/lib/atelier/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DAILY_LIMIT = 5

const GeneratePreviewSchema = z.object({
  flowers: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1).max(30),
  greenery: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(20) })).max(20).optional().default([]),
  containerId: z.string().uuid().nullable().optional(),
  sizeKey: z.string().min(1).max(50),
})

const containerPromptLabels = {
  basket: 'a refined woven flower basket',
  glass_vase: 'a clear minimal glass vase',
  vase: 'an elegant premium flower vase',
  wrap: 'restrained luxury paper wrapping',
  luxury_box: 'a structured luxury flower box',
} as const

function asErrorMessage(value: unknown) {
  return value instanceof Error ? value.message : String(value || '')
}

async function claimDailySlot(serviceClient: ReturnType<typeof createServiceClient>, identifier: string) {
  const { data, error } = await serviceClient.rpc('claim_ai_generation_slot', {
    p_identifier: identifier,
    p_daily_limit: DAILY_LIMIT,
  })

  if (!error && data && typeof data === 'object') {
    const result = data as { allowed?: boolean; remaining?: number }
    return {
      allowed: Boolean(result.allowed),
      remaining: typeof result.remaining === 'number' ? result.remaining : 0,
      claimed: Boolean(result.allowed),
    }
  }

  // Compatibility fallback while the database migration rolls out.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await serviceClient
    .from('ai_generation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .gte('created_at', oneDayAgo)

  const used = count || 0
  return { allowed: used < DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used), claimed: false }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimitResponse = await checkRateLimit(ip, 'ai')
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 })
  }

  const parsed = GeneratePreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'اختيارات الأتيليه غير مكتملة أو غير صالحة.' }, { status: 400 })
  }

  const supabase = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  const identifier = user?.id || ip
  const { flowers, greenery, containerId, sizeKey } = parsed.data

  const flowerIds = flowers.map(item => item.id)
  const greeneryIds = greenery.map(item => item.id)

  const [flowerRes, greeneryRes, containerRes, sizeRes] = await Promise.all([
    serviceClient.from('flower_types').select('id,name,name_ar,color,in_stock').in('id', flowerIds),
    greeneryIds.length
      ? serviceClient.from('greenery_options').select('id,name,name_ar,in_stock').in('id', greeneryIds)
      : Promise.resolve({ data: [], error: null }),
    containerId
      ? serviceClient.from('vase_options').select('id,name,name_ar,container_type,in_stock').eq('id', containerId).single()
      : Promise.resolve({ data: null, error: null }),
    serviceClient.from('bouquet_sizes').select('key,label_ar,stem_count').eq('key', sizeKey).single(),
  ])

  if (flowerRes.error || greeneryRes.error || containerRes.error || sizeRes.error || !sizeRes.data) {
    console.error('[atelier/generate-preview] selection lookup failed', {
      flower: flowerRes.error,
      greenery: greeneryRes.error,
      container: containerRes.error,
      size: sizeRes.error,
    })
    return NextResponse.json({ error: 'تعذر التحقق من مكونات الباقة.' }, { status: 400 })
  }

  if ((flowerRes.data || []).length !== new Set(flowerIds).size) {
    return NextResponse.json({ error: 'إحدى الزهور لم تعد متاحة.' }, { status: 400 })
  }
  if ((flowerRes.data || []).some(item => !item.in_stock)) {
    return NextResponse.json({ error: 'إحدى الزهور نفدت من المخزون.' }, { status: 409 })
  }
  if ((greeneryRes.data || []).some(item => !item.in_stock)) {
    return NextResponse.json({ error: 'إحدى اللمسات الخضراء لم تعد متاحة.' }, { status: 409 })
  }
  if (containerRes.data && !containerRes.data.in_stock) {
    return NextResponse.json({ error: 'طريقة التقديم المختارة لم تعد متاحة.' }, { status: 409 })
  }

  const selectedStemCount = flowers.reduce((sum, item) => sum + item.qty, 0)
  if (selectedStemCount !== Number(sizeRes.data.stem_count)) {
    return NextResponse.json(
      { error: `الحجم ${sizeRes.data.label_ar} يحتاج ${sizeRes.data.stem_count} ساق بالضبط.` },
      { status: 400 }
    )
  }

  const slot = await claimDailySlot(serviceClient, identifier)
  if (!slot.allowed) {
    return NextResponse.json(
      { error: 'اكتمل حد المعاينات الواقعية لهذا اليوم.', remaining: 0 },
      { status: 429 }
    )
  }

  const flowerRows = flowerRes.data || []
  const greeneryRows = greeneryRes.data || []
  const flowerDescription = flowers
    .map(item => {
      const row = flowerRows.find(flower => flower.id === item.id)
      const name = row?.name || row?.name_ar || 'flower'
      const color = row?.color ? ` in ${row.color}` : ''
      return `${item.qty} stems of ${name}${color}`
    })
    .join(', ')

  const greeneryDescription = greenery
    .map(item => {
      const row = greeneryRows.find(option => option.id === item.id)
      return row ? `${item.qty} stems of ${row.name}` : null
    })
    .filter(Boolean)
    .join(', ')

  const containerType = normalizeContainerType(containerRes.data?.container_type)
  const containerDescription = containerRes.data
    ? `${containerPromptLabels[containerType]} (${containerRes.data.name})`
    : 'restrained luxury bouquet wrapping'

  const prompt = [
    `Editorial luxury florist photograph of one finished ${sizeRes.data.label_ar} bouquet with exactly ${selectedStemCount} flower stems.`,
    `Flowers: ${flowerDescription}.`,
    greeneryDescription ? `Greenery accents: ${greeneryDescription}.` : '',
    `Presentation: ${containerDescription}.`,
    'Preserve the selected flower varieties and approximate color balance.',
    'Natural botanical proportions, professionally arranged by a high-end florist, soft diffused daylight, warm ivory studio background, quiet luxury styling, realistic petals and stems, no text, no logo, no hands, no people, no extra objects.',
    'Vertical product photography, photorealistic, high detail.',
  ].filter(Boolean).join(' ')

  const seed = Math.floor(Math.random() * 1_000_000)
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=800&seed=${seed}&nologo=true`

  let normalizedBuffer: Buffer
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const imageResponse = await fetch(pollinationsUrl, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout)
    if (!imageResponse.ok) throw new Error(`generator status ${imageResponse.status}`)
    const imageBuffer = await imageResponse.arrayBuffer()
    normalizedBuffer = await sharp(Buffer.from(imageBuffer))
      .rotate()
      .resize(640, 800, { fit: 'cover' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer()
  } catch (error) {
    console.error('[atelier/generate-preview] generation failed:', asErrorMessage(error))
    return NextResponse.json({ error: 'تعذر إنشاء المعاينة الواقعية الآن. حاول مرة أخرى.' }, { status: 502 })
  }

  const fileName = `${new Date().toISOString().slice(0, 10)}/preview-${Date.now()}-${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await serviceClient.storage
    .from('atelier-previews')
    .upload(fileName, normalizedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('[atelier/generate-preview] upload failed:', uploadError)
    return NextResponse.json({ error: 'تعذر حفظ المعاينة الواقعية.' }, { status: 500 })
  }

  if (!slot.claimed) {
    await serviceClient.from('ai_generation_logs').insert({ identifier })
  }

  const { data: publicData } = serviceClient.storage.from('atelier-previews').getPublicUrl(fileName)
  return NextResponse.json({ imageUrl: publicData.publicUrl, remaining: Math.max(0, slot.remaining - (slot.claimed ? 0 : 1)) })
}
