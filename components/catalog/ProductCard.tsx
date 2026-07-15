'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag, Eye } from 'lucide-react'
import type { Product } from '@/types'
// التعديل 1: استيراد useCart بدلاً من useCartStore
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  // التعديل 2: استخدام الـ Hook المصحح useCart
  const addItem = useCart((state) => state.addItem)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="relative bg-flore-card rounded-3xl overflow-hidden shadow-luxury hover:shadow-xl transition-shadow duration-300">
        {/* Image */}
        <Link href={`/product/${product.id}`}>
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
            {product.badge && (
              <div className="absolute top-4 right-4">
                <Badge
                  variant="default"
                  className="text-white"
                  style={{ backgroundColor: product.badge_color || '#0D5C63' }}
                >
                  {product.badge}
                </Badge>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-5 space-y-3">
          <Link href={`/product/${product.id}`}>
            <h3 className="font-noto text-lg font-medium text-flore-text-primary line-clamp-1 hover:text-flore-primary transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center justify-between">
            <span className="font-amiri text-xl font-bold text-flore-primary">
              {product.price} د.أ
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1 gap-2"
              // التعديل 3: تمرير الكائن بالصيغة الصحيحة المتوافقة مع الـ CartItem Interface
              onClick={() => addItem({ product, quantity: 1 })}
            >
              <ShoppingBag className="h-4 w-4" />
              أضف للسلة
            </Button>

            {product.ar_enabled && (
              <Link href={`/ar?product=${product.id}`}>
                <Button variant="outline" size="icon" aria-label="تجربة AR">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}