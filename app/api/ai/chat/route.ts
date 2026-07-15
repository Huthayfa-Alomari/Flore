import { createClient } from '@/lib/supabase/server'
import { chatWithAI } from '@/lib/ai/openrouter'
import { checkRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MAX_MESSAGE_LENGTH = 1000
const MAX_MESSAGES = 10

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']), // لا نسمح للعميل بإرسال دور "system" بنفسه
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
})

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting موزّع عبر Upstash Redis (يعمل بشكل صحيح عبر كل نسخ Vercel Serverless،
  // بعكس Map في الذاكرة الذي كان يُعاد تصفيره مع كل استدعاء بارد)
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
    const reply = await chatWithAI(parsed.data.messages)
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('[ai/chat] OpenRouter error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }
}
