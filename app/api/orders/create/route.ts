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
    greenery: z.array(z.object({
        id: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
    })).max(30).optional(),
    wrapId: z.string().uuid().nullable().optional(),
    vaseId: z.string().uuid().nullable().optional(),
    sizeKey: z.string().max(50).optional(),
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
    delivery_address: z.string().min(5).max(500).optional(),
    awaiting_recipient_address: z.boolean().optional(),
    recipient_name: z.string().max(100).optional(),
    recipient_phone: z.string().min(10).max(20).optional(),
    delivery_region: z.string().max(100).optional().nullable(),
    delivery_notes: z.string().max(500).optional().nullable(),
    delivery_date: z.string().datetime().optional(),
    gift_message: z.string().max(500).optional().nullable(),
    delivery_time_slot: z.string().max(50).optional().nullable(),
    is_anonymous_gift: z.boolean().optional(),
    payment_method: z.enum(['whatsapp', 'cliq', 'cash', 'card']),
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
        delivery_time_slot,
        is_anonymous_gift,
        awaiting_recipient_address,
        recipient_name,
        recipient_phone,
        payment_method,
    } = parsed.data

    if (awaiting_recipient_address) {
        if (!recipient_name || !recipient_phone) {
            return NextResponse.json(
                { error: 'Recipient name and phone are required when requesting their address' },
                { status: 400 }
            )
        }
    } else if (!delivery_address) {
        return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
    }

    const realItems = items.filter((i) => !isCustomItem(i.product_id))
    const customItems = items.filter((i) => isCustomItem(i.product_id))

    for (const item of customItems) {
        if (!item.bouquet_selection) {
            return NextResponse.json(
                { error: 'Custom bouquet items require bouquet_selection' },
                { status: 400 }
            )
        }
    }

    // ---- تحقق المنتجات العادية ----
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

    // ---- تحقق وحساب الباقات المخصصة من قاعدة البيانات مباشرة ----
    type FlowerRow = { id: string; name: string; name_ar: string | null; price: number; image: string | null; in_stock: boolean }
    type GreeneryRow = { id: string; name: string; name_ar: string | null; price: number; in_stock: boolean }
    type ContainerRow = { id: string; name: string; name_ar: string | null; price: number; in_stock: boolean }
    type SizeRow = { key: string; label_ar: string; price_multiplier: number }

    let flowerMap = new Map<string, FlowerRow>()
    let greeneryMap = new Map<string, GreeneryRow>()
    let containerMap = new Map<string, ContainerRow>()
    let sizeMap = new Map<string, SizeRow>()

    if (customItems.length > 0) {
        const allFlowerIds = Array.from(new Set(
            customItems.flatMap((i) => i.bouquet_selection!.flowers.map((f) => f.id))
        ))
        const allGreeneryIds = Array.from(new Set(
            customItems.flatMap((i) => i.bouquet_selection!.greenery?.map((g) => g.id) || [])
        ))
        // ملاحظة: vaseId يمثل الآن "الحاوية الموحّدة" (سلة/مزهرية/تغليف/صندوق) — نقرأها من vase_options
        const allContainerIds = Array.from(new Set(
            customItems.map((i) => i.bouquet_selection!.vaseId).filter((id): id is string => !!id)
        ))
        const allSizeKeys = Array.from(new Set(
            customItems.map((i) => i.bouquet_selection!.sizeKey).filter((k): k is string => !!k)
        ))

        const [flowersRes, greeneryRes, containersRes, sizesRes] = await Promise.all([
            allFlowerIds.length
                ? supabase.from('flower_types').select('id, name, name_ar, price, image, in_stock').in('id', allFlowerIds)
                : Promise.resolve({ data: [], error: null }),
            allGreeneryIds.length
                ? supabase.from('greenery_options').select('id, name, name_ar, price, in_stock').in('id', allGreeneryIds)
                : Promise.resolve({ data: [], error: null }),
            allContainerIds.length
                ? supabase.from('vase_options').select('id, name, name_ar, price, in_stock').in('id', allContainerIds)
                : Promise.resolve({ data: [], error: null }),
            allSizeKeys.length
                ? supabase.from('bouquet_sizes').select('key, label_ar, price_multiplier').in('key', allSizeKeys)
                : Promise.resolve({ data: [], error: null }),
        ])

        if (flowersRes.error || greeneryRes.error || containersRes.error || sizesRes.error) {
            console.error(
                '[orders/create] Bouquet ingredients fetch error:',
                flowersRes.error, greeneryRes.error, containersRes.error, sizesRes.error
            )
            return NextResponse.json({ error: 'Failed to verify bouquet ingredients' }, { status: 500 })
        }

        flowerMap = new Map((flowersRes.data as FlowerRow[]).map((f) => [f.id, f]))
        greeneryMap = new Map((greeneryRes.data as GreeneryRow[]).map((g) => [g.id, g]))
        containerMap = new Map((containersRes.data as ContainerRow[]).map((c) => [c.id, c]))
        sizeMap = new Map((sizesRes.data as SizeRow[]).map((s) => [s.key, s]))

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
            for (const g of item.bouquet_selection!.greenery || []) {
                const greenery = greeneryMap.get(g.id)
                if (!greenery) {
                    return NextResponse.json({ error: `Greenery ${g.id} not found` }, { status: 400 })
                }
                if (!greenery.in_stock) {
                    return NextResponse.json({ error: `Greenery "${greenery.name}" is out of stock` }, { status: 400 })
                }
            }
            const containerId = item.bouquet_selection!.vaseId
            if (containerId) {
                const container = containerMap.get(containerId)
                if (!container) {
                    return NextResponse.json({ error: `Container ${containerId} not found` }, { status: 400 })
                }
                if (!container.in_stock) {
                    return NextResponse.json({ error: `Container "${container.name}" is out of stock` }, { status: 400 })
                }
            }
            const sizeKey = item.bouquet_selection!.sizeKey
            if (sizeKey && !sizeMap.has(sizeKey)) {
                return NextResponse.json({ error: `Bouquet size "${sizeKey}" not found` }, { status: 400 })
            }
        }
    }

    function computeCustomBouquetPrice(selection: NonNullable<typeof customItems[number]['bouquet_selection']>) {
        const flowersPrice = selection.flowers.reduce((sum, f) => {
            const flower = flowerMap.get(f.id)!
            return sum + flower.price * f.qty
        }, 0)
        const greeneryPrice = (selection.greenery || []).reduce((sum, g) => {
            const item = greeneryMap.get(g.id)!
            return sum + item.price * g.qty
        }, 0)
        const containerPrice = selection.vaseId ? (containerMap.get(selection.vaseId)?.price || 0) : 0
        const multiplier = selection.sizeKey ? (sizeMap.get(selection.sizeKey)?.price_multiplier || 1) : 1
        return (flowersPrice + greeneryPrice + containerPrice) * multiplier
    }

    function buildCustomBouquetDisplay(selection: NonNullable<typeof customItems[number]['bouquet_selection']>) {
        const flowerNames = selection.flowers.map((f) => {
            const flower = flowerMap.get(f.id)!
            return `${flower.name_ar || flower.name} ×${f.qty}`
        }).join('، ')
        const greeneryNames = (selection.greenery || []).map((g) => {
            const item = greeneryMap.get(g.id)!
            return `${item.name_ar || item.name} ×${g.qty}`
        }).join('، ')
        const container = selection.vaseId ? containerMap.get(selection.vaseId) : null
        const size = selection.sizeKey ? sizeMap.get(selection.sizeKey) : null
        const name = `باقة مخصصة — ${flowerNames}`
        const image = flowerMap.get(selection.flowers[0].id)?.image || ''
        return {
            name,
            image,
            containerName: container?.name_ar || container?.name || '',
            greeneryNames,
            sizeLabel: size?.label_ar || '',
        }
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
                    wrap: display.greeneryNames,
                    vase: `${display.containerName}${display.sizeLabel ? ` — ${display.sizeLabel}` : ''}`,
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
        delivery_address: delivery_address || null,
        delivery_region: delivery_region || null,
        delivery_notes: delivery_notes || null,
        delivery_date: delivery_date || null,
        gift_message: gift_message || null,
        delivery_time_slot: delivery_time_slot || null,
        is_anonymous_gift: is_anonymous_gift || false,
        awaiting_recipient_address: awaiting_recipient_address || false,
        recipient_name: recipient_name || null,
        recipient_phone: recipient_phone || null,
        payment_method,
        payment_status: 'pending',
        status: awaiting_recipient_address ? 'awaiting_address' : 'pending',
        total,
        items: orderItems,
    }

    let orderResult
    if (user?.id) {
        orderResult = await supabase.from('orders').insert(orderData).select('id, recipient_address_token').single()
    } else {
        const serviceClient = createServiceClient()
        orderResult = await serviceClient.from('orders').insert(orderData).select('id, recipient_address_token').single()
    }

    if (orderResult.error) {
        console.error('[orders/create] Insert error:', orderResult.error)
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    return NextResponse.json({
        orderId: orderResult.data.id,
        total,
        recipientAddressToken: orderResult.data.recipient_address_token,
    })
}