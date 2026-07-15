import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const OrderItemSchema = z.object({
    product_id: z.string().uuid(),
    qty: z.number().int().min(1).max(99),
    customization: z.string().max(500).optional(),
})

const CreateOrderSchema = z.object({
    items: z.array(OrderItemSchema).min(1).max(50),
    customer_name: z.string().min(1).max(100),
    customer_phone: z.string().min(10).max(20),
    customer_email: z.string().email().optional(),
    delivery_address: z.string().min(5).max(500),
    delivery_region: z.string().max(100).optional(),
    delivery_notes: z.string().max(500).optional(),
    delivery_date: z.string().datetime().optional(),
    gift_message: z.string().max(500).optional(),
    payment_method: z.enum(['whatsapp', 'cliq', 'cash', 'stripe']),
})

export async function POST(request: NextRequest) {
    // حد المعدل: 10 طلبات إنشاء لكل دقيقة لكل IP — يمنع سكربتات إنشاء طلبات وهمية
    // مهم بشكل خاص هنا لأن الطلبات كضيف (بدون تسجيل) مسموحة عمدًا في هذا المسار
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createClient()

    // تم إزالة authError المعطلة لتجنب اعتراض TypeScript الصارم
    const { data: { user } } = await supabase.auth.getUser()

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CreateOrderSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const {
        items,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        delivery_region,
        delivery_notes,
        delivery_date,
        gift_message,
        payment_method,
    } = parsed.data

    // جلب المنتجات من الخادم للتحقق من الأسعار الحقيقية والأصلية (والاسم/الصورة لتخزينهما وقت الطلب)
    const productIds = items.map((i) => i.product_id)
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, price, in_stock, name, image')
        .in('id', productIds)

    if (productsError || !products) {
        console.error('[orders/create] Product fetch error:', productsError)
        return NextResponse.json({ error: 'Failed to verify products' }, { status: 500 })
    }

    // التحقق من توفر المنتجات في المخزن
    const productMap = new Map(products.map((p) => [p.id, p]))
    for (const item of items) {
        const product = productMap.get(item.product_id)
        if (!product) {
            return NextResponse.json(
                { error: `Product ${item.product_id} not found` },
                { status: 400 }
            )
        }
        if (!product.in_stock) {
            return NextResponse.json(
                { error: `Product "${product.name}" is out of stock` },
                { status: 400 }
            )
        }
    }

    // احتساب الإجمالي النهائي بشكل آمن ومستقل على السيرفر
    const total = items.reduce((sum, item) => {
        const product = productMap.get(item.product_id)!
        return sum + product.price * item.qty
    }, 0)

    // إعداد بيانات الطلب بأسعار الوقت الحالي — شكل موحّد يُستخدم في كل الكود:
    // { product_id, name, image, price, qty, customization }
    const orderItems = items.map((item) => {
        const product = productMap.get(item.product_id)!
        return {
            product_id: item.product_id,
            name: product.name,
            image: product.image || '',
            price: product.price,
            qty: item.qty,
            customization: item.customization || null,
        }
    })

    const orderData = {
        user_id: user?.id || null,
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        delivery_address,
        delivery_region: delivery_region || null,
        delivery_notes: delivery_notes || null,
        delivery_date: delivery_date || null,
        gift_message: gift_message || null,
        payment_method,
        payment_status: 'pending',
        status: 'pending',
        total,
        items: orderItems,
    }

    // إدراج الطلب في قاعدة البيانات بناءً على هوية العميل
    let orderResult
    if (user?.id) {
        // عميل مسجل — يتم إدخال البيانات عبر الصلاحيات العادية (RLS)
        orderResult = await supabase.from('orders').insert(orderData).select('id').single()
    } else {
        // زائر — يتم استخدام صلاحيات الخدمة العليا (Service Client) لإتمام العملية بأمان
        const serviceClient = createServiceClient()
        orderResult = await serviceClient.from('orders').insert(orderData).select('id').single()
    }

    if (orderResult.error) {
        console.error('[orders/create] Insert error:', orderResult.error)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    return NextResponse.json({ orderId: orderResult.data.id, total })
}