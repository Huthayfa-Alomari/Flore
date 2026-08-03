import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const ChargeSchema = z.object({
    orderId: z.string().uuid(),
    paymentToken: z.string().min(10),
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

    const parsed = ChargeSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { orderId, paymentToken } = parsed.data

    // نجيب مبلغ الطلب الحقيقي من قاعدة البيانات — أبداً لا نثق بمبلغ من المتصفح
    const { data: order } = await supabase
        .from('orders')
        .select('total, user_id, customer_phone, payment_status')
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

    // ⚠️ رابط الـ API هذا افتراضي (NMI الأصلية) — تأكد من الجهة إذا لازم رابط مختلف
    const nmiResponse = await fetch('https://secure.nmi.com/api/transact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            security_key: process.env.NMI_SERVER_KEY!,
            type: 'sale',
            payment_token: paymentToken,
            amount: order.total.toFixed(2),
            orderid: orderId,
        }),
    })

    const text = await nmiResponse.text()
    const result = Object.fromEntries(new URLSearchParams(text))

    // response=1 يعني نجاح حسب توثيق NMI القياسي
    if (result.response !== '1') {
        console.error('[nmi/charge] Declined:', result)
        return NextResponse.json(
            { error: result.responsetext || 'فشلت عملية الدفع، تحقق من بيانات البطاقة' },
            { status: 400 }
        )
    }

    const serviceClient = createServiceClient()
    const { error: updateError } = await serviceClient
        .from('orders')
        .update({
            payment_status: 'paid',
            payment_transaction_id: result.transactionid || null,
            payment_method: 'card',
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (updateError) {
        console.error('[nmi/charge] Order update error:', updateError)
        // الدفع نجح فعلياً بس فشل تحديث القاعدة — هذا يحتاج تدخل يدوي فوري منك
        return NextResponse.json(
            { error: 'تم الدفع بنجاح لكن حدث خطأ بتحديث الطلب، يرجى التواصل معنا فوراً' },
            { status: 500 }
        )
    }

    return NextResponse.json({ success: true, transactionId: result.transactionid })
}