import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// التحقق من وجود المفاتيح السرية لتفادي انهيار التطبيق وقت التشغيل
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// الإعداد المحدث المتوافق مع الـ Types لديك:
const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
    : null

export async function POST(request: NextRequest) {
    if (!stripe || !stripeWebhookSecret) {
        console.error('[stripe/webhook] Stripe environment variables are missing')
        return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 })
    }

    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature') || ''

    let event: Stripe.Event

    // 1. التحقق من أصالة الإشارة (Signature Verification) القادمة من Stripe
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret)
    } catch (err: any) {
        console.error(`[stripe/webhook] Signature verification failed: ${err.message}`)
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
    }

    const supabase = createServiceClient()

    try {
        switch (event.type) {
            // حالة: إتمام عملية الدفع بنجاح عبر Stripe Checkout
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session
                const orderId = session.metadata?.orderId

                if (!orderId) {
                    console.error('[stripe/webhook] Missing orderId in session metadata')
                    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
                }

                // الحماية من التكرار (Idempotency): جلب حالة الطلب الحالية
                const { data: currentOrder } = await supabase
                    .from('orders')
                    .select('payment_status, total')
                    .eq('id', orderId)
                    .single()

                if (!currentOrder) {
                    console.error(`[stripe/webhook] Order ${orderId} not found`)
                    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
                }

                if (currentOrder.payment_status === 'paid') {
                    console.log(`[stripe/webhook] Order ${orderId} is already marked as paid. Skipping.`)
                    return NextResponse.json({ received: true })
                }

                // التحقق من تطابق المبلغ المدفوع فعليًا مع إجمالي الطلب المخزّن (طبقة حماية إضافية
                // حتى لو استُغلت ثغرة ما لإنشاء جلسة بمبلغ مغاير). الدينار الأردني = 1000 فلس.
                const expectedAmount = Math.round(currentOrder.total * 1000)
                const receivedAmount = session.amount_total

                if (expectedAmount !== receivedAmount) {
                    console.error(`[stripe/webhook] Amount mismatch for order ${orderId}: expected ${expectedAmount}, received ${receivedAmount}`)
                    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
                }

                // تحديث حالة الطلب إلى "مدفوع" ونقله لقسم التنسيق داخل الأتيليه
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({
                        payment_status: 'paid',
                        status: 'arranging',
                        stripe_session_id: session.id,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', orderId)

                if (updateError) {
                    console.error(`[stripe/webhook] DB Update failed for order ${orderId}:`, updateError)
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
                }

                console.log(`[stripe/webhook] Successfully processed paid order: ${orderId}`)
                break
            }

            // حالات: انتهاء صلاحية الجلسة أو فشل عملية الدفع الفعلي
            case 'checkout.session.expired':
            case 'payment_intent.payment_failed': {
                const obj = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent
                const orderId = obj.metadata?.orderId

                if (orderId) {
                    // التحقق من أن الطلب لم يُدفع مسبقاً عبر وسيلة أخرى لتفادي تضارب البيانات
                    const { data: currentOrder } = await supabase
                        .from('orders')
                        .select('payment_status')
                        .eq('id', orderId)
                        .single()

                    if (currentOrder && currentOrder.payment_status !== 'paid') {
                        await supabase
                            .from('orders')
                            .update({
                                payment_status: 'failed',
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', orderId)

                        console.log(`[stripe/webhook] Order ${orderId} marked as failed due to ${event.type}`)
                    }
                }
                break
            }

            default:
                console.log(`[stripe/webhook] Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true, type: event.type })

    } catch (error) {
        console.error('[stripe/webhook] Unexpected runtime runtime error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}