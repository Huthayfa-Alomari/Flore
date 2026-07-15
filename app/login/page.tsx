'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Flower2, Mail, Phone, ArrowLeft, Loader2, UserPlus, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

function getErrorMessage(error: { message?: string; code?: string; status?: number }): string {
  const msg = (error.message || '').toLowerCase()
  const code = (error.code || '').toLowerCase()
  const status = error.status || 0

  if (status === 0 || msg === '0' || msg === '') {
    return 'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت وحاول مجدداً'
  }
  if (code === 'invalid_credentials' || msg.includes('invalid credentials')) {
    return 'بيانات الدخول غير صحيحة'
  }
  if (code === 'email_not_confirmed') {
    return 'البريد الإلكتروني غير مفعل. تحقق من صندوق البريد'
  }
  if (msg.includes('rate limit') || code === 'over_email_send_rate_limit') {
    return 'تم إرسال الكثير من الرموز. انتظر قليلاً وحاول مجدداً'
  }
  if (msg.includes('invalid email') || msg.includes('email format')) {
    return 'صيغة البريد الإلكتروني غير صحيحة'
  }
  if (msg.includes('phone') && (msg.includes('invalid') || msg.includes('format'))) {
    return 'صيغة رقم الهاتف غير صحيحة'
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'هذا الحساب مسجل مسبقاً. جرب تسجيل الدخول'
  }
  if (msg.includes('security') || msg.includes('blocked')) {
    return 'تم حظر هذا الطلب لأسباب أمنية. حاول لاحقاً'
  }
  if (msg.includes('sms') && (msg.includes('failed') || msg.includes('error'))) {
    return 'فشل إرسال رسالة SMS. تأكد من صحة الرقم وحاول مجدداً'
  }
  if (msg.includes('email') && (msg.includes('failed') || msg.includes('send') || msg.includes('error'))) {
    return 'فشل إرسال البريد الإلكتروني. تأكد من العنوان وحاول مجدداً'
  }
  if (msg.includes('otp') && msg.includes('expired')) {
    return 'انتهت صلاحية الرمز. أعد إرسال رمز جديد'
  }
  if (msg.includes('otp') && msg.includes('invalid')) {
    return 'رمز التحقق غير صحيح'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'مشكلة في الاتصال بالشبكة. تحقق من الإنترنت وحاول مجدداً'
  }

  return error.message || 'حدث خطأ غير متوقع. حاول مجدداً'
}

function LoginForm() {
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'auth') {
      setMessage('فشل التحقق من الرابط. حاول تسجيل الدخول مجدداً')
      setIsError(true)
    }
  }, [searchParams])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(getErrorMessage(error))
        setIsError(true)
      } else {
        setMessage('تم إرسال رابط تسجيل الدخول إلى بريدك الإلكتروني. تحقق من صندوق الوارد والبريد المزعج')
        setIsError(false)
      }
    } catch (err: any) {
      setMessage('حدث خطأ غير متوقع. حاول مجدداً')
      setIsError(true)
    }
    setLoading(false)
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      if (!otpSent) {
        const formattedPhone = `+962${phone.replace(/^0/, '').replace(/\s/g, '')}`
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        })

        if (error) {
          setMessage(getErrorMessage(error))
          setIsError(true)
        } else {
          setOtpSent(true)
          setMessage('تم إرسال رمز التحقق إلى هاتفك')
          setIsError(false)
        }
      } else {
        const formattedPhone = `+962${phone.replace(/^0/, '').replace(/\s/g, '')}`
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms',
        })

        if (error) {
          setMessage(getErrorMessage(error))
          setIsError(true)
        } else {
          router.push('/profile')
          router.refresh()
        }
      }
    } catch (err: any) {
      setMessage('حدث خطأ غير متوقع. حاول مجدداً')
      setIsError(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-16 w-16 bg-flore-subtle rounded-full flex items-center justify-center mb-4">
              <Flower2 className="h-8 w-8 text-flore-primary" />
            </div>
            <CardTitle className="font-amiri text-2xl">مرحباً بك في فلوري</CardTitle>
            <p className="text-flore-text-secondary text-sm mt-1">
              سجل الدخول أو أنشئ حساب جديد
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Method Toggle */}
            <div className="flex rounded-xl bg-flore-subtle p-1">
              <button
                type="button"
                onClick={() => { setMethod('email'); setOtpSent(false); setMessage('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${method === 'email' ? 'bg-white text-flore-primary shadow-sm' : 'text-flore-text-secondary'
                  }`}
              >
                <Mail className="h-4 w-4 inline ml-1" />
                البريد
              </button>
              <button
                type="button"
                onClick={() => { setMethod('phone'); setOtpSent(false); setMessage('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${method === 'phone' ? 'bg-white text-flore-primary shadow-sm' : 'text-flore-text-secondary'
                  }`}
              >
                <Phone className="h-4 w-4 inline ml-1" />
                الهاتف
              </button>
            </div>

            {/* Info note */}
            <p className="text-xs text-flore-text-secondary text-center bg-flore-subtle/50 rounded-lg p-2">
              <UserPlus className="h-3 w-3 inline ml-1" />
              إذا لم يكن لديك حساب، سيتم إنشاؤه تلقائياً عند التسجيل
            </p>

            {/* Forms */}
            {method === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 inline ml-1" />
                      إرسال رابط تسجيل الدخول
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-flore-text-secondary text-sm">
                      +962
                    </span>
                    <Input
                      type="tel"
                      placeholder="7X XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={otpSent}
                      dir="ltr"
                      className="pl-16"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-sm font-medium mb-2">رمز التحقق</label>
                    <Input
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      dir="ltr"
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : otpSent ? (
                    'تحقق من الرمز'
                  ) : (
                    'إرسال رمز التحقق'
                  )}
                </Button>
              </form>
            )}

            {message && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-sm text-center p-3 rounded-xl ${isError
                    ? 'bg-red-50 text-red-600'
                    : 'bg-green-50 text-green-600'
                  }`}
              >
                {message}
              </motion.p>
            )}

            <div className="text-center">
              <Link href="/catalog">
                <Button variant="ghost" size="sm" className="gap-2 text-flore-text-secondary">
                  <ArrowLeft className="h-4 w-4" />
                  العودة للتسوق
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Wrapper with Suspense for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-flore-bg flex items-center justify-center">
        <div className="animate-pulse font-amiri text-xl text-flore-primary">
          جاري التحميل...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
