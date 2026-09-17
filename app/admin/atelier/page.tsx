'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Flower2, Leaf, Package, RefreshCw, Ruler, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

type FlowerRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  color_family: string | null
  in_stock: boolean
}

type GreeneryRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  in_stock: boolean
}

type ContainerRow = {
  id: string
  name: string
  name_ar: string | null
  price: number
  container_type: string | null
  in_stock: boolean
}

type SizeRow = {
  id: string
  key: string
  label_ar: string
  desc_ar: string | null
  stem_count: number
  price_multiplier: number
}

type SaveState = { key: string; state: 'saving' | 'saved' | 'error' } | null

const colorFamilies = [
  ['red', 'أحمر'],
  ['pink', 'وردي'],
  ['white', 'أبيض'],
  ['yellow', 'أصفر'],
  ['purple', 'بنفسجي'],
  ['orange', 'برتقالي'],
  ['other', 'أخرى'],
]

export default function AtelierAdminPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [flowers, setFlowers] = useState<FlowerRow[]>([])
  const [greenery, setGreenery] = useState<GreeneryRow[]>([])
  const [containers, setContainers] = useState<ContainerRow[]>([])
  const [sizes, setSizes] = useState<SizeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [f, g, c, s] = await Promise.all([
      supabase.from('flower_types').select('id,name,name_ar,price,color_family,in_stock').order('price'),
      supabase.from('greenery_options').select('id,name,name_ar,price,in_stock').order('price'),
      supabase.from('vase_options').select('id,name,name_ar,price,container_type,in_stock').order('price'),
      supabase.from('bouquet_sizes').select('id,key,label_ar,desc_ar,stem_count,price_multiplier').order('stem_count'),
    ])
    const queryError = f.error || g.error || c.error || s.error
    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setFlowers((f.data || []).map(row => ({ ...row, price: Number(row.price) })) as FlowerRow[])
    setGreenery((g.data || []).map(row => ({ ...row, price: Number(row.price) })) as GreeneryRow[])
    setContainers((c.data || []).map(row => ({ ...row, price: Number(row.price) })) as ContainerRow[])
    setSizes((s.data || []).map(row => ({ ...row, stem_count: Number(row.stem_count), price_multiplier: Number(row.price_multiplier) })) as SizeRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  async function save(table: string, id: string, payload: Record<string, unknown>, key: string) {
    setSaveState({ key, state: 'saving' })
    const { error: updateError } = await supabase.from(table).update(payload).eq('id', id)
    if (updateError) {
      setSaveState({ key, state: 'error' })
      setError(updateError.message)
      return
    }
    setSaveState({ key, state: 'saved' })
    window.setTimeout(() => setSaveState(current => current?.key === key ? null : current), 1500)
  }

  const saveButton = (key: string, onClick: () => void) => {
    const current = saveState?.key === key ? saveState.state : null
    return (
      <button type="button" onClick={onClick} disabled={current === 'saving'} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-flore-primary px-4 text-xs font-semibold text-white disabled:opacity-50">
        {current === 'saved' ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {current === 'saving' ? 'جارٍ الحفظ' : current === 'saved' ? 'تم الحفظ' : 'حفظ'}
      </button>
    )
  }

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-flore-text-primary/15 border-t-flore-text-primary" /></div>
  }

  return (
    <div className="mx-auto max-w-6xl" dir="rtl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-flore-text-secondary">ATELIER INVENTORY</p>
          <h1 className="mt-2 font-amiri text-4xl font-semibold">إدارة الأتيليه</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-flore-text-secondary">تحكم بالأسعار والتوفر والحجم من هنا. لا يوجد حذف مباشر من هذه الصفحة حتى نحافظ على سلامة الطلبات القديمة.</p>
        </div>
        <button type="button" onClick={load} className="flex min-h-11 items-center gap-2 rounded-full border border-flore-border bg-flore-card px-4 text-xs font-semibold"><RefreshCw className="h-4 w-4" /> تحديث</button>
      </header>

      {error && <div className="mb-6 rounded-2xl border border-flore-error/20 bg-flore-error/5 px-4 py-3 text-sm text-flore-error">{error}</div>}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'الزهور', value: flowers.filter(item => item.in_stock).length, icon: Flower2 },
          { label: 'الخضرة', value: greenery.filter(item => item.in_stock).length, icon: Leaf },
          { label: 'التقديم', value: containers.filter(item => item.in_stock).length, icon: Package },
          { label: 'الأحجام', value: sizes.length, icon: Ruler },
        ].map(card => {
          const Icon = card.icon
          return <div key={card.label} className="rounded-[1.5rem] border border-flore-border bg-flore-card p-4"><Icon className="h-4 w-4 text-flore-gold-dark" /><p className="mt-4 font-amiri text-3xl font-semibold">{card.value}</p><p className="mt-1 text-xs text-flore-text-secondary">{card.label} متاحة</p></div>
        })}
      </div>

      <div className="space-y-8">
        <section className="rounded-[2rem] border border-flore-border bg-flore-card p-4 shadow-luxury sm:p-6">
          <div className="mb-5"><h2 className="font-amiri text-2xl font-semibold">الزهور</h2><p className="mt-1 text-xs text-flore-text-secondary">السعر لكل ساق، عائلة اللون، والتوفر.</p></div>
          <div className="space-y-3">
            {flowers.map((flower, index) => (
              <div key={flower.id} className="grid gap-3 rounded-2xl border border-flore-border bg-flore-bg p-4 md:grid-cols-[minmax(160px,1fr)_130px_150px_100px_90px] md:items-end">
                <div><p className="text-sm font-semibold">{flower.name_ar || flower.name}</p><p className="mt-1 text-[11px] text-flore-text-secondary">{flower.name}</p></div>
                <label className="text-[11px] text-flore-text-secondary">السعر
                  <input type="number" min="0" step="0.25" value={flower.price} onChange={event => setFlowers(rows => rows.map((row, i) => i === index ? { ...row, price: Number(event.target.value) } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm text-flore-text-primary" />
                </label>
                <label className="text-[11px] text-flore-text-secondary">اللون
                  <select value={flower.color_family || 'other'} onChange={event => setFlowers(rows => rows.map((row, i) => i === index ? { ...row, color_family: event.target.value } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm text-flore-text-primary">
                    {colorFamilies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-flore-border bg-flore-card px-3 text-xs"><span>{flower.in_stock ? 'متاح' : 'موقوف'}</span><input type="checkbox" checked={flower.in_stock} onChange={event => setFlowers(rows => rows.map((row, i) => i === index ? { ...row, in_stock: event.target.checked } : row))} className="h-5 w-5 accent-flore-primary" /></label>
                {saveButton(`flower-${flower.id}`, () => save('flower_types', flower.id, { price: flower.price, color_family: flower.color_family, in_stock: flower.in_stock }, `flower-${flower.id}`))}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-flore-border bg-flore-card p-4 shadow-luxury sm:p-6">
          <div className="mb-5"><h2 className="font-amiri text-2xl font-semibold">اللمسات الخضراء</h2><p className="mt-1 text-xs text-flore-text-secondary">سعر الإضافة وحالة التوفر.</p></div>
          <div className="space-y-3">
            {greenery.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-2xl border border-flore-border bg-flore-bg p-4 md:grid-cols-[minmax(160px,1fr)_130px_100px_90px] md:items-end">
                <div><p className="text-sm font-semibold">{item.name_ar || item.name}</p><p className="mt-1 text-[11px] text-flore-text-secondary">{item.name}</p></div>
                <label className="text-[11px] text-flore-text-secondary">السعر<input type="number" min="0" step="0.25" value={item.price} onChange={event => setGreenery(rows => rows.map((row, i) => i === index ? { ...row, price: Number(event.target.value) } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-flore-border bg-flore-card px-3 text-xs"><span>{item.in_stock ? 'متاح' : 'موقوف'}</span><input type="checkbox" checked={item.in_stock} onChange={event => setGreenery(rows => rows.map((row, i) => i === index ? { ...row, in_stock: event.target.checked } : row))} className="h-5 w-5 accent-flore-primary" /></label>
                {saveButton(`green-${item.id}`, () => save('greenery_options', item.id, { price: item.price, in_stock: item.in_stock }, `green-${item.id}`))}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-flore-border bg-flore-card p-4 shadow-luxury sm:p-6">
          <div className="mb-5"><h2 className="font-amiri text-2xl font-semibold">طرق التقديم</h2><p className="mt-1 text-xs text-flore-text-secondary">التغليف، المزهريات، السلال والصناديق.</p></div>
          <div className="space-y-3">
            {containers.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-2xl border border-flore-border bg-flore-bg p-4 md:grid-cols-[minmax(160px,1fr)_120px_130px_100px_90px] md:items-end">
                <div><p className="text-sm font-semibold">{item.name_ar || item.name}</p><p className="mt-1 text-[11px] text-flore-text-secondary">{item.name}</p></div>
                <div><p className="text-[11px] text-flore-text-secondary">النوع</p><p className="mt-2 min-h-11 rounded-xl border border-flore-border bg-flore-card px-3 py-3 text-xs">{item.container_type || 'vase'}</p></div>
                <label className="text-[11px] text-flore-text-secondary">السعر<input type="number" min="0" step="0.25" value={item.price} onChange={event => setContainers(rows => rows.map((row, i) => i === index ? { ...row, price: Number(event.target.value) } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                <label className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-flore-border bg-flore-card px-3 text-xs"><span>{item.in_stock ? 'متاح' : 'موقوف'}</span><input type="checkbox" checked={item.in_stock} onChange={event => setContainers(rows => rows.map((row, i) => i === index ? { ...row, in_stock: event.target.checked } : row))} className="h-5 w-5 accent-flore-primary" /></label>
                {saveButton(`container-${item.id}`, () => save('vase_options', item.id, { price: item.price, in_stock: item.in_stock }, `container-${item.id}`))}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-flore-border bg-flore-card p-4 shadow-luxury sm:p-6">
          <div className="mb-5"><h2 className="font-amiri text-2xl font-semibold">أحجام الباقات</h2><p className="mt-1 text-xs text-flore-text-secondary">عدد السيقان يحدد اكتمال التصميم؛ المعامل يؤثر على سعر الزهور فقط.</p></div>
          <div className="space-y-3">
            {sizes.map((size, index) => (
              <div key={size.id} className="grid gap-3 rounded-2xl border border-flore-border bg-flore-bg p-4 lg:grid-cols-[130px_minmax(180px,1fr)_110px_110px_90px] lg:items-end">
                <label className="text-[11px] text-flore-text-secondary">الاسم<input value={size.label_ar} onChange={event => setSizes(rows => rows.map((row, i) => i === index ? { ...row, label_ar: event.target.value } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                <label className="text-[11px] text-flore-text-secondary">الوصف<input value={size.desc_ar || ''} onChange={event => setSizes(rows => rows.map((row, i) => i === index ? { ...row, desc_ar: event.target.value } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                <label className="text-[11px] text-flore-text-secondary">السيقان<input type="number" min="1" step="1" value={size.stem_count} onChange={event => setSizes(rows => rows.map((row, i) => i === index ? { ...row, stem_count: Number(event.target.value) } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                <label className="text-[11px] text-flore-text-secondary">المعامل<input type="number" min="1" step="0.1" value={size.price_multiplier} onChange={event => setSizes(rows => rows.map((row, i) => i === index ? { ...row, price_multiplier: Number(event.target.value) } : row))} className="mt-1 min-h-11 w-full rounded-xl border border-flore-border bg-flore-card px-3 text-sm" /></label>
                {saveButton(`size-${size.id}`, () => save('bouquet_sizes', size.id, { label_ar: size.label_ar, desc_ar: size.desc_ar, stem_count: size.stem_count, price_multiplier: size.price_multiplier }, `size-${size.id}`))}
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs leading-6 text-flore-text-secondary">الأسعار المعروضة للعميل في الأتيليه تُحسب من هذه القيم مباشرة ثم يعيد الخادم التحقق منها عند إنشاء الطلب. مثال السعر الحالي لأول زهرة: {flowers[0] ? formatPrice(flowers[0].price) : '—'}.</p>
    </div>
  )
}
