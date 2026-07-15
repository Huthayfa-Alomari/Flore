'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, Search, Sparkles, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/store/cart-store'

const navItems = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/catalog', label: 'استكشف', icon: Search },
  { href: '/atelier', label: 'صمم', icon: Sparkles },
  { href: '/cart', label: 'السلة', icon: ShoppingBag },
  { href: '/profile', label: 'حسابي', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  // 💡 التعديل هنا: نقرأ الـ Store كاملاً بدون استدعاء getCount مباشرة لمنع انهيار الخادم
  const cartStore = useCart()
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    // 💡 الحساب الفعلي لعدد العناصر لا يتم إلا على المتصفح بعد التحميل
    setItemCount(cartStore.getCount())
  }, [cartStore])

  // 🚨 جدار الحماية الحاسم: منع رندرة المكون تفاعلياً على السيرفر أثناء الـ Build
  if (!mounted) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-flore-border md:hidden safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 py-2 px-3"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-px left-0 right-0 h-0.5 bg-flore-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-colors ${isActive ? 'text-flore-primary' : 'text-flore-text-secondary'
                    }`}
                />
                {item.href === '/cart' && itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-flore-primary text-white text-[10px] flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${isActive ? 'text-flore-primary' : 'text-flore-text-secondary'
                  }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  )
}