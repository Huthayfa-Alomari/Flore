import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

// تهيئة Stripe بشكل كسول (lazy) لتفادي انهيار البناء عند غياب المفتاح
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' })
    : null

export async function POST(request: Request) {
    try {
        if (!stripe) {
            return NextResponse.json({ error: 'Stripe configuration missing' }, { status: 500 })
        }

        const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
        if (rateLimitResponse) return rateLimitResponse

        const supabase = createClient()

        // 0. التحقق الصريح من هوية المستخدم (دفاع مضاعف بجانب RLS، وليس اعتمادًا عليها فقط)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { orderId, customerEmail } = await request.json()

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
        }

        // 1. جلب الطلب مع التحقق الصريح من الملكية (بجانب حماية RLS)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', user.id)
            .single()

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // منع إعادة دفع الطلبات المنتهية أو المدفوعة مسبقًا
        if (['delivered', 'cancelled'].includes(order.status) || order.payment_status === 'paid') {
            return NextResponse.json({ error: 'This order has already been processed or cancelled' }, { status: 400 })
        }

        // 2. الطلب يخزّن بيانات كل عنصر كاملة وقت إنشائه (الاسم والسعر عند الطلب)، فلا حاجة لأي join إضافي
        const orderItems = (order.items as { name: string; price: number; qty: number }[]) || []

        // 3. بناء الـ Line Items اعتمادًا على السعر المحفوظ وقت الطلب لا سعر المنتج الحالي،
        //    لضمان عدم تغيّر المبلغ عن السعر الذي وافق عليه العميل عند إنشاء الطلب
        const secureLineItems = orderItems.map((item) => {
            // 🚨 الدينار الأردني (JOD) عملة ثلاثية الخانات العشرية عند Stripe: نضرب في 1000 (فلس) لا 100
            const unitAmountInFils = Math.round(item.price * 1000)

            return {
                price_data: {
                    currency: 'jod',
                    product_data: {
                        name: item.name || 'باقة فاخرة من FLORÉ',
                    },
                    unit_amount: unitAmountInFils,
                },
                quantity: item.qty || 1,
            }
        })

        if (secureLineItems.length === 0) {
            return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
        }

        // 4. إنشاء جلسة الدفع الآمنة من Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: secureLineItems,
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order=${orderId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart?canceled=true`,
            customer_email: customerEmail || user.email || undefined,
            metadata: {
                orderId,
            },
        })

        return NextResponse.json({ sessionId: session.id, url: session.url })

    } catch (globalError: any) {
        console.error('Stripe Integration Error:', globalError.message)
        return NextResponse.json({
            error: 'Internal Server Error',
            details: globalError.message
        }, { status: 500 })
    }
}
