import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    const formData = await request.formData()
    const fields: Record<string, string> = {}
    formData.forEach((value, key) => {
        fields[key] = value.toString()
    })

    const { signature, ...rest } = fields

    // تحقق التوقيع (HMAC-SHA256) — يمنع أي طرف مزوّر من ادعاء نجاح دفع لم يحصل
    const filteredFields = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== '')
    )
    const sortedKeys = Object.keys(filteredFields).sort()
    const query = sortedKeys.map((k) => `${k}=${encodeURIComponent(filteredFields[k])}`).join('&')

    const expectedSignature = crypto
        .createHmac('sha256', process.env.PAYTABS_SERVER_KEY!)
        .update(query)
        .digest('hex')

    if (signature !== expectedSignature) {
        console.error('[paytabs/callback] Invalid signature — possible forged request')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const orderId = fields.cartId
    const isApproved = fields.respStatus === 'A'

    const serviceClient = createServiceClient()
    const { error } = await serviceClient
        .from('orders')
        .update({
            payment_status: isApproved ? 'paid' : 'failed',
            payment_transaction_id: fields.tranRef || null,
            payment_method: 'card',
            updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

    if (error) {
        console.error('[paytabs/callback] Update error:', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}