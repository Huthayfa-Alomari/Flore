'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'

const LiveMap = dynamic(
  () => import('@/components/tracking/LiveMap').then(module => module.LiveMap),
  { ssr: false }
)

type TrackingOrder = {
  id: string
  customerName: string | null
  items: Array<{
    product_id?: string
    name?: string
    image?: string
    price?: number
    qty?: number
    customization?: unknown
  }>
  total: number
  status: string
  paymentMethod: string
  paymentStatus: string
  deliveryRegion: string | null
  deliveryTimeSlot: string | null
  giftMessage: string | null
  isAnonymousGift: boolean
  awaitingRecipientAddress: boolean
  recipientName: string | null
  driverLat: number | null
  driverLng: number | null
  estimatedArrival: string | null
  createdAt: string
  updatedAt: string
}

const stages = [
  { key: 'received', label: 'تم استلام الطلب', icon: Package },
  { key: 'arranging', label: 'داخل الأتيليه', icon: Clock3 },
  { key: 'departed', label: 'خرج للتوصيل', icon: Truck },
  { key: 'delivered', label: 'تم التسليم', icon: Check },
]

const statusRank: Record<string, number> = {
  pending: 0,
  awaiting_address: 0,
  received: 0,
  arranging: 1,
  scenting: 1,
  sealing: 1,
  departed: 2,
  en_route: 2,
  nearby: 2,
  arrived: 2,
  delivered: 3,
  cancelled: -1,
}

function paymentLabel(method: string) {
  if (method === 'card') return 'بطاقة'
  if (method === 'cliq') return 'CliQ'
  if (method === 'cash') return 'عند الاستلام'
  return 'واتساب'
}

