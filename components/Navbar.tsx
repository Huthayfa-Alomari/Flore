"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingBag, User } from 'lucide-react'
import { useCart } from '@/lib/store/cart-store'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { DeliveryCitySelector } from '@/components/DeliveryCitySelector'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { getCount } = useCart()

  useEffect(() => {
    setMounted(true)
  }, [])

  // إغلاق القائمة عند التنقل
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const count = mounted ? getCount() : 0

  const links = [
    { href: '/', label: 'الرئيسية' },
    { href: '/catalog', label: 'المجموعة' },
    { href: '/accessories', label: 'الإكسسوارات' },
    { href: '/plants', label: 'النباتات' },
    { href: '/atelier', label: 'الأتيليه' },
    { href: '/ar', label: 'AR' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-flore-bg/85 backdrop-blur-xl border-b border-flore-border/70 font-noto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* الشعار — كورمورانت إيطاليك بلمسة ذهبية */}
          <Link href="/" className="flex items-baseline gap-2 group shrink-0" aria-label="فلوري — الرئيسية">
            <span className="font-display italic text-2xl font-semibold tracking-wide text-flore-text-primary">
              Floré
            </span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-flore-gold-dark mb-1.5" />
          </Link>

          {/* اختيار المدينة — وسط الشاشة على الديسكتوب */}
          <div className="hidden md:block">
            <DeliveryCitySelector />
          </div>

          {/* روابط الشاشات الكبيرة */}
          <div className="hidden md:flex items-center gap-7">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative text-sm font-medium transition-colors duration-200 ease-flore py-1
                    ${isActive
                      ? 'text-flore-primary'
                      : 'text-flore-text-secondary hover:text-flore-text-primary'}
                  `}
                >
                  {link.label}
                  <span
                    className={`
                      absolute -bottom-0.5 right-0 left-0 mx-auto h-px rounded-full
                      bg-flore-gold-dark transition-all duration-250 ease-flore
                      ${isActive ? 'opacity-100' : 'opacity-0'}
                    `}
                    style={{ height: '1.5px' }}
                  />
                </Link>
              )
            })}
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center gap-1.5">

            <ThemeSwitch />

            {/* السلة */}
            <Link
              href="/cart"
              aria-label={`السلة (${count} عنصر)`}
              className="relative h-9 w-9 rounded-full flex items-center justify-center text-flore-text-secondary hover:text-flore-primary hover:border-flore-primary/40 border border-transparent hover:border-flore-border hover:bg-flore-card transition-all duration-200 ease-flore active:scale-95"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {count > 0 && (
                <span className="absolute -top-1 -left-1 bg-flore-primary text-white text-[10px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>

            {/* الحساب */}
            <Link
              href="/profile"
              aria-label="حسابي"
              className="h-9 w-9 rounded-full flex items-center justify-center text-flore-text-secondary hover:text-flore-primary hover:border-flore-primary/40 border border-transparent hover:border-flore-border hover:bg-flore-card transition-all duration-200 ease-flore active:scale-95"
            >
              <User className="h-[18px] w-[18px]" />
            </Link>

            {/* قائمة الموبايل */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden h-9 w-9 rounded-full flex items-center justify-center text-flore-text-primary border border-flore-border bg-flore-card transition-all duration-200 ease-flore active:scale-95 cursor-pointer"
              aria-label={isOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الموبايل المنسدلة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="md:hidden bg-flore-bg/95 backdrop-blur-xl border-b border-flore-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((link, i) => {
                const isActive = pathname === link.href
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.2 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center justify-between py-3 px-4 rounded-xl text-[15px] font-medium transition-colors duration-200
                        ${isActive
                          ? 'bg-flore-subtle text-flore-primary'
                          : 'text-flore-text-primary hover:bg-flore-subtle/60'}
                      `}
                    >
                      {link.label}
                      <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-flore-gold-dark' : 'bg-transparent'}`} />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
