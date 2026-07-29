import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateLocationSchema = z.object({
    orderId: z.string().uuid(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
})

export async function POST(request: NextRequest) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // تحقق إن المستخدم فعلاً دوره driver
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

    const parsed = UpdateLocationSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { orderId, lat, lng } = parsed.data

    // تحقق إن هذا الطلب فعلاً موكّل لهذا السائق تحديداً — يمنع سائق يحدّث طلب غيره
    const { data: order } = await supabase
        .from('orders')
        .select('driver_id')
        .eq('id', orderId)
        .single()

    if (!order || order.driver_id !== user.id) {
        return NextResponse.json({ error: 'This order is not assigned to you' }, { status: 403 })
    }

    const { error } = await supabase
        .from('orders')
        .update({ driver_lat: lat, driver_lng: lng, updated_at: new Date().toISOString() })
        .eq('id', orderId)

    if (error) {
        console.error('[driver/update-location] Update error:', error)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}