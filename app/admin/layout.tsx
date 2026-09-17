export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, Package, Flower2 } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role || role.role !== 'admin') redirect('/')

  const navItems = [
    { href: '/admin', label: 'اللوحة الرئيسية', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'الطلبات', icon: ShoppingBag },
    { href: '/admin/products', label: 'المنتجات', icon: Package },
    { href: '/admin/atelier', label: 'إدارة الأتيليه', icon: Flower2 },
  ]

  return (
    <div className="min-h-screen bg-flore-bg" dir="rtl">
      <div className="flex">
        <aside className="hidden min-h-screen w-64 shrink-0 border-l border-flore-border bg-flore-card p-6 lg:block">
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-flore-text-secondary">FLORÉ ADMIN</p>
            <h2 className="mt-2 font-amiri text-2xl font-semibold text-flore-text-primary">لوحة التحكم</h2>
          </div>
          <nav className="space-y-2" aria-label="إدارة FLORÉ">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-medium text-flore-text-secondary transition-colors hover:bg-flore-bg hover:text-flore-text-primary"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-flore-border bg-flore-card px-4 text-xs font-semibold">
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              )
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
