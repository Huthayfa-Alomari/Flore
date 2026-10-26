'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Sparkles } from 'lucide-react'

export function ConciergeButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // تأكيد شحن المكون في المتصفح أولاً لمنع تعارض الخادم والعميل
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-flore-primary text-white shadow-luxury transition-colors duration-200 ease-flore hover:bg-flore-primary-dark md:bottom-8"
        aria-label="مساعد فلوري"
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed bottom-40 left-6 z-40 w-80 overflow-hidden rounded-3xl border border-flore-border/70 bg-flore-card shadow-luxury md:bottom-24"
          >
            {/* ترويسة الكونسيرج */}
            <div className="flex items-center gap-3 border-b border-flore-border/70 bg-flore-bg-alt/60 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flore-subtle">
                <Sparkles className="h-5 w-5 text-flore-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-amiri text-lg font-bold leading-snug text-flore-text-primary">مساعد فلوري</h3>
                <p className="flex items-center gap-1.5 text-[11px] text-flore-text-secondary">
                  <span className="h-1.5 w-1.5 rounded-full bg-flore-success" />
                  اسألني عن أي شيء!
                </p>
              </div>
            </div>

            {/* جسد اللوحة */}
            <div className="p-5">
              <p className="mb-4 font-amiri text-base leading-relaxed text-flore-text-primary">
                كيف يمكنني مساعدتك اليوم؟
              </p>
              <Link href="/ai-assistant">
                <span className="block w-full cursor-pointer rounded-full bg-flore-primary py-3 text-center text-sm font-medium text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.98]">
                  فتح المحادثة الكاملة
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
