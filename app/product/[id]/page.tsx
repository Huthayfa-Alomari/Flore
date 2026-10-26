'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ScanEye, ArrowLeft, Check, Copy, MessageCircle, SearchX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
// التعديل 1: استيراد useCart بدلاً من useCartStore
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { FlowerAddButton } from '@/components/ui/FlowerAddButton'
import { Badge } from '@/components/ui/Badge'
import { ARFlowerViewer } from '@/components/catalog/ARFlowerViewer'
import { ProductImageCarousel } from '@/components/catalog/ProductImageCarousel'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAR, setShowAR] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [copied, setCopied] = useState(false)

  // التعديل 2: استخدام الـ Hook المصحح useCart
  const addItem = useCart((state) => state.addItem)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchProduct = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) {
      console.error('Error:', error)
    } else {
      setProduct(data)
    }
    setLoading(false)
  }, [productId, supabase])

  useEffect(() => {
    fetchProduct()
  }, [fetchProduct])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({
        title: product?.name || 'FLORÉ',
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsAppShare = () => {
    const text = `مرحباً! أعجبني هذا المنتج من فلوري: ${product?.name} - ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flore-container py-12 md:py-16">
        <div className="animate-pulse grid items-start gap-10 md:grid-cols-2 lg:gap-14">
          <div className="aspect-[4/5] rounded-3xl bg-flore-subtle" />
          <div className="space-y-5 py-2">
            <div className="h-3 w-24 rounded-full bg-flore-subtle" />
            <div className="h-10 w-3/4 rounded-2xl bg-flore-subtle" />
            <div className="h-4 w-1/2 rounded-full bg-flore-subtle" />
            <div className="h-8 w-28 rounded-full bg-flore-subtle" />
            <div className="h-28 rounded-3xl bg-flore-subtle" />
            <div className="h-12 rounded-full bg-flore-subtle" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flore-container animate-fade-up py-20 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
          <SearchX className="h-8 w-8 text-flore-primary" />
        </div>
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">
          المنتج غير موجود
        </h1>
        <p className="text-flore-text-secondary mb-8">
          ربما تم نقله أو لم يعد متوفراً في المجموعة
        </p>
        <Link href="/catalog">
          <Button variant="primary">العودة للمجموعة</Button>
        </Link>
      </div>
    )
  }

  const allImages = [product.image, ...(product.images || [])]

  return (
    <div className="flore-container py-8 md:py-12">
      {/* العودة للمجموعة */}
      <Link
        href="/catalog"
        className="group mb-8 inline-flex items-center gap-2.5 text-sm text-flore-text-secondary transition-colors duration-200 ease-flore hover:text-flore-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-flore-border/70 bg-flore-card shadow-luxury-soft transition-all duration-200 ease-flore group-hover:border-flore-primary/40">
          <ArrowLeft className="h-4 w-4" />
        </span>
        العودة للمجموعة
      </Link>

      <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-14">
        {/* الصور */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          className="relative"
        >
          <ProductImageCarousel images={allImages} alt={product.name} />
          {product.badge && (
            <div className="absolute top-4 right-4 z-10">
              <Badge
                style={{ backgroundColor: product.badge_color || 'var(--flore-primary)' }}
                className="text-white shadow-luxury-soft backdrop-blur-sm"
              >
                {product.badge}
              </Badge>
            </div>
          )}
        </motion.div>

        {/* التفاصيل */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
          className="space-y-7"
        >
          {/* العنوان */}
          <header>
            <p className="flore-eyebrow flore-eyebrow-right mb-3">THE COLLECTION</p>
            <h1 className="font-amiri text-3xl font-bold leading-snug text-flore-text-primary md:text-4xl">
              {product.name}
            </h1>
            {product.name_en && (
              <p className="mt-1.5 font-display text-lg italic tracking-wide text-flore-text-secondary">
                {product.name_en}
              </p>
            )}
          </header>

          {/* السعر */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-amiri text-3xl font-bold text-flore-primary">
              <span className="flore-price" dir="ltr">{formatPrice(product.price, '')}</span>
              <span className="mr-1.5 text-base font-medium text-flore-text-secondary">د.أ</span>
            </p>
            <span className="text-sm text-flore-text-secondary">شامل الضريبة</span>
          </div>

          {/* الوصف — بطاقة بخط رفيع */}
          {product.description && (
            <div className="rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft">
              <p className="text-[15px] leading-loose text-flore-text-secondary">
                {product.description}
              </p>
            </div>
          )}

          {/* الكمية */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-flore-text-primary">الكمية:</span>
            <div className="flex items-center rounded-full border border-flore-border/70 bg-flore-card p-1 shadow-luxury-soft">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="تقليل الكمية"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-flore-text-primary transition-colors duration-200 ease-flore hover:bg-flore-subtle active:scale-95"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-bold text-flore-text-primary">
                <span className="flore-price">{quantity}</span>
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                aria-label="زيادة الكمية"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-flore-text-primary transition-colors duration-200 ease-flore hover:bg-flore-subtle active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* الإجراءات */}
          <div className="flex flex-col gap-3">
            <FlowerAddButton
              variant="primary"
              onClick={() => addItem({ product, quantity })}
            >
              أضف لهديتك - <span className="flore-price">{product.price * quantity}</span> د.أ
            </FlowerAddButton>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2">
                <Heart className="h-4 w-4" />
                المفضلة
              </Button>

              {product.ar_enabled && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowAR(true)}
                >
                  <ScanEye className="h-4 w-4" />
                  تجربة AR
                </Button>
              )}
            </div>
          </div>

          {/* المشاركة */}
          <div className="flex items-center gap-2 border-t border-flore-border/70 pt-5">
            <span className="text-sm text-flore-text-secondary">مشاركة:</span>
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-flore-success" /> : <Copy className="h-4 w-4" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleWhatsAppShare} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </Button>
          </div>

          {/* المزايا */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              'توصيل سريع في عمّان والزرقاء',
              'زهور طازجة يومياً',
              'تغليف فاخر مجاني',
              'ضمان الجودة',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 rounded-2xl bg-flore-subtle/60 px-4 py-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-flore-sage/30">
                  <Check className="h-3 w-3 text-flore-primary" />
                </span>
                <span className="text-sm text-flore-text-secondary">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* نافذة الواقع المعزز */}
      <AnimatePresence>
        {showAR && (
          <ARFlowerViewer
            modelUrl={product.model_url}
            posterUrl={product.image}
            onClose={() => setShowAR(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
