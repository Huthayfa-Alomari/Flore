import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const RecipientAddressSchema = z.object({
    token: z.string().uuid(),
    address: z.string().min(5).max(500),
    region: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = RecipientAddressSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { token, address, region } = parsed.data
    const serviceClient = createServiceClient()

    const { data: order } = await serviceClient
        .from('orders')
        .select('id, awaiting_recipient_address')
        .eq('recipient_address_token', token)
        .single()

    if (!order) {
        return NextResponse.json({ error: 'رابط غير صالح' }, { status: 404 })
    }

    if (!order.awaiting_recipient_address) {
        return NextResponse.json({ error: 'تم إدخال العنوان مسبقاً لهذا الطلب' }, { status: 400 })
    }

    const { error } = await serviceClient
        .from('orders')
        .update({
            delivery_address: address,
            delivery_region: region || null,
            awaiting_recipient_address: false,
            status: 'pending', // ✅ هلق يبدأ التجهيز فعلياً
            updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

    if (error) {
        console.error('[recipient-address] Update error:', error)
        return NextResponse.json({ error: 'فشل حفظ العنوان' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}