'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

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
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 left-6 z-40 h-14 w-14 rounded-full bg-flore-primary text-white shadow-lg flex items-center justify-center hover:bg-flore-primary-dark transition-colors md:bottom-8"
        aria-label="مساعد فلوري"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-40 left-6 z-40 w-80 bg-flore-card rounded-3xl shadow-2xl border border-flore-border overflow-hidden md:bottom-24"
          >
            <div className="bg-flore-primary p-4 text-white">
              <h3 className="font-amiri font-bold">مساعد فلوري</h3>
              <p className="text-xs text-white/80">اسألني عن أي شيء!</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-flore-text-secondary mb-4">
                كيف يمكنني مساعدتك اليوم؟
              </p>
              <Link href="/ai-assistant">
                <span className="block w-full bg-flore-primary text-white rounded-xl py-3 text-sm font-medium hover:bg-flore-primary-dark transition-colors text-center cursor-pointer">
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