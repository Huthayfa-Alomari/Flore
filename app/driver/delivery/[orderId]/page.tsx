'use client'

import { Fragment, useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navigation, RadioTower, CheckCircle2, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// خطوات رحلة التوصيل — تُستخدم في الخط الزمني أعلى الصفحة
const deliverySteps = [
  { label: 'بدء الرحلة', icon: Navigation },
  { label: 'مشاركة الموقع', icon: RadioTower },
  { label: 'تم التسليم', icon: CheckCircle2 },
]

export default function DriverDeliveryPage() {
    const params = useParams()
    const router = useRouter()
    const orderId = params.orderId as string
    const [isTracking, setIsTracking] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState<string | null>(null)
    const [finishing, setFinishing] = useState(false)
    const watchIdRef = useRef<number | null>(null)

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError('المتصفح لا يدعم تحديد الموقع')
            return
        }

        setError(null)
        setIsTracking(true)

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                try {
                    const response = await fetch('/api/driver/update-location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId,
                            lat: latitude,
                            lng: longitude,
                        }),
                    })
                    if (response.ok) {
                        setLastUpdate(new Date().toLocaleTimeString('ar-JO'))
                    }
                } catch (err) {
                    console.error('Failed to update location:', err)
                }
            },
            (err) => {
                setError('تعذر الوصول لموقعك — تأكد من تفعيل صلاحية الموقع')
                console.error(err)
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 15000,
            }
        )
    }

    const stopTrackingOnly = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setIsTracking(false)
    }

    const handleFinishDelivery = async () => {
        if (finishing) return
        setFinishing(true)
        setError(null)

        stopTrackingOnly()

        try {
            const response = await fetch('/api/driver/complete-delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'فشل تحديث حالة الطلب')
            }

            router.push('/driver/deliveries')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'حدث خطأ أثناء إنهاء التوصيل'
            setError(message)
            setFinishing(false)
        }
    }

    // إعادة المحاولة بعد الخطأ — تركّب الدالتين الموجودتين دون تغيير منطقهما
    const handleRetry = () => {
        if (isTracking) stopTrackingOnly()
        startTracking()
    }

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [])

    // الخطوة الحالية في رحلة التوصيل: 0 قبل البدء، 1 أثناء المشاركة، 2 عند الإنهاء
    const currentStep = !isTracking ? 0 : finishing ? 2 : 1

    return (
        <div className="max-w-md mx-auto px-4 py-10 md:py-14" dir="rtl">
            {/* الترويسة */}
            <div className="text-center mb-8">
                <p className="flore-eyebrow mb-3">Live Delivery</p>
                <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-2">
                    توصيل الطلب <span className="flore-price" dir="ltr">#{orderId.slice(0, 8)}</span>
                </h1>
                <p className="text-flore-text-secondary text-sm leading-relaxed">
                    فعّل مشاركة الموقع ليتمكن الزبون من تتبع طلبه لحظياً
                </p>
            </div>

            {/* الخط الزمني لرحلة التوصيل */}
            <div className="bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-6 mb-6">
                <div className="flex items-start justify-center" aria-label="مراحل التوصيل">
                    {deliverySteps.map((step, i) => {
                        const Icon = step.icon
                        const done = i < currentStep
                        const active = i === currentStep
                        return (
                            <Fragment key={step.label}>
                                {/* الخطوة */}
                                <div className="flex flex-col items-center w-16 shrink-0">
                                    <span
                                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 ease-flore ${
                                            done
                                                ? 'bg-flore-primary text-white border border-flore-primary shadow-luxury-soft'
                                                : active
                                                    ? 'bg-flore-subtle text-flore-primary border-2 border-flore-gold ring-4 ring-flore-gold/20'
                                                    : 'bg-flore-card text-flore-text-secondary/50 border border-flore-border'
                                        }`}
                                        aria-current={active ? 'step' : undefined}
                                    >
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span
                                        className={`mt-2 text-[11px] font-medium text-center leading-tight transition-colors duration-300 ease-flore ${
                                            done || active ? 'text-flore-text-primary' : 'text-flore-text-secondary/60'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {/* الوصل بين الخطوات */}
                                {i < deliverySteps.length - 1 && (
                                    <div className="flex-1 min-w-[1.5rem] flex items-center justify-center h-11" aria-hidden="true">
                                        <span
                                            className={`h-px w-full transition-colors duration-300 ease-flore ${
                                                i < currentStep ? 'bg-flore-primary' : 'bg-flore-border'
                                            }`}
                                        />
                                    </div>
                                )}
                            </Fragment>
                        )
                    })}
                </div>
            </div>

            {/* حالة الخطأ */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-flore-error/10 border border-flore-error/20 rounded-2xl p-4 mb-6 flex flex-col gap-3 text-center"
                    role="alert"
                >
                    <p className="text-sm text-flore-error leading-relaxed">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleRetry} className="gap-2 self-center">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        إعادة المحاولة
                    </Button>
                </motion.div>
            )}

            {!isTracking ? (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
                    className="bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-6 text-center"
                >
                    <div className="h-16 w-16 rounded-full bg-flore-subtle flex items-center justify-center mx-auto mb-5">
                        <Navigation className="h-7 w-7 text-flore-primary" aria-hidden="true" />
                    </div>
                    <h2 className="font-amiri text-xl font-bold text-flore-text-primary mb-1.5">جاهز للانطلاق؟</h2>
                    <p className="text-sm text-flore-text-secondary leading-relaxed mb-6">
                        عند بدء المشاركة سيتم إرسال موقعك للزبون لحظة بلحظة حتى إتمام التوصيل
                    </p>
                    <Button
                        onClick={startTracking}
                        size="lg"
                        className="w-full h-14 text-base gap-2"
                    >
                        <Navigation className="h-5 w-5" aria-hidden="true" />
                        ابدأ مشاركة الموقع
                    </Button>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
                    className="space-y-4"
                >
                    {/* بطاقة المشاركة الحية */}
                    <div className="bg-flore-subtle/70 border border-flore-primary/20 rounded-2xl p-4 flex items-center gap-3">
                        <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-flore-primary opacity-60" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-flore-primary" />
                        </span>
                        <div className="min-w-0">
                            <p className="font-bold text-flore-text-primary">جاري المشاركة الحية</p>
                            {lastUpdate && (
                                <p className="text-xs text-flore-text-secondary mt-0.5">
                                    آخر تحديث: <span className="flore-price" dir="ltr">{lastUpdate}</span>
                                </p>
                            )}
                        </div>
                        {finishing && (
                            <Check className="h-5 w-5 text-flore-primary mr-auto shrink-0" aria-hidden="true" />
                        )}
                    </div>

                    <Button
                        onClick={handleFinishDelivery}
                        disabled={finishing}
                        isLoading={finishing}
                        size="lg"
                        className="w-full h-14 text-base gap-2"
                    >
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        {finishing ? 'جاري الإنهاء...' : 'تم التوصيل — إنهاء الطلب'}
                    </Button>
                </motion.div>
            )}
        </div>
    )
}
