'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles, ArrowLeft } from 'lucide-react'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/catalog')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-flore-bg p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-flore-border/70 bg-flore-card p-8 text-center shadow-luxury md:p-10"
      >
        {/* هالة احتفال ذهبية ناعمة */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-flore-gold/15 blur-3xl"
        />

        <div className="relative">
          {/* ختم التأكيد الذهبي */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-gold/15 ring-8 ring-flore-gold/10">
            <Check className="h-10 w-10 text-flore-gold-dark" strokeWidth={2.5} />
          </div>

          <p className="flore-eyebrow mb-3">ORDER CONFIRMED</p>
          <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">
            تم تأكيد الدفع بنجاح!
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-flore-text-secondary">
            شكراً لثقتك بـ FLORÉ Luxury. سيتم التواصل معك قريباً لتأكيد تفاصيل التوصيل.
          </p>

          {orderId && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-flore-gold/30 bg-flore-gold/10 px-5 py-2.5">
              <Sparkles className="h-4 w-4 text-flore-gold-dark" />
              <span className="text-sm text-flore-text-secondary">رقم الطلب:</span>
              <span className="flore-price font-amiri text-lg font-bold text-flore-gold-dark" dir="ltr">
                {orderId}
              </span>
            </div>
          )}

          <p className="mb-8 text-xs text-flore-text-secondary">
            سيتم تحويلك تلقائياً خلال{' '}
            <span className="flore-price font-bold text-flore-text-primary">{countdown}</span> ثانية...
          </p>

          <Link
            href="/catalog"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-flore-primary px-8 py-3.5 text-sm font-medium text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.97]"
          >
            <ArrowLeft className="h-4 w-4" />
            متابعة التسوق
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
