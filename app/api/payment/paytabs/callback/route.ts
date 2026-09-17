import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PayTabsCallback = {
  tran_ref?: string
  cart_id?: string
  payment_result?: {
    response_status?: string
    response_code?: string
    response_message?: string
  }
}

function validSignature(rawBody: string, receivedSignature: string | null, serverKey: string) {
  if (!receivedSignature) return false
  const calculated = createHmac('sha256', serverKey).update(rawBody).digest('hex')
  const received = Buffer.from(receivedSignature, 'utf8')
  const expected = Buffer.from(calculated, 'utf8')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function POST(request: NextRequest) {
  const serverKey = process.env.PAYTABS_SERVER_KEY
  if (!serverKey) {
    console.error('[paytabs/callback] PAYTABS_SERVER_KEY is missing')
    return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('signature')
  if (!validSignature(rawBody, signature, serverKey)) {
    console.error('[paytabs/callback] invalid callback signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let payload: PayTabsCallback
  try {
    payload = JSON.parse(rawBody) as PayTabsCallback
  } catch {
    return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 })
  }

  const orderId = payload.cart_id
  if (!orderId) return NextResponse.json({ error: 'Missing cart_id' }, { status: 400 })

  const approved = payload.payment_result?.response_status === 'A'
  const serviceClient = createServiceClient()
  const { error } = await serviceClient
    .from('orders')
    .update({
      payment_status: approved ? 'paid' : 'failed',
      payment_transaction_id: payload.tran_ref || null,
      payment_method: 'card',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('[paytabs/callback] order update failed', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
