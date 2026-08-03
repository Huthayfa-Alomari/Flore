import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CreatePaymentSchema = z.object({
    orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreatePaymentSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { orderId } = parsed.data

    // نجيب مبلغ الطلب الحقيقي من قاعدة البيانات — أبداً لا نثق بمبلغ من المتصفح
    const { data: order } = await supabase
        .from('orders')
        .select('total, user_id, customer_phone, customer_name, payment_status')
        .eq('id', orderId)
        .single()

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id && order.user_id !== user?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.payment_status === 'paid') {
        return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    const ptResponse = await fetch('https://secure-jordan.paytabs.com/payment/request', {
        method: 'POST',
        headers: {
            'Authorization': process.env.PAYTABS_SERVER_KEY!,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profile_id: Number(process.env.PAYTABS_PROFILE_ID),
            tran_type: 'sale',
            tran_class: 'ecom',
            cart_id: orderId,
            cart_description: `FLORÉ Order #${orderId.slice(0, 8)}`,
            cart_currency: 'JOD',
            cart_amount: order.total,
            callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/paytabs/callback`,
            return: `${process.env.NEXT_PUBLIC_APP_URL}/tracking/${orderId}`,
            customer_details: {
                name: order.customer_name || 'Floré Customer',
                email: `${order.customer_phone}@floreguest.jo`,
                phone: order.customer_phone,
                street1: 'N/A',
                city: 'Amman',
                country: 'JO',
                ip: getClientIp(request),
            },
        }),
    })

    const result = await ptResponse.json()

    if (result.code) {
        // استجابة فيها "code" و"message" تعني خطأ حسب توثيق PayTabs
        console.error('[paytabs/create] Error:', result)
        return NextResponse.json({ error: result.message || 'فشل بدء عملية الدفع' }, { status: 400 })
    }

    if (result.redirect_url) {
        // العميل محتاج يتم تحويله (مثلاً 3D Secure) — هذا المسار الأشيع والأبسط
        return NextResponse.json({ redirectUrl: result.redirect_url })
    }

    if (result.payment_result?.response_status === 'A') {
        // نادراً ما يصير هيك بدون redirect، بس تحسباً
        return NextResponse.json({ success: true, transactionRef: result.tran_ref })
    }

    return NextResponse.json({ error: 'استجابة غير متوقعة من بوابة الدفع' }, { status: 500 })
}