import { createClient } from '@/lib/supabase/server'
import { chatWithAI } from '@/lib/ai/openrouter'
import { checkRateLimit, isRateLimitConfigured } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MAX_MESSAGE_LENGTH = 1000
const MAX_MESSAGES = 10

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
})

export async function POST(request: Request) {
  // Never run a billable AI endpoint without distributed rate limiting in production.
  if (process.env.NODE_ENV === 'production' && !isRateLimitConfigured()) {
    return NextResponse.json(
      { error: 'خدمة المساعد غير متاحة مؤقتًا. يرجى المحاولة لاحقًا.' },
      { status: 503 }
    )
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimitResponse = await checkRateLimit(user.id, 'ai')
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  try {
    // Ground recommendations in current, in-stock products instead of hard-coded prices.
    const { data: products, error: catalogError } = await supabase
      .from('products')
      .select('name, name_en, category, price, currency, description, in_stock')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .limit(60)

    if (catalogError) {
      console.error('[ai/chat] Could not load live catalog:', catalogError.message)
    }

    const catalogContext = (products || []).map((product) => ({
      name: product.name,
      nameEn: product.name_en,
      category: product.category,
      price: product.price,
      currency: product.currency || 'JOD',
      description: product.description,
      inStock: product.in_stock,
    }))

    const reply = await chatWithAI(parsed.data.messages, JSON.stringify(catalogContext))
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[ai/chat] Provider request failed:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }
}
