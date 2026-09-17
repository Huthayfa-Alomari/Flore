import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TrackOrderSchema = z.object({
  orderId: z.string().uuid(),
  trackingToken: z.string().min(16).max(256).optional(),
  phone: z.string().trim().min(8).max(24).optional(),
})

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '').replace(/^962/, '0')
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimitResponse = await checkRateLimit(ip, 'strict')
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'بيانات التتبع غير صالحة.' }, { status: 400 })
  }

  const parsed = TrackOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'رقم الطلب أو بيانات التحقق غير صالحة.' }, { status: 400 })
  }

  const authClient = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await authClient.auth.getUser()
  const { orderId, trackingToken, phone } = parsed.data

  const { data: order, error } = await serviceClient
    .from('orders')
    .select('id,user_id,customer_name,customer_phone,items,total,status,payment_method,payment_status,delivery_region,delivery_time_slot,gift_message,is_anonymous_gift,awaiting_recipient_address,recipient_name,driver_lat,driver_lng,estimated_arrival,created_at,updated_at,tracking_token_hash')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'لم نعثر على هذا الطلب.' }, { status: 404 })
  }

  const signedInOwner = Boolean(user?.id && order.user_id === user.id)
  const validToken = Boolean(
    trackingToken &&
    order.tracking_token_hash &&
    hashToken(trackingToken) === order.tracking_token_hash
  )
  const legacyPhoneMatch = Boolean(
    !order.tracking_token_hash &&
    phone &&
    normalizePhone(phone) === normalizePhone(order.customer_phone)
  )
  const explicitPhoneMatch = Boolean(
    phone &&
    normalizePhone(phone) === normalizePhone(order.customer_phone)
  )

  if (!signedInOwner && !validToken && !legacyPhoneMatch && !explicitPhoneMatch) {
    return NextResponse.json({ error: 'تعذر التحقق من ملكية الطلب.' }, { status: 403 })
  }

  return NextResponse.json({
    order: {
      id: order.id,
      customerName: order.customer_name,
      items: order.items,
      total: Number(order.total),
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      deliveryRegion: order.delivery_region,
      deliveryTimeSlot: order.delivery_time_slot,
      giftMessage: order.gift_message,
      isAnonymousGift: order.is_anonymous_gift,
      awaitingRecipientAddress: order.awaiting_recipient_address,
      recipientName: order.recipient_name,
      driverLat: order.driver_lat === null ? null : Number(order.driver_lat),
      driverLng: order.driver_lng === null ? null : Number(order.driver_lng),
      estimatedArrival: order.estimated_arrival,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    },
  })
}
