import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const UpdateSchema = z.object({
  orderId: z.string().uuid(),
  driver_lat: z.number().finite().min(-90).max(90),
  driver_lng: z.number().finite().min(-180).max(180),
  temperature: z.number().finite().optional(),
  humidity: z.number().finite().min(0).max(100).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const { orderId, driver_lat, driver_lng, temperature, humidity } = parsed.data

  // Verify caller is the assigned driver for this order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('driver_id, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.driver_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden: not assigned driver' }, { status: 403 })
  }

  // Use service client only for the write (RLS would also work with proper policy)
  const serviceClient = createServiceClient()
  const { error: updateError } = await serviceClient
    .from('orders')
    .update({
      driver_lat,
      driver_lng,
      temperature: temperature ?? null,
      humidity: humidity ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('[delivery/update] Supabase error:', updateError)
    return NextResponse.json({ error: 'Failed to update delivery status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}