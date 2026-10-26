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

  // نقرأ الـ Store كاملاً بدون استدعاء getCount مباشرة لمنع انهيار الخادم
  const cartStore = useCart()
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    setMounted(true)
    // الحساب الفعلي لعدد العناصر لا يتم إلا على المتصفح بعد التحميل
    setItemCount(cartStore.getCount())
  }, [cartStore])

  // جدار الحماية الحاسم: منع رندرة المكون تفاعلياً على السيرفر أثناء الـ Build
  if (!mounted) return null

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50 md:hidden
        bg-flore-bg/90 backdrop-blur-xl
        border-t border-flore-border
        safe-area-pb
      "
      aria-label="التنقل السريع"
    >
      <div className="flex items-center justify-around h-[68px] max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 w-16 h-full cursor-pointer"
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-[2.5px] w-8 rounded-full bg-flore-gold-dark"
                  transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                />
              )}

              <span
                className={`
                  relative flex items-center justify-center h-8 w-12 rounded-full
                  transition-colors duration-200 ease-flore
                  ${isActive ? 'bg-flore-subtle' : ''}
                `}
              >
                <Icon
                  className={`
                    h-[19px] w-[19px] transition-colors duration-200
                    ${isActive ? 'text-flore-primary' : 'text-flore-text-secondary'}
                  `}
                  strokeWidth={isActive ? 2 : 1.75}
                />
                {item.href === '/cart' && itemCount > 0 && (
                  <span className="absolute -top-1 -left-1.5 bg-flore-primary text-white text-[10px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </span>

              <span
                className={`
                  text-[10px] leading-none transition-colors duration-200
                  ${isActive ? 'text-flore-primary font-medium' : 'text-flore-text-secondary'}
                `}
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
