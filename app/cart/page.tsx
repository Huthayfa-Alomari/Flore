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
  const { items, removeItem, updateQuantity, getTotal } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-[60vh] bg-flore-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4" aria-label="جاري التحميل">
          <span className="relative flex h-12 w-12">
            <span className="absolute inline-flex h-full w-full rounded-full bg-flore-subtle opacity-60" />
            <ShoppingBag className="relative h-6 w-6 m-3 text-flore-primary" />
          </span>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-flore-bg px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-flore-subtle flex items-center justify-center">
            <ShoppingBag className="h-9 w-9 text-flore-primary" strokeWidth={1.5} />
          </div>
          <p className="flore-eyebrow mb-3">YOUR CART</p>
          <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">لم تختر هديتك بعد</h1>
          <p className="text-flore-text-secondary mb-8 leading-loose">
            كل هدية تبدأ بزهرة واحدة — استكشف مجموعتنا أو صمّم باقة تعبّر عنك
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/catalog">
              <Button size="lg" className="gap-2 w-full">
                <ArrowLeft className="h-4 w-4" />
                تسوق الآن
              </Button>
            </Link>
            <Link href="/atelier">
              <Button size="lg" variant="outline" className="gap-2 w-full">
                صمّم باقتك
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-flore-bg pb-24" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-10">
            <p className="flore-eyebrow mb-3">YOUR CART</p>
            <h1 className="font-amiri text-4xl font-bold text-flore-text-primary">
              سلة المشتريات
              <span className="text-flore-text-secondary text-2xl font-normal mr-2">
                (<span className="flore-price" dir="ltr">{items.length}</span>)
              </span>
            </h1>
          </div>

          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="bg-flore-card rounded-3xl border border-flore-border/70 p-4 shadow-luxury-soft flex gap-4"
              >
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.image || '/placeholder.png'}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-amiri text-lg font-bold text-flore-text-primary truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-flore-text-secondary text-sm mt-0.5">
                        <span className="flore-price" dir="ltr">{formatPrice(item.product.price)}</span> / وحدة
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      aria-label={`حذف ${item.product.name}`}
                      className="text-flore-text-secondary/60 hover:text-flore-error transition-colors duration-200 cursor-pointer p-1"
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 bg-flore-subtle rounded-full">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        aria-label="تقليل الكمية"
                        className="p-2 hover:bg-flore-card/70 rounded-full transition-colors duration-200 cursor-pointer text-flore-text-secondary hover:text-flore-primary"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold flore-price" dir="ltr">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        aria-label="زيادة الكمية"
                        className="p-2 hover:bg-flore-card/70 rounded-full transition-colors duration-200 cursor-pointer text-flore-text-secondary hover:text-flore-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-lg font-bold text-flore-primary">
                      <span className="flore-price" dir="ltr">{formatPrice(item.product.price * item.quantity)}</span>
                      <span className="text-flore-text-secondary text-xs font-normal mr-1">د.أ</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-flore-card rounded-3xl border border-flore-border/70 p-6 shadow-luxury-soft">
            <div className="flex justify-between items-center py-3 px-4 mb-2 text-right bg-flore-subtle/60 rounded-2xl">
              <span className="text-flore-text-secondary text-sm">المجموع</span>
              <span className="text-2xl font-bold text-flore-primary">
                <span className="flore-price" dir="ltr">{formatPrice(getTotal())}</span>
                <span className="text-flore-text-secondary text-sm font-normal mr-1">د.أ</span>
              </span>
            </div>
            <p className="text-[11px] text-flore-text-secondary/70 text-center mb-4">
              التوصيل والضريبة يُحسبان عند إتمام الطلب
            </p>
            <Button
              size="lg"
              className="w-full gap-2 justify-center"
              onClick={() => router.push('/checkout')}
            >
              إتمام الطلب
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}