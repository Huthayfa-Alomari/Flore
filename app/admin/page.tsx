"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Package, DollarSign, TrendingUp, Clock, Users, Wallet, CalendarDays,
  CheckCircle2, XCircle, Search, RefreshCw, Download, Inbox,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatPrice, formatDate, orderStatuses } from '@/lib/utils'
import type { Order } from '@/types'

// خريطة حالات الطلب → أنواع الشارات بألوان النظام (بدل الألوان الصارخة القديمة)
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
    { eyebrow: 'ORDERS',  label: 'إجمالي الطلبات', value: stats.total,                    icon: Package,    trend: '+12%'         },
    { eyebrow: 'REVENUE', label: 'الإيرادات',      value: formatPrice(stats.revenue),      icon: DollarSign, trend: '+8%'          },
    { eyebrow: 'TODAY',   label: 'إيرادات اليوم',  value: formatPrice(stats.todayRevenue), icon: TrendingUp, trend: 'مباشر'        },
    { eyebrow: 'PENDING', label: 'معلّقة',         value: stats.pending,                   icon: Clock,      trend: 'تحتاج اهتمام' },
  ]

  if (!mounted || loading) {
    return (
      <div className="min-h-[60vh]">
        {/* هيكل تحميل أنيق — بطاقات إحصائية + جدول */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-flore-subtle/60 rounded-3xl h-44 animate-pulse" />
          ))}
        </div>
        <div className="bg-flore-subtle/60 rounded-3xl h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto">

      {/* الترويسة */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="flore-eyebrow flore-eyebrow-right mb-3">Admin Overview</p>
          <h1 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary">لوحة التحكم</h1>
          <p className="text-flore-text-secondary mt-1.5">نظرة عامة على أداء المتجر</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> تحديث
          </Button>
          <Button onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" aria-hidden="true" /> تصدير CSV
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.eyebrow}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06, ease: [0.22, 0.61, 0.36, 1] }}
              className="bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-6 flore-lift"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="h-11 w-11 rounded-full bg-flore-subtle flex items-center justify-center">
                  <Icon className="h-5 w-5 text-flore-primary" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-medium text-flore-text-secondary bg-flore-subtle/70 rounded-full px-2.5 py-1">
                  {stat.trend}
                </span>
              </div>
              <p className="font-display text-[10px] uppercase tracking-[0.32em] text-flore-gold-dark mb-1.5" dir="ltr" style={{ textAlign: 'right' }}>
                {stat.eyebrow}
              </p>
              <p className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary leading-tight">
                {stat.value}
              </p>
              <p className="text-sm text-flore-text-secondary mt-1.5">{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* الرسوم البيانية */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-6">
          <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-5">توزيع حالات الطلبات</h3>
          <div className="space-y-3.5">
            {orderStatuses.slice(0, 6).map(status => {
              const count = orders.filter(o => o.status === status.value).length
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={status.value}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-flore-text-primary">{status.label}</span>
                    <span className="font-bold text-flore-text-primary">{count}</span>
                  </div>
                  <div className="w-full bg-flore-subtle rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-flore ${
                        status.value === 'delivered'
                          ? 'bg-flore-gold'
                          : status.value === 'cancelled'
                            ? 'bg-flore-error/70'
                            : 'bg-flore-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-flore-card rounded-3xl border border-flore-border/70 shadow-luxury-soft p-6">
          <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-5">ملخص الإيرادات</h3>
          <div className="space-y-3">
            {[
              { label: 'إيرادات اليوم',    value: formatPrice(stats.todayRevenue), icon: CalendarDays },
              { label: 'إجمالي الإيرادات', value: formatPrice(stats.revenue),      icon: Wallet },
              { label: 'عملاء فريدون',     value: stats.customers,                 icon: Users },
            ].map(item => {
              const Icon = item.icon
              return (
                <div key={item.label} className="flex justify-between items-center p-4 bg-flore-subtle/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-flore-card flex items-center justify-center shadow-luxury-soft">
                      <Icon className="h-4 w-4 text-flore-primary" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-flore-text-secondary">{item.label}</span>
                  </div>
                  <span className="font-amiri text-xl font-bold text-flore-text-primary">{item.value}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* جدول الطلبات */}
      <div className="bg-flore-card rounded-3xl shadow-luxury-soft border border-flore-border/70 overflow-hidden">
        <div className="p-6 border-b border-flore-border/70">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
              <h2 className="font-amiri text-2xl font-bold text-flore-text-primary">الطلبات</h2>
              <p className="text-xs text-flore-text-secondary mt-1">تتبّع آخر الطلبات وحدّث حالاتها</p>
            </div>
            <div className="flex gap-3 flex-wrap w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-flore-text-secondary pointer-events-none" aria-hidden="true" />
                <Input
                  type="text" placeholder="بحث..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-10 pr-10 w-full md:w-56"
                />
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-10 rounded-full border border-flore-border bg-flore-card px-4 text-sm text-flore-text-primary cursor-pointer focus:outline-none focus:border-flore-primary/50 focus:ring-4 focus:ring-flore-primary/10 transition-all duration-200 ease-flore"
              >
                <option value="all">كل الطلبات</option>
                {orderStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm" dir="rtl">
            <thead className="bg-flore-subtle/40 border-b border-flore-border/70">
              <tr>
                {['الطلب', 'العميل', 'الإجمالي', 'طريقة الدفع', 'الحالة', 'التاريخ', 'إجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-flore-text-secondary whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-flore-border/70">
              {filteredOrders.map(order => {
                const statusObj = orderStatuses.find(s => s.value === order.status)
                const badge = badgeFor(order.status)
                return (
                  <motion.tr key={order.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-flore-subtle/40 transition-colors duration-200 ease-flore"
                  >
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs text-flore-text-secondary flore-price" dir="ltr">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-flore-text-primary">{order.customer_name || 'زائر'}</p>
                      <p className="text-xs text-flore-text-secondary flore-price mt-0.5" dir="ltr">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-flore-text-primary flore-price" dir="ltr">{formatPrice(order.total)}</span>
                    </td>
                    <td className="px-4 py-4 text-flore-text-secondary">{order.payment_method}</td>
                    <td className="px-4 py-4">
                      <Badge variant={badge.variant} className={badge.className}>
                        {statusObj?.label || order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-flore-text-secondary whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 justify-end items-center">
                        <select
                          value={order.status}
                          onChange={e => updateStatus(order.id, e.target.value)}
                          className="text-xs rounded-full border border-flore-border bg-flore-card px-3 py-1.5 text-flore-text-primary cursor-pointer focus:outline-none focus:border-flore-primary/50 transition-colors duration-200 ease-flore"
                        >
                          {orderStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button
                          onClick={() => updateStatus(order.id, 'delivered')}
                          className="p-2 rounded-full bg-flore-subtle text-flore-primary hover:bg-flore-primary hover:text-white transition-all duration-200 ease-flore cursor-pointer"
                          title="تم التسليم"
                          aria-label="تم التسليم"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="p-2 rounded-full text-flore-error border border-flore-error/30 hover:bg-flore-error/10 transition-all duration-200 ease-flore cursor-pointer"
                          title="إلغاء"
                          aria-label="إلغاء الطلب"
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" />
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
          <div className="p-12 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-flore-subtle flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-flore-primary" aria-hidden="true" />
            </div>
            <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-1">لا توجد طلبات</h3>
            <p className="text-sm text-flore-text-secondary">لا توجد طلبات في هذا الفلتر</p>
          </div>
        )}
      </div>

    </div>
  )
}
