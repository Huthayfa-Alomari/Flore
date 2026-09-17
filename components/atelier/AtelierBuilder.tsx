'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MessageSquare,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Ruler,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart-store'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { BouquetPreview } from './BouquetPreview'
import {
  calculateAtelierPrice,
  canIncreaseStem,
  getStemProgress,
} from '@/lib/atelier/pricing'
import {
  CONTAINER_LABELS,
  normalizeContainerType,
  toSelectionEntries,
  type AtelierContainer,
  type AtelierStep,
  type BouquetSize,
  type Flower,
  type Greenery,
  type QuantityMap,
} from '@/lib/atelier/types'

type Notice = { tone: 'info' | 'error' | 'success'; text: string } | null

const steps: Array<{ key: AtelierStep; label: string; short: string; icon: typeof Ruler }> = [
  { key: 'size', label: 'حجم الباقة', short: 'الحجم', icon: Ruler },
  { key: 'flowers', label: 'اختيار الزهور', short: 'الزهور', icon: Sparkles },
  { key: 'greenery', label: 'اللمسات الخضراء', short: 'الخضرة', icon: Leaf },
  { key: 'container', label: 'طريقة التقديم', short: 'التقديم', icon: Package },
  { key: 'message', label: 'رسالة الإهداء', short: 'الإهداء', icon: MessageSquare },
]

const colorFilters = [
  { key: 'all', label: 'الكل', swatch: 'linear-gradient(135deg,#D8B8B5,#B89B5E,#E7DDD2)' },
  { key: 'red', label: 'أحمر', swatch: '#A83A45' },
  { key: 'pink', label: 'وردي', swatch: '#D8B8B5' },
  { key: 'white', label: 'أبيض', swatch: '#F9F7F2' },
  { key: 'yellow', label: 'أصفر', swatch: '#D9B85A' },
  { key: 'purple', label: 'بنفسجي', swatch: '#8E7295' },
  { key: 'orange', label: 'برتقالي', swatch: '#D18C5C' },
]

