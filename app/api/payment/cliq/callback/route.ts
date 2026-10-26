import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

// تحديد واجهة برمجية واضحة لهيكل بيانات الـ Webhook القادم من CliQ
interface CliqWebhookPayload {
  orderId?: string
  status?: 'paid' | 'success' | 'failed' | 'cancelled'
  metadata?: {
    orderId?: string
  }
}

function verifyCliQSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(payload).digest('hex')

    const expectedBuffer = Buffer.from(expected, 'hex')
    const signatureBuffer = Buffer.from(signature, 'hex')

    // يجب أن تكون أطوال الـ Buffers متطابقة ليتمكن timingSafeEqual من مقارنتها بأمان
    if (expectedBuffer.length !== signatureBuffer.length) {
      return false
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-cliq-signature') || ''

  const webhookSecret = process.env.CLIQ_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[cliq/callback] CLIQ_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // التحقق الآمن من التوقيع الرقمي لمنع الـ Webhook Spoofing
  if (!verifyCliQSignature(rawBody, signature, webhookSecret)) {
    console.warn('[cliq/callback] Invalid webhook signature detected')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: CliqWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // استخراج المعطيات الأساسية بشكل مرن
  const orderId = payload.orderId || payload.metadata?.orderId
  const status = payload.status

  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status in payload' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    // 1. جلب حالة الطلب الحالية لتفادي تكرار العمليات (Idempotency Check)
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !existingOrder) {
      console.error(`[cliq/callback] Order not found in database: ${orderId}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // إذا كان الطلب معالجاً مسبقاً كطلب مدفوع، نرد بـ 200 فوراً دون تعديل شيء
    if (existingOrder.payment_status === 'paid') {
      return NextResponse.json({ received: true, message: 'Order already processed as paid' }, { status: 200 })
    }

    // 2. تحديد الحقول المراد تحديثها بناءً على نتيجة عملية الدفع في تطبيق CliQ
    let updateFields: Record<string, any> = {}

    if (status === 'paid' || status === 'success') {
      updateFields = {
        payment_status: 'paid',
        status: 'arranging', // تحويل الباقة إلى مرحلة التنسيق داخل الأتيليه
        updated_at: new Date().toISOString(),
      }
    } else if (status === 'failed' || status === 'cancelled') {
      updateFields = {
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      }
    } else {
      // في حال وجود حالات غير معرفة مرسلة من البنك
      return NextResponse.json({ received: true, message: 'Unhandled status received' }, { status: 200 })
    }

    // 3. تحديث قاعدة البيانات ببيانات الدفع النهائية والموثقة
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateFields)
      .eq('id', orderId)

    if (updateError) {
      console.error(`[cliq/callback] Database update failed for order ${orderId}:`, updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    console.log(`[cliq/callback] Successfully updated order ${orderId} to payment_status: ${updateFields.payment_status}`)
    return NextResponse.json({ received: true })

  } catch (serverError) {
    console.error('[cliq/callback] Unexpected runtime error:', serverError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}