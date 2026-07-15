"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-flore-bg flex items-center justify-center">
        <div className="animate-pulse font-amiri text-xl text-flore-primary">جاري تحميل السلة الفاخرة...</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg px-4">
        <div className="text-center">
          <ShoppingBag className="h-20 w-20 mx-auto text-flore-primary/30 mb-6" />
          <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-4">السلة فارغة</h1>
          <p className="text-flore-text-secondary mb-8">اكتشف مجموعتنا الفاخرة واختر ما يناسبك</p>
          <Link href="/catalog">
            <Button size="lg" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              تسوق الآن
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-flore-bg pb-24" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-amiri text-4xl font-bold text-flore-text-primary mb-8 text-center">
            سلة المشتريات ({items.length})
          </h1>

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="bg-flore-card rounded-2xl p-4 shadow-luxury flex gap-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={item.product.image || '/placeholder.png'} alt={item.product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 text-right">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-amiri text-lg font-bold text-flore-text-primary">{item.product.name}</h3>
                      <p className="text-flore-text-secondary text-sm">{formatPrice(item.product.price)} / وحدة</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 bg-flore-subtle rounded-xl">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2 hover:bg-flore-gold/20 rounded-xl transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2 hover:bg-flore-gold/20 rounded-xl transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="font-amiri text-xl font-bold text-flore-primary">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-flore-card rounded-3xl p-6 shadow-luxury">
            <div className="flex justify-between items-center mb-4 text-right">
              <span className="text-flore-text-secondary">المجموع</span>
              <span className="font-amiri text-2xl font-bold text-flore-primary">{formatPrice(getTotal())}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={clearCart} className="flex-1 py-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium">
                إفراغ السلة
              </button>
              <Button size="lg" className="flex-[2] gap-2" onClick={() => router.push('/checkout')}>
                إتمـام الطلب
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}