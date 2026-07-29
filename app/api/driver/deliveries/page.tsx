'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, MapPin, Phone, ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Order } from '@/types'

export default function DriverDeliveriesPage() {
    const router = useRouter()
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [unauthorized, setUnauthorized] = useState(false)

    const fetchDeliveries = useCallback(async () => {
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { data: role } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (!role || role.role !== 'driver') {
            setUnauthorized(true)
            setLoading(false)
            return
        }

        const { data, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('driver_id', user.id)
            .neq('status', 'delivered')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: true })

        if (fetchError) {
            setError('حدث خطأ أثناء تحميل الطلبات')
            setLoading(false)
            return
        }

        setOrders((data as Order[]) || [])
        setLoading(false)
    }, [supabase, router])

    useEffect(() => {
        fetchDeliveries()
    }, [fetchDeliveries])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-flore-primary" />
            </div>
        )
    }

    if (unauthorized) {
        return (
            <div className="max-w-md mx-auto px-4 py-20 text-center" dir="rtl">
                <Package className="h-16 w-16 text-flore-text-secondary mx-auto mb-4" />
                <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                    هذه الصفحة مخصصة للسائقين فقط
                </h1>
                <Link href="/" className="text-flore-primary font-bold hover:underline">
                    العودة للرئيسية
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8" dir="rtl">
            <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-2">
                طلباتي للتوصيل
            </h1>
            <p className="text-flore-text-secondary mb-8">
                {orders.length > 0 ? `لديك ${orders.length} طلب بانتظار التوصيل` : 'لا توجد طلبات موكّلة لك حالياً'}
            </p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4">
                    {error}
                </div>
            )}

            {orders.length === 0 && !error ? (
                <div className="text-center py-16 bg-flore-card rounded-2xl border border-flore-border">
                    <Package className="h-12 w-12 text-flore-text-secondary mx-auto mb-3" />
                    <p className="text-flore-text-secondary">ستظهر هنا الطلبات فور توكيلها لك</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={`/driver/delivery/${order.id}`}
                            className="block bg-flore-card rounded-2xl border border-flore-border p-5 hover:border-flore-primary transition-colors"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-bold text-flore-text-primary">
                                    طلب #{order.id.slice(0, 8)}
                                </span>
                                <span className="text-xs bg-flore-primary/10 text-flore-primary font-bold px-3 py-1 rounded-full">
                                    {order.status === 'pending' ? 'بانتظار البدء' : order.status === 'preparing' ? 'قيد التجهيز' : 'قيد التوصيل'}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2 text-flore-text-secondary">
                                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{order.delivery_address}{order.delivery_region ? ` — ${order.delivery_region}` : ''}</span>
                                </div>
                                {order.customer_phone && (
                                    <div className="flex items-center gap-2 text-flore-text-secondary">
                                        <Phone className="h-4 w-4 flex-shrink-0" />
                                        <span dir="ltr">{order.customer_phone}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-flore-border">
                                <span className="font-bold text-flore-primary">{order.total} د.أ</span>
                                <span className="flex items-center gap-1 text-sm font-bold text-flore-primary">
                                    ابدأ التوصيل
                                    <ArrowLeft className="h-4 w-4 rotate-180" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}