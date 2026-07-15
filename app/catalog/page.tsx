'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProductCard } from '@/components/catalog/ProductCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { categories, debounce } from '@/lib/utils'
import type { Product } from '@/types'

type SortOption = 'newest' | 'price_asc' | 'price_desc'

// 1. فصل منطق الكتالوج بمكون داخلي يقرأ الرابط بأمان
function CatalogContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || 'all'

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('in_stock', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
    } else {
      setProducts(data || [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filterAndSort = useCallback(() => {
    let result = [...products]

    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.name_en && p.name_en.toLowerCase().includes(query))
      )
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    setFilteredProducts(result)
  }, [products, activeCategory, searchQuery, sortBy])

  useEffect(() => {
    filterAndSort()
  }, [filterAndSort])

  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value)
  }, 300)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-amiri text-4xl md:text-5xl font-bold text-flore-text-primary mb-4">
          مجموعتنا الفاخرة
        </h1>
        <p className="text-flore-text-secondary max-w-2xl mx-auto">
          اكتشف تشكيلتنا الواسعة من البوكيهات الفاخرة، الزهور المحفوظة، المزهريات والهدايا المميزة
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-6 mb-12">
        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-flore-text-secondary" />
          <Input
            placeholder="ابحث عن منتج..."
            className="pr-12"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.id ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex justify-center items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-flore-text-secondary" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-flore-card border border-flore-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flore-primary/30"
          >
            <option value="newest">الأحدث</option>
            <option value="price_asc">السعر: من الأقل</option>
            <option value="price_desc">السعر: من الأعلى</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-flore-subtle rounded-3xl" />
              <div className="mt-4 h-4 bg-flore-subtle rounded w-3/4" />
              <div className="mt-2 h-4 bg-flore-subtle rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-flore-subtle rounded-full h-24 w-24 mx-auto mb-6 flex items-center justify-center">
            <Search className="h-10 w-10 text-flore-text-secondary" />
          </div>
          <h3 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
            لا توجد منتجات مطابقة
          </h3>
          <p className="text-flore-text-secondary">
            جرب البحث بكلمات مختلفة أو تصفح الفئات الأخرى
          </p>
        </div>
      )}
    </div>
  )
}

// 2. المكون الرئيسي يقوم بتغليف الكتالوج بـ Suspense لضمان نجاح الـ Build السحابي
export default function CatalogPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-flore-text-secondary">
        جاري تحميل الكتالوج الفاخر...
      </div>
    }>
      <CatalogContent />
    </Suspense>
  )
}