import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8')
  const b = Buffer.from(right, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  const serverKey = process.env.PAYTABS_SERVER_KEY
  const formData = await request.formData()
  const fields: Record<string, string> = {}
  formData.forEach((value, key) => {
    fields[key] = value.toString()
  })

  const receivedSignature = fields.signature
  if (!serverKey || !receivedSignature) {
    return NextResponse.redirect(new URL('/checkout?payment=verification-failed', request.nextUrl.origin), 303)
  }

  delete fields.signature
  const params = new URLSearchParams()
  Object.keys(fields)
    .filter(key => fields[key] !== '')
    .sort()
    .forEach(key => params.append(key, fields[key]))

  const calculatedSignature = createHmac('sha256', serverKey).update(params.toString()).digest('hex')
  if (!secureEqual(calculatedSignature, receivedSignature)) {
    console.error('[paytabs/return] invalid return signature')
    return NextResponse.redirect(new URL('/checkout?payment=verification-failed', request.nextUrl.origin), 303)
  }

  const orderId = fields.cartId
  if (!orderId) {
    return NextResponse.redirect(new URL('/checkout?payment=missing-order', request.nextUrl.origin), 303)
  }

  const approved = fields.respStatus === 'A'
  const serviceClient = createServiceClient()
  await serviceClient
    .from('orders')
    .update({
      payment_status: approved ? 'paid' : 'failed',
      payment_transaction_id: fields.tranRef || null,
      payment_method: 'card',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  const target = new URL(`/tracking/${orderId}`, request.nextUrl.origin)
  target.searchParams.set('payment', approved ? 'success' : 'failed')
  return NextResponse.redirect(target, 303)
}
