import Image from 'next/image'
import Link from 'next/link'
import {
    Package,
    Flower2,
    Truck,
    CheckCircle2,
    Check,
    SearchX,
    CreditCard,
    MapPin,
    Clock,
    Phone,
    Calendar,
    AlertCircle,
    RefreshCw,
    MessageSquare,
} from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { LiveMap } from '@/components/tracking/LiveMap'
import { formatDate, orderStatuses } from '@/lib/utils'
import type { Order } from '@/types'

export const dynamic = 'force-dynamic'

/* ── رحلة الطلب — أربع محطات أنيقة بدل قائمة حالات طويلة ── */
interface JourneyStep {
    icon: typeof Package
    title: string
    note: string
    statuses: readonly string[]
}

const JOURNEY: readonly JourneyStep[] = [
    {
        icon: Package,
        title: 'تم تسجيل الطلب',
        note: 'استلمنا طلبك وسُجّل في دفتر الأتيليه',
        statuses: ['pending', 'received'],
    },
    {
        icon: Flower2,
        title: 'جاري التنسيق والتعطير',
        note: 'فنّيو فلوري يرتّبون أزهارك بعناية ويُذيلونها بعطرها الخاص',
        statuses: ['arranging', 'scenting', 'sealing'],
    },
    {
        icon: Truck,
        title: 'خرجت للتوصيل',
        note: 'الباقة الآن في طريقها إليك مع سائقنا',
        statuses: ['departed', 'en_route', 'nearby', 'arrived'],
    },
    {
        icon: CheckCircle2,
        title: 'تم التسليم',
        note: 'وصلت الهدية إلى وجهتها وأسعدت قلباً ما',
        statuses: ['delivered'],
    },
]

const DELIVERY_ACTIVE = ['departed', 'en_route', 'nearby', 'arrived']

const PAYMENT_LABELS: Record<string, string> = {
    card: 'بطاقة ائتمانية',
    whatsapp: 'واتساب',
    cliq: 'تحويل CliQ',
    cash: 'نقداً عند الاستلام',
}

const REGION_LABELS: Record<string, string> = {
    amman: 'عمّان',
    zarqa: 'الزرقاء',
    irbid: 'إربد',
    other: 'أخرى',
}

/* نبرة لونية هادئة لشارة الحالة — دون ألوان صارخة */
function statusTone(status: string): string {
    if (status === 'delivered')
        return 'border-flore-success/25 bg-flore-success/10 text-flore-success'
    if (status === 'cancelled')
        return 'border-flore-error/25 bg-flore-error/10 text-flore-error'
    if (DELIVERY_ACTIVE.includes(status))
        return 'border-flore-gold/30 bg-flore-gold/15 text-flore-gold-dark'
    if (status === 'pending')
        return 'border-flore-border bg-flore-subtle text-flore-text-secondary'
    return 'border-flore-primary/20 bg-flore-subtle text-flore-primary'
}

const pillPrimary =
    'inline-flex items-center justify-center gap-2 rounded-full bg-flore-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.97] cursor-pointer'
const pillOutline =
    'inline-flex items-center justify-center gap-2 rounded-full border border-flore-border bg-flore-card px-6 py-3 text-sm font-medium text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:bg-flore-subtle/50 active:scale-[0.97] cursor-pointer'

