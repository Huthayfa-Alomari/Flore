import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CustomizationSchema = z.object({
    flowers: z.array(z.string()).optional(),
    wrap: z.string().optional(),
    vase: z.string().optional(),
    message: z.string().optional(),
}).optional().nullable()

const BouquetSelectionSchema = z.object({
    flowers: z.array(z.object({
        id: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
    })).min(1).max(30),
    wrapId: z.string().uuid().nullable().optional(),
    vaseId: z.string().uuid().nullable().optional(),
})

const OrderItemSchema = z.object({
    product_id: z.string().min(1),
    qty: z.number().int().min(1).max(99),
    customization: CustomizationSchema,
    bouquet_selection: BouquetSelectionSchema.optional(),
})

const CreateOrderSchema = z.object({
    items: z.array(OrderItemSchema).min(1).max(50),
    customer_name: z.string().min(1).max(100),
    customer_phone: z.string().min(10).max(20),
    customer_email: z.string().email().optional(),
    delivery_address: z.string().min(5).max(500),
    delivery_region: z.string().max(100).optional().nullable(),
    delivery_notes: z.string().max(500).optional().nullable(),
    delivery_date: z.string().datetime().optional(),
    gift_message: z.string().max(500).optional().nullable(),
    payment_method: z.enum(['whatsapp', 'cliq', 'cash', 'stripe']),
})

