export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, Package, Users, BarChart3 } from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!role || role.role !== 'admin') {
    redirect('/')
  }

  const navItems = [
    { href: '/admin', label: 'اللوحة الرئيسية', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'الطلبات', icon: ShoppingBag },
    { href: '/admin/products', label: 'المنتجات', icon: Package },
    { href: '#', label: 'العملاء', icon: Users },
    { href: '#', label: 'التحليلات', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-flore-bg">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-flore-card border-l border-flore-border min-h-screen p-6 hidden lg:block">
          <div className="mb-8">
            <h2 className="font-amiri text-xl font-bold text-flore-primary">لوحة التحكم</h2>
            <p className="text-xs text-flore-text-secondary mt-1">FLORÉ Admin</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-flore-text-secondary hover:bg-flore-subtle hover:text-flore-primary transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}