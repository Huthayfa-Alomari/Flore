'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  Store,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'اللوحة الرئيسية', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingBag },
  { href: '/admin/products', label: 'المنتجات', icon: Package },
  { href: '#', label: 'العملاء', icon: Users },
  { href: '#', label: 'التحليلات', icon: BarChart3 },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [authorized, setAuthorized] = useState(false)

  // نفس حاجز الصلاحيات السابق (المستخدم + دور الأدمن) — تتم حماية المسار
  // أيضاً من طرف الـ middleware، وهذه إعادة التحقق داخل الواجهة
  useEffect(() => {
    const checkAuth = async () => {
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

      if (!role || (role as { role: string }).role !== 'admin') {
        router.push('/')
        return
      }

      setAuthorized(true)
    }

    checkAuth()
  }, [supabase, router])

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  if (!authorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-flore-bg">
        <div className="h-14 w-14 rounded-full bg-flore-subtle flex items-center justify-center shadow-luxury-soft">
          <Loader2 className="h-6 w-6 animate-spin text-flore-primary" aria-hidden="true" />
        </div>
        <p className="font-amiri text-lg text-flore-text-secondary">جارٍ التحقق من الصلاحيات…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-flore-bg">
      <div className="flex">
        {/* ── الشريط الجانبي — سطح المكتب ── */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-l border-flore-border/70 bg-flore-card px-5 py-8 overflow-y-auto">
          {/* الشعار */}
          <div className="mb-8 px-3">
            <p className="font-display italic text-2xl text-flore-text-primary leading-none" dir="ltr">
              FLORÉ
            </p>
            <p className="font-display text-[10px] uppercase tracking-[0.32em] text-flore-gold-dark mt-2" dir="ltr" style={{ textAlign: 'right' }}>
              Admin Console
            </p>
            <div className="h-px bg-flore-border/70 mt-4" aria-hidden="true" />
          </div>

          {/* التنقل */}
          <nav className="space-y-1.5 animate-fade-up" aria-label="تنقل لوحة التحكم">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 ease-flore cursor-pointer ${
                    active
                      ? 'bg-flore-primary text-white shadow-luxury-soft'
                      : 'text-flore-text-secondary hover:bg-flore-subtle hover:text-flore-primary'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-flore ${
                      active ? '' : 'group-hover:scale-110'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="mr-auto h-1.5 w-1.5 rounded-full bg-flore-gold" aria-hidden="true" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* العودة إلى المتجر */}
          <div className="mt-auto pt-6">
            <div className="h-px bg-flore-border/70 mb-4" aria-hidden="true" />
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-flore-text-secondary hover:bg-flore-subtle hover:text-flore-primary transition-all duration-200 ease-flore cursor-pointer"
            >
              <Store className="h-5 w-5" aria-hidden="true" />
              العودة إلى المتجر
            </Link>
          </div>
        </aside>

        {/* ── المحتوى ── */}
        <div className="flex-1 min-w-0">
          {/* الشريط العلوي — الجوال */}
          <div className="lg:hidden sticky top-16 z-30 bg-flore-bg/85 backdrop-blur-xl border-b border-flore-border/70">
            <div className="flex items-center justify-between px-4 pt-3">
              <p className="font-display italic text-xl text-flore-text-primary" dir="ltr">
                FLORÉ
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-flore-text-secondary hover:text-flore-primary transition-colors duration-200 ease-flore cursor-pointer"
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                المتجر
              </Link>
            </div>
            <nav
              className="flex gap-2 overflow-x-auto px-4 py-3"
              aria-label="تنقل لوحة التحكم"
              style={{ scrollbarWidth: 'none' }}
            >
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex shrink-0 items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-flore cursor-pointer ${
                      active
                        ? 'bg-flore-primary text-white shadow-luxury-soft'
                        : 'bg-flore-card text-flore-text-secondary border border-flore-border/70 hover:border-flore-primary/40 hover:text-flore-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