function isCustomItem(productId: string) {
    return productId.startsWith('custom-')
}

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

    const realItems = items.filter((i) => !isCustomItem(i.product_id))
    const customItems = items.filter((i) => isCustomItem(i.product_id))

    // كل عنصر مخصص لازم يحمل bouquet_selection — بدون سعر أو اسم موثوق من المتصفح إطلاقاً
    for (const item of customItems) {
        if (!item.bouquet_selection) {
            return NextResponse.json(
                { error: 'Custom bouquet items require bouquet_selection' },
                { status: 400 }
            )
        }
    }

    // ---- تحقق المنتجات العادية (كما كان) ----
    let productMap = new Map<string, { id: string; price: number; in_stock: boolean; name: string; image: string }>()

    if (realItems.length > 0) {
        const productIds = realItems.map((i) => i.product_id)
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price, in_stock, name, image')
            .in('id', productIds)

        if (productsError || !products) {
            console.error('[orders/create] Product fetch error:', productsError)
            return NextResponse.json({ error: 'Failed to verify products' }, { status: 500 })
        }

        productMap = new Map(products.map((p) => [p.id, p]))

        for (const item of realItems) {
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
    }

    // ---- تحقق وحساب الباقات المخصصة من قاعدة البيانات مباشرة (المصدر الوحيد الموثوق للسعر) ----
    type FlowerRow = { id: string; name: string; name_ar: string | null; price: number; image: string | null; in_stock: boolean }
    type WrapRow = { id: string; name: string; name_ar: string | null; price: number; in_stock: boolean }
    type VaseRow = { id: string; name: string; name_ar: string | null; price: number; in_stock: boolean }

    let flowerMap = new Map<string, FlowerRow>()
    let wrapMap = new Map<string, WrapRow>()
    let vaseMap = new Map<string, VaseRow>()

    if (customItems.length > 0) {
        const allFlowerIds = Array.from(new Set(
            customItems.flatMap((i) => i.bouquet_selection!.flowers.map((f) => f.id))
        ))
        const allWrapIds = Array.from(new Set(
            customItems.map((i) => i.bouquet_selection!.wrapId).filter((id): id is string => !!id)
        ))
        const allVaseIds = Array.from(new Set(
            customItems.map((i) => i.bouquet_selection!.vaseId).filter((id): id is string => !!id)
        ))

        const [flowersRes, wrapsRes, vasesRes] = await Promise.all([
            allFlowerIds.length
                ? supabase.from('flower_types').select('id, name, name_ar, price, image, in_stock').in('id', allFlowerIds)
                : Promise.resolve({ data: [], error: null }),
            allWrapIds.length
                ? supabase.from('wrap_options').select('id, name, name_ar, price, in_stock').in('id', allWrapIds)
                : Promise.resolve({ data: [], error: null }),
            allVaseIds.length
                ? supabase.from('vase_options').select('id, name, name_ar, price, in_stock').in('id', allVaseIds)
                : Promise.resolve({ data: [], error: null }),
        ])

        if (flowersRes.error || wrapsRes.error || vasesRes.error) {
            console.error('[orders/create] Bouquet ingredients fetch error:', flowersRes.error, wrapsRes.error, vasesRes.error)
            return NextResponse.json({ error: 'Failed to verify bouquet ingredients' }, { status: 500 })
        }

        flowerMap = new Map((flowersRes.data as FlowerRow[]).map((f) => [f.id, f]))
        wrapMap = new Map((wrapsRes.data as WrapRow[]).map((w) => [w.id, w]))
        vaseMap = new Map((vasesRes.data as VaseRow[]).map((v) => [v.id, v]))

        // تحقق وجود وتوفر كل عنصر مُختار
        for (const item of customItems) {
            for (const f of item.bouquet_selection!.flowers) {
                const flower = flowerMap.get(f.id)
                if (!flower) {
                    return NextResponse.json({ error: `Flower ${f.id} not found` }, { status: 400 })
                }
                if (!flower.in_stock) {
                    return NextResponse.json({ error: `Flower "${flower.name}" is out of stock` }, { status: 400 })
                }
            }
            const wrapId = item.bouquet_selection!.wrapId
            if (wrapId) {
                const wrap = wrapMap.get(wrapId)
                if (!wrap) {
                    return NextResponse.json({ error: `Wrap ${wrapId} not found` }, { status: 400 })
                }
                if (!wrap.in_stock) {
                    return NextResponse.json({ error: `Wrap "${wrap.name}" is out of stock` }, { status: 400 })
                }
            }
            const vaseId = item.bouquet_selection!.vaseId
            if (vaseId) {
                const vase = vaseMap.get(vaseId)
                if (!vase) {
                    return NextResponse.json({ error: `Vase ${vaseId} not found` }, { status: 400 })
                }
                if (!vase.in_stock) {
                    return NextResponse.json({ error: `Vase "${vase.name}" is out of stock` }, { status: 400 })
                }
            }
        }
    }

    // احتساب سعر الباقة المخصصة الواحدة بالكامل من بيانات السيرفر
    function computeCustomBouquetPrice(selection: NonNullable<typeof customItems[number]['bouquet_selection']>) {
        const flowersPrice = selection.flowers.reduce((sum, f) => {
            const flower = flowerMap.get(f.id)!
            return sum + flower.price * f.qty
        }, 0)
        const wrapPrice = selection.wrapId ? (wrapMap.get(selection.wrapId)?.price || 0) : 0
        const vasePrice = selection.vaseId ? (vaseMap.get(selection.vaseId)?.price || 0) : 0
        return flowersPrice + wrapPrice + vasePrice
    }

    function buildCustomBouquetDisplay(selection: NonNullable<typeof customItems[number]['bouquet_selection']>) {
        const flowerNames = selection.flowers.map((f) => {
            const flower = flowerMap.get(f.id)!
            return `${flower.name_ar || flower.name} ×${f.qty}`
        }).join('، ')
        const wrap = selection.wrapId ? wrapMap.get(selection.wrapId) : null
        const vase = selection.vaseId ? vaseMap.get(selection.vaseId) : null
        const name = `باقة مخصصة — ${flowerNames}`
        const image = flowerMap.get(selection.flowers[0].id)?.image || ''
        return { name, image, wrapName: wrap?.name_ar || wrap?.name || '', vaseName: vase?.name_ar || vase?.name || '' }
    }

    const total =
        realItems.reduce((sum, item) => {
            const product = productMap.get(item.product_id)!
            return sum + product.price * item.qty
        }, 0) +
        customItems.reduce((sum, item) => {
            const unitPrice = computeCustomBouquetPrice(item.bouquet_selection!)
            return sum + unitPrice * item.qty
        }, 0)

    const orderItems = [
        ...realItems.map((item) => {
            const product = productMap.get(item.product_id)!
            return {
                product_id: item.product_id,
                name: product.name,
                image: product.image || '',
                price: product.price,
                qty: item.qty,
                customization: item.customization || null,
            }
        }),
        ...customItems.map((item) => {
            const unitPrice = computeCustomBouquetPrice(item.bouquet_selection!)
            const display = buildCustomBouquetDisplay(item.bouquet_selection!)
            return {
                product_id: item.product_id,
                name: display.name,
                image: display.image,
                price: unitPrice,
                qty: item.qty,
                customization: {
                    flowers: item.bouquet_selection!.flowers.map((f) => {
                        const flower = flowerMap.get(f.id)!
                        return `${flower.name_ar || flower.name} ×${f.qty}`
                    }),
                    wrap: display.wrapName,
                    vase: display.vaseName,
                    message: item.customization?.message || '',
                },
            }
        }),
    ]

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

    let orderResult
    if (user?.id) {
        orderResult = await supabase.from('orders').insert(orderData).select('id').single()
    } else {
        const serviceClient = createServiceClient()
        orderResult = await serviceClient.from('orders').insert(orderData).select('id').single()
    }

    if (orderResult.error) {
        console.error('[orders/create] Insert error:', orderResult.error)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    return NextResponse.json({ orderId: orderResult.data.id, total })
}