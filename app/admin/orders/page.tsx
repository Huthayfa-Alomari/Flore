'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { orderStatuses } from '@/lib/utils'
import type { Order } from '@/types'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [, setLoading] = useState(true)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-amiri text-3xl font-bold text-flore-text-primary">إدارة الطلبات</h1>
          <p className="text-flore-text-secondary mt-1">إدارة وتتبع جميع طلبات العملاء</p>
        </div>
      </div>

      {/* Filters */}
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

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-flore-subtle/50">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-medium">رقم الطلب</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">العميل</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">الإجمالي</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">الحالة</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">التاريخ</th>
                  <th className="text-right px-4 py-3 text-sm font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flore-border">
                {orders.map((order) => {
                  const statusInfo = orderStatuses.find(s => s.value === order.status)
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-flore-subtle/30 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm font-medium">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>
                          <p>{order.customer_name || 'غير معروف'}</p>
                          <p className="text-flore-text-secondary text-xs" dir="ltr">{order.customer_phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">
                        {order.total} د.أ
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={statusInfo?.color || ''}>
                          {statusInfo?.label || order.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-flore-text-secondary">
                        {new Date(order.created_at).toLocaleDateString('ar-JO')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const nextStatus = orderStatuses[orderStatuses.findIndex(s => s.value === order.status) + 1]?.value
                                if (nextStatus) updateStatus(order.id, nextStatus)
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              تحديث
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Truck className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}