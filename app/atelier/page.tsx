"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

// ─── Types ─────────────────────────────────────────────
type Flower = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  color: string | null
  in_stock: boolean
}

type Greenery = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
}

type Container = {
  id: string
  name: string
  name_ar: string | null
  price: number
  image: string | null
  in_stock: boolean
  container_type: 'basket' | 'glass_vase' | 'wrap' | 'luxury_box'
}

type BouquetSize = {
  id: string
  key: string
  label_ar: string
  desc_ar: string | null
  stem_count: number
  price_multiplier: number
}

type Step = 'flowers' | 'greenery' | 'container' | 'size' | 'message'

const CONTAINER_ICONS: Record<Container['container_type'], string> = {
  basket: '🧺',
  glass_vase: '🏺',
  wrap: '💐',
  luxury_box: '🎁',
}

const CONTAINER_LABELS: Record<Container['container_type'], string> = {
  basket: 'سلة',
  glass_vase: 'مزهرية زجاجية',
  wrap: 'تغليف باقة',
  luxury_box: 'صندوق فاخر',
}

const PRESETS = [
  { id: 'romantic', label: 'رومانسية', icon: '💕', desc: 'ورد أحمر + توليب' },
  { id: 'elegant', label: 'فاخرة', icon: '✨', desc: 'أوركيد + كالا' },
  { id: 'fresh', label: 'منعشة', icon: '🌿', desc: 'زهور بيضاء' },
  { id: 'sunshine', label: 'مشرقة', icon: '☀️', desc: 'عباد الشمس' },
]

const COLOR_FILTERS = [
  { label: 'الكل', value: 'all', color: 'linear-gradient(135deg,#ccc,#999)' },
  { label: 'أحمر', value: '#e11d48', color: '#e11d48' },
  { label: 'وردي', value: '#ff6b9d', color: '#ff6b9d' },
  { label: 'أبيض', value: '#f8fafc', color: '#f8fafc' },
  { label: 'أصفر', value: '#fbbf24', color: '#fbbf24' },
  { label: 'بنفسجي', value: '#a855f7', color: '#a855f7' },
]

function triggerConfetti() {
  if (typeof window === 'undefined') return
  const colors = ['#0D5C63', '#67B26F', '#C9A962', '#ff6b9d']
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div')
    el.style.position = 'fixed'
    el.style.left = '50%'
    el.style.top = '50%'
    el.style.width = '8px'
    el.style.height = '8px'
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '9999'
    document.body.appendChild(el)
    const angle = Math.random() * Math.PI * 2
    const velocity = 100 + Math.random() * 200
    const tx = Math.cos(angle) * velocity
    const ty = Math.sin(angle) * velocity - 100
    const rot = Math.random() * 720 - 360
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration: 800 + Math.random() * 600, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }
    ).onfinish = () => el.remove()
  }
}