const presets = [
  { id: 'romantic', label: 'رومانسي', description: 'درجات حمراء ووردية', families: ['red', 'pink'] },
  { id: 'quiet', label: 'هادئ', description: 'أبيض ولمسات ناعمة', families: ['white', 'pink'] },
  { id: 'editorial', label: 'تحريري', description: 'بنفسجي وأبيض بتكوين راقٍ', families: ['purple', 'white'] },
  { id: 'sunlit', label: 'مشرق', description: 'أصفر وبرتقالي دافئ', families: ['yellow', 'orange'] },
]

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function inferColorFamily(flower: Flower) {
  if (flower.color_family) return normalize(flower.color_family)
  const text = normalize(`${flower.name} ${flower.name_ar || ''} ${flower.color || ''}`)
  if (/red|أحمر|احمر|حمراء|#c41e3a/.test(text)) return 'red'
  if (/pink|وردي|وردية|زهري|#f7c6d9|#ff6b9d/.test(text)) return 'pink'
  if (/white|أبيض|ابيض|بيضاء|#ffffff|#f8fafc/.test(text)) return 'white'
  if (/yellow|أصفر|اصفر|صفراء|sunflower|دوار الشمس|عباد الشمس/.test(text)) return 'yellow'
  if (/purple|lavender|بنفسجي|خزامى|#b497d6/.test(text)) return 'purple'
  if (/orange|peach|برتقالي|خوخي/.test(text)) return 'orange'
  return 'other'
}

function supportedImage(url: string | null | undefined) {
  if (!url) return false
  return url.startsWith('/') || url.includes('rlktxwqxmwdostitaefo.supabase.co') || url.includes('i.pinimg.com')
}

function nextStep(current: AtelierStep) {
  const index = steps.findIndex(step => step.key === current)
  return steps[Math.min(index + 1, steps.length - 1)].key
}

function previousStep(current: AtelierStep) {
  const index = steps.findIndex(step => step.key === current)
  return steps[Math.max(index - 1, 0)].key
}

export function AtelierBuilder() {
  const router = useRouter()
  const { addItem } = useCart()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [flowers, setFlowers] = useState<Flower[]>([])
  const [greenery, setGreenery] = useState<Greenery[]>([])
  const [containers, setContainers] = useState<AtelierContainer[]>([])
  const [sizes, setSizes] = useState<BouquetSize[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [activeStep, setActiveStep] = useState<AtelierStep>('size')
  const [selectedSizeKey, setSelectedSizeKey] = useState('')
  const [selectedFlowers, setSelectedFlowers] = useState<QuantityMap>({})
  const [selectedGreenery, setSelectedGreenery] = useState<QuantityMap>({})
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)
  const [giftMessage, setGiftMessage] = useState('')
  const [colorFilter, setColorFilter] = useState('all')
  const [notice, setNotice] = useState<Notice>(null)

  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiRemaining, setAiRemaining] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [flowerRes, greeneryRes, containerRes, sizeRes] = await Promise.all([
          supabase.from('flower_types').select('id,name,name_ar,price,image,color,color_family,in_stock').eq('in_stock', true).order('price'),
          supabase.from('greenery_options').select('id,name,name_ar,price,image,in_stock').eq('in_stock', true).order('price'),
          supabase.from('vase_options').select('id,name,name_ar,price,image,in_stock,container_type').eq('in_stock', true).order('price'),
          supabase.from('bouquet_sizes').select('id,key,label_ar,desc_ar,stem_count,price_multiplier').order('stem_count'),
        ])
        const error = flowerRes.error || greeneryRes.error || containerRes.error || sizeRes.error
        if (error) throw error
        if (cancelled) return

        setFlowers((flowerRes.data || []).map(item => ({ ...item, price: Number(item.price) })) as Flower[])
        setGreenery((greeneryRes.data || []).map(item => ({ ...item, price: Number(item.price) })) as Greenery[])
        setContainers(
          (containerRes.data || []).map(item => ({
            ...item,
            price: Number(item.price),
            container_type: normalizeContainerType(item.container_type),
          })) as AtelierContainer[]
        )
        const normalizedSizes = (sizeRes.data || []).map(item => ({
          ...item,
          stem_count: Number(item.stem_count),
          price_multiplier: Number(item.price_multiplier),
        })) as BouquetSize[]
        setSizes(normalizedSizes)
        const regular = normalizedSizes.find(size => size.key === 'regular') || normalizedSizes[0]
        if (regular) setSelectedSizeKey(regular.key)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'تعذر تحميل بيانات الأتيليه'
        setLoadError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const selectedSize = useMemo(
    () => sizes.find(size => size.key === selectedSizeKey) || null,
    [sizes, selectedSizeKey]
  )

  const selectedContainer = useMemo(
    () => containers.find(item => item.id === selectedContainerId) || null,
    [containers, selectedContainerId]
  )

  const stemProgress = useMemo(
    () => getStemProgress(selectedFlowers, selectedSize),
    [selectedFlowers, selectedSize]
  )

  const price = useMemo(
    () =>
      calculateAtelierPrice({
        flowers,
        flowerQuantities: selectedFlowers,
        greenery,
        greeneryQuantities: selectedGreenery,
        container: selectedContainer,
        size: selectedSize,
      }),
    [flowers, selectedFlowers, greenery, selectedGreenery, selectedContainer, selectedSize]
  )

  const filteredFlowers = useMemo(() => {
    if (colorFilter === 'all') return flowers
    return flowers.filter(flower => inferColorFamily(flower) === colorFilter)
  }, [flowers, colorFilter])

  const invalidatePreview = useCallback(() => {
    setAiImageUrl(null)
    setNotice(null)
  }, [])

  const chooseSize = useCallback(
    (sizeKey: string) => {
      const nextSize = sizes.find(size => size.key === sizeKey)
      if (!nextSize) return
      const currentCount = Object.values(selectedFlowers).reduce((sum, qty) => sum + qty, 0)
      setSelectedSizeKey(sizeKey)
      if (currentCount > nextSize.stem_count) {
        setSelectedFlowers({})
        setNotice({ tone: 'info', text: 'غيّرنا الحجم وأعدنا الزهور لأن التكوين السابق أكبر من السعة الجديدة.' })
      }
      setAiImageUrl(null)
    },
    [sizes, selectedFlowers]
  )

  const updateFlower = useCallback(
    (id: string, delta: number) => {
      if (delta > 0 && !canIncreaseStem(selectedFlowers, selectedSize)) {
        setNotice({ tone: 'info', text: `اكتمل حجم الباقة: ${selectedSize?.stem_count || 0} ساق.` })
        return
      }
      setSelectedFlowers(previous => {
        const next = { ...previous }
        const value = Math.max(0, (next[id] || 0) + delta)
        if (value === 0) delete next[id]
        else next[id] = value
        return next
      })
      invalidatePreview()
    },
    [selectedFlowers, selectedSize, invalidatePreview]
  )

  const updateGreenery = useCallback(
    (id: string, delta: number) => {
      setSelectedGreenery(previous => {
        const next = { ...previous }
        const value = Math.max(0, (next[id] || 0) + delta)
        if (value === 0) delete next[id]
        else next[id] = value
        return next
      })
      invalidatePreview()
    },
    [invalidatePreview]
  )

  const applyPreset = useCallback(
    (presetId: string) => {
      if (!selectedSize) return
      const preset = presets.find(item => item.id === presetId)
      if (!preset) return
      const candidates = flowers.filter(flower => preset.families.includes(inferColorFamily(flower)))
      if (candidates.length === 0) {
        setNotice({ tone: 'info', text: 'هذا الاتجاه غير متاح من مخزون اليوم. اختر زهورك يدويًا.' })
        return
      }
      const quantities: QuantityMap = {}
      let remaining = selectedSize.stem_count
      candidates.slice(0, 3).forEach((flower, index, list) => {
        const slotsLeft = list.length - index
        const qty = index === 0 ? Math.ceil(remaining * 0.55) : Math.ceil(remaining / slotsLeft)
        const safeQty = Math.min(remaining, qty)
        quantities[flower.id] = safeQty
        remaining -= safeQty
      })
      if (remaining > 0) quantities[candidates[0].id] += remaining
      setSelectedFlowers(quantities)
      setColorFilter('all')
      setActiveStep('flowers')
      setNotice({ tone: 'success', text: 'جهزنا نقطة بداية متوازنة. يمكنك تعديل كل ساق كما تريد.' })
      setAiImageUrl(null)
    },
    [flowers, selectedSize]
  )

  const handleGeneratePreview = useCallback(async () => {
    if (!stemProgress.complete || !selectedSize) {
      setNotice({ tone: 'info', text: 'أكمل عدد السيقان المطلوب أولًا حتى تكون المعاينة الواقعية دقيقة.' })
      return
    }
    if (isGeneratingAi || aiRemaining === 0) return
    setIsGeneratingAi(true)
    setNotice(null)
    try {
      const response = await fetch('/api/atelier/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowers: toSelectionEntries(selectedFlowers),
          greenery: toSelectionEntries(selectedGreenery),
          containerId: selectedContainerId,
          sizeKey: selectedSize.key,
        }),
      })
      const data = await response.json()
      if (typeof data?.remaining === 'number') setAiRemaining(data.remaining)
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'تعذر توليد المعاينة')
      if (!data?.imageUrl) throw new Error('لم تصل صورة المعاينة من الخادم')
      setAiImageUrl(data.imageUrl)
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'تعذر توليد المعاينة الآن.' })
    } finally {
      setIsGeneratingAi(false)
    }
  }, [
    stemProgress.complete,
    selectedSize,
    isGeneratingAi,
    aiRemaining,
    selectedFlowers,
    selectedGreenery,
    selectedContainerId,
  ])

  const reset = useCallback(() => {
    const regular = sizes.find(size => size.key === 'regular') || sizes[0]
    setSelectedSizeKey(regular?.key || '')
    setSelectedFlowers({})
    setSelectedGreenery({})
    setSelectedContainerId(null)
    setGiftMessage('')
    setColorFilter('all')
    setActiveStep('size')
    setAiImageUrl(null)
    setAiRemaining(null)
    setNotice(null)
  }, [sizes])

  const canAdd = stemProgress.complete && Boolean(selectedSize)

  const addToCart = useCallback(() => {
    if (!canAdd || !selectedSize) {
      setNotice({ tone: 'info', text: `أكمل ${stemProgress.remaining} ساق قبل إضافة الباقة.` })
      return
    }

    const selectedFlowerLabels = toSelectionEntries(selectedFlowers).map(entry => {
      const flower = flowers.find(item => item.id === entry.id)
      return `${flower?.name_ar || flower?.name || 'زهرة'} ×${entry.qty}`
    })
    const selectedGreeneryLabels = toSelectionEntries(selectedGreenery).map(entry => {
      const item = greenery.find(option => option.id === entry.id)
      return `${item?.name_ar || item?.name || 'خضرة'} ×${entry.qty}`
    })
    const containerLabel = selectedContainer
      ? selectedContainer.name_ar || selectedContainer.name || CONTAINER_LABELS[selectedContainer.container_type]
      : ''
    const now = new Date().toISOString()
    const fallbackImage = flowers.find(flower => selectedFlowers[flower.id])?.image || ''

    const product: Product = {
      id: `custom-${Date.now()}`,
      name: `باقة FLORÉ مخصصة — ${selectedSize.label_ar}`,
      name_en: 'Custom FLORÉ Bouquet',
      category: 'custom',
      price: price.total,
      currency: 'JOD',
      image: aiImageUrl || fallbackImage,
      images: [],
      description: `زهور: ${selectedFlowerLabels.join('، ')}${selectedGreeneryLabels.length ? ` | خضرة: ${selectedGreeneryLabels.join('، ')}` : ''}${containerLabel ? ` | تقديم: ${containerLabel}` : ''} | حجم: ${selectedSize.label_ar}`,
      description_en: null,
      badge: 'مصمم لك',
      badge_color: '#B89B5E',
      in_stock: true,
      model_url: null,
      ar_enabled: false,
      created_at: now,
      updated_at: now,
    }

    addItem({
      product,
      quantity: 1,
      customization: {
        flowers: selectedFlowerLabels,
        greenery: selectedGreeneryLabels,
        container: containerLabel,
        wrap: selectedContainer?.container_type === 'wrap' ? containerLabel : '',
        vase: selectedContainer && selectedContainer.container_type !== 'wrap' ? containerLabel : '',
        message: giftMessage.trim(),
      },
      bouquetSelection: {
        flowers: toSelectionEntries(selectedFlowers),
        greenery: toSelectionEntries(selectedGreenery),
        containerId: selectedContainerId,
        sizeKey: selectedSize.key,
      },
    })

    router.push('/cart')
  }, [
    canAdd,
    selectedSize,
    stemProgress.remaining,
    selectedFlowers,
    selectedGreenery,
    flowers,
    greenery,
    selectedContainer,
    price.total,
    aiImageUrl,
    giftMessage,
    addItem,
    selectedContainerId,
    router,
  ])

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center" dir="rtl">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#20201E]/15 border-t-[#20201E]" />
          <p className="mt-4 text-sm text-[#766E66]">نحضّر خامات الأتيليه المتاحة اليوم</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center" dir="rtl">
        <p className="font-amiri text-3xl text-[#20201E]">تعذر فتح الأتيليه</p>
        <p className="mt-3 text-sm text-[#766E66]">{loadError}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-12 rounded-full bg-[#20201E] px-6 text-sm font-semibold text-white">
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const stepIndex = steps.findIndex(step => step.key === activeStep)

  return (
    <div className="min-h-screen bg-[#F7F3ED] pb-36 text-[#20201E]" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <header className="mx-auto mb-8 max-w-2xl text-center lg:mb-12">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8F8274]">ATELIER FLORÉ</p>
          <h1 className="mt-3 font-amiri text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">صمّمها كما تخيّلتها</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#766E66] sm:text-base">
            اختيار واحد في كل مرة. الحجم أولًا، ثم نبني التكوين الحقيقي حتى آخر ساق.
          </p>
        </header>

        <nav aria-label="خطوات تصميم الباقة" className="sticky top-0 z-30 -mx-4 mb-6 border-y border-black/[0.06] bg-[#F7F3ED]/92 px-4 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:mb-10 lg:rounded-full lg:border">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 overflow-x-auto">
            {steps.map((step, index) => {
              const active = step.key === activeStep
              const available = index <= Math.max(stepIndex + 1, 1) || stemProgress.complete
              const Icon = step.icon
              return (
                <button
                  key={step.key}
                  type="button"
                  disabled={!available}
                  onClick={() => available && setActiveStep(step.key)}
                  className={`flex min-h-11 min-w-[64px] items-center justify-center gap-2 rounded-full px-3 text-xs font-semibold transition sm:min-w-[116px] ${active ? 'bg-[#20201E] text-white' : available ? 'text-[#625A53] hover:bg-white/70' : 'cursor-not-allowed text-[#B9B0A8]'}`}
                  aria-current={active ? 'step' : undefined}
                >
                  {index < stepIndex ? <Check className="h-4 w-4" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                  <span className="hidden sm:inline">{step.short}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {notice && (
          <div className={`mx-auto mb-6 max-w-3xl rounded-2xl border px-4 py-3 text-sm leading-6 ${notice.tone === 'error' ? 'border-[#B95858]/20 bg-[#B95858]/5 text-[#8F3D3D]' : notice.tone === 'success' ? 'border-[#6E7C64]/20 bg-[#6E7C64]/5 text-[#526048]' : 'border-[#B89B5E]/25 bg-[#B89B5E]/8 text-[#6C5A33]'}`}>
            {notice.text}
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)] lg:items-start">
          <section className="order-2 min-w-0 lg:order-1">
            <div className="rounded-[2rem] border border-black/[0.06] bg-white/70 p-4 shadow-[0_20px_60px_rgba(32,32,30,0.04)] sm:p-6 lg:p-8">
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9A8E82]">{String(stepIndex + 1).padStart(2, '0')} / 05</p>
                  <h2 className="mt-2 font-amiri text-3xl font-semibold">{steps[stepIndex].label}</h2>
                </div>
                {activeStep !== 'size' && (
                  <button type="button" onClick={() => setActiveStep(previousStep(activeStep))} className="flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-semibold text-[#766E66] hover:bg-[#F7F3ED]">
                    <ChevronRight className="h-4 w-4" aria-hidden="true" /> السابق
                  </button>
                )}
              </div>

              {activeStep === 'size' && (
                <div>
                  <p className="mb-5 text-sm leading-7 text-[#766E66]">الحجم يحدد عدد سيقان الزهور المطلوب في التصميم. لن نسمح بإضافة باقة ناقصة أو أكبر من الحجم المختار.</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {sizes.map(size => {
                      const active = selectedSizeKey === size.key
                      return (
                        <button key={size.id} type="button" onClick={() => chooseSize(size.key)} className={`min-h-40 rounded-[1.5rem] border p-5 text-right transition ${active ? 'border-[#20201E] bg-[#20201E] text-white shadow-[0_18px_40px_rgba(32,32,30,.16)]' : 'border-black/[0.08] bg-[#FBF9F5] hover:-translate-y-0.5 hover:border-[#9D8B78]'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-amiri text-2xl font-semibold">{size.label_ar}</p>
                              <p className={`mt-1 text-xs ${active ? 'text-white/65' : 'text-[#8A8179]'}`}>{size.desc_ar}</p>
                            </div>
                            {active && <Check className="h-5 w-5" aria-hidden="true" />}
                          </div>
                          <div className="mt-8 flex items-end justify-between">
                            <span className={`text-xs ${active ? 'text-white/60' : 'text-[#8A8179]'}`}>عدد السيقان</span>
                            <span className="font-amiri text-4xl font-semibold">{size.stem_count}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-7 flex justify-end">
                    <button type="button" disabled={!selectedSize} onClick={() => setActiveStep('flowers')} className="flex min-h-12 items-center gap-2 rounded-full bg-[#20201E] px-6 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-40">
                      اختيار الزهور <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 'flowers' && (
                <div>
                  <div className="mb-5 rounded-2xl bg-[#F7F3ED] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#8A8179]">تقدم التكوين</p>
                        <p className="mt-1 font-amiri text-2xl font-semibold">{stemProgress.selected} / {stemProgress.target} ساق</p>
                      </div>
                      <div className="text-left text-xs text-[#766E66]">{stemProgress.complete ? 'اكتمل الحجم' : `متبقي ${stemProgress.remaining}`}</div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                      <div className="h-full rounded-full bg-[#B89B5E] transition-all duration-500" style={{ width: `${stemProgress.target ? Math.min(100, (stemProgress.selected / stemProgress.target) * 100) : 0}%` }} />
                    </div>
                  </div>

                  {stemProgress.selected === 0 && (
                    <div className="mb-6">
                      <p className="mb-3 text-xs font-semibold text-[#8A8179]">ابدأ باتجاه جاهز ثم عدّله</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {presets.map(preset => (
                          <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)} className="min-h-24 rounded-2xl border border-black/[0.07] bg-[#FBF9F5] p-3 text-right transition hover:border-[#B89B5E]">
                            <p className="text-sm font-semibold">{preset.label}</p>
                            <p className="mt-1 text-[11px] leading-5 text-[#857B72]">{preset.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="تصفية الزهور حسب اللون">
                    {colorFilters.map(filter => (
                      <button key={filter.key} type="button" onClick={() => setColorFilter(filter.key)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${colorFilter === filter.key ? 'border-[#20201E] bg-[#20201E] text-white' : 'border-black/[0.07] bg-white text-[#665E57]'}`}>
                        <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: filter.swatch }} />
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {filteredFlowers.map(flower => {
                      const qty = selectedFlowers[flower.id] || 0
                      return (
                        <article key={flower.id} className={`overflow-hidden rounded-[1.35rem] border bg-[#FBF9F5] transition ${qty > 0 ? 'border-[#B89B5E] shadow-[0_14px_30px_rgba(32,32,30,.08)]' : 'border-black/[0.07]'}`}>
                          <div className="relative aspect-[4/3] overflow-hidden bg-[#EEE8DF]">
                            {supportedImage(flower.image) ? <Image src={flower.image!} alt={flower.name_ar || flower.name} fill className="object-cover" sizes="(max-width:640px) 50vw, 220px" /> : <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${flower.color || '#D8B8B5'} 0 22%, transparent 23%), linear-gradient(145deg,#F7F3ED,#E7DDD2)` }} />}
                            {qty > 0 && <span className="absolute left-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-[#20201E] px-2 text-xs font-bold text-white">{qty}</span>}
                          </div>
                          <div className="p-3">
                            <h3 className="line-clamp-1 text-sm font-semibold">{flower.name_ar || flower.name}</h3>
                            <p className="mt-1 text-xs text-[#8A8179]">{formatPrice(flower.price)} / ساق</p>
                            <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center overflow-hidden rounded-full border border-black/[0.07] bg-white">
                              <button type="button" onClick={() => updateFlower(flower.id, -1)} disabled={qty === 0} className="grid h-12 place-items-center disabled:opacity-25" aria-label={`إنقاص ${flower.name_ar || flower.name}`}><Minus className="h-4 w-4" /></button>
                              <span className="text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                              <button type="button" onClick={() => updateFlower(flower.id, 1)} disabled={!canIncreaseStem(selectedFlowers, selectedSize)} className="grid h-12 place-items-center bg-[#20201E] text-white disabled:bg-[#D8D1C9]" aria-label={`إضافة ${flower.name_ar || flower.name}`}><Plus className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>

                  <div className="mt-7 flex justify-end">
                    <button type="button" disabled={!stemProgress.complete} onClick={() => setActiveStep('greenery')} className="flex min-h-12 items-center gap-2 rounded-full bg-[#20201E] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">
                      اللمسات الخضراء <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {activeStep === 'greenery' && (
                <div>
                  <p className="mb-5 text-sm leading-7 text-[#766E66]">تفاصيل اختيارية لا تدخل ضمن عدد سيقان الحجم. أضف منها ما يحتاجه التكوين فقط.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {greenery.map(item => {
                      const qty = selectedGreenery[item.id] || 0
                      return (
                        <article key={item.id} className={`overflow-hidden rounded-[1.35rem] border bg-[#FBF9F5] ${qty > 0 ? 'border-[#7A8A70]' : 'border-black/[0.07]'}`}>
                          <div className="relative aspect-[4/3] bg-[#E8ECE4]">
                            {supportedImage(item.image) ? <Image src={item.image!} alt={item.name_ar || item.name} fill className="object-cover" sizes="220px" /> : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#78886D_0_24%,transparent_25%),linear-gradient(145deg,#EDF0E9,#DCE3D5)]" />}
                          </div>
                          <div className="p-3">
                            <h3 className="text-sm font-semibold">{item.name_ar || item.name}</h3>
                            <p className="mt-1 text-xs text-[#8A8179]">{formatPrice(item.price)}</p>
                            <div className="mt-3 grid grid-cols-[48px_1fr_48px] items-center overflow-hidden rounded-full border border-black/[0.07] bg-white">
                              <button type="button" onClick={() => updateGreenery(item.id, -1)} disabled={qty === 0} className="grid h-12 place-items-center disabled:opacity-25" aria-label={`إنقاص ${item.name_ar || item.name}`}><Minus className="h-4 w-4" /></button>
                              <span className="text-center text-sm font-semibold">{qty}</span>
                              <button type="button" onClick={() => updateGreenery(item.id, 1)} className="grid h-12 place-items-center bg-[#6D7D63] text-white" aria-label={`إضافة ${item.name_ar || item.name}`}><Plus className="h-4 w-4" /></button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                  <div className="mt-7 flex justify-end">
                    <button type="button" onClick={() => setActiveStep('container')} className="flex min-h-12 items-center gap-2 rounded-full bg-[#20201E] px-6 text-sm font-semibold text-white">طريقة التقديم <ChevronLeft className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {activeStep === 'container' && (
                <div>
                  <p className="mb-5 text-sm leading-7 text-[#766E66]">اختر طريقة تقديم واحدة، أو اتركها بدون إضافة إذا رغبت.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {containers.map(container => {
                      const active = selectedContainerId === container.id
                      return (
                        <button key={container.id} type="button" onClick={() => { setSelectedContainerId(active ? null : container.id); invalidatePreview() }} className={`min-h-44 overflow-hidden rounded-[1.35rem] border text-right transition ${active ? 'border-[#20201E] bg-[#20201E] text-white' : 'border-black/[0.07] bg-[#FBF9F5]'}`}>
                          <div className={`relative h-24 ${active ? 'bg-white/10' : 'bg-[#EEE8DF]'}`}>
                            {supportedImage(container.image) ? <Image src={container.image!} alt={container.name_ar || container.name} fill className="object-cover" sizes="220px" /> : <div className="absolute inset-0 grid place-items-center"><Package className={`h-7 w-7 ${active ? 'text-white/65' : 'text-[#A99B8D]'}`} /></div>}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold">{container.name_ar || CONTAINER_LABELS[container.container_type]}</p>
                            <p className={`mt-1 text-xs ${active ? 'text-white/65' : 'text-[#8A8179]'}`}>{container.price > 0 ? `+ ${formatPrice(container.price)}` : 'بدون تكلفة'}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-7 flex justify-end">
                    <button type="button" onClick={() => setActiveStep('message')} className="flex min-h-12 items-center gap-2 rounded-full bg-[#20201E] px-6 text-sm font-semibold text-white">رسالة الإهداء <ChevronLeft className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {activeStep === 'message' && (
                <div>
                  <p className="mb-4 text-sm leading-7 text-[#766E66]">اختياري. سنعرض الرسالة كما كتبتها بالضبط، لذلك أبقينا هذه الخطوة هادئة وبسيطة.</p>
                  <textarea value={giftMessage} onChange={event => setGiftMessage(event.target.value)} maxLength={220} rows={6} placeholder="اكتب رسالتك هنا…" className="w-full resize-none rounded-[1.5rem] border border-black/[0.08] bg-[#FBF9F5] p-5 text-base leading-8 outline-none transition placeholder:text-[#B0A69D] focus:border-[#8F8274]" />
                  <div className="mt-2 text-left text-xs text-[#9A8E82]">{giftMessage.length} / 220</div>
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={reset} className="flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#766E66] hover:bg-[#F7F3ED]"><RotateCcw className="h-4 w-4" /> ابدأ من جديد</button>
                    <button type="button" disabled={!canAdd} onClick={addToCart} className="min-h-12 rounded-full bg-[#20201E] px-7 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(32,32,30,.14)] disabled:cursor-not-allowed disabled:opacity-35">أضف هديتي — {formatPrice(price.total)}</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-black/[0.06] bg-white/70 p-4 shadow-[0_20px_60px_rgba(32,32,30,0.05)] sm:p-5">
              <BouquetPreview flowers={flowers} flowerQuantities={selectedFlowers} greenery={greenery} greeneryQuantities={selectedGreenery} container={selectedContainer} aiImageUrl={aiImageUrl} isGenerating={isGeneratingAi} />

              <div className="mt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.15em] text-[#9A8E82]">التكوين الحالي</p>
                    <p className="mt-1 font-amiri text-2xl font-semibold">{stemProgress.selected} / {stemProgress.target || '—'} ساق</p>
                  </div>
                  <p className="font-amiri text-3xl font-semibold">{formatPrice(price.total)}</p>
                </div>

                <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4 text-xs text-[#766E66]">
                  <div className="flex justify-between"><span>الزهور{price.sizeMultiplier > 1 ? ` × ${price.sizeMultiplier}` : ''}</span><span>{formatPrice(price.flowersAdjusted)}</span></div>
                  {price.greenery > 0 && <div className="flex justify-between"><span>اللمسات الخضراء</span><span>{formatPrice(price.greenery)}</span></div>}
                  {price.container > 0 && <div className="flex justify-between"><span>طريقة التقديم</span><span>{formatPrice(price.container)}</span></div>}
                </div>

                <button type="button" onClick={handleGeneratePreview} disabled={!stemProgress.complete || isGeneratingAi || aiRemaining === 0} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#B89B5E]/35 bg-[#B89B5E]/8 px-4 text-sm font-semibold text-[#6D5A32] transition hover:bg-[#B89B5E]/12 disabled:cursor-not-allowed disabled:opacity-40">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {aiImageUrl ? 'أنشئ تصورًا جديدًا' : 'حوّل تصميمي إلى معاينة واقعية'}
                </button>
                <p className="mt-2 text-center text-[11px] leading-5 text-[#9A8E82]">{aiRemaining === null ? 'المعاينة الواقعية اختيارية ومحدودة يوميًا' : aiRemaining > 0 ? `متبقي ${aiRemaining} معاينة اليوم` : 'اكتمل حد المعاينات اليوم'}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.07] bg-[#F7F3ED]/94 px-4 py-3 backdrop-blur-xl safe-area-pb lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-[#8A8179]">{stemProgress.complete ? 'التكوين مكتمل' : `${stemProgress.remaining} ساق متبقية`}</p>
            <p className="mt-0.5 font-amiri text-xl font-semibold">{formatPrice(price.total)}</p>
          </div>
          {activeStep === 'message' ? (
            <button type="button" disabled={!canAdd} onClick={addToCart} className="min-h-12 rounded-full bg-[#20201E] px-5 text-sm font-semibold text-white disabled:opacity-35">أضف هديتي</button>
          ) : (
            <button type="button" disabled={activeStep === 'flowers' && !stemProgress.complete} onClick={() => setActiveStep(nextStep(activeStep))} className="flex min-h-12 items-center gap-1 rounded-full bg-[#20201E] px-5 text-sm font-semibold text-white disabled:opacity-35">متابعة <ChevronLeft className="h-4 w-4" /></button>
          )}
        </div>
      </div>
    </div>
  )
}
