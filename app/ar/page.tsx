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
    <div className="relative w-full h-full">
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
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-flore-primary text-white px-8 py-4 rounded-xl font-noto font-medium shadow-lg hover:bg-opacity-90 transition-all flex items-center gap-2 cursor-pointer z-20"
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Flower2 className="h-12 w-12 animate-spin text-flore-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="font-amiri text-4xl font-bold text-flore-text-primary mb-2">
          تجربة الواقع المعزز
        </h1>
        <p className="text-flore-text-secondary">
          شاهد البوكيه في منزلك قبل الشراء
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* مُحدد المنتجات الجانبي */}
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <h3 className="font-amiri text-xl font-bold text-flore-text-primary">اختر منتجاً</h3>
          {products.length === 0 ? (
            <p className="text-xs text-flore-text-secondary font-noto">لا توجد منتجات AR مفعلة حالياً.</p>
          ) : (
            products.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`w-full text-right p-4 rounded-2xl border-2 transition-all ${selectedProduct?.id === product.id
                  ? 'border-flore-primary bg-flore-primary/5'
                  : 'border-flore-border hover:border-flore-primary/50'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-xl bg-cover bg-center flex-shrink-0"
                    style={{ backgroundImage: `url(${product.image})` }}
                  />
                  <div>
                    <p className="font-medium text-sm text-flore-text-primary">{product.name}</p>
                    <p className="text-flore-primary font-bold text-xs">{product.price} د.أ</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* مسرح العرض الحي */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border border-flore-border shadow-luxury rounded-3xl">
            <CardContent className="p-0">
              <div className="relative aspect-square bg-flore-bg">
                {selectedProduct?.model_url ? (
                  <Suspense fallback={
                    <div className="h-full flex items-center justify-center">
                      <Eye className="h-12 w-12 text-flore-primary animate-pulse" />
                    </div>
                  }>
                    <ModelViewer product={selectedProduct} />
                  </Suspense>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <Eye className="h-16 w-16 text-flore-text-secondary mb-4" />
                    <h3 className="font-amiri text-xl font-bold mb-2 text-flore-text-primary">
                      النموذج ثلاثي الأبعاد غير متوفر
                    </h3>
                    <p className="text-flore-text-secondary text-xs">
                      هذا المنتج لا يحتوي على نموذج AR بعد
                    </p>
                  </div>
                )}

                {/* تلميح في حال عدم دعم الـ AR على الحواسيب */}
                {!isSupported && (
                  <div className="absolute inset-0 bg-flore-bg/90 flex items-center justify-center rounded-3xl">
                    <div className="text-center p-8">
                      <Smartphone className="h-14 w-14 text-flore-primary mx-auto mb-4 animate-bounce" />
                      <h3 className="font-amiri text-xl font-bold mb-2 text-flore-text-primary">
                        افتح من الهاتف المحمول
                      </h3>
                      <p className="text-flore-text-secondary max-w-sm text-xs font-noto leading-relaxed">
                        تقنية الواقع المعزز (AR) تتطلب كاميرا ومستشعرات هاتف محمول. يرجى تصفح هذا الرابط من هاتفك الذكي لمعاينة الورد حياً في غرفتك.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-flore-card border border-flore-border rounded-2xl p-4 text-center">
              <RotateCcw className="h-5 w-5 mx-auto mb-2 text-flore-primary" />
              <p className="text-xs font-medium font-noto text-flore-text-primary">تدوير 360°</p>
            </div>
            <div className="bg-flore-card border border-flore-border rounded-2xl p-4 text-center">
              <Smartphone className="h-5 w-5 mx-auto mb-2 text-flore-primary" />
              <p className="text-xs font-medium font-noto text-flore-text-primary">عرض حقيقي</p>
            </div>
            <div className="bg-flore-card border border-flore-border rounded-2xl p-4 text-center">
              <Eye className="h-5 w-5 mx-auto mb-2 text-flore-primary" />
              <p className="text-xs font-medium font-noto text-flore-text-primary">مقياس حقيقي</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