export default function AtelierPage() {
  const { addItem } = useCart()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [flowers, setFlowers] = useState<Flower[]>([])
  const [greeneries, setGreeneries] = useState<Greenery[]>([])
  const [containers, setContainers] = useState<Container[]>([])
  const [bouquetSizes, setBouquetSizes] = useState<BouquetSize[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState(false)

  const [selectedFlowers, setSelectedFlowers] = useState<Record<string, number>>({})
  const [selectedGreenery, setSelectedGreenery] = useState<Record<string, number>>({})
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>('regular')
  const [giftMessage, setGiftMessage] = useState('')

  const [activeStep, setActiveStep] = useState<Step>('flowers')
  const [colorFilter, setColorFilter] = useState('all')
  const [previewHovered, setPreviewHovered] = useState(false)
  const [showPresets, setShowPresets] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const [
          { data: f, error: ef },
          { data: c, error: ec },
          { data: g, error: eg },
          { data: s, error: es },
        ] = await Promise.all([
          supabase.from('flower_types').select('*').eq('in_stock', true).order('price'),
          supabase.from('vase_options').select('*').eq('in_stock', true).order('price'),
          supabase.from('greenery_options').select('*').eq('in_stock', true).order('price'),
          supabase.from('bouquet_sizes').select('*').order('stem_count'),
        ])
        if (ef) throw ef
        if (ec) throw ec
        if (eg) throw eg
        if (es) throw es
        if (isMounted) {
          if (f) setFlowers(f)
          if (c) setContainers(c as Container[])
          if (g) setGreeneries(g)
          if (s) setBouquetSizes(s)
        }
      } catch (err: unknown) {
        if (isMounted) setError((err as { message?: string }).message || 'حدث خطأ في تحميل البيانات')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [supabase])

  const filteredFlowers = useMemo(() => {
    if (colorFilter === 'all') return flowers
    return flowers.filter(f => {
      if (!f.color) return false
      const c = f.color.toLowerCase()
      return c === colorFilter.toLowerCase()
    })
  }, [flowers, colorFilter])

  const flowersTotalPrice = useMemo(() => {
    return Object.entries(selectedFlowers).reduce((sum, [id, qty]) => {
      const flower = flowers.find(f => f.id === id)
      return sum + (flower?.price || 0) * qty
    }, 0)
  }, [selectedFlowers, flowers])

  const greeneryTotalPrice = useMemo(() => {
    return Object.entries(selectedGreenery).reduce((sum, [id, qty]) => {
      const item = greeneries.find(g => g.id === id)
      return sum + (item?.price || 0) * qty
    }, 0)
  }, [selectedGreenery, greeneries])

  const selectedContainerObj = containers.find(c => c.id === selectedContainer)
  const sizeMultiplier = useMemo(
    () => bouquetSizes.find(s => s.key === selectedSize)?.price_multiplier || 1,
    [bouquetSizes, selectedSize]
  )

  const totalPrice = useMemo(() => {
    const base = flowersTotalPrice + greeneryTotalPrice + (selectedContainerObj?.price || 0)
    return base * sizeMultiplier
  }, [flowersTotalPrice, greeneryTotalPrice, selectedContainerObj, sizeMultiplier])

  const totalFlowers = useMemo(
    () => Object.values(selectedFlowers).reduce((a, b) => a + b, 0),
    [selectedFlowers]
  )

  const updateFlowerQty = useCallback((id: string, delta: number) => {
    setSelectedFlowers(prev => {
      const qty = Math.max(0, (prev[id] || 0) + delta)
      const next = { ...prev }
      if (qty === 0) delete next[id]
      else next[id] = qty
      return next
    })
  }, [])

  const updateGreeneryQty = useCallback((id: string, delta: number) => {
    setSelectedGreenery(prev => {
      const qty = Math.max(0, (prev[id] || 0) + delta)
      const next = { ...prev }
      if (qty === 0) delete next[id]
      else next[id] = qty
      return next
    })
  }, [])

  const applyPreset = useCallback((presetId: string) => {
    const next: Record<string, number> = {}
    if (presetId === 'romantic') {
      const red = flowers.find(f => f.name_ar?.includes('حمراء'))
      if (red) next[red.id] = 5
    } else if (presetId === 'elegant') {
      const orchid = flowers.find(f => f.name_ar?.includes('أوركيد') || f.name_ar?.includes('لافندر'))
      if (orchid) next[orchid.id] = 4
    } else if (presetId === 'fresh') {
      const white = flowers.find(f => f.name_ar?.includes('بيضاء'))
      if (white) next[white.id] = 6
    } else if (presetId === 'sunshine') {
      const sun = flowers.find(f => f.name_ar?.includes('صفراء') || f.name_ar?.includes('برتقالية'))
      if (sun) next[sun.id] = 5
    }
    if (Object.keys(next).length === 0) {
      // ما لقينا زهرة مطابقة — نبلغ المستخدم بدل ما نطبق باقة فاضية بصمت
      alert('عذراً، هذا الاقتراح غير متاح حالياً، اختر زهورك يدوياً 🌸')
      return
    }
    setSelectedFlowers(next)
    setShowPresets(false)
  }, [flowers])

  const clearAll = useCallback(() => {
    setSelectedFlowers({})
    setSelectedGreenery({})
    setSelectedContainer(null)
    setSelectedSize('regular')
    setGiftMessage('')
    setActiveStep('flowers')
    setShowPresets(true)
  }, [])

  const handleAddToCart = useCallback(() => {
    if (totalFlowers === 0) {
      alert('اختر زهرة واحدة على الأقل')
      return
    }
    const selectedFlowerNames = Object.entries(selectedFlowers)
      .map(([id, qty]) => {
        const f = flowers.find(fl => fl.id === id)
        return `${f?.name_ar || f?.name} ×${qty}`
      })
      .join('، ')

    const size = bouquetSizes.find(s => s.key === selectedSize)
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
      description: `زهور: ${selectedFlowerNames}${selectedContainerObj ? ` | حاوية: ${selectedContainerObj.name_ar || selectedContainerObj.name}` : ''}${size ? ` | الحجم: ${size.label_ar}` : ''}`,
      description_en: null,
      badge: 'مخصص',
      badge_color: '#0D5C63',
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
        wrap: selectedContainerObj?.name_ar || selectedContainerObj?.name || '',
        vase: '',
        message: giftMessage,
      },
      bouquetSelection: {
        flowers: Object.entries(selectedFlowers).map(([id, qty]) => ({ id, qty })),
        wrapId: null,
        vaseId: selectedContainer,
      },
    })

    triggerConfetti()
    setAdded(true)
    setTimeout(() => {
      window.location.href = '/cart'
    }, 1200)
  }, [totalFlowers, selectedFlowers, flowers, selectedContainerObj, selectedContainer, totalPrice, giftMessage, addItem, bouquetSizes, selectedSize])

  const bouquetPreviewItems = useMemo(() => {
    const items: { color: string; image: string | null; size: number }[] = []
    Object.entries(selectedFlowers).forEach(([id, qty]) => {
      const flower = flowers.find(f => f.id === id)
      if (!flower) return
      const count = Math.min(qty, 10)
      for (let i = 0; i < count; i++) {
        items.push({ color: flower.color || '#ff6b9d', image: flower.image || null, size: 26 + Math.random() * 14 })
      }
    })
    return items.sort(() => Math.random() - 0.5)
  }, [selectedFlowers, flowers])

  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'flowers', label: 'الزهور', icon: '🌸' },
    { key: 'greenery', label: 'الأوراق', icon: '🌿' },
    { key: 'container', label: 'الحاوية', icon: '🎁' },
    { key: 'size', label: 'الحجم', icon: '📏' },
    { key: 'message', label: 'الإهداء', icon: '💌' },
  ]
  const stepIndex = steps.findIndex(s => s.key === activeStep)

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-flore-primary/20 border-t-flore-primary animate-spin" />
          <p className="text-flore-text-secondary text-lg font-medium animate-pulse">جاري تحميل الأتيليه...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-flore-bg">
        <div className="text-center bg-flore-card rounded-3xl p-8 shadow-luxury max-w-sm mx-4">
          <div className="text-5xl mb-4">😔</div>
          <p className="text-red-500 text-xl mb-4 font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-flore-primary text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition">
            إعادة المحاولة
          </button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-flore-bg pb-32 font-noto" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-flore-card/60 backdrop-blur-sm rounded-full px-4 py-1.5 mb-3 border border-flore-border">
            <span className="text-xs text-flore-text-secondary tracking-widest uppercase">Atelier Floré</span>
          </div>
          <h1 className="font-amiri text-4xl md:text-5xl font-bold text-flore-text-primary mb-2">أتيليه فلوري</h1>
          <p className="text-flore-text-secondary text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            صمّم باقتك الخاصة خطوة بخطوة — من الزهرة إلى الحاوية
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-1 md:gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((step, idx) => {
            const isActive = step.key === activeStep
            const isPast = idx < stepIndex
            const isClickable = idx <= stepIndex + 1
            return (
              <button
                key={step.key}
                onClick={() => isClickable && setActiveStep(step.key)}
                disabled={!isClickable}
                className={`flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap
                  ${isActive ? 'bg-flore-primary text-white shadow-lg scale-105'
                    : isPast ? 'bg-flore-primary/15 text-flore-primary'
                      : 'bg-flore-card text-flore-text-secondary border border-flore-border'}
                  ${!isClickable ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="font-bold text-sm hidden md:inline">{step.label}</span>
                {isPast && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {showPresets && activeStep === 'flowers' && totalFlowers === 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-flore-text-secondary uppercase tracking-wider">ابدأ باقتراح سريع</h3>
              <button onClick={() => setShowPresets(false)} className="text-xs text-flore-primary hover:underline">تخطي</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className="group bg-flore-card rounded-2xl p-4 border-2 border-flore-border hover:border-flore-primary hover:shadow-lg transition-all duration-300 text-right"
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">{preset.icon}</div>
                  <div className="font-bold text-flore-text-primary text-sm mb-1">{preset.label}</div>
                  <div className="text-xs text-flore-text-secondary leading-relaxed">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">

            {/* FLOWERS */}
            {activeStep === 'flowers' && (
              <div>
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                  <span className="text-sm font-bold text-flore-text-secondary whitespace-nowrap ml-1">تصفية:</span>
                  {COLOR_FILTERS.map(cf => (
                    <button
                      key={cf.value}
                      onClick={() => setColorFilter(cf.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 whitespace-nowrap
                        ${colorFilter === cf.value ? 'border-flore-primary bg-flore-primary/10 text-flore-primary' : 'border-flore-border bg-flore-card text-flore-text-secondary hover:border-flore-primary/50'}`}
                    >
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: cf.color }} />
                      {cf.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredFlowers.map(flower => {
                    const qty = selectedFlowers[flower.id] || 0
                    const isSelected = qty > 0
                    return (
                      <div
                        key={flower.id}
                        className={`group relative bg-flore-card rounded-2xl border-2 transition-all duration-300 overflow-hidden
                          ${isSelected ? 'border-flore-primary shadow-lg' : 'border-flore-border hover:border-flore-primary/50 hover:shadow-md'}`}
                      >
                        <div className="relative h-32 bg-gradient-to-b from-flore-bg to-flore-card overflow-hidden">
                          {flower.image ? (
                            <Image src={flower.image} alt={flower.name_ar || flower.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full opacity-30" style={{ backgroundColor: flower.color || '#ff6b9d' }} />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-flore-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{qty}</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-sm text-flore-text-primary">{flower.name_ar || flower.name}</p>
                          <p className="text-flore-primary text-sm font-bold mb-2">{formatPrice(flower.price)}</p>
                          <div className="flex items-center justify-between bg-flore-bg rounded-xl p-1">
                            <button onClick={() => updateFlowerQty(flower.id, 1)} className="bg-flore-primary text-white w-8 h-8 rounded-lg font-bold text-lg hover:brightness-110 transition flex items-center justify-center active:scale-95">+</button>
                            <span className={`font-bold text-base px-3 transition-all ${isSelected ? 'text-flore-primary scale-110' : 'text-flore-text-secondary'}`}>{qty}</span>
                            <button onClick={() => updateFlowerQty(flower.id, -1)} disabled={qty === 0} className="bg-flore-card border border-flore-border text-flore-text-secondary w-8 h-8 rounded-lg font-bold text-lg hover:bg-flore-bg transition flex items-center justify-center disabled:opacity-30 active:scale-95">−</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredFlowers.length === 0 && (
                  <div className="text-center py-12 bg-flore-card rounded-2xl border border-flore-border">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-flore-text-secondary">لا توجد زهور بهذا اللون حالياً</p>
                    <button onClick={() => setColorFilter('all')} className="text-flore-primary font-bold mt-2 hover:underline">عرض الكل</button>
                  </div>
                )}

                {totalFlowers > 0 && (
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => setActiveStep('greenery')} className="bg-flore-primary text-white px-8 py-3 rounded-xl font-bold text-base hover:brightness-110 transition shadow-lg flex items-center gap-2">
                      التالي: الأوراق الخضراء
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GREENERY */}
            {activeStep === 'greenery' && (
              <div className="space-y-4">
                <p className="text-sm text-flore-text-secondary mb-3">اختر الأوراق الخضراء لتكمل تنسيقك (اختياري)</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {greeneries.map(item => {
                    const qty = selectedGreenery[item.id] || 0
                    return (
                      <div key={item.id} className={`rounded-2xl border-2 overflow-hidden ${qty > 0 ? 'border-flore-primary shadow-lg' : 'border-flore-border'} bg-flore-card`}>
                        <div className="relative h-24 bg-flore-bg">
                          {item.image ? (
                            <Image src={item.image} alt={item.name_ar || item.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-sm text-flore-text-primary">{item.name_ar || item.name}</p>
                          <p className="text-flore-primary text-sm font-bold mb-2">{formatPrice(item.price)}</p>
                          <div className="flex items-center justify-between bg-flore-bg rounded-xl p-1">
                            <button onClick={() => updateGreeneryQty(item.id, 1)} className="bg-flore-primary text-white w-8 h-8 rounded-lg font-bold">+</button>
                            <span className="font-bold px-3">{qty}</span>
                            <button onClick={() => updateGreeneryQty(item.id, -1)} disabled={qty === 0} className="bg-flore-card border border-flore-border w-8 h-8 rounded-lg font-bold disabled:opacity-30">−</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button onClick={() => setActiveStep('flowers')} className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    السابق
                  </button>
                  <button onClick={() => setActiveStep('container')} className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md">التالي</button>
                </div>
              </div>
            )}

            {/* CONTAINER (unified: box / wrap / vase / basket) */}
            {activeStep === 'container' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {containers.map(c => {
                    const isSelected = selectedContainer === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedContainer(isSelected ? null : c.id)}
                        className={`group relative rounded-2xl border-2 p-4 transition-all duration-300 text-center
                          ${isSelected ? 'border-flore-primary bg-flore-primary/5 shadow-lg' : 'border-flore-border bg-flore-card hover:border-flore-primary/50 hover:shadow-md'}`}
                      >
                        <div className="relative w-16 h-16 mx-auto mb-2 rounded-xl overflow-hidden bg-flore-bg flex items-center justify-center">
                          {c.image ? (
                            <Image src={c.image} alt="" fill className="object-cover" />
                          ) : (
                            <span className="text-3xl">{CONTAINER_ICONS[c.container_type]}</span>
                          )}
                          {isSelected && (
                            <div className="absolute inset-0 bg-flore-primary/20 flex items-center justify-center">
                              <svg className="w-6 h-6 text-flore-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-sm text-flore-text-primary">{c.name_ar || CONTAINER_LABELS[c.container_type]}</p>
                        <p className="text-xs mt-1">
                          {c.price > 0 ? <span className="text-flore-primary font-bold">+{formatPrice(c.price)}</span> : <span className="text-green-600 font-bold">مجاني</span>}
                        </p>
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button onClick={() => setActiveStep('greenery')} className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    السابق
                  </button>
                  <button onClick={() => setActiveStep('size')} className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md">التالي</button>
                </div>
              </div>
            )}

            {/* SIZE */}
            {activeStep === 'size' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {bouquetSizes.map(size => {
                    const isSelected = selectedSize === size.key
                    return (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.key)}
                        className={`text-right rounded-2xl border-2 p-4 transition-all ${isSelected ? 'border-flore-primary bg-flore-primary/5 shadow-lg' : 'border-flore-border bg-flore-card hover:border-flore-primary/50'}`}
                      >
                        <p className="font-bold text-flore-text-primary mb-1">{size.label_ar}</p>
                        <p className="text-sm text-flore-text-secondary mb-2">{size.desc_ar}</p>
                        {size.price_multiplier > 1 && <span className="text-flore-primary text-xs font-bold">×{size.price_multiplier}</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button onClick={() => setActiveStep('container')} className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    السابق
                  </button>
                  <button onClick={() => setActiveStep('message')} className="bg-flore-primary text-white px-6 py-2.5 rounded-xl font-bold hover:brightness-110 transition shadow-md">التالي</button>
                </div>
              </div>
            )}

            {/* MESSAGE */}
            {activeStep === 'message' && (
              <div>
                <div className="bg-flore-card rounded-2xl border border-flore-border p-6">
                  <h3 className="font-bold text-flore-text-primary mb-4 flex items-center gap-2"><span>💌</span> رسالة الإهداء</h3>
                  <textarea
                    value={giftMessage}
                    onChange={e => setGiftMessage(e.target.value)}
                    placeholder="اكتب رسالتك الخاصة هنا..."
                    rows={5}
                    maxLength={200}
                    className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-4 text-flore-text-primary placeholder:text-flore-text-secondary focus:border-flore-primary focus:outline-none resize-none transition-colors text-base leading-relaxed"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-flore-text-secondary">{giftMessage.length}/200</span>
                    <div className="flex gap-2 flex-wrap">
                      {['كل عام وأنت بخير 🎉', 'أحبك 💕', 'شكراً لك 🌸', 'بالتوفيق ✨'].map(quick => (
                        <button key={quick} onClick={() => setGiftMessage(quick)} className="text-xs bg-flore-bg border border-flore-border rounded-lg px-3 py-1 text-flore-text-secondary hover:border-flore-primary hover:text-flore-primary transition">
                          {quick}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <button onClick={() => setActiveStep('size')} className="text-flore-text-secondary font-bold hover:text-flore-primary transition flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    السابق
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PREVIEW SIDEBAR */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 space-y-4">
              <div
                className="bg-flore-card rounded-3xl p-6 border border-flore-border shadow-luxury relative overflow-hidden"
                onMouseEnter={() => setPreviewHovered(true)}
                onMouseLeave={() => setPreviewHovered(false)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-flore-primary/10 to-transparent rounded-bl-full" />
                <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-4 text-center relative z-10">معاينة الباقة</h3>

                <div className="relative mx-auto w-full max-w-[280px] aspect-[3/4] mb-4">
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[55%] rounded-t-[40%] transition-all duration-500"
                    style={{
                      backgroundColor: 'var(--flore-gold)',
                      backgroundImage: selectedContainerObj?.image ? `url(${selectedContainerObj.image})` : undefined,
                      backgroundSize: 'cover',
                      opacity: 0.85,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    }}
                  />
                  <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[85%] h-[55%] z-10">
                    {bouquetPreviewItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2 opacity-30">🌸</div>
                          <p className="text-flore-text-secondary text-sm">اختر زهوراً لتظهر هنا</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        {bouquetPreviewItems.map((item, i) => {
                          const row = Math.floor(i / 3)
                          const col = i % 3
                          const offsetX = (col - 1) * 35 + (Math.random() - 0.5) * 20
                          const offsetY = row * 30 + (Math.random() - 0.5) * 15
                          const rotation = (Math.random() - 0.5) * 40
                          return (
                            <div
                              key={i}
                              className="absolute transition-all duration-500 ease-out"
                              style={{
                                left: `calc(50% + ${offsetX}px)`,
                                top: `${offsetY}px`,
                                transform: `translate(-50%, 0) rotate(${rotation}deg) scale(${previewHovered ? 1.1 : 1})`,
                                zIndex: 10 + row,
                              }}
                            >
                              {item.image ? (
                                <div className="rounded-full overflow-hidden border-2 border-white shadow-md" style={{ width: item.size, height: item.size }}>
                                  <Image src={item.image} alt="" width={item.size} height={item.size} className="object-cover" />
                                </div>
                              ) : (
                                <div className="rounded-full border-2 border-white shadow-md" style={{ width: item.size, height: item.size, backgroundColor: item.color }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {giftMessage && (
                  <div className="bg-flore-bg rounded-xl p-3 mb-4 border border-flore-border">
                    <p className="text-flore-text-secondary text-sm italic leading-relaxed text-center font-amiri">&quot;{giftMessage}&quot;</p>
                  </div>
                )}

                <div className="space-y-2 text-sm mb-4">
                  {totalFlowers > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-flore-text-secondary">الزهور ({totalFlowers})</span>
                      <span className="font-bold text-flore-text-primary">{formatPrice(flowersTotalPrice)}</span>
                    </div>
                  )}
                  {Object.keys(selectedGreenery).length > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-flore-text-secondary">الأوراق الخضراء</span>
                      <span className="font-bold text-flore-text-primary">{formatPrice(greeneryTotalPrice)}</span>
                    </div>
                  )}
                  {selectedContainerObj && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-flore-text-secondary">{selectedContainerObj.name_ar}</span>
                      <span className="font-bold text-flore-text-primary">{formatPrice(selectedContainerObj.price)}</span>
                    </div>
                  )}
                  {sizeMultiplier > 1 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-flore-text-secondary">حجم {bouquetSizes.find(s => s.key === selectedSize)?.label_ar}</span>
                      <span className="font-bold text-flore-primary">×{sizeMultiplier}</span>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-flore-border pt-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-flore-text-primary text-base">الإجمالي</span>
                    <span className="font-amiri text-3xl font-bold text-flore-primary">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={totalFlowers === 0 || added}
                  className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2
                    ${added ? 'bg-green-500 text-white' : totalFlowers === 0 ? 'bg-flore-border text-flore-text-secondary cursor-not-allowed' : 'bg-flore-primary text-white hover:brightness-110 shadow-lg active:scale-[0.98]'}`}
                >
                  {added ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      تمت الإضافة!
                    </>
                  ) : (
                    'أضف إلى السلة'
                  )}
                </button>

                {totalFlowers > 0 && (
                  <button onClick={clearAll} className="w-full mt-2 text-flore-text-secondary text-sm hover:text-red-400 transition py-1">
                    إعادة التصميم من البداية
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}