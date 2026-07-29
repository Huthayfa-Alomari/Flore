'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'


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

    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [])

    return (
        <div className="max-w-md mx-auto px-4 py-12 text-center" dir="rtl">
            <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                توصيل الطلب #{orderId.slice(0, 8)}
            </h1>
            <p className="text-flore-text-secondary mb-8">
                فعّل مشاركة الموقع ليتمكن الزبون من تتبع طلبه لحظياً
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4">
                    {error}
                </div>
            )}

            {!isTracking ? (
                <button
                    onClick={startTracking}
                    className="bg-flore-primary text-white px-8 py-4 rounded-xl font-bold text-lg w-full"
                >
                    🚗 ابدأ مشاركة الموقع
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
                        <p className="font-bold">جاري المشاركة الحية ✅</p>
                        {lastUpdate && <p className="text-xs mt-1">آخر تحديث: {lastUpdate}</p>}
                    </div>
                    <button
                        onClick={handleFinishDelivery}
                        disabled={finishing}
                        className="bg-flore-primary text-white px-8 py-4 rounded-xl font-bold text-lg w-full disabled:opacity-60"
                    >
                        {finishing ? 'جاري الإنهاء...' : '✅ تم التوصيل — إنهاء الطلب'}
                    </button>
                </div>
            )}
        </div>
    )
}