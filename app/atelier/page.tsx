"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

type Flower = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  color: string | null
  in_stock: boolean
}

type Wrap = {
  id: string
  name: string
  name_ar: string | null
  price: number
  color: string | null
  in_stock: boolean
}

type Vase = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
}

export default function AtelierPage() {
  const { addItem } = useCart()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [flowers, setFlowers] = useState<Flower[]>([])
  const [wraps, setWraps] = useState<Wrap[]>([])
  const [vases, setVases] = useState<Vase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  const [selectedFlowers, setSelectedFlowers] = useState<Record<string, number>>({})
  const [selectedWrap, setSelectedWrap] = useState<string | null>(null)
  const [selectedVase, setSelectedVase] = useState<string | null>(null)
  const [giftMessage, setGiftMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        const [{ data: f, error: ef }, { data: w, error: ew }, { data: v, error: ev }] =
          await Promise.all([
            supabase.from('flower_types').select('*').eq('in_stock', true),
            supabase.from('wrap_options').select('*').eq('in_stock', true),
            supabase.from('vase_options').select('*').eq('in_stock', true),
          ])

        if (ef) throw ef
        if (ew) throw ew
        if (ev) throw ev

        if (isMounted) {
          if (f) setFlowers(f)
          if (w) setWraps(w)
          if (v) setVases(v)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError((err as { message?: string }).message || 'حدث خطأ في تحميل البيانات')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const flowersTotalPrice = useMemo(() => {
    return Object.entries(selectedFlowers).reduce((sum, [id, qty]) => {
      const flower = flowers.find(f => f.id === id)
      return sum + ((flower?.price || 0) * qty)
    }, 0)
  }, [selectedFlowers, flowers])

  const totalPrice = useMemo(() => {
    const wrap = wraps.find(w => w.id === selectedWrap)
    const vase = vases.find(v => v.id === selectedVase)
    return flowersTotalPrice + (wrap?.price || 0) + (vase?.price || 0)
  }, [flowersTotalPrice, wraps, selectedWrap, vases, selectedVase])

  const totalFlowers = useMemo(() =>
    Object.values(selectedFlowers).reduce((a, b) => a + b, 0),
    [selectedFlowers]
  )

  const updateFlowerQty = (id: string, delta: number) => {
    setSelectedFlowers(prev => {
      const qty = Math.max(0, (prev[id] || 0) + delta)
      const next = { ...prev }
      if (qty === 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  const handleAddToCart = () => {
    if (totalFlowers === 0) {
      alert('اختر زهرة واحدة على الأقل')
      return
    }

    const selectedFlowerNames = Object.entries(selectedFlowers)
      .map(([id, qty]) => {
        const f = flowers.find(fl => fl.id === id)
        return `${f?.name_ar || f?.name} ×${qty}`
      }).join('، ')

    const wrap = wraps.find(w => w.id === selectedWrap)
    const vase = vases.find(v => v.id === selectedVase)

    const now = new Date().toISOString()
    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: `باقة مخصصة — ${selectedFlowerNames}`,
      name_en: 'Custom Bouquet',
      category: 'custom' as const,
      price: totalPrice,
      currency: 'JOD',
      image: flowers.find(f => selectedFlowers[f.id])?.image || '',
      images: [],
      description: `زهور: ${selectedFlowerNames}${wrap ? ` | تغليف: ${wrap.name_ar || wrap.name}` : ''}${vase ? ` | مزهرية: ${vase.name_ar || vase.name}` : ''}`,
      description_en: null,
      badge: 'مخصص',
      badge_color: '#c77dff',
      in_stock: true,
      model_url: null,
      ar_enabled: false,
      created_at: now,
      updated_at: now,
    }

    addItem({
      product: customProduct,
      quantity: 1,
      customization: {
        flowers: Object.entries(selectedFlowers).map(([id, qty]) => {
          const f = flowers.find(fl => fl.id === id)
          return `${f?.name_ar || f?.name} ×${qty}`
        }),
        wrap: wrap?.name_ar || wrap?.name || '',
        vase: vase?.name_ar || vase?.name || '',
        message: giftMessage,
      },
    })

    setAdded(true)
    setTimeout(() => {
      window.location.href = '/cart'
    }, 800)
  }

  const bouquetColors = Object.entries(selectedFlowers).flatMap(([id, qty]) => {
    const flower = flowers.find(f => f.id === id)
    return Array(Math.min(qty, 8)).fill(flower?.color || '#ff6b9d')
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-flore-bg">
      <div className="text-flore-primary text-xl animate-pulse font-amiri">جاري تحميل الأتيليه...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-flore-bg">
      <div className="text-red-500 text-center">
        <p className="text-xl mb-2">{error}</p>
        <button onClick={() => window.location.reload()} className="text-flore-primary underline">إعادة المحاولة</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-flore-bg pb-32 font-noto" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="text-center mb-8">
          <h1 className="font-amiri text-4xl font-bold text-flore-primary mb-2">أتيليه فلوري</h1>
          <p className="text-flore-text-secondary">صمّم باقتك الخاصة — اختر الزهور والتغليف والمزهرية</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

          <div className="md:col-span-2 space-y-8">

            {/* الزهور */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-flore-text-primary flex items-center gap-2">
                الزهور
                {totalFlowers > 0 && (
                  <span className="text-sm font-normal bg-flore-primary text-white px-2 py-0.5 rounded-full">
                    {totalFlowers} محددة
                  </span>
                )}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {flowers.map(flower => {
                  const qty = selectedFlowers[flower.id] || 0
                  return (
                    <div key={flower.id}
                      className={`p-4 rounded-2xl border-2 transition-all bg-flore-card ${qty > 0 ? 'border-flore-primary shadow-md' : 'border-flore-border'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: flower.color || '#ff6b9d' }} />
                        <div>
                          <p className="font-bold text-sm text-flore-text-primary">{flower.name_ar || flower.name}</p>
                          <p className="text-flore-primary text-sm font-semibold">{formatPrice(flower.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-flore-bg rounded-xl p-1">
                        <button onClick={() => updateFlowerQty(flower.id, 1)}
                          className="bg-flore-primary text-white w-8 h-8 rounded-lg font-bold text-lg hover:opacity-90 transition flex items-center justify-center">
                          +
                        </button>
                        <span className="font-bold text-flore-text-primary px-3">{qty}</span>
                        <button onClick={() => updateFlowerQty(flower.id, -1)}
                          disabled={qty === 0}
                          className="bg-flore-card border border-flore-border text-flore-text-primary w-8 h-8 rounded-lg font-bold text-lg hover:bg-flore-border transition flex items-center justify-center disabled:opacity-30">
                          −
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* التغليف */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-flore-text-primary">التغليف</h2>
              <div className="flex flex-wrap gap-3">
                {wraps.map(wrap => (
                  <button key={wrap.id}
                    onClick={() => setSelectedWrap(selectedWrap === wrap.id ? null : wrap.id)}
                    className={`px-5 py-3 rounded-xl border-2 transition-all font-medium text-sm ${selectedWrap === wrap.id
                      ? 'border-flore-primary bg-flore-primary/10 text-flore-primary shadow-md'
                      : 'border-flore-border bg-flore-card text-flore-text-primary hover:border-flore-primary/50'
                      }`}
                  >
                    {wrap.name_ar || wrap.name}
                    {wrap.price > 0 && <span className="mr-1 text-flore-primary">+{formatPrice(wrap.price)}</span>}
                    {wrap.price === 0 && <span className="mr-1 text-green-500">مجاني</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* المزهرية */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-flore-text-primary">المزهرية</h2>
              <div className="flex flex-wrap gap-3">
                {vases.map(vase => (
                  <button key={vase.id}
                    onClick={() => setSelectedVase(selectedVase === vase.id ? null : vase.id)}
                    className={`px-5 py-3 rounded-xl border-2 transition-all font-medium text-sm ${selectedVase === vase.id
                      ? 'border-flore-primary bg-flore-primary/10 text-flore-primary shadow-md'
                      : 'border-flore-border bg-flore-card text-flore-text-primary hover:border-flore-primary/50'
                      }`}
                  >
                    {vase.name_ar || vase.name}
                    {vase.price > 0 && <span className="mr-1 text-flore-primary">+{formatPrice(vase.price)}</span>}
                    {vase.price === 0 && <span className="mr-1 text-green-500">مجاني</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* رسالة الإهداء */}
            <section>
              <h2 className="text-xl font-bold mb-4 text-flore-text-primary">رسالة الإهداء (اختياري)</h2>
              <textarea
                value={giftMessage}
                onChange={e => setGiftMessage(e.target.value)}
                placeholder="اكتب رسالتك الخاصة هنا..."
                rows={3}
                className="w-full rounded-xl border-2 border-flore-border bg-flore-card p-3 text-flore-text-primary focus:border-flore-primary focus:outline-none resize-none transition-colors"
              />
            </section>
          </div>

          {/* عمود المعاينة */}
          <div className="space-y-4">
            <div className="bg-flore-card rounded-3xl p-6 border border-flore-border shadow-luxury sticky top-20">
              <h3 className="font-amiri text-xl font-bold text-flore-primary mb-4 text-center">معاينة الباقة</h3>

              <div className="flex flex-wrap justify-center gap-2 min-h-[120px] items-center mb-4 p-3 bg-flore-bg rounded-2xl">
                {bouquetColors.length === 0 ? (
                  <p className="text-flore-text-secondary text-sm text-center">اختر زهوراً لتظهر هنا</p>
                ) : (
                  bouquetColors.map((color, i) => (
                    <div key={i}
                      className="w-8 h-8 rounded-full shadow-md transition-all hover:scale-110"
                      style={{ backgroundColor: color }}
                    />
                  ))
                )}
              </div>

              <div className="space-y-2 text-sm text-flore-text-secondary mb-4">
                {totalFlowers > 0 && (
                  <div className="flex justify-between">
                    <span>الزهور ({totalFlowers})</span>
                    <span className="font-semibold text-flore-text-primary">
                      {formatPrice(flowersTotalPrice)}
                    </span>
                  </div>
                )}
                {selectedWrap && wraps.find(w => w.id === selectedWrap) && (
                  <div className="flex justify-between">
                    <span>{wraps.find(w => w.id === selectedWrap)?.name_ar}</span>
                    <span className="font-semibold text-flore-text-primary">
                      {formatPrice(wraps.find(w => w.id === selectedWrap)?.price || 0)}
                    </span>
                  </div>
                )}
                {selectedVase && vases.find(v => v.id === selectedVase) && (
                  <div className="flex justify-between">
                    <span>{vases.find(v => v.id === selectedVase)?.name_ar}</span>
                    <span className="font-semibold text-flore-text-primary">
                      {formatPrice(vases.find(v => v.id === selectedVase)?.price || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-flore-border pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-flore-text-primary">الإجمالي</span>
                  <span className="font-amiri text-2xl font-bold text-flore-primary">{formatPrice(totalPrice)}</span>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={totalFlowers === 0 || added}
                className={`w-full py-3 rounded-xl font-bold text-base transition-all ${added
                  ? 'bg-green-500 text-white'
                  : totalFlowers === 0
                    ? 'bg-flore-border text-flore-text-secondary cursor-not-allowed'
                    : 'bg-flore-primary text-white hover:opacity-90 shadow-md'
                  }`}
              >
                {added ? 'تمت الإضافة! جاري التحويل...' : 'أضف إلى السلة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}