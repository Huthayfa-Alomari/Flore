'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Eye, ArrowLeft, Check, Copy, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
// التعديل 1: استيراد useCart بدلاً من useCartStore
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ARFlowerViewer } from '@/components/catalog/ARFlowerViewer'
import type { Product } from '@/types'

export default function ProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
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
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse grid md:grid-cols-2 gap-12">
          <div className="aspect-square bg-flore-subtle rounded-3xl" />
          <div className="space-y-4">
            <div className="h-8 bg-flore-subtle rounded w-3/4" />
            <div className="h-4 bg-flore-subtle rounded w-1/2" />
            <div className="h-24 bg-flore-subtle rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-4">
          المنتج غير موجود
        </h1>
        <Link href="/catalog">
          <Button>العودة للمجموعة</Button>
        </Link>
      </div>
    )
  }

  const allImages = [product.image, ...(product.images || [])]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link href="/catalog" className="inline-flex items-center gap-2 text-flore-text-secondary hover:text-flore-primary mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-noto text-sm">العودة للمجموعة</span>
      </Link>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-flore-subtle"
          >
            <Image
              src={allImages[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
            {product.badge && (
              <div className="absolute top-4 right-4">
                <Badge
                  style={{ backgroundColor: product.badge_color || '#0D5C63' }}
                  className="text-white"
                >
                  {product.badge}
                </Badge>
              </div>
            )}
          </motion.div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${selectedImage === i ? 'border-flore-primary' : 'border-transparent'
                    }`}
                >
                  <Image src={img} alt={`${product.name} ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="font-amiri text-3xl md:text-4xl font-bold text-flore-text-primary mb-2">
              {product.name}
            </h1>
            {product.name_en && (
              <p className="font-playfair text-lg text-flore-text-secondary">
                {product.name_en}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-4">
            <span className="font-amiri text-3xl font-bold text-flore-primary">
              {product.price} د.أ
            </span>
            <span className="text-flore-text-secondary">شامل الضريبة</span>
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-flore-card rounded-2xl p-6 shadow-luxury">
              <p className="text-flore-text-secondary leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-4">
            <span className="font-noto font-medium">الكمية:</span>
            <div className="flex items-center border border-flore-border rounded-xl">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-10 w-10 flex items-center justify-center hover:bg-flore-subtle transition-colors rounded-r-xl"
              >
                -
              </button>
              <span className="h-10 w-12 flex items-center justify-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 flex items-center justify-center hover:bg-flore-subtle transition-colors rounded-l-xl"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full gap-2"
              // التعديل 3: تمرير المنتج والكمية معاً في كائن واحد ليوافق الـ Interface الجديد
              onClick={() => addItem({ product, quantity })}
            >
              <ShoppingBag className="h-5 w-5" />
              أضف للسلة - {product.price * quantity} د.أ
            </Button>

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
                  <Eye className="h-4 w-4" />
                  تجربة AR
                </Button>
              )}
            </div>
          </div>

          {/* Share */}
          <div className="flex items-center gap-3 pt-4 border-t border-flore-border">
            <span className="text-sm text-flore-text-secondary">مشاركة:</span>
            <Button variant="ghost" size="sm" onClick={handleShare} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleWhatsAppShare} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              'توصيل سريع في عمّان والزرقاء',
              'زهور طازجة يومياً',
              'تغليف فاخر مجاني',
              'ضمان الجودة',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-flore-text-secondary">
                <Check className="h-4 w-4 text-flore-success" />
                {feature}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AR Modal */}
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