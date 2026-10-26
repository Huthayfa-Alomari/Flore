"use client"

import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

export function PushNotification() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // التأكد من أن المتصفح يدعم الخدمة بشكل كامل وآمن
        if (
            typeof window !== 'undefined' &&
            'serviceWorker' in navigator &&
            'PushManager' in window
        ) {
            setIsSupported(true)
            checkSubscription()
        }
    }, [])

    const checkSubscription = async () => {
        try {
            // ننتظر حتى يصبح الـ Service Worker الذي أنشأته الحزمة جاهزاً تماماً
            const registration = await navigator.serviceWorker.ready
            if (!registration.pushManager) return

            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        } catch (err) {
            console.error('Error checking push subscription:', err)
        }
    }

    const subscribe = async () => {
        if (loading) return
        setLoading(true)
        try {
            // 1. طلب الإذن الرسمي من المستخدم لإرسال الإشعارات
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                alert('يرجى تفعيل الإشعارات من إعدادات المتصفح لتلقي تحديثات طلباتك 🌸')
                setLoading(false)
                return
            }

            // 2. جلب الـ Service Worker الجاهز التابع لحزمة الـ PWA
            const registration = await navigator.serviceWorker.ready

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) {
                throw new Error('VAPID Public Key is missing from environment variables')
            }

            // 3. إنشاء الاشتراك وربطه بمفتاح السيرفر
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            })

            // 4. إرسال بيانات الاشتراك إلى الـ API الخاص بنا لتخزينها في Supabase
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription),
            })

            if (!response.ok) {
                throw new Error('Failed to send subscription to backend')
            }

            setIsSubscribed(true)
        } catch (err) {
            console.error('Failed to subscribe to push notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const unsubscribe = async () => {
        if (loading) return
        setLoading(true)
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()

                // اختياري: يمكنك هنا استدعاء الـ API لحذف الاشتراك من قاعدة البيانات فوراً
                await fetch('/api/push/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                }).catch(() => {/* يتجاوز الخطأ في حال عدم بناء الـ API الخاص بالحذف بعد */ })

                setIsSubscribed(false)
            }
        } catch (err) {
            console.error('Failed to unsubscribe:', err)
        } finally {
            setLoading(false)
        }
    }

    // منع ظهور أي مشاكل تفارق في الرندرة بين السيرفر والمتصفح (Hydration Guard)
    if (!mounted || !isSupported) return null

    return (
        <button
            onClick={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
            aria-label={isSubscribed ? "إيقاف الإشعارات" : "تفعيل الإشعارات"}
            className={`fixed bottom-40 left-6 z-40 flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border shadow-luxury transition-all duration-200 ease-flore active:scale-95 cursor-pointer disabled:cursor-not-allowed md:bottom-24 ${isSubscribed
                ? 'border-flore-border/70 bg-flore-card text-flore-text-secondary hover:border-flore-primary/40 hover:bg-flore-subtle hover:text-flore-text-primary'
                : 'border-flore-primary/30 bg-flore-card text-flore-primary hover:border-flore-primary/60 hover:bg-flore-subtle'
                }`}
        >
            {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSubscribed ? (
                <BellOff className="h-5 w-5" />
            ) : (
                <span className="relative flex items-center justify-center">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-flore-gold" />
                </span>
            )}
        </button>
    )
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}