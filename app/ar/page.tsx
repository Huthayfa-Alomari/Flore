'use client'

import { useState, useEffect, Suspense } from 'react'
import { Eye, Smartphone, RotateCcw, Flower2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/Card'
import { useARSupport } from '@/hooks/useAR'
import type { Product } from '@/types'

// model-viewer types are defined globally in types/model-viewer.d.ts

function ModelViewer({ product }: { product: Product }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
      import('@google/model-viewer')
        .then(() => console.log('Model Viewer loaded in standalone AR page'))
        .catch((err) => console.error('Failed to load model-viewer:', err))
    }
  }, [])

  if (!isMounted) return null

  return (
    <div className="relative h-full w-full">
      <model-viewer
        src={product.model_url || ''} // تمرير سلسلة فارغة بدلاً من null لتجنب تعارض الأنواع الصارم
        poster={product.image || ''}   // تمرير سلسلة فارغة بدلاً من null لتجنب تعارض الأنواع الصارم
        alt={`معاينة ${product.name}`}
        camera-controls
        auto-rotate
        ar
        ar-modes="webxr scene-viewer quick-look"
        touch-action="pan-y"
        shadow-intensity="1"
        exposure="0.8"
        style={{ width: '100%', height: '100%', borderRadius: '1.5rem' } as React.CSSProperties}
      >
        {/* تم تحويله إلى div وتمرير ستايل تفاعلي لحل مشكلة الـ Event handlers passed to Client Component props */}
        <div
          slot="ar-button"
          className="absolute bottom-6 left-1/2 z-20 flex cursor-pointer -translate-x-1/2 items-center gap-2 rounded-full bg-flore-primary px-8 py-4 font-noto text-sm font-medium text-white shadow-luxury transition-all duration-200 ease-flore hover:bg-flore-primary-dark active:scale-[0.97]"
        >
          <Smartphone className="h-5 w-5" />
          عرض في مساحتك
        </div>
      </model-viewer>
    </div>
  )
}

export default function ARPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const { isSupported } = useARSupport()
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('ar_enabled', true)
        .eq('in_stock', true)

      if (data && data.length > 0) {
        setProducts(data as Product[])
        setSelectedProduct(data[0] as Product)
      }
    } catch (error) {
      console.error('Error fetching AR products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5">
        <div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-flore-subtle">
          <Flower2 className="h-9 w-9 text-flore-primary" />
        </div>
        <p className="font-amiri text-lg text-flore-text-secondary">
          جاري تجهيز تجربة الواقع المعزز...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-12">
      {/* ── الترويسة ── */}
      <div className="mb-10 text-center animate-fade-up md:mb-12">
        <p className="flore-eyebrow mb-3">AUGMENTED REALITY</p>
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
          تجربة الواقع المعزز
        </h1>
        <p className="mt-3 text-sm text-flore-text-secondary">
          شاهد البوكيه في منزلك قبل الشراء
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* مُحدد المنتجات الجانبي */}
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 lg:col-span-1">
          <h3 className="font-amiri mb-2 text-xl font-bold text-flore-text-primary">اختر منتجاً</h3>
          {products.length === 0 ? (
            <div className="rounded-3xl border border-flore-border/70 bg-flore-card p-8 text-center shadow-luxury-soft">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
                <Eye className="h-7 w-7 text-flore-primary" />
              </div>
              <h4 className="font-amiri text-lg font-bold text-flore-text-primary">
                لا توجد منتجات AR مفعلة حالياً.
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-flore-text-secondary">
                عُد لاحقاً لاستكشاف المجموعة داخل مساحتك
              </p>
            </div>
          ) : (
            products.map((product) => {
              const isSelected = selectedProduct?.id === product.id
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`flore-lift flex w-full cursor-pointer items-center gap-4 rounded-3xl border p-3 text-right transition-all duration-200 ease-flore ${isSelected
                    ? 'border-flore-primary bg-flore-subtle/50 shadow-luxury-soft'
                    : 'border-flore-border/70 bg-flore-card hover:border-flore-primary/40'
                    }`}
                >
                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl border border-flore-border/60 bg-cover bg-center"
                    style={{ backgroundImage: `url(${product.image})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-flore-text-primary">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-flore-primary">
                      <span className="flore-price" dir="ltr">{product.price}</span> د.أ
                    </p>
                  </div>
                  {isSelected && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-flore-gold-dark" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* مسرح العرض الحي */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden rounded-3xl animate-fade-up">
            <CardContent className="p-0">
              <div className="relative aspect-square bg-flore-bg-alt">
                {selectedProduct?.model_url ? (
                  <Suspense fallback={
                    <div className="flex h-full items-center justify-center">
                      <Eye className="h-12 w-12 animate-pulse text-flore-primary" />
                    </div>
                  }>
                    <ModelViewer product={selectedProduct} />
                  </Suspense>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
                      <Eye className="h-8 w-8 text-flore-text-secondary" />
                    </div>
                    <h3 className="font-amiri text-xl font-bold text-flore-text-primary">
                      النموذج ثلاثي الأبعاد غير متوفر
                    </h3>
                    <p className="mt-2 text-xs text-flore-text-secondary">
                      هذا المنتج لا يحتوي على نموذج AR بعد
                    </p>
                  </div>
                )}

                {/* تلميح في حال عدم دعم الـ AR على الحواسيب */}
                {!isSupported && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-flore-bg/95 backdrop-blur-sm">
                    <div className="max-w-sm p-8 text-center">
                      <div className="mx-auto mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-flore-subtle">
                        <Smartphone className="h-8 w-8 text-flore-primary" />
                      </div>
                      <h3 className="font-amiri text-xl font-bold text-flore-text-primary">
                        افتح من الهاتف المحمول
                      </h3>
                      <p className="mt-2 font-noto text-xs leading-relaxed text-flore-text-secondary">
                        تقنية الواقع المعزز (AR) تتطلب كاميرا ومستشعرات هاتف محمول. يرجى تصفح هذا الرابط من هاتفك الذكي لمعاينة الورد حياً في غرفتك.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* مزايا التجربة */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center rounded-3xl border border-flore-border/70 bg-flore-card p-5 text-center shadow-luxury-soft">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-flore-subtle">
                <RotateCcw className="h-5 w-5 text-flore-primary" />
              </div>
              <p className="font-noto text-xs font-medium text-flore-text-primary">تدوير 360°</p>
            </div>
            <div className="flex flex-col items-center rounded-3xl border border-flore-border/70 bg-flore-card p-5 text-center shadow-luxury-soft">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-flore-subtle">
                <Smartphone className="h-5 w-5 text-flore-primary" />
              </div>
              <p className="font-noto text-xs font-medium text-flore-text-primary">عرض حقيقي</p>
            </div>
            <div className="flex flex-col items-center rounded-3xl border border-flore-border/70 bg-flore-card p-5 text-center shadow-luxury-soft">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-flore-subtle">
                <Eye className="h-5 w-5 text-flore-primary" />
              </div>
              <p className="font-noto text-xs font-medium text-flore-text-primary">مقياس حقيقي</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
