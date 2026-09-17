import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreatePaymentSchema = z.object({
    orderId: z.string().uuid(),
    trackingToken: z.string().min(16).max(256).optional(),
})

function hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    const authClient = createClient()
    const serviceClient = createServiceClient()
    const { data: { user } } = await authClient.auth.getUser()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreatePaymentSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: 'بيانات الدفع غير صالحة' }, { status: 400 })
    }

    const { orderId, trackingToken } = parsed.data
    const { data: order } = await serviceClient
        .from('orders')
        .select('total,user_id,customer_phone,customer_name,payment_status,delivery_region,tracking_token_hash')
        .eq('id', orderId)
        .single()

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const signedInOwner = Boolean(user?.id && order.user_id === user.id)
    const guestOwner = Boolean(
        !order.user_id &&
        trackingToken &&
        order.tracking_token_hash &&
        hashToken(trackingToken) === order.tracking_token_hash
    )

    if (!signedInOwner && !guestOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
    }

    const serverKey = process.env.PAYTABS_SERVER_KEY
    const profileId = Number(process.env.PAYTABS_PROFILE_ID)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    if (!serverKey || !profileId || !appUrl.startsWith('http')) {
        return NextResponse.json({ error: 'بوابة الدفع غير مهيأة بالكامل' }, { status: 500 })
    }

    const ptResponse = await fetch('https://secure-jordan.paytabs.com/payment/request', {
        method: 'POST',
        headers: {
            Authorization: serverKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profile_id: profileId,
            tran_type: 'sale',
            tran_class: 'ecom',
            cart_id: orderId,
            cart_description: `FLORÉ Order #${orderId.slice(0, 8)}`,
            cart_currency: 'JOD',
            cart_amount: Number(order.total),
            callback: `${appUrl}/api/payment/paytabs/callback`,
            return: `${appUrl}/api/payment/paytabs/return`,
            customer_details: {
                name: order.customer_name || 'FLORÉ Customer',
                email: `${order.customer_phone}@floreguest.jo`,
                phone: order.customer_phone,
                street1: 'N/A',
                city: order.delivery_region || 'Amman',
                country: 'JO',
                ip: getClientIp(request),
            },
        }),
        cache: 'no-store',
    })

    const result = await ptResponse.json()
    if (!ptResponse.ok || result.code) {
        console.error('[paytabs/create] Error:', result)
        return NextResponse.json({ error: result.message || 'فشل بدء عملية الدفع' }, { status: 400 })
    }

    if (result.redirect_url) {
        return NextResponse.json({ redirectUrl: result.redirect_url })
    }

    if (result.payment_result?.response_status === 'A') {
        return NextResponse.json({ success: true, transactionRef: result.tran_ref })
    }

    return NextResponse.json({ error: 'استجابة غير متوقعة من بوابة الدفع' }, { status: 502 })
}
