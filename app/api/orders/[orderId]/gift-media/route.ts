import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 15 * 1024 * 1024

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '').replace(/^962/, '0')
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
  if (rateLimitResponse) return rateLimitResponse

  const formData = await request.formData()
  const file = formData.get('media') as File | null
  const customerPhone = String(formData.get('customerPhone') || '')
  const trackingToken = String(formData.get('trackingToken') || '')

  if (!file) return NextResponse.json({ error: 'لم يتم إرفاق تسجيل.' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'حجم التسجيل يتجاوز 15MB.' }, { status: 400 })

  const mediaType: 'audio' | 'video' | null = file.type.startsWith('audio/')
    ? 'audio'
    : file.type.startsWith('video/')
      ? 'video'
      : null

  if (!mediaType) return NextResponse.json({ error: 'نوع الملف غير مدعوم.' }, { status: 400 })

  const authClient = createClient()
  const serviceClient = createServiceClient()
  const { data: { user } } = await authClient.auth.getUser()

  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .select('id,user_id,customer_phone,gift_token,tracking_token_hash')
    .eq('id', params.orderId)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'الطلب غير موجود.' }, { status: 404 })

  const signedInOwner = Boolean(user?.id && order.user_id === user.id)
  const validToken = Boolean(trackingToken && order.tracking_token_hash && hashToken(trackingToken) === order.tracking_token_hash)
  const phoneMatch = normalizePhone(customerPhone) === normalizePhone(order.customer_phone)

  if (!signedInOwner && !validToken && !phoneMatch) {
    return NextResponse.json({ error: 'غير مصرح برفع تسجيل لهذا الطلب.' }, { status: 403 })
  }

  const extension = file.type.includes('ogg') ? 'ogg' : file.type.includes('mp4') ? 'mp4' : 'webm'
  const fileName = `${params.orderId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await serviceClient.storage
    .from('gift-media')
    .upload(fileName, buffer, { contentType: file.type, cacheControl: '3600', upsert: false })

  if (uploadError) {
    console.error('[gift-media] upload failed', uploadError)
    return NextResponse.json({ error: 'تعذر رفع التسجيل.' }, { status: 500 })
  }

  const { data: publicData } = serviceClient.storage.from('gift-media').getPublicUrl(fileName)
  const { error: updateError } = await serviceClient
    .from('orders')
    .update({ gift_media_url: publicData.publicUrl, gift_media_type: mediaType })
    .eq('id', params.orderId)

  if (updateError) {
    console.error('[gift-media] order update failed', updateError)
    return NextResponse.json({ error: 'تم رفع التسجيل لكن تعذر ربطه بالطلب.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  return NextResponse.json({
    success: true,
    giftUrl: order.gift_token ? `${appUrl}/gift/${order.gift_token}` : null,
  })
}
