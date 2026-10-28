"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MapPin, User, MessageSquare, CreditCard, Banknote, MessageCircle, ArrowLeft, Clock, Mic } from 'lucide-react'
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { formatPrice, generateWhatsAppMessage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { GiftMediaRecorder } from '@/components/checkout/GiftMediaRecorder'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotal, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    region: 'amman',
    payment: 'whatsapp',
    giftMessage: '',
    notes: '',
    deliveryTimeSlot: '',
    isAnonymousGift: false,
    askRecipientAddress: false,
    recipientName: '',
    recipientPhone: '',
  })

  const [giftMedia, setGiftMedia] = useState<{ blob: Blob; type: 'audio' | 'video' } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    if (items.length === 0) {
      router.push('/cart')
      return
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          const p = profile as { full_name?: string; phone?: string }
          setForm(prev => ({
            ...prev,
            name: p.full_name || '',
            phone: p.phone || '',
          }))
        }
      }
    }
    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const savedCity = localStorage.getItem('flore_delivery_city')
    if (savedCity) {
      setForm(prev => ({ ...prev, region: savedCity }))
    }
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-[60vh] bg-flore-bg flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-flore-subtle border-t-flore-primary animate-spin" />
      </div>
    )
  }

  if (items.length === 0) return null

  const uploadGiftMedia = async (orderId: string) => {
    if (!giftMedia) return

    const formData = new FormData()
    formData.append('media', giftMedia.blob, giftMedia.type === 'video' ? 'gift.webm' : 'gift-audio.webm')
    formData.append('customerPhone', form.phone)

    try {
      const res = await fetch(`/api/orders/${orderId}/gift-media`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        console.error('Gift media upload failed:', await res.text())
        // ما نوقف عملية الطلب — رفع الرسالة فشل بس الطلب نفسه نجح، نكمل عادي
      }
    } catch (err) {
      console.error('Gift media upload error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            product_id: item.product.id,
            qty: item.quantity,
            customization: item.customization || null,
            ...(item.bouquetSelection && { bouquet_selection: item.bouquetSelection }),
          })),
          customer_name: form.name,
          customer_phone: form.phone,
          ...(form.askRecipientAddress
            ? { awaiting_recipient_address: true, recipient_name: form.recipientName, recipient_phone: form.recipientPhone }
            : { delivery_address: form.address, delivery_region: form.region.toLowerCase() }),
          gift_message: form.giftMessage || null,
          delivery_notes: form.notes || null,
          payment_method: form.payment.toLowerCase(),
          delivery_time_slot: form.deliveryTimeSlot || null,
          is_anonymous_gift: form.isAnonymousGift,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        const message = typeof err.error === 'string'
          ? err.error
          : 'بيانات الطلب غير صحيحة، يرجى المراجعة'
        throw new Error(message)
      }

      const { orderId, total: serverTotal, recipientAddressToken } = await response.json()
      const orderTotal = serverTotal || getTotal()

      // ارفع رسالة الإهداء (صوت/فيديو) فور نجاح إنشاء الطلب، قبل أي خطوة دفع
      await uploadGiftMedia(orderId)

      if (form.askRecipientAddress) {
        const link = `${window.location.origin}/recipient-address/${recipientAddressToken}`
        const msg = `مرحباً ${form.recipientName}! 🌸 لديك هدية من Floré بانتظارك، الرجاء إدخال عنوانك من هنا: ${link}`
        const waNumber = form.recipientPhone.replace(/^0/, '962')
        window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank')
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : `/tracking/${orderId}`)
      } else if (form.payment === 'whatsapp') {
        const message = generateWhatsAppMessage(items, orderTotal)
        const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '962790000000'
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank')
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : `/tracking/${orderId}`)

      } else if (form.payment === 'cliq') {
        const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '962790000000'
        const cliqMessage = `مرحباً، حوّلت مبلغ ${formatPrice(orderTotal)} عبر CliQ لطلب رقم #${orderId.slice(0, 8)}\nمرفق لقطة الشاشة للتأكيد 🌸`
        const cliqWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(cliqMessage)}`

        alert(`تم تسجيل طلبك بنجاح 🌸\n\nيرجى تحويل المبلغ عبر CliQ إلى:\nAlias: HUTHYFAO\n\nبعدها سيتم فتح واتساب لإرسال لقطة شاشة التحويل لتأكيد طلبك.`)
        window.open(cliqWhatsappUrl, '_blank')
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : `/tracking/${orderId}`)

      } else if (form.payment === 'cash') {
        alert('تم تسجيل طلبك بنجاح 🌸. سيتم الدفع نقداً عند استلام الباقة الفاخرة.')
        clearCart()
        router.push(userId ? `/profile?order=${orderId}` : `/tracking/${orderId}`)
      } else if (form.payment === 'card') {
        const ptRes = await fetch('/api/payment/paytabs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const ptData = await ptRes.json()

        if (!ptRes.ok) {
          const message = typeof ptData.error === 'string' ? ptData.error : 'فشل بدء عملية الدفع'
          throw new Error(message)
        }

        clearCart()
        if (ptData.redirectUrl) {
          window.location.href = ptData.redirectUrl // توجيه فوري لصفحة PayTabs الآمنة
        } else {
          router.push(userId ? `/profile?order=${orderId}` : `/tracking/${orderId}`)
        }
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الطلب'
      console.error('Checkout error:', err)
      alert(message + ' — يرجى المحاولة مرة أخرى أو التواصل معنا مباشرة.')
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods = [
    { id: 'card', label: 'بطاقة ائتمانية', icon: CreditCard, desc: 'Visa / Mastercard عبر PayTabs' },
    { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, desc: 'تأكيد فوري وفاتورة مباشرة' },
    { id: 'cliq', label: 'تطبيق CliQ', icon: Banknote, desc: 'تحويل يدوي عبر الـ Alias' },
    { id: 'cash', label: 'كاش عند الاستلام', icon: Banknote, desc: 'الدفع نقداً لسائق فلوري' },
  ]

  return (
    <div className="flore-checkout-page min-h-screen bg-flore-bg pb-24 font-noto text-right" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">

        <button
          onClick={() => router.push('/cart')}
          className="flex items-center gap-2 text-flore-text-secondary hover:text-flore-primary mb-8 font-medium text-sm transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" /> العودة للسلة
        </button>

        <div className="text-center mb-10">
          <p className="flore-eyebrow mb-3">CHECKOUT</p>
          <h1 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary mb-3">
            لحظات قليلة تفصلك عن إسعاد أحدهم
          </h1>
          <p className="text-flore-text-secondary text-sm">
            مراجعة آمنة وموثقة للطلب | جميع الأسعار بالدينار الأردني (JOD)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* معلومات التواصل */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <User className="h-4 w-4 text-flore-primary" />
              </span>
              معلومات التواصل
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-flore-text-primary mb-1.5">الاسم الكامل</label>
                <input
                  required type="text" value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none"
                  placeholder="محمد أحمد"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-flore-text-primary mb-1.5">رقم الهاتف</label>
                <input
                  required type="tel" value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none"
                  placeholder="0790000000" dir="ltr"
                />
              </div>
            </div>
          </section>

          {/* عنوان التوصيل */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <MapPin className="h-4 w-4 text-flore-primary" />
              </span>
              وجهة التوصيل
            </h2>
            <label className="flex items-center justify-between mb-4 cursor-pointer bg-flore-subtle/50 rounded-2xl p-3.5 border border-flore-border/50">
              <div>
                <p className="font-bold text-sm text-flore-text-primary">اطلب العنوان من المستلم</p>
                <p className="text-xs text-flore-text-secondary mt-0.5">سنرسل للمستلم رابطاً لإدخال عنوانه بنفسه</p>
              </div>
              <input
                type="checkbox"
                checked={form.askRecipientAddress}
                onChange={e => setForm(prev => ({ ...prev, askRecipientAddress: e.target.checked }))}
                className="w-5 h-5 rounded accent-flore-primary cursor-pointer"
              />
            </label>

            {form.askRecipientAddress ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-flore-text-primary mb-1.5">اسم المستلم</label>
                  <input
                    required
                    type="text"
                    value={form.recipientName}
                    onChange={e => setForm(prev => ({ ...prev, recipientName: e.target.value }))}
                    className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-flore-text-primary mb-1.5">رقم هاتف المستلم</label>
                  <input
                    required
                    type="tel"
                    value={form.recipientPhone}
                    onChange={e => setForm(prev => ({ ...prev, recipientPhone: e.target.value }))}
                    dir="ltr"
                    className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-flore-text-primary mb-1.5">المنطقة</label>
                  <select
                    value={form.region}
                    onChange={e => setForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none cursor-pointer"
                  >
                    <option value="amman">عمّان</option>
                    <option value="zarqa">الزرقاء</option>
                    <option value="irbid">إربد</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-flore-text-primary mb-1.5">العنوان بالتفصيل</label>
                  <textarea
                    required value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none resize-none"
                    rows={2} placeholder="الشارع، رقم البناء، المعالم القريبة"
                  />
                </div>
              </div>
            )}
          </section>

          {/* طريقة الدفع */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <CreditCard className="h-4 w-4 text-flore-primary" />
              </span>
              طريقة الدفع
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {paymentMethods.map(method => {
                const Icon = method.icon
                const isSelected = form.payment === method.id
                return (
                  <button
                    key={method.id} type="button"
                    onClick={() => setForm(prev => ({ ...prev, payment: method.id }))}
                    className={`rounded-2xl p-4 text-center border transition-all duration-200 ease-flore flex flex-col items-center justify-center gap-2 cursor-pointer ${isSelected
                      ? 'border-flore-primary bg-flore-subtle shadow-luxury-soft'
                      : 'border-flore-border bg-flore-card hover:border-flore-primary/40'
                      }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-flore-primary' : 'text-flore-text-secondary'}`} />
                    <p className={`font-bold text-xs md:text-sm ${isSelected ? 'text-flore-primary' : 'text-flore-text-primary'}`}>
                      {method.label}
                    </p>
                    <p className="text-[10px] text-flore-text-secondary leading-4 hidden md:block">
                      {method.desc}
                    </p>
                  </button>
                )
              })}
            </div>

            {form.payment === 'cliq' && (
              <div className="mt-4 p-4 bg-flore-bg rounded-xl border border-flore-border text-center">
                <p className="text-sm text-flore-text-secondary mb-1">حوّل عبر تطبيق بنكك إلى:</p>
                <p className="font-bold text-flore-primary text-lg" dir="ltr">HUTHYFAO</p>
                <p className="text-xs text-flore-text-secondary mt-2">
                  بعد إتمام الطلب سيُفتح واتساب تلقائياً لإرسال إثبات التحويل
                </p>
              </div>
            )}
          </section>

          {/* وقت التوصيل */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <Clock className="h-4 w-4 text-flore-primary" />
              </span>
              وقت التوصيل المفضّل
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: '09:00-13:00', label: 'صباحاً', desc: '9:00 - 1:00' },
                { value: '13:00-17:00', label: 'ظهراً', desc: '1:00 - 5:00' },
                { value: '17:00-21:00', label: 'مساءً', desc: '5:00 - 9:00' },
                { value: '', label: 'أي وقت', desc: 'حسب توفر السائق' },
              ].map(slot => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, deliveryTimeSlot: slot.value }))}
                  className={`p-3 rounded-2xl border text-center transition-all duration-200 ease-flore cursor-pointer ${form.deliveryTimeSlot === slot.value
                    ? 'border-flore-primary bg-flore-subtle'
                    : 'border-flore-border bg-flore-bg hover:border-flore-primary/40'
                    }`}
                >
                  <p className="font-bold text-sm text-flore-text-primary">{slot.label}</p>
                  <p className="text-[11px] text-flore-text-secondary mt-0.5 flore-price" dir="ltr">{slot.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* هدية مجهولة المصدر */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold text-flore-text-primary">إخفاء هويتي عن المستلم</p>
                <p className="text-xs text-flore-text-secondary mt-1">لن نشارك اسمك أو رقمك مع المستلم حتى لو سأل</p>
              </div>
              <input
                type="checkbox"
                checked={form.isAnonymousGift}
                onChange={e => setForm(prev => ({ ...prev, isAnonymousGift: e.target.checked }))}
                className="w-5 h-5 rounded accent-flore-primary"
              />
            </label>
          </section>

          {/* رسالة الإهداء */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <MessageSquare className="h-4 w-4 text-flore-primary" />
              </span>
              رسالة كرت الإهداء (اختياري)
            </h2>
            <textarea
              value={form.giftMessage}
              onChange={e => setForm(prev => ({ ...prev, giftMessage: e.target.value }))}
              className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none resize-none mb-4"
              rows={2} placeholder="اكتب كلمات الإهداء التي ترغب في إرفاقها مع الباقة..."
            />

            <p className="text-sm text-flore-text-secondary mb-3 flex items-center gap-1.5">
              <Mic className="h-4 w-4 text-flore-primary shrink-0" />
              أضف رسالة صوتية أو فيديو قصير — سيصل المُستقبل رمز QR على البطاقة يستمع فيه لصوتك
            </p>
            <GiftMediaRecorder onRecorded={(blob, type) => setGiftMedia({ blob, type })} />
          </section>

          {/* ملاحظات */}
          <section className="bg-flore-card rounded-3xl p-6 shadow-luxury-soft border border-flore-border/70">
            <h2 className="font-amiri text-xl font-bold mb-5 flex items-center gap-2.5 text-flore-text-primary">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-flore-subtle">
                <MessageCircle className="h-4 w-4 text-flore-primary" />
              </span>
              ملاحظات التوصيل (اختياري)
            </h2>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-2xl border border-flore-border bg-flore-bg p-3 text-sm transition-all duration-200 hover:border-flore-sage focus:border-flore-primary/60 focus:ring-4 focus:ring-flore-primary/10 focus:outline-none resize-none"
              rows={2} placeholder="مثال: يرجى الاتصال قبل الوصول..."
            />
          </section>

          {/* الملخص وزر الإرسال */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-bl from-flore-primary to-flore-primary-dark text-white rounded-3xl p-6 md:p-8 shadow-luxury"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-flore-gold/15 blur-3xl" />
            <div className="relative">
            <div className="flex justify-between items-center mb-3 text-sm">
              <span className="text-white/75">عدد العناصر</span>
              <span className="font-bold text-base"><span className="flore-price" dir="ltr">{items.reduce((s, i) => s + i.quantity, 0)}</span></span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/75 text-sm">الإجمالي</span>
              <span className="text-3xl font-bold flore-price" dir="ltr">{formatPrice(getTotal())}</span>
            </div>
            <p className="text-white/60 text-[11px] mb-6">
              الأسعار النهائية تُحتسب وتُؤكَّد من السيرفر عند الإرسال
            </p>
            <Button
              type="submit" disabled={loading} size="lg"
              className="w-full bg-white text-flore-primary hover:bg-flore-gold hover:text-[#2B2B27] transition-all font-bold text-base py-4"
            >
              {loading ? 'جاري تجهيز هديتك...' : 'أرسل هديتك الآن'}
            </Button>
            </div>
          </motion.div>

        </form>
      </div>
    </div>
  )
}