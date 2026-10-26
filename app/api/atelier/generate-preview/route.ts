import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import sharp from 'sharp'

const DAILY_LIMIT = 5

const GeneratePreviewSchema = z.object({
    flowers: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).min(1),
    greenery: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(50) })).optional(),
    containerId: z.string().uuid().nullable().optional(),
    sizeKey: z.string().max(50).optional(),
})

const CONTAINER_PROMPT_LABELS: Record<string, string> = {
    basket: 'a woven basket',
    glass_vase: 'a clear glass vase',
    wrap: 'elegant paper wrapping',
    luxury_box: 'a luxury flower box',
}

export async function POST(request: NextRequest) {
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
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { flowers, greenery, containerId } = parsed.data
    const serviceClient = createServiceClient()

    // ── تحقق الحد اليومي الفعلي (لا يمكن التحايل عليه بتحديث الصفحة) ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await serviceClient
        .from('ai_generation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('identifier', identifier)
        .gte('created_at', oneDayAgo)

    const usedCount = count || 0
    if (usedCount >= DAILY_LIMIT) {
        return NextResponse.json(
            { error: 'وصلت للحد الأقصى من المعاينات اليوم، حاول غداً 🌸', remaining: 0 },
            { status: 429 }
        )
    }

    // ── نبني النص (prompt) من بيانات قاعدة البيانات الحقيقية، مش من نص حر يرسله المتصفح ──
    const flowerIds = flowers.map((f) => f.id)
    const greeneryIds = (greenery || []).map((g) => g.id)

    const [flowersRes, greeneryRes, containerRes] = await Promise.all([
        supabase.from('flower_types').select('id, name').in('id', flowerIds),
        greeneryIds.length
            ? supabase.from('greenery_options').select('id, name').in('id', greeneryIds)
            : Promise.resolve({ data: [] }),
        containerId
            ? supabase.from('vase_options').select('id, name, container_type').eq('id', containerId).single()
            : Promise.resolve({ data: null }),
    ])

    if (!flowersRes.data || flowersRes.data.length === 0) {
        return NextResponse.json({ error: 'Invalid flower selection' }, { status: 400 })
    }

    const flowerDesc = flowers
        .map((f) => {
            const name = flowersRes.data!.find((fl) => fl.id === f.id)?.name || 'flower'
            return `${f.qty} ${name}`
        })
        .join(', ')

    const greeneryDesc = (greenery || [])
        .map((g) => {
            const name = (greeneryRes.data as { id: string; name: string }[] | null)?.find((gr) => gr.id === g.id)?.name
            return name ? `${g.qty} ${name}` : null
        })
        .filter(Boolean)
        .join(', ')

    const containerType = (containerRes.data as { container_type?: string } | null)?.container_type
    const containerDesc = containerType ? CONTAINER_PROMPT_LABELS[containerType] || 'a bouquet wrap' : 'a bouquet wrap'

    const prompt = `A stunning floral bouquet featuring ${flowerDesc}${greeneryDesc ? ` with ${greeneryDesc}` : ''}, arranged in ${containerDesc}, professional florist photography, soft natural lighting, elegant, high resolution, vibrant colors, minimal background`

    // ── التوليد عبر Pollinations مع مهلة زمنية (timeout) لتفادي انتظار لا نهائي ──
    const seed = Math.floor(Math.random() * 1000000)
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&seed=${seed}&nologo=true`

    let imageBuffer: ArrayBuffer
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 25000) // 25 ثانية حد أقصى
        const imgResponse = await fetch(pollinationsUrl, { signal: controller.signal })
        clearTimeout(timeout)

        if (!imgResponse.ok) throw new Error('Generation failed')
        imageBuffer = await imgResponse.arrayBuffer()
    } catch (err) {
        console.error('[atelier/generate-preview] Fetch error:', err)
        return NextResponse.json({ error: 'تعذر توليد الصورة، حاول مرة أخرى' }, { status: 502 })
    }

    // ── إعادة ترميز الصورة بصيغة JPEG قياسية نظيفة، يضمن توافقها مع next/image optimizer ──
    let normalizedBuffer: Buffer
    try {
        normalizedBuffer = await sharp(Buffer.from(imageBuffer))
            .jpeg({ quality: 90 })
            .toBuffer()
    } catch (err) {
        console.error('[atelier/generate-preview] Image normalization failed:', err)
        return NextResponse.json({ error: 'تعذر معالجة الصورة، حاول مرة أخرى' }, { status: 502 })
    }

    // ── رفع فوري للتخزين الدائم (Supabase Storage) ──
    const fileName = `preview-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error: uploadError } = await serviceClient.storage
        .from('atelier-previews')
        .upload(fileName, normalizedBuffer, { contentType: 'image/jpeg', upsert: false })

    if (uploadError) {
        console.error('[atelier/generate-preview] Upload error:', uploadError)
        return NextResponse.json({ error: 'فشل حفظ الصورة' }, { status: 500 })
    }

    const { data: { publicUrl } } = serviceClient.storage.from('atelier-previews').getPublicUrl(fileName)

    // ── تسجيل الاستخدام (هذا هو الحد الحقيقي، غير قابل للتحايل) ──
    await serviceClient.from('ai_generation_logs').insert({ identifier })

    return NextResponse.json({
        imageUrl: publicUrl,
        remaining: DAILY_LIMIT - usedCount - 1,
    })
}
