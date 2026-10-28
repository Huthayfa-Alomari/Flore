'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Truck, Inbox, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { orderStatuses } from '@/lib/utils'
import type { Order } from '@/types'

// خريطة حالات الطلب → أنواع الشارات بألوان النظام
const badgeFor = (
  status: string
): { variant: 'default' | 'secondary' | 'gold' | 'sage' | 'outline'; className?: string } => {
  switch (status) {
    case 'delivered':
      return { variant: 'default' }
    case 'cancelled':
      return { variant: 'outline', className: 'border-flore-error/30 text-flore-error' }
    case 'pending':
      return { variant: 'outline' }
    case 'nearby':
    case 'arrived':
      return { variant: 'gold' }
    case 'departed':
    case 'en_route':
      return { variant: 'sage' }
    default:
      return { variant: 'secondary' }
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    if (data) setOrders(data as Order[])
    setLoading(false)
  }, [supabase, filter])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    fetchOrders()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-14 w-14 rounded-full bg-flore-subtle flex items-center justify-center shadow-luxury-soft">
          <Loader2 className="h-6 w-6 animate-spin text-flore-primary" aria-hidden="true" />
        </div>
      </div>
    )
  }

  return (
    <div className="flore-admin-orders-page space-y-6">
      <div>
        <p className="flore-eyebrow flore-eyebrow-right mb-3">Orders</p>
        <h1 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary">إدارة الطلبات</h1>
        <p className="text-flore-text-secondary mt-1.5">إدارة وتتبع جميع طلبات العملاء</p>
      </div>

      {/* الفلاتر */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          الكل
        </Button>
        {orderStatuses.slice(0, -1).map((status) => (
          <Button
            key={status.value}
            variant={filter === status.value ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>

      {/* جدول الطلبات */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm" dir="rtl">
              <thead className="bg-flore-subtle/40 border-b border-flore-border/70">
                <tr>
                  {['رقم الطلب', 'العميل', 'الإجمالي', 'الحالة', 'التاريخ', 'إجراءات'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-xs font-medium text-flore-text-secondary whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-flore-border/70">
                {orders.map((order) => {
                  const statusInfo = orderStatuses.find(s => s.value === order.status)
                  const badge = badgeFor(order.status)
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-flore-subtle/40 transition-colors duration-200 ease-flore"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-flore-text-secondary flore-price" dir="ltr">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-flore-text-primary">{order.customer_name || 'غير معروف'}</p>
                        <p className="text-xs text-flore-text-secondary flore-price mt-0.5" dir="ltr">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-flore-text-primary flore-price" dir="ltr">{order.total} د.أ</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={badge.variant} className={badge.className}>
                          {statusInfo?.label || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-flore-text-secondary whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('ar-JO')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 justify-end">
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                const nextStatus = orderStatuses[orderStatuses.findIndex(s => s.value === order.status) + 1]?.value
                                if (nextStatus) updateStatus(order.id, nextStatus)
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                              تحديث
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" title="توصيل" aria-label="توصيل">
                            <Truck className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="p-12 flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-full bg-flore-subtle flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-flore-primary" aria-hidden="true" />
              </div>
              <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-1">لا توجد طلبات</h3>
              <p className="text-sm text-flore-text-secondary">لم يتم العثور على طلبات مطابقة لهذا الفلتر</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
