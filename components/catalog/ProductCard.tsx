'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag, ScanEye } from 'lucide-react'
import type { Product } from '@/types'
import { useCart } from '@/lib/store/cart-store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className="group"
    >
      <div className="flore-lift relative bg-flore-card rounded-3xl overflow-hidden border border-flore-border/70 shadow-luxury-soft">
        {/* الصورة */}
        <Link
          href={`/product/${product.id}`}
          aria-label={product.name}
          className="relative block aspect-[4/5] overflow-hidden cursor-pointer"
        >
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-flore group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {product.badge && (
            <div className="absolute top-4 right-4">
              <Badge
                variant="default"
                className="text-white backdrop-blur-sm"
                style={product.badge_color ? { backgroundColor: product.badge_color } : undefined}
              >
                {product.badge}
              </Badge>
            </div>
          )}

          {product.ar_enabled && (
            <div className="absolute bottom-4 left-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-flore-card/90 border border-flore-border/60 text-flore-primary shadow-luxury-soft backdrop-blur-sm transition-transform duration-200 group-hover:scale-105">
                <ScanEye className="h-[18px] w-[18px]" />
              </span>
            </div>
          )}
        </Link>

        {/* المحتوى */}
        <div className="p-5 space-y-4">
          <Link href={`/product/${product.id}`} className="block cursor-pointer">
            <h3 className="font-amiri text-xl font-bold text-flore-text-primary line-clamp-1 transition-colors duration-200 group-hover:text-flore-primary">
              {product.name}
            </h3>
          </Link>

          <div className="flex items-center justify-between">
            <span className="text-[15px] font-medium text-flore-text-primary">
              <span className="flore-price" dir="ltr">{formatPrice(product.price, '')}</span>
              <span className="text-flore-text-secondary text-sm mr-1">د.أ</span>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1 gap-2"
              onClick={() => addItem({ product, quantity: 1 })}
            >
              <ShoppingBag className="h-4 w-4" />
              أضف للسلة
            </Button>

            {product.ar_enabled && (
              <Link href={`/ar?product=${product.id}`}>
                <Button variant="outline" size="icon" aria-label="تجربة AR">
                  <ScanEye className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}