export function OrderTrackingExperience({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams()
  const paymentResult = searchParams.get('payment')
  const queryToken = searchParams.get('token')

  const [trackingToken, setTrackingToken] = useState<string | null>(queryToken)
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<TrackingOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [requiresPhone, setRequiresPhone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = window.localStorage.getItem(`flore_tracking_${orderId}`)
    if (queryToken) {
      window.localStorage.setItem(`flore_tracking_${orderId}`, queryToken)
      setTrackingToken(queryToken)
    } else if (stored) {
      setTrackingToken(stored)
    }
  }, [orderId, queryToken])

  const fetchOrder = useCallback(async (options?: { silent?: boolean; phoneOverride?: string }) => {
    const token = queryToken || trackingToken || window.localStorage.getItem(`flore_tracking_${orderId}`) || undefined
    const phoneValue = options?.phoneOverride || phone || undefined
    if (!options?.silent) setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingToken: token, phone: phoneValue }),
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 403) setRequiresPhone(true)
        throw new Error(typeof data?.error === 'string' ? data.error : 'تعذر تحميل الطلب.')
      }
      setOrder(data.order as TrackingOrder)
      setRequiresPhone(false)
    } catch (requestError) {
      if (!options?.silent) setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الطلب.')
    } finally {
      if (!options?.silent) setLoading(false)
    }
  }, [orderId, phone, queryToken, trackingToken])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  useEffect(() => {
    if (!order) return
    const interval = window.setInterval(() => fetchOrder({ silent: true }), 30_000)
    return () => window.clearInterval(interval)
  }, [fetchOrder, order])

  const currentRank = order ? (statusRank[order.status] ?? 0) : 0
  const shortId = orderId.slice(0, 8).toUpperCase()
  const items = useMemo(() => Array.isArray(order?.items) ? order!.items : [], [order])

  if (loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-flore-bg" dir="rtl">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-flore-text-primary/15 border-t-flore-text-primary" />
          <p className="mt-4 text-sm text-flore-text-secondary">نحدّث رحلة الهدية</p>
        </div>
      </div>
    )
  }

  if (!order && requiresPhone) {
    return (
      <main className="grid min-h-screen place-items-center bg-flore-bg px-4 py-12" dir="rtl">
        <div className="w-full max-w-md rounded-[2rem] border border-flore-border bg-flore-card p-6 shadow-luxury sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-flore-bg"><ShieldCheck className="h-5 w-5" /></div>
          <h1 className="mt-5 font-amiri text-3xl font-semibold">تحقق بسيط قبل عرض الطلب</h1>
          <p className="mt-3 text-sm leading-7 text-flore-text-secondary">لحماية تفاصيل الهدية، أدخل رقم الهاتف المستخدم عند الطلب.</p>
          <form onSubmit={event => { event.preventDefault(); fetchOrder({ phoneOverride: phone }) }} className="mt-6">
            <input autoFocus required dir="ltr" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} className="min-h-12 w-full rounded-2xl border border-flore-border bg-flore-bg px-4 text-left outline-none focus:border-flore-gold" placeholder="0790000000" />
            {error && <p className="mt-3 text-sm text-flore-error">{error}</p>}
            <button type="submit" className="mt-4 min-h-12 w-full rounded-full bg-flore-primary text-sm font-semibold text-white">عرض رحلة الطلب</button>
          </form>
        </div>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="grid min-h-screen place-items-center bg-flore-bg px-4 text-center" dir="rtl">
        <div><h1 className="font-amiri text-3xl font-semibold">تعذر عرض الطلب</h1><p className="mt-3 text-sm text-flore-text-secondary">{error || 'أعد المحاولة من رابط التتبع الخاص بك.'}</p></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-flore-bg pb-20 text-flore-text-primary" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-14">
        {paymentResult === 'success' && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-flore-success/20 bg-flore-success/5 px-4 py-3 text-sm text-flore-success">
            <Check className="h-4 w-4" /> تم استلام نتيجة الدفع. يتم تحديث حالة الطلب تلقائيًا.
          </div>
        )}
        {paymentResult === 'failed' && (
          <div className="mb-6 rounded-2xl border border-flore-error/20 bg-flore-error/5 px-4 py-3 text-sm text-flore-error">لم يكتمل الدفع بالبطاقة. طلبك ما زال محفوظًا ويمكنك التواصل معنا لإكماله.</div>
        )}

        <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9A8E82]">ORDER JOURNEY · {shortId}</p>
            <h1 className="mt-3 font-amiri text-4xl font-semibold sm:text-5xl">رحلة هديتك</h1>
            <p className="mt-3 text-sm text-flore-text-secondary">آخر تحديث {formatDate(order.updatedAt || order.createdAt)}</p>
          </div>
          <div className="rounded-full border border-flore-border bg-flore-card px-4 py-2 text-xs font-semibold">{formatPrice(order.total)}</div>
        </header>

        {order.awaitingRecipientAddress && !order.deliveryRegion && (
          <div className="mb-7 rounded-[1.5rem] border border-flore-gold/25 bg-flore-gold/5 p-5">
            <p className="text-sm font-semibold">بانتظار عنوان المستلم</p>
            <p className="mt-1 text-xs leading-6 text-flore-text-secondary">سنبدأ مرحلة التوصيل فور وصول العنوان من {order.recipientName || 'المستلم'}.</p>
          </div>
        )}

        {order.status === 'cancelled' ? (
          <div className="mb-7 rounded-[1.5rem] border border-flore-error/20 bg-flore-error/5 p-5 text-sm text-flore-error">تم إلغاء هذا الطلب. تواصل مع FLORÉ إذا كنت تحتاج تفاصيل إضافية.</div>
        ) : (
          <section className="mb-7 rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
            <div className="grid gap-5 sm:grid-cols-4">
              {stages.map((stage, index) => {
                const Icon = stage.icon
                const complete = currentRank >= index
                const current = currentRank === index && order.status !== 'delivered'
                return (
                  <div key={stage.key} className="relative flex gap-3 sm:block">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border ${complete ? 'border-flore-primary bg-flore-primary text-white' : 'border-flore-border bg-flore-bg text-flore-text-secondary'}`}>
                      {complete && !current ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="pt-1 sm:mt-3 sm:pt-0"><p className="text-sm font-semibold">{stage.label}</p><p className="mt-1 text-xs text-flore-text-secondary">{complete ? 'مكتمل أو جارٍ' : 'بانتظار المرحلة'}</p></div>
                    {index < stages.length - 1 && <div className={`absolute hidden h-px w-[calc(100%-3rem)] sm:block ${complete ? 'bg-flore-primary' : 'bg-flore-border'}`} style={{ top: 22, left: 'calc(-50% + 1.5rem)' }} />}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-7">
            {order.driverLat !== null && order.driverLng !== null && currentRank >= 2 && (
              <section className="overflow-hidden rounded-[2rem] border border-flore-border bg-flore-card shadow-luxury">
                <div className="flex items-center justify-between p-5 sm:p-6">
                  <div><h2 className="font-amiri text-2xl font-semibold">المندوب في الطريق</h2><p className="mt-1 text-xs text-flore-text-secondary">الموقع يظهر أثناء مرحلة التوصيل فقط.</p></div>
                  <MapPin className="h-5 w-5 text-flore-gold-dark" />
                </div>
                <div className="h-72"><LiveMap lat={order.driverLat} lng={order.driverLng} /></div>
              </section>
            )}

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury sm:p-7">
              <h2 className="font-amiri text-2xl font-semibold">محتوى الطلب</h2>
              <div className="mt-5 divide-y divide-flore-border">
                {items.map((item, index) => (
                  <div key={`${item.product_id || item.name}-${index}`} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div><p className="text-sm font-semibold leading-6">{item.name || 'عنصر من FLORÉ'}</p><p className="mt-1 text-xs text-flore-text-secondary">الكمية {item.qty || 1}</p></div>
                    <p className="shrink-0 text-sm">{formatPrice(Number(item.price || 0) * Number(item.qty || 1))}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury">
              <h2 className="font-amiri text-2xl font-semibold">تفاصيل مختصرة</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">رقم الطلب</dt><dd className="font-semibold" dir="ltr">#{shortId}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">الدفع</dt><dd>{paymentLabel(order.paymentMethod)}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">حالة الدفع</dt><dd>{order.paymentStatus === 'paid' ? 'مدفوع' : order.paymentStatus === 'failed' ? 'فشل' : 'بانتظار التأكيد'}</dd></div>
                {order.deliveryRegion && <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">المدينة</dt><dd>{order.deliveryRegion}</dd></div>}
                {order.deliveryTimeSlot && <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">الفترة</dt><dd>{order.deliveryTimeSlot}</dd></div>}
                {order.estimatedArrival && <div className="flex justify-between gap-4"><dt className="text-flore-text-secondary">الوصول المتوقع</dt><dd>{formatDate(order.estimatedArrival)}</dd></div>}
              </dl>
            </section>

            <section className="rounded-[2rem] border border-flore-border bg-flore-card p-5 shadow-luxury">
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><p className="text-sm font-semibold">الإجمالي النهائي</p></div>
              <p className="mt-3 font-amiri text-4xl font-semibold">{formatPrice(order.total)}</p>
              <p className="mt-2 text-xs leading-5 text-flore-text-secondary">هذا هو الإجمالي الذي ثبته الخادم عند إنشاء الطلب.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
