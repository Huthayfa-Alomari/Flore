'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const quickQuestions = [
  'ما أفضل بوكيه لمناسبة الخطوبة؟',
  'كيف أعتني بالورود المحفوظة؟',
  'ما مدة التوصيل في عمّان؟',
  'هل يوجد خصم للطلبات الكبيرة؟',
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً! أنا مساعد فلوري. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، لا يمكنني الاتصال بالخادم حالياً. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setIsLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-3xl flex-col px-4 py-8">
      {/* ── الترويسة ── */}
      <div className="mb-6 text-center animate-fade-up">
        <p className="flore-eyebrow mb-3">AI CONCIERGE</p>
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary">
          مساعد فلوري الذكي
        </h1>
        <p className="mt-2 text-sm text-flore-text-secondary">
          اسألني عن أي شيء يخص الزهور والهدايا
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden animate-fade-up">
        <CardContent className="flex flex-1 flex-col p-0">
          {/* ── سجل المحادثة ── */}
          <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                >
                  {/* الصور الرمزية */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${message.role === 'user'
                        ? 'bg-flore-primary text-white'
                        : 'border border-flore-border/70 bg-flore-card text-flore-primary shadow-luxury-soft'
                      }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>

                  {/* الفقاعة — المستخدم: تعبئة سيج / المساعد: بطاقة بإطار رفيع */}
                  <div
                    className={`max-w-[80%] px-5 py-3.5 ${message.role === 'user'
                        ? 'rounded-3xl rounded-tl-md bg-flore-primary text-white shadow-luxury-soft'
                        : 'rounded-3xl rounded-tr-md border border-flore-border/70 bg-flore-card text-flore-text-primary shadow-luxury-soft'
                      }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* مؤشر الكتابة */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-flore-border/70 bg-flore-card text-flore-primary shadow-luxury-soft">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="rounded-3xl rounded-tr-md border border-flore-border/70 bg-flore-card px-5 py-4 shadow-luxury-soft">
                  <div className="flex gap-1.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-flore-sage" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-flore-sage" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-flore-sage" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── أسئلة شائعة ── */}
          {messages.length < 3 && (
            <div className="border-t border-flore-border/50 px-4 pb-3 pt-3 md:px-6">
              <p className="mb-2 text-xs text-flore-text-secondary">أسئلة شائعة:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="cursor-pointer rounded-full border border-flore-border/70 bg-flore-card px-4 py-2 text-xs text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:bg-flore-subtle/50 active:scale-[0.97]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── شريط الإدخال ── */}
          <form onSubmit={handleSubmit} className="border-t border-flore-border/70 bg-flore-card p-4 md:px-6">
            <div className="flex items-center gap-2 rounded-full border border-flore-border bg-flore-bg py-1.5 pl-1.5 pr-5 transition-all duration-200 ease-flore focus-within:border-flore-primary/40 focus-within:ring-4 focus-within:ring-flore-primary/10">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                className="h-10 flex-1 bg-transparent text-sm text-flore-text-primary placeholder:text-flore-text-secondary/60 focus:outline-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                aria-label="إرسال"
              >
                <Send className="h-4 w-4 -scale-x-100" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
