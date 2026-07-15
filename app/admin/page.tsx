"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, DollarSign, TrendingUp, Clock,
  CheckCircle, XCircle, Search, RefreshCw, Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatPrice, formatDate, orderStatuses } from '@/lib/utils'
import type { Order } from '@/types'

export default function AdminDashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    total: 0, revenue: 0, todayRevenue: 0,
    customers: 0, pending: 0, delivered: 0, cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    checkAdmin()
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: role } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).single()
    if (!role || (role as { role: string }).role !== 'admin') router.push('/')
  }

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders').select('*').order('created_at', { ascending: false })
    if (data) { setOrders(data as Order[]); calculateStats(data as Order[]) }
    setLoading(false)
  }

  const calculateStats = (list: Order[]) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const revenue = list.reduce((s, o) => s + (o.total || 0), 0)
    const todayRevenue = list
      .filter(o => o.created_at && new Date(o.created_at) >= today)
      .reduce((s, o) => s + (o.total || 0), 0)
    setStats({
      total: list.length, revenue, todayRevenue,
      customers: new Set(list.map(o => o.user_id).filter(Boolean)).size,
      pending:   list.filter(o => o.status === 'received').length,
      delivered: list.filter(o => o.status === 'delivered').length,
      cancelled: list.filter(o => o.status === 'cancelled').length,
    })
  }

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (!error) setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const filteredOrders = orders.filter(order => {
    if (filter !== 'all' && order.status !== filter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_phone?.includes(q) ||
        order.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const exportCSV = () => {
    const csv = [
      ['ID', 'Customer', 'Phone', 'Total', 'Status', 'Date'],
      ...filteredOrders.map(o => [
        o.id.slice(0, 8), o.customer_name || '-', o.customer_phone,
        o.total, o.status, new Date(o.created_at).toLocaleDateString('ar-JO'),
      ]),
    ].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const statCards = [
    { label: 'إجمالي الطلبات',  value: stats.total,                    icon: Package,    color: 'bg-blue-100 text-blue-600',    trend: '+12%'         },
    { label: 'الإيرادات',        value: formatPrice(stats.revenue),      icon: DollarSign, color: 'bg-green-100 text-green-600',  trend: '+8%'          },
    { label: 'إيرادات اليوم',    value: formatPrice(stats.todayRevenue), icon: TrendingUp, color: 'bg-purple-100 text-purple-600',trend: 'مباشر'        },
    { label: 'معلّقة',           value: stats.pending,                   icon: Clock,      color: 'bg-orange-100 text-orange-600',trend: 'تحتاج اهتمام' },
  ]

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flore-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-flore-bg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-amiri text-4xl font-bold text-flore-text-primary">لوحة التحكم</h1>
            <p className="text-flore-text-secondary mt-1">نظرة عامة على أداء المتجر</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
            <Button onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> تصدير CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-flore-card rounded-2xl p-6 shadow-luxury"
              >
                <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-2xl font-bold text-flore-text-primary">{stat.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-flore-text-secondary">{stat.label}</p>
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {stat.trend}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-flore-card rounded-3xl p-6 shadow-luxury">
            <h3 className="font-amiri text-xl font-bold mb-4">توزيع حالات الطلبات</h3>
            <div className="space-y-3">
              {orderStatuses.slice(0, 6).map(status => {
                const count = orders.filter(o => o.status === status.value).length
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
                return (
                  <div key={status.value}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{status.label}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-flore-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-flore-card rounded-3xl p-6 shadow-luxury">
            <h3 className="font-amiri text-xl font-bold mb-4">ملخص الإيرادات</h3>
            <div className="space-y-4">
              {[
                { label: 'إيرادات اليوم',    value: formatPrice(stats.todayRevenue), bg: 'bg-green-50',  color: 'text-green-600'  },
                { label: 'إجمالي الإيرادات', value: formatPrice(stats.revenue),      bg: 'bg-blue-50',   color: 'text-blue-600'   },
                { label: 'عملاء فريدون',      value: stats.customers,                bg: 'bg-purple-50', color: 'text-purple-600' },
              ].map(item => (
                <div key={item.label} className={`flex justify-between items-center p-4 ${item.bg} rounded-2xl`}>
                  <span className="text-flore-text-secondary">{item.label}</span>
                  <span className={`${item.color} font-bold text-xl`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-flore-card rounded-3xl shadow-luxury border border-flore-border overflow-hidden">
          <div className="p-6 border-b border-flore-border">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <h2 className="font-amiri text-2xl font-bold text-flore-text-primary">الطلبات</h2>
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-flore-text-secondary" />
                  <input
                    type="text" placeholder="بحث..." value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)} dir="rtl"
                    className="pl-4 pr-10 py-2 rounded-xl border-2 border-flore-border bg-flore-bg text-sm focus:border-flore-primary focus:outline-none w-56"
                  />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl border-2 border-flore-border bg-flore-bg text-sm focus:border-flore-primary focus:outline-none cursor-pointer"
                >
                  <option value="all">كل الطلبات</option>
                  {orderStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right" dir="rtl">
              <thead className="bg-flore-bg border-b border-flore-border">
                <tr>
                  {['الطلب', 'العميل', 'الإجمالي', 'طريقة الدفع', 'الحالة', 'التاريخ', 'إجراءات'].map(h => (
                    <th key={h} className="px-4 py-3 text-sm font-bold text-flore-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-flore-border">
                {filteredOrders.map(order => {
                  const statusObj = orderStatuses.find(s => s.value === order.status)
                  return (
                    <motion.tr key={order.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="hover:bg-flore-bg/50 transition-colors"
                    >
                      <td className="px-4 py-4 font-mono text-xs text-flore-text-secondary">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-sm">{order.customer_name || 'زائر'}</p>
                        <p className="text-xs text-flore-text-secondary">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-4 font-bold text-flore-primary">{formatPrice(order.total)}</td>
                      <td className="px-4 py-4 text-sm">{order.payment_method}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusObj?.color || 'bg-gray-100 text-gray-600'}`}>
                          {statusObj?.label || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-flore-text-secondary">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2 justify-end">
                          <select value={order.status}
                            onChange={e => updateStatus(order.id, e.target.value)}
                            className="text-xs border border-flore-border rounded-lg px-2 py-1 bg-flore-bg focus:border-flore-primary focus:outline-none cursor-pointer"
                          >
                            {orderStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                          <button
                            onClick={() => updateStatus(order.id, 'delivered')}
                            className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200"
                            title="تم التسليم"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateStatus(order.id, 'cancelled')}
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                            title="إلغاء"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-flore-text-secondary">
              لا توجد طلبات في هذا الفلتر
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
