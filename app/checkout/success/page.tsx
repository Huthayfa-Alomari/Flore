'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowLeft } from 'lucide-react'

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
    <div className="min-h-screen bg-flore-bg flex items-center justify-center p-4" dir="rtl">
      <div className="bg-flore-card rounded-3xl p-8 max-w-md w-full text-center shadow-luxury border border-flore-border">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="font-amiri text-2xl font-bold text-flore-primary mb-2">
          تم تأكيد الدفع بنجاح!
        </h1>
        <p className="text-flore-text-secondary mb-4">
          شكراً لثقتك بـ FLORÉ Luxury. سيتم التواصل معك قريباً لتأكيد تفاصيل التوصيل.
        </p>
        {orderId && (
          <p className="text-sm text-flore-text-secondary mb-2">
            رقم الطلب: <span className="font-mono font-bold">{orderId}</span>
          </p>
        )}
        <p className="text-xs text-flore-text-secondary mb-6">
          سيتم تحويلك تلقائياً خلال {countdown} ثانية...
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 bg-flore-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-flore-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          متابعة التسوق
        </Link>
      </div>
    </div>
  )
}
