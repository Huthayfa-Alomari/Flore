import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

type SupabaseServerClient = ReturnType<typeof createClient>

async function checkAdmin(supabase: SupabaseServerClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 } as const

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role || role.role !== 'admin') {
    return { error: 'Forbidden', status: 403 } as const
  }

  return { user }
}

// قائمة بيضاء صريحة بكل الحقول المسموح للأدمن بكتابتها — أي حقل غير مذكور هنا يُرفض تلقائيًا
const ProductSchema = z.object({
  name: z.string().min(1).max(200),
  name_en: z.string().max(200).optional().nullable(),
  category: z.enum(['bouquets', 'preserved', 'vases', 'chocolates', 'custom']),
  price: z.number().positive().max(10000),
  currency: z.string().max(10).optional(),
  image: z.string().max(2000),
  images: z.array(z.string().max(2000)).max(20).optional(),
  description: z.string().max(2000).optional().nullable(),
  description_en: z.string().max(2000).optional().nullable(),
  badge: z.string().max(50).optional().nullable(),
  badge_color: z.string().max(30).optional().nullable(),
  in_stock: z.boolean().optional(),
  model_url: z.string().max(2000).optional().nullable(),
  ar_enabled: z.boolean().optional(),
})

// عند التعديل نسمح بحقول جزئية فقط
const ProductUpdateSchema = ProductSchema.partial().extend({
  id: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'admin')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createClient()
  const auth = await checkAdmin(supabase)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const { data, error } = await supabase.from('products').insert(parsed.data).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'admin')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createClient()
  const auth = await checkAdmin(supabase)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ProductUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  const { id, ...updates } = parsed.data

  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(getClientIp(request), 'admin')
  if (rateLimitResponse) return rateLimitResponse

  const supabase = createClient()
  const auth = await checkAdmin(supabase)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Valid product ID required' }, { status: 400 })
  }

  const { error } = await supabase.from('products').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
