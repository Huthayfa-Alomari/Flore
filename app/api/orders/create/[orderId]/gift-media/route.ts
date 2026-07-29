import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 15 * 1024 * 1024 // 15MB

export async function POST(request: NextRequest, { params }: { params: { orderId: string } }) {
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    const { orderId } = params
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const formData = await request.formData()
    const file = formData.get('media') as File | null
    const customerPhone = formData.get('customerPhone') as string | null

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }

    const mediaType: 'audio' | 'video' | null = file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('video/')
            ? 'video'
            : null

    if (!mediaType) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // تحقق أن الطالب هو فعلاً صاحب الطلب (مسجل أو ضيف بنفس رقم الهاتف)
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, customer_phone, gift_token')
        .eq('id', orderId)
        .single()

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const isOwner = order.user_id ? order.user_id === user?.id : order.customer_phone === customerPhone

    if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServiceClient()
    const ext = mediaType === 'video' ? 'webm' : 'webm'
    const fileName = `${orderId}-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await serviceClient.storage
        .from('gift-media')
        .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
        console.error('[gift-media] Upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 })
    }

    const { data: { publicUrl } } = serviceClient.storage.from('gift-media').getPublicUrl(fileName)

    const { error: updateError } = await serviceClient
        .from('orders')
        .update({ gift_media_url: publicUrl, gift_media_type: mediaType })
        .eq('id', orderId)

    if (updateError) {
        console.error('[gift-media] Update error:', updateError)
        return NextResponse.json({ error: 'Failed to save media reference' }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        giftUrl: `${process.env.NEXT_PUBLIC_APP_URL}/gift/${order.gift_token}`,
    })
}