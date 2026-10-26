import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const CompleteDeliverySchema = z.object({
    orderId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (!role || role.role !== 'driver') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = CompleteDeliverySchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { orderId } = parsed.data

    // تحقق إن هذا الطلب فعلاً موكّل لهذا السائق تحديداً — يمنع سائق ينهي طلب غيره
    const { data: order } = await supabase
        .from('orders')
        .select('driver_id, status')
        .eq('id', orderId)
        .single()

    if (!order || order.driver_id !== user.id) {
        return NextResponse.json({ error: 'This order is not assigned to you' }, { status: 403 })
    }

    if (order.status === 'delivered') {
        return NextResponse.json({ error: 'Order already marked as delivered' }, { status: 400 })
    }

    const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', orderId)

    if (error) {
        console.error('[driver/complete-delivery] Update error:', error)
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}