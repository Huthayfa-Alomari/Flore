'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Banknote,
  Check,
  Clock3,
  CreditCard,
  Gift,
  MapPin,
  MessageCircle,
  ShieldCheck,
  User,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart-store'
import { formatPrice, generateWhatsAppMessage } from '@/lib/utils'
import { GiftMediaRecorder } from '@/components/checkout/GiftMediaRecorder'

type GiftMedia = { blob: Blob; type: 'audio' | 'video' } | null

type CheckoutForm = {
  name: string
  phone: string
  address: string
  region: string
  payment: 'card' | 'whatsapp' | 'cliq' | 'cash'
  giftMessage: string
  notes: string
  deliveryTimeSlot: string
  isAnonymousGift: boolean
  askRecipientAddress: boolean
  recipientName: string
  recipientPhone: string
}

const paymentMethods = [
  { id: 'card' as const, label: 'بطاقة', description: 'Visa / Mastercard عبر PayTabs', icon: CreditCard },
  { id: 'whatsapp' as const, label: 'واتساب', description: 'تأكيد الطلب مع فريق FLORÉ', icon: MessageCircle },
  { id: 'cliq' as const, label: 'CliQ', description: 'تحويل يدوي ثم تأكيد', icon: Banknote },
  { id: 'cash' as const, label: 'عند الاستلام', description: 'دفع نقدي وقت التسليم', icon: Banknote },
]