export default async function TrackingPage({
    params,
}: {
    params: { orderId: string }
}) {
    const supabase = createServiceClient()

    let order: Order | null = null
    let fetchFailed = false
    try {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('id', params.orderId)
            .single()
        order = (data as Order | null) ?? null
    } catch {
        fetchFailed = true
    }

    /* ── حالة خطأ الاتصال — رسالة ودّية مع إعادة محاولة ── */
    if (fetchFailed) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-flore-bg px-4" dir="rtl">
                <div className="max-w-md w-full rounded-3xl border border-flore-error/20 bg-flore-error/5 p-8 text-center animate-fade-up">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-flore-error/20 bg-flore-card">
                        <AlertCircle className="h-8 w-8 text-flore-error" />
                    </div>
                    <p className="flore-eyebrow mb-3">TRACK ORDER</p>
                    <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                        تعذّر جلب تفاصيل الطلب
                    </h1>
                    <p className="mb-8 text-sm leading-relaxed text-flore-text-secondary">
                        حدث خلل مؤقت في الاتصال، يرجى المحاولة مرة أخرى بعد لحظات.
                    </p>
                    <Link href={`/tracking/${params.orderId}`} className={pillPrimary}>
                        <RefreshCw className="h-4 w-4" />
                        إعادة المحاولة
                    </Link>
                </div>
            </div>
        )
    }

    /* ── طلب غير موجود — حالة فارغة أنيقة ── */
    if (!order) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-flore-bg px-4" dir="rtl">
                <div className="max-w-md text-center animate-fade-up">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
                        <SearchX className="h-9 w-9 text-flore-primary" />
                    </div>
                    <p className="flore-eyebrow mb-3">TRACK ORDER</p>
                    <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">
                        لم نعثر على طلبك
                    </h1>
                    <p className="mb-8 text-sm leading-relaxed text-flore-text-secondary">
                        تأكد من رقم الطلب أو تصفح مجموعتنا — فريق الأتيليه جاهز للمساعدة دائماً.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link href="/catalog" className={pillPrimary}>
                            تصفح المجموعة
                        </Link>
                        <Link href="/" className={pillOutline}>
                            العودة للرئيسية
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const statusLabel =
        orderStatuses.find((s) => s.value === order!.status)?.label || order!.status
    const activeIdx = JOURNEY.findIndex((m) => m.statuses.includes(order!.status))
    const isCancelled = order.status === 'cancelled'
    const isDelivered = order.status === 'delivered'
    const CurrentIcon = activeIdx >= 0 ? JOURNEY[activeIdx].icon : Package

    const heroNote = isCancelled
        ? 'نعتذر عن إلغاء هذا الطلب — تواصل معنا وسنسعد بترتيب باقة جديدة لك.'
        : isDelivered
          ? 'وصلت الباقة إلى وجهتها — شكراً لثقتك بفلوري.'
          : (activeIdx >= 0 ? JOURNEY[activeIdx].note : 'طلبك قيد الرعاية الآن، سنبقيك على اطلاع مع كل خطوة.')

    const driverLat = order.driver_lat
    const driverLng = order.driver_lng
    const showMap =
        driverLat != null && driverLng != null && DELIVERY_ACTIVE.includes(order.status)

    return (
        <div className="flore-container py-10 md:py-14">
            {/* ── ترويسة الصفحة ── */}
            <header className="mb-10 text-center animate-fade-up">
                <p className="flore-eyebrow mb-3">TRACK ORDER</p>
                <h1 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                    تتبّع طلبك
                </h1>
                <p className="mt-3 text-sm text-flore-text-secondary">
                    تابع رحلة باقتك من الأتيليه حتى باب المنزل
                </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* ── العمود الرئيسي ── */}
                <div className="space-y-6 lg:col-span-2">
                    {/* بطاقة الحالة الحالية */}
                    <section className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft animate-fade-up md:p-8">
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="mb-1 text-xs text-flore-text-secondary">رقم الطلب</p>
                                <p className="font-amiri text-2xl font-bold text-flore-text-primary">
                                    <span className="flore-price" dir="ltr">
                                        #{order.id.slice(0, 8)}
                                    </span>
                                </p>
                            </div>
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium ${statusTone(order.status)}`}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {statusLabel}
                            </span>
                        </div>

                        <div className="flex items-start gap-4 border-t border-flore-border/70 pt-6">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-flore-subtle text-flore-primary">
                                <CurrentIcon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-amiri text-xl font-bold text-flore-text-primary">
                                    {isCancelled ? 'تم إلغاء هذا الطلب' : statusLabel}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-flore-text-secondary">
                                    {heroNote}
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-flore-text-secondary/80">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formatDate(order.updated_at)}
                                    </span>
                                    {order.estimated_arrival && (
                                        <span className="inline-flex items-center gap-1.5 text-flore-gold-dark">
                                            <Clock className="h-3.5 w-3.5" />
                                            الوصول المتوقع: {order.estimated_arrival}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* رحلة الطلب — خطوات أنيقة */}
                    {isCancelled ? (
                        <section className="rounded-3xl border border-flore-error/20 bg-flore-error/5 p-8 text-center animate-fade-up">
                            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-flore-error" />
                            <h2 className="font-amiri text-xl font-bold text-flore-text-primary mb-2">
                                تم إيقاف رحلة هذا الطلب
                            </h2>
                            <p className="text-sm leading-relaxed text-flore-text-secondary">
                                نعتذر عن الإلغاء — تواصل معنا وسنسعد بترتيب باقة جديدة تليق بالمناسبة.
                            </p>
                        </section>
                    ) : (
                        <section className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft animate-fade-up md:p-8">
                            <h2 className="font-amiri mb-6 text-xl font-bold text-flore-text-primary">
                                رحلة الطلب
                            </h2>
                            <ol>
                                {JOURNEY.map((step, i) => {
                                    const Icon = step.icon
                                    const done = activeIdx > i
                                    const current = activeIdx === i
                                    const isLast = i === JOURNEY.length - 1
                                    return (
                                        <li key={step.title} className="flex gap-5">
                                            {/* عمود النقاط والوصلة */}
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                                                        done
                                                            ? 'bg-flore-primary text-white'
                                                            : current
                                                              ? 'bg-flore-primary text-white ring-4 ring-flore-primary/15'
                                                              : 'border border-flore-border bg-flore-card text-flore-text-secondary/50'
                                                    }`}
                                                >
                                                    {done ? (
                                                        <Check className="h-5 w-5" strokeWidth={2.5} />
                                                    ) : (
                                                        <Icon className="h-5 w-5" />
                                                    )}
                                                </div>
                                                {!isLast && (
                                                    <div
                                                        className={`my-1 w-px flex-1 ${
                                                            done || current
                                                                ? 'bg-flore-primary/30'
                                                                : 'bg-flore-border'
                                                        }`}
                                                    />
                                                )}
                                            </div>

                                            {/* المحتوى */}
                                            <div className={isLast ? 'pb-1 pt-1.5' : 'pb-8 pt-1.5'}>
                                                <p
                                                    className={`font-amiri text-lg font-bold leading-snug ${
                                                        done || current
                                                            ? 'text-flore-text-primary'
                                                            : 'text-flore-text-secondary/60'
                                                    }`}
                                                >
                                                    {step.title}
                                                    {current && (
                                                        <span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-flore-gold-dark align-middle" />
                                                    )}
                                                </p>
                                                <p
                                                    className={`mt-0.5 text-sm leading-relaxed ${
                                                        done || current
                                                            ? 'text-flore-text-secondary'
                                                            : 'text-flore-text-secondary/50'
                                                    }`}
                                                >
                                                    {step.note}
                                                </p>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ol>
                        </section>
                    )}

                    {/* خريطة السائق الحية — عند توفر الموقع */}
                    {showMap && driverLat != null && driverLng != null && (
                        <section className="rounded-3xl border border-flore-border/70 bg-flore-card p-2 shadow-luxury-soft animate-fade-up">
                            <div className="h-72 md:h-80">
                                <LiveMap lat={driverLat} lng={driverLng} />
                            </div>
                        </section>
                    )}
                </div>

                {/* ── العمود الجانبي ── */}
                <aside className="space-y-6">
                    {/* ملخص الباقة */}
                    <section className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft animate-fade-up">
                        <h2 className="font-amiri mb-5 text-xl font-bold text-flore-text-primary">
                            تفاصيل الباقة
                        </h2>
                        <ul className="space-y-4">
                            {order.items.map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    {item.image ? (
                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-flore-border/60">
                                            <Image
                                                src={item.image}
                                                alt={item.name}
                                                fill
                                                className="object-cover"
                                                sizes="56px"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-flore-subtle">
                                            <Flower2 className="h-6 w-6 text-flore-primary" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-flore-text-primary">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-flore-text-secondary">
                                            الكمية: <span className="flore-price">{item.qty}</span>
                                        </p>
                                    </div>
                                    <p className="whitespace-nowrap text-sm font-bold text-flore-text-primary">
                                        <span className="flore-price" dir="ltr">
                                            {(item.price * item.qty).toFixed(2)}
                                        </span>{' '}
                                        د.أ
                                    </p>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-5 flex items-center justify-between border-t border-flore-border/70 pt-5">
                            <span className="text-sm font-medium text-flore-text-secondary">الإجمالي</span>
                            <span className="font-amiri text-2xl font-bold text-flore-primary">
                                <span className="flore-price" dir="ltr">
                                    {order.total.toFixed(2)}
                                </span>{' '}
                                د.أ
                            </span>
                        </div>

                        {order.gift_message && (
                            <div className="mt-5 rounded-2xl bg-flore-subtle/70 p-4">
                                <p className="mb-1 flex items-center gap-1.5 text-xs text-flore-text-secondary">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    رسالة الإهداء
                                </p>
                                <p className="font-amiri text-base leading-relaxed text-flore-text-primary">
                                    &quot;{order.gift_message}&quot;
                                </p>
                            </div>
                        )}
                    </section>

                    {/* معلومات التوصيل */}
                    <section className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft animate-fade-up">
                        <h2 className="font-amiri mb-2 text-xl font-bold text-flore-text-primary">
                            معلومات التوصيل
                        </h2>
                        <ul className="divide-y divide-flore-border/60">
                            <li className="flex items-center gap-3 py-3.5">
                                <CreditCard className="h-4 w-4 shrink-0 text-flore-primary" />
                                <span className="text-sm text-flore-text-secondary">طريقة الدفع</span>
                                <span className="mr-auto text-sm font-medium text-flore-text-primary">
                                    {PAYMENT_LABELS[order.payment_method] || order.payment_method}
                                </span>
                            </li>
                            {order.delivery_region && (
                                <li className="flex items-center gap-3 py-3.5">
                                    <MapPin className="h-4 w-4 shrink-0 text-flore-primary" />
                                    <span className="text-sm text-flore-text-secondary">المنطقة</span>
                                    <span className="mr-auto text-sm font-medium text-flore-text-primary">
                                        {REGION_LABELS[order.delivery_region] || order.delivery_region}
                                    </span>
                                </li>
                            )}
                            {order.delivery_time_slot && (
                                <li className="flex items-center gap-3 py-3.5">
                                    <Clock className="h-4 w-4 shrink-0 text-flore-primary" />
                                    <span className="text-sm text-flore-text-secondary">وقت التوصيل</span>
                                    <span className="flore-price mr-auto text-sm font-medium text-flore-text-primary">
                                        {order.delivery_time_slot}
                                    </span>
                                </li>
                            )}
                            <li className="flex items-center gap-3 py-3.5">
                                <Phone className="h-4 w-4 shrink-0 text-flore-primary" />
                                <span className="text-sm text-flore-text-secondary">رقم التواصل</span>
                                <span className="flore-price mr-auto text-sm font-medium text-flore-text-primary">
                                    {order.customer_phone}
                                </span>
                            </li>
                            {order.delivery_address && (
                                <li className="flex items-start gap-3 py-3.5">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-flore-primary" />
                                    <span className="mt-0.5 text-sm text-flore-text-secondary">العنوان</span>
                                    <span className="mr-auto max-w-[55%] text-left text-sm font-medium leading-relaxed text-flore-text-primary">
                                        {order.delivery_address}
                                    </span>
                                </li>
                            )}
                        </ul>
                    </section>
                </aside>
            </div>
        </div>
    )
}
