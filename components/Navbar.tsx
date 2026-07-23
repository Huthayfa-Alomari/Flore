"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ShoppingCart, User, Flower2 } from 'lucide-react'
import { useCart } from '@/lib/store/cart-store'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { getCount } = useCart()

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-flore-bg/80 backdrop-blur-md border-b border-flore-border font-noto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* الهوية البصرية */}
          <Link href="/" className="flex items-center gap-2 group">
            <Flower2 className="h-8 w-8 text-flore-primary transition-transform duration-300 group-hover:rotate-12" />
            <span className="font-amiri text-xl font-bold text-flore-primary tracking-wide">Floré</span>
          </Link>

          {/* روابط الشاشات الكبيرة */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-flore-text-secondary hover:text-flore-primary transition-colors font-medium text-sm lg:text-base"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center gap-2">

            {/* زر تبديل الوضع الداكن/الفاتح */}
            <ThemeToggle />

            {/* سلة المشتريات */}
            <Link href="/cart" className="relative p-2 rounded-full hover:bg-flore-card transition-colors group">
              <ShoppingCart className="h-6 w-6 text-flore-text-primary group-hover:text-flore-primary transition-colors" />
              {count > 0 && (
                <span className="absolute top-1 right-1 bg-flore-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {count}
                </span>
              )}
            </Link>

            {/* الملف الشخصي */}
            <Link href="/profile" className="p-2 rounded-full hover:bg-flore-card transition-colors group">
              <User className="h-6 w-6 text-flore-text-primary group-hover:text-flore-primary transition-colors" />
            </Link>

            {/* زر القائمة للموبايل */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-xl text-flore-text-primary hover:bg-flore-card transition-colors"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* القائمة الجانبية للموبايل */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-flore-bg border-b border-flore-border shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-3 px-4 rounded-xl text-base font-medium text-flore-text-primary hover:text-flore-primary hover:bg-flore-card transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}