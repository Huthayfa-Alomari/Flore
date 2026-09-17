import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { calculateAtelierPrice } from '@/lib/atelier/pricing'
import type { QuantityMap } from '@/lib/atelier/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CustomizationSchema = z.object({
  flowers: z.array(z.string()).optional(),
  greenery: z.array(z.string()).optional(),
  container: z.string().optional(),
  wrap: z.string().optional(),
  vase: z.string().optional(),
  message: z.string().max(500).optional(),
}).optional().nullable()

const SelectionItemSchema = z.object({
  id: z.string().uuid(),
  qty: z.number().int().min(1).max(50),
})

const BouquetSelectionSchema = z.object({
  flowers: z.array(SelectionItemSchema).min(1).max(30),
  greenery: z.array(SelectionItemSchema).max(30).optional().default([]),
  containerId: z.string().uuid().nullable().optional(),
  sizeKey: z.string().max(50).optional(),
  // Legacy persisted-cart fields; normalized on the server.
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
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().trim().min(10).max(20),
  customer_email: z.string().email().optional(),
  delivery_address: z.string().trim().min(5).max(500).optional(),
  awaiting_recipient_address: z.boolean().optional(),
  recipient_name: z.string().trim().max(100).optional(),
  recipient_phone: z.string().trim().min(10).max(20).optional(),
  delivery_region: z.string().max(100).optional().nullable(),
  delivery_notes: z.string().max(500).optional().nullable(),
  delivery_date: z.string().datetime().optional(),
  gift_message: z.string().max(500).optional().nullable(),
  delivery_time_slot: z.string().max(50).optional().nullable(),
  is_anonymous_gift: z.boolean().optional(),
  payment_method: z.enum(['whatsapp', 'cliq', 'cash', 'card']),
})

type FlowerRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
}

type GreeneryRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  in_stock: boolean
}

type ContainerRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  in_stock: boolean
}

type SizeRow = {
  key: string
  label_ar: string
  stem_count: number
  price_multiplier: number
}

function isCustomItem(productId: string) {
  return productId.startsWith('custom-')
}

function quantityMap(items: Array<{ id: string; qty: number }>): QuantityMap {
  return Object.fromEntries(items.map(item => [item.id, item.qty]))
}

function selectionContainerId(selection: z.infer<typeof BouquetSelectionSchema>) {
  return selection.containerId || selection.vaseId || selection.wrapId || null
}