export function CheckoutExperience() {
  const router = useRouter()
  const { items, getTotal, clearCart } = useCart()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [giftMedia, setGiftMedia] = useState<GiftMedia>(null)
  const [form, setForm] = useState<CheckoutForm>({
    name: '',
    phone: '',
    address: '',
    region: 'amman',
    payment: 'card',
    giftMessage: '',
    notes: '',
    deliveryTimeSlot: '',
    isAnonymousGift: false,
    askRecipientAddress: false,
    recipientName: '',
    recipientPhone: '',
  })

  useEffect(() => {
    setMounted(true)
    const savedCity = window.localStorage.getItem('flore_delivery_city')
    if (savedCity) setForm(previous => ({ ...previous, region: savedCity }))

    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name,phone')
        .eq('id', user.id)
        .single()
      if (profile) {
        setForm(previous => ({
          ...previous,
          name: profile.full_name || previous.name,
          phone: profile.phone || previous.phone,
        }))
      }
    }
    loadUser()
  }, [supabase])

  useEffect(() => {
    if (mounted && items.length === 0) router.replace('/cart')
  }, [mounted, items.length, router])

  const clientTotal = useMemo(() => getTotal(), [getTotal, items])

  function updateForm<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) {
    setForm(previous => ({ ...previous, [key]: value }))
    setError(null)
  }

  function trackingPath(orderId: string, token?: string) {
    if (token) window.localStorage.setItem(`flore_tracking_${orderId}`, token)
    return `/tracking/${orderId}`
  }

  async function uploadGiftMedia(orderId: string, trackingToken?: string) {
    if (!giftMedia) return
    const body = new FormData()
    body.append('media', giftMedia.blob, giftMedia.type === 'video' ? 'gift-video.webm' : 'gift-audio.webm')
    body.append('customerPhone', form.phone)
    if (trackingToken) body.append('trackingToken', trackingToken)

    try {
      const response = await fetch(`/api/orders/${orderId}/gift-media`, { method: 'POST', body })
      if (!response.ok) console.error('[checkout] gift media upload failed', await response.text())
    } catch (uploadError) {
      console.error('[checkout] gift media upload failed', uploadError)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            product_id: item.product.id,
            qty: item.quantity,
            customization: item.customization || null,
            ...(item.bouquetSelection ? { bouquet_selection: item.bouquetSelection } : {}),
          })),
          customer_name: form.name,
          customer_phone: form.phone,
          ...(form.askRecipientAddress
            ? {
                awaiting_recipient_address: true,
                recipient_name: form.recipientName,
                recipient_phone: form.recipientPhone,
              }
            : {
                delivery_address: form.address,
                delivery_region: form.region.toLowerCase(),
              }),
          gift_message: form.giftMessage || null,
          delivery_notes: form.notes || null,
          payment_method: form.payment,
          delivery_time_slot: form.deliveryTimeSlot || null,
          is_anonymous_gift: form.isAnonymousGift,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'تعذر إنشاء الطلب.')

      const orderId = String(data.orderId)
      const serverTotal = Number(data.total)
      const trackingToken = typeof data.trackingToken === 'string' ? data.trackingToken : undefined
      const path = trackingPath(orderId, trackingToken)
      await uploadGiftMedia(orderId, trackingToken)

      if (form.askRecipientAddress) {
        const addressLink = `${window.location.origin}/recipient-address/${data.recipientAddressToken}`
        const text = `مرحباً ${form.recipientName}، لديك هدية من FLORÉ بانتظارك. أدخل عنوان الاستلام من هنا: ${addressLink}`
        const number = form.recipientPhone.replace(/^0/, '962')
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : path)
        return
      }

      if (form.payment === 'card') {
        const paymentResponse = await fetch('/api/payment/paytabs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, trackingToken }),
        })
        const paymentData = await paymentResponse.json()
        if (!paymentResponse.ok) throw new Error(typeof paymentData?.error === 'string' ? paymentData.error : 'تعذر بدء الدفع بالبطاقة.')
        if (paymentData.redirectUrl) {
          clearCart()
          window.location.href = paymentData.redirectUrl
          return
        }
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : path)
        return
      }

      if (form.payment === 'whatsapp') {
        const message = generateWhatsAppMessage(items, Number.isFinite(serverTotal) ? serverTotal : clientTotal)
        const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '962790000000'
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
      }

      if (form.payment === 'cliq') {
        const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '962790000000'
        const message = `تم إنشاء طلب FLORÉ #${orderId.slice(0, 8)} بقيمة ${formatPrice(serverTotal)}. أرسل صورة تحويل CliQ لتأكيد الدفع.`
        window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
      }

      clearCart()
      router.push(userId ? `/profile?order=${orderId}` : path)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'حدث خطأ أثناء معالجة الطلب.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || items.length === 0) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-flore-bg" dir="rtl">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-flore-text-primary/15 border-t-flore-text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-flore-bg pb-28 text-flore-text-primary" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-14">
        <button type="button" onClick={() => router.push('/cart')} className="mb-8 flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-flore-text-secondary transition hover:bg-flore-card">
          <ArrowRight className="h-4 w-4" /> العودة للسلة
        </button>

        <div className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9A8E82]">CHECKOUT</p>
          <h1 className="mt-3 font-amiri text-4xl font-semibold sm:text-5xl">اللمسة الأخيرة</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-flore-text-secondary">تفاصيل قليلة فقط، ثم نبدأ تجهيز الهدية. السعر النهائي يعاد التحقق منه على الخادم قبل تسجيل الطلب.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-flore-bg"><User className="h-4 w-4" /></div>
                <div><h2 className="font-amiri text-2xl font-semibold">بيانات التواصل</h2><p className="text-xs text-flore-text-secondary">لن نستخدمها إلا لتنفيذ الطلب والتوصيل.</p></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">الاسم الكامل
                  <input required value={form.name} onChange={event => updateForm('name', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 outline-none focus:border-flore-gold" placeholder="الاسم" />
                </label>
                <label className="text-sm font-medium">رقم الهاتف
                  <input required dir="ltr" inputMode="tel" value={form.phone} onChange={event => updateForm('phone', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 text-left outline-none focus:border-flore-gold" placeholder="0790000000" />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-flore-bg"><MapPin className="h-4 w-4" /></div>
                <div><h2 className="font-amiri text-2xl font-semibold">وجهة الهدية</h2><p className="text-xs text-flore-text-secondary">أدخل العنوان أو دع المستلم يرسله بنفسه.</p></div>
              </div>

              <label className="mb-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-flore-border bg-flore-bg p-4">
                <div><p className="text-sm font-semibold">اطلب العنوان من المستلم</p><p className="mt-1 text-xs leading-5 text-flore-text-secondary">ننشئ رابطًا خاصًا لإدخال عنوانه بدون كشف هوية المرسل.</p></div>
                <input type="checkbox" checked={form.askRecipientAddress} onChange={event => updateForm('askRecipientAddress', event.target.checked)} className="h-5 w-5 accent-flore-primary" />
              </label>

              {form.askRecipientAddress ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">اسم المستلم
                    <input required value={form.recipientName} onChange={event => updateForm('recipientName', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 outline-none" />
                  </label>
                  <label className="text-sm font-medium">رقم المستلم
                    <input required dir="ltr" inputMode="tel" value={form.recipientPhone} onChange={event => updateForm('recipientPhone', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 text-left outline-none" />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="text-sm font-medium">المدينة
                    <select value={form.region} onChange={event => updateForm('region', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 outline-none">
                      <option value="amman">عمّان</option>
                      <option value="zarqa">الزرقاء</option>
                      <option value="irbid">إربد</option>
                      <option value="other">أخرى</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium">العنوان التفصيلي
                    <textarea required value={form.address} onChange={event => updateForm('address', event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-flore-border bg-flore-bg p-4 leading-7 outline-none" placeholder="المنطقة، الشارع، أقرب نقطة دالة" />
                  </label>
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-flore-bg"><Gift className="h-4 w-4" /></div>
                <div><h2 className="font-amiri text-2xl font-semibold">الإهداء</h2><p className="text-xs text-flore-text-secondary">اختياري، ويمكن أن يكون نصًا أو تسجيلًا قصيرًا.</p></div>
              </div>
              <textarea value={form.giftMessage} maxLength={500} onChange={event => updateForm('giftMessage', event.target.value)} rows={4} className="w-full resize-none rounded-2xl border border-flore-border bg-flore-bg p-4 leading-7 outline-none" placeholder="رسالتك…" />
              <div className="mt-4"><GiftMediaRecorder onRecorded={(blob, type) => setGiftMedia({ blob, type })} /></div>
              <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-flore-bg p-4">
                <div><p className="text-sm font-semibold">هدية مجهولة الاسم</p><p className="mt-1 text-xs text-flore-text-secondary">لا نكشف اسم المرسل للمستلم.</p></div>
                <input type="checkbox" checked={form.isAnonymousGift} onChange={event => updateForm('isAnonymousGift', event.target.checked)} className="h-5 w-5 accent-flore-primary" />
              </label>
            </section>

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-flore-bg"><Clock3 className="h-4 w-4" /></div>
                <h2 className="font-amiri text-2xl font-semibold">ملاحظات التوصيل</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">الفترة المفضلة
                  <select value={form.deliveryTimeSlot} onChange={event => updateForm('deliveryTimeSlot', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 outline-none">
                    <option value="">بدون تفضيل</option>
                    <option value="morning">صباحًا</option>
                    <option value="afternoon">بعد الظهر</option>
                    <option value="evening">مساءً</option>
                  </select>
                </label>
                <label className="text-sm font-medium">ملاحظة
                  <input value={form.notes} onChange={event => updateForm('notes', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 outline-none" placeholder="مثال: الاتصال قبل الوصول" />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-flore-bg"><ShieldCheck className="h-4 w-4" /></div>
                <div><h2 className="font-amiri text-2xl font-semibold">طريقة الدفع</h2><p className="text-xs text-flore-text-secondary">اختر الطريقة المناسبة. لا نعتمد سعر المتصفح عند إنشاء الطلب.</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentMethods.map(method => {
                  const Icon = method.icon
                  const active = form.payment === method.id
                  return (
                    <button key={method.id} type="button" onClick={() => updateForm('payment', method.id)} className={`min-h-24 rounded-2xl border p-4 text-right transition ${active ? 'border-flore-primary bg-flore-primary text-white' : 'border-flore-border bg-flore-bg hover:border-flore-gold'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <Icon className="h-5 w-5" />
                        {active && <Check className="h-5 w-5" />}
                      </div>
                      <p className="mt-3 text-sm font-semibold">{method.label}</p>
                      <p className={`mt-1 text-xs ${active ? 'text-white/65' : 'text-flore-text-secondary'}`}>{method.description}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            {error && <div className="rounded-2xl border border-flore-error/20 bg-flore-error/5 px-4 py-3 text-sm text-flore-error">{error}</div>}
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#9A8E82]">ORDER SUMMARY</p>
              <h2 className="mt-2 font-amiri text-2xl font-semibold">مراجعة الهدية</h2>
              <div className="mt-5 space-y-4">
                {items.map(item => (
                  <div key={item.product.id} className="border-b border-flore-border pb-4 last:border-0">
                    <div className="flex justify-between gap-3"><p className="text-sm font-semibold leading-6">{item.product.name}</p><span className="shrink-0 text-sm">{formatPrice(item.product.price * item.quantity)}</span></div>
                    <p className="mt-1 text-xs text-flore-text-secondary">الكمية {item.quantity}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-end justify-between border-t border-flore-border pt-5">
                <span className="text-sm font-semibold">الإجمالي المبدئي</span>
                <span className="font-amiri text-3xl font-semibold">{formatPrice(clientTotal)}</span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-flore-text-secondary">قد يتغير هذا الرقم فقط إذا تغير مخزون أو سعر عنصر قبل تأكيد الطلب؛ الخادم يعيد حسابه من المصدر.</p>
              <button disabled={loading} type="submit" className="mt-6 min-h-14 w-full rounded-full bg-flore-primary px-5 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(32,32,30,.16)] disabled:opacity-50">
                {loading ? 'جارٍ تثبيت الطلب…' : form.payment === 'card' ? 'متابعة للدفع الآمن' : 'تأكيد الطلب'}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}
