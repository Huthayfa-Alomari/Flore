import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit(getClientIp(request), 'strict')
    if (rateLimitResponse) return rateLimitResponse

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let body: { orderId?: string; phoneNumber?: string; customer_phone?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { orderId, phoneNumber, customer_phone } = body
    const verificationPhone = phoneNumber || customer_phone

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.user_id) {
      if (!user || order.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (!verificationPhone || order.customer_phone !== verificationPhone) {
        return NextResponse.json({ error: 'Forbidden: invalid verification details' }, { status: 403 })
      }
    }

    if (['delivered', 'cancelled', 'paid'].includes(order.status)) {
      return NextResponse.json({ error: 'This order cannot be processed for payment' }, { status: 400 })
    }

    const cliqResponse = await fetch('https://api.cliq.jo/payment/request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLIQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: order.total,
        currency: 'JOD',
        orderId,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/cliq/callback`,
        phoneNumber: verificationPhone,
        description: `FLORÉ Luxury Order #${orderId.slice(0, 8)}`,
      }),
    })

    if (!cliqResponse.ok) {
      const errorData = await cliqResponse.json().catch(() => ({}))
      return NextResponse.json({
        error: 'Failed to generate CliQ payment request',
        details: (errorData as { message?: string }).message || 'Gateway error',
      }, { status: cliqResponse.status })
    }

    const data = await cliqResponse.json() as { transactionId: string; paymentUrl: string }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: updateError } = await serviceClient
      .from('orders')
      .update({
        payment_transaction_id: data.transactionId,
        payment_method: 'cliq',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Failed to bind transactionId:', updateError.message)
    }

    return NextResponse.json({
      success: true,
      paymentUrl: data.paymentUrl,
      transactionId: data.transactionId,
    })

  } catch (err: unknown) {
    console.error('[CliQ Payment Error]:', err)
    return NextResponse.json({ error: 'Internal payment gateway error' }, { status: 500 })
  }
}