function createTrackingToken() {
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 })
  }

  const parsed = CreateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'راجع بيانات الطلب والحقول المطلوبة.' }, { status: 400 })
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
      return NextResponse.json({ error: 'اسم ورقم المستلم مطلوبان لطلب العنوان منه.' }, { status: 400 })
    }
  } else if (!delivery_address) {
    return NextResponse.json({ error: 'عنوان التوصيل مطلوب.' }, { status: 400 })
  }

  const authClient = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await authClient.auth.getUser()

  const realItems = items.filter(item => !isCustomItem(item.product_id))
  const customItems = items.filter(item => isCustomItem(item.product_id))

  for (const item of customItems) {
    if (!item.bouquet_selection) {
      return NextResponse.json({ error: 'الباقة المخصصة تحتاج تفاصيل التصميم.' }, { status: 400 })
    }
  }

  const productIds = Array.from(new Set(realItems.map(item => item.product_id)))
  const { data: productRows, error: productError } = productIds.length
    ? await serviceClient.from('products').select('id,price,in_stock,name,image').in('id', productIds)
    : { data: [], error: null }

  if (productError) {
    console.error('[orders/create] product lookup failed', productError)
    return NextResponse.json({ error: 'تعذر التحقق من المنتجات.' }, { status: 500 })
  }

  const productMap = new Map(
    (productRows || []).map(product => [product.id, { ...product, price: Number(product.price) }])
  )

  for (const item of realItems) {
    const product = productMap.get(item.product_id)
    if (!product) return NextResponse.json({ error: 'أحد المنتجات لم يعد موجودًا.' }, { status: 400 })
    if (!product.in_stock) return NextResponse.json({ error: `المنتج «${product.name}» غير متوفر الآن.` }, { status: 409 })
  }

  const customSelections = customItems.map(item => item.bouquet_selection!)
  const flowerIds = Array.from(new Set(customSelections.flatMap(selection => selection.flowers.map(item => item.id))))
  const greeneryIds = Array.from(new Set(customSelections.flatMap(selection => selection.greenery.map(item => item.id))))
  const containerIds = Array.from(new Set(customSelections.map(selectionContainerId).filter((id): id is string => Boolean(id))))

  const [flowersRes, greeneryRes, containersRes, sizesRes] = await Promise.all([
    flowerIds.length
      ? serviceClient.from('flower_types').select('id,name,name_ar,price,image,in_stock').in('id', flowerIds)
      : Promise.resolve({ data: [], error: null }),
    greeneryIds.length
      ? serviceClient.from('greenery_options').select('id,name,name_ar,price,in_stock').in('id', greeneryIds)
      : Promise.resolve({ data: [], error: null }),
    containerIds.length
      ? serviceClient.from('vase_options').select('id,name,name_ar,price,in_stock').in('id', containerIds)
      : Promise.resolve({ data: [], error: null }),
    customItems.length
      ? serviceClient.from('bouquet_sizes').select('key,label_ar,stem_count,price_multiplier')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (flowersRes.error || greeneryRes.error || containersRes.error || sizesRes.error) {
    console.error('[orders/create] atelier lookup failed', {
      flowers: flowersRes.error,
      greenery: greeneryRes.error,
      containers: containersRes.error,
      sizes: sizesRes.error,
    })
    return NextResponse.json({ error: 'تعذر التحقق من تصميم الباقة.' }, { status: 500 })
  }

  const flowerMap = new Map(
    ((flowersRes.data || []) as FlowerRow[]).map(item => [item.id, { ...item, price: Number(item.price) }])
  )
  const greeneryMap = new Map(
    ((greeneryRes.data || []) as GreeneryRow[]).map(item => [item.id, { ...item, price: Number(item.price) }])
  )
  const containerMap = new Map(
    ((containersRes.data || []) as ContainerRow[]).map(item => [item.id, { ...item, price: Number(item.price) }])
  )
  const sizeMap = new Map(
    ((sizesRes.data || []) as SizeRow[]).map(item => [item.key, {
      ...item,
      stem_count: Number(item.stem_count),
      price_multiplier: Number(item.price_multiplier),
    }])
  )

  function resolveSize(selection: z.infer<typeof BouquetSelectionSchema>) {
    if (selection.sizeKey) return sizeMap.get(selection.sizeKey) || null
    const selectedCount = selection.flowers.reduce((sum, flower) => sum + flower.qty, 0)
    return Array.from(sizeMap.values()).find(size => size.stem_count === selectedCount) || null
  }

  for (const selection of customSelections) {
    for (const selected of selection.flowers) {
      const flower = flowerMap.get(selected.id)
      if (!flower) return NextResponse.json({ error: 'إحدى الزهور غير موجودة.' }, { status: 400 })
      if (!flower.in_stock) return NextResponse.json({ error: `الزهرة «${flower.name_ar || flower.name}» نفدت من المخزون.` }, { status: 409 })
    }
    for (const selected of selection.greenery) {
      const item = greeneryMap.get(selected.id)
      if (!item) return NextResponse.json({ error: 'إحدى اللمسات الخضراء غير موجودة.' }, { status: 400 })
      if (!item.in_stock) return NextResponse.json({ error: `«${item.name_ar || item.name}» غير متوفر الآن.` }, { status: 409 })
    }

    const containerId = selectionContainerId(selection)
    if (containerId) {
      const container = containerMap.get(containerId)
      if (!container) return NextResponse.json({ error: 'طريقة التقديم غير موجودة.' }, { status: 400 })
      if (!container.in_stock) return NextResponse.json({ error: 'طريقة التقديم المختارة لم تعد متاحة.' }, { status: 409 })
    }

    const size = resolveSize(selection)
    if (!size) return NextResponse.json({ error: 'حجم الباقة غير صالح. أعد فتح الأتيليه وحدد الحجم.' }, { status: 400 })
    const stemCount = selection.flowers.reduce((sum, flower) => sum + flower.qty, 0)
    if (stemCount !== size.stem_count) {
      return NextResponse.json({ error: `حجم «${size.label_ar}» يحتاج ${size.stem_count} ساق، بينما التصميم يحتوي ${stemCount}.` }, { status: 400 })
    }
  }

  function computeCustomPrice(selection: z.infer<typeof BouquetSelectionSchema>) {
    const size = resolveSize(selection)!
    const containerId = selectionContainerId(selection)
    const container = containerId ? containerMap.get(containerId) || null : null
    return calculateAtelierPrice({
      flowers: Array.from(flowerMap.values()),
      flowerQuantities: quantityMap(selection.flowers),
      greenery: Array.from(greeneryMap.values()),
      greeneryQuantities: quantityMap(selection.greenery),
      container,
      size,
    }).total
  }

  const orderItems = [
    ...realItems.map(item => {
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
    ...customItems.map(item => {
      const selection = item.bouquet_selection!
      const size = resolveSize(selection)!
      const containerId = selectionContainerId(selection)
      const container = containerId ? containerMap.get(containerId) || null : null
      const flowerLabels = selection.flowers.map(selected => {
        const flower = flowerMap.get(selected.id)!
        return `${flower.name_ar || flower.name} ×${selected.qty}`
      })
      const greeneryLabels = selection.greenery.map(selected => {
        const option = greeneryMap.get(selected.id)!
        return `${option.name_ar || option.name} ×${selected.qty}`
      })
      const containerName = container?.name_ar || container?.name || ''
      return {
        product_id: item.product_id,
        name: `باقة FLORÉ مخصصة — ${size.label_ar}`,
        image: flowerMap.get(selection.flowers[0].id)?.image || '',
        price: computeCustomPrice(selection),
        qty: item.qty,
        customization: {
          flowers: flowerLabels,
          greenery: greeneryLabels,
          container: containerName,
          wrap: containerName,
          vase: `${containerName}${containerName ? ' — ' : ''}${size.label_ar}`,
          message: item.customization?.message || '',
        },
      }
    }),
  ]

  const total = Math.round(orderItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100
  const tracking = createTrackingToken()

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
    tracking_token_hash: tracking.hash,
  }

  const { data: order, error: insertError } = await serviceClient
    .from('orders')
    .insert(orderData)
    .select('id,recipient_address_token')
    .single()

  if (insertError || !order) {
    console.error('[orders/create] insert failed', insertError)
    return NextResponse.json({ error: 'تعذر إنشاء الطلب. لم يتم الخصم أو الدفع.' }, { status: 500 })
  }

  return NextResponse.json({
    orderId: order.id,
    total,
    recipientAddressToken: order.recipient_address_token,
    trackingToken: tracking.token,
  })
}
