'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Package, MapPin, Phone, ArrowLeft, Loader2, RefreshCw, PackageOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Order } from '@/types'

// خريطة حالة الطلب في قائمة السائق → نوع الشارة بلوحة الألوان الهادئة
const badgeFor = (
  status: string
): { variant: 'default' | 'secondary' | 'gold' | 'sage' | 'outline' } => {
  switch (status) {
    case 'pending':
      return { variant: 'outline' }
    case 'preparing':
      return { variant: 'secondary' }
    default:
      return { variant: 'sage' }
  }
}

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
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="h-14 w-14 rounded-full bg-flore-subtle flex items-center justify-center shadow-luxury-soft">
                    <Loader2 className="h-6 w-6 animate-spin text-flore-primary" aria-hidden="true" />
                </div>
                <p className="font-amiri text-lg text-flore-text-secondary">جارٍ تحميل طلباتك…</p>
            </div>
        )
    }

    if (unauthorized) {
        return (
            <div className="max-w-md mx-auto px-4 py-20 text-center" dir="rtl">
                <div className="h-16 w-16 rounded-full bg-flore-subtle flex items-center justify-center mx-auto mb-5">
                    <Package className="h-7 w-7 text-flore-primary" aria-hidden="true" />
                </div>
                <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                    هذه الصفحة مخصصة للسائقين فقط
                </h1>
                <p className="text-sm text-flore-text-secondary mb-6">
                    يبدو أن حسابك لا يملك صلاحية الوصول إلى قائمة التوصيل
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium bg-flore-primary text-white hover:bg-flore-primary-dark hover:shadow-luxury-soft transition-all duration-200 ease-flore cursor-pointer"
                >
                    العودة للرئيسية
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-12" dir="rtl">
            {/* الترويسة */}
            <div className="mb-8">
                <p className="flore-eyebrow flore-eyebrow-right mb-3">Driver</p>
                <h1 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary mb-2">
                    طلباتي للتوصيل
                </h1>
                <p className="text-flore-text-secondary">
                    {orders.length > 0 ? `لديك ${orders.length} طلب بانتظار التوصيل` : 'لا توجد طلبات موكّلة لك حالياً'}
                </p>
            </div>

            {/* حالة الخطأ مع إعادة المحاولة */}
            {error && (
                <div className="bg-flore-error/10 border border-flore-error/20 rounded-2xl p-4 mb-6 flex flex-col gap-3 text-center" role="alert">
                    <p className="text-sm text-flore-error leading-relaxed">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchDeliveries} className="gap-2 self-center">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        إعادة المحاولة
                    </Button>
                </div>
            )}

            {orders.length === 0 && !error ? (
                <div className="text-center py-16 bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft">
                    <div className="h-16 w-16 rounded-full bg-flore-subtle flex items-center justify-center mx-auto mb-4">
                        <PackageOpen className="h-7 w-7 text-flore-primary" aria-hidden="true" />
                    </div>
                    <h2 className="font-amiri text-xl font-bold text-flore-text-primary mb-1.5">لا توجد طلبات حالياً</h2>
                    <p className="text-sm text-flore-text-secondary">ستظهر هنا الطلبات فور توكيلها لك</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order, index) => {
                        const badge = badgeFor(order.status)
                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: index * 0.05, ease: [0.22, 0.61, 0.36, 1] }}
                            >
                                <Link
                                    href={`/driver/delivery/${order.id}`}
                                    className="block bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-5 md:p-6 hover:border-flore-primary/40 transition-all duration-200 ease-flore flore-lift"
                                >
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                        <span className="font-amiri text-lg font-bold text-flore-text-primary">
                                            طلب <span className="flore-price" dir="ltr">#{order.id.slice(0, 8)}</span>
                                        </span>
                                        <Badge variant={badge.variant}>
                                            {order.status === 'pending' ? 'بانتظار البدء' : order.status === 'preparing' ? 'قيد التجهيز' : 'قيد التوصيل'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex items-start gap-3 text-flore-text-secondary">
                                            <span className="h-7 w-7 rounded-full bg-flore-subtle text-flore-primary flex items-center justify-center shrink-0">
                                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                            </span>
                                            <span className="leading-relaxed">{order.delivery_address}{order.delivery_region ? ` — ${order.delivery_region}` : ''}</span>
                                        </div>
                                        {order.customer_phone && (
                                            <div className="flex items-center gap-3 text-flore-text-secondary">
                                                <span className="h-7 w-7 rounded-full bg-flore-subtle text-flore-primary flex items-center justify-center shrink-0">
                                                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                                                </span>
                                                <span className="flore-price" dir="ltr">{order.customer_phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-flore-border/70">
                                        <span className="font-amiri text-lg font-bold text-flore-text-primary">
                                            <span className="flore-price" dir="ltr">{order.total} د.أ</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 text-sm font-bold text-flore-primary">
                                            ابدأ التوصيل
                                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                    </div>
                                </Link>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
