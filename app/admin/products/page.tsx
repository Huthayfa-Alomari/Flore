'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Product } from '@/types'

type ProductForm = {
  name: string
  name_en: string
  category: Product['category']
  price: string
  description: string
  description_en: string
  badge: string
  badge_color: string
  in_stock: boolean
  ar_enabled: boolean
}

const emptyForm: ProductForm = {
  name: '',
  name_en: '',
  category: 'bouquets',
  price: '',
  description: '',
  description_en: '',
  badge: '',
  badge_color: '#0D5C63',
  in_stock: true,
  ar_enabled: false,
}

const categories: { value: Product['category']; label: string }[] = [
  { value: 'bouquets', label: 'باقات' },
  { value: 'preserved', label: 'محفوظة' },
  { value: 'vases', label: 'مزهرية' },
  { value: 'chocolates', label: 'شوكولاتة' },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setProducts(data as Product[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openAddForm = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setImageFile(null)
    setImagePreview('')
    setShowForm(true)
  }

  const openEditForm = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      name_en: product.name_en || '',
      category: product.category,
      price: String(product.price),
      description: product.description || '',
      description_en: product.description_en || '',
      badge: product.badge || '',
      badge_color: product.badge_color || '#0D5C63',
      in_stock: product.in_stock,
      ar_enabled: product.ar_enabled,
    })
    setImageFile(null)
    setImagePreview(product.image || '')
    setShowForm(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return editingProduct?.image || ''

    setUploadProgress('جاري رفع الصورة...')
    const ext = imageFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('products')
      .upload(fileName, imageFile, { cacheControl: '3600', upsert: false })

    if (error) throw new Error('فشل رفع الصورة: ' + error.message)

    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      alert('اسم المنتج والسعر مطلوبان')
      return
    }

    setSaving(true)
    setUploadProgress('')

    try {
      const imageUrl = await uploadImage()
      setUploadProgress('جاري حفظ المنتج...')

      const productData = {
        name: form.name,
        name_en: form.name_en || null,
        category: form.category,
        price: parseFloat(form.price),
        currency: 'JOD',
        image: imageUrl,
        images: [imageUrl],
        description: form.description || null,
        description_en: form.description_en || null,
        badge: form.badge || null,
        badge_color: form.badge_color || null, // 🐛 كان يخزّن نص الشارة (form.badge) بدل اللون فعليًا
        in_stock: form.in_stock,
        model_url: null,
        ar_enabled: form.ar_enabled,
      }

      // الكتابة تمر عبر /api/admin/products (تحقق Zod صارم + rate limiting) بدل الكتابة
      // المباشرة من المتصفح، لضمان تطبيق نفس قواعد التحقق دائمًا مهما كان مصدر الطلب
      const response = await fetch('/api/admin/products', {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct ? { id: editingProduct.id, ...productData } : productData),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(typeof error === 'string' ? error : 'فشل حفظ المنتج')
      }

      setShowForm(false)
      fetchProducts()
    } catch (err) {
      alert('خطأ: ' + (err instanceof Error ? err.message : 'حدث خطأ غير متوقع'))
    } finally {
      setSaving(false)
      setUploadProgress('')
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return
    const response = await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' })
    if (!response.ok) {
      alert('فشل حذف المنتج')
      return
    }
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-flore-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-amiri text-3xl font-bold text-flore-text-primary">إدارة المنتجات</h1>
          <p className="text-flore-text-secondary mt-1">إضافة وتعديل وحذف المنتجات</p>
        </div>
        <Button onClick={openAddForm} className="gap-2">
          <Plus className="h-4 w-4" />
          منتج جديد
        </Button>
      </div>

      {/* فورم إضافة/تعديل */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-amiri text-xl font-bold">
                  {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-flore-text-secondary hover:text-flore-text-primary">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* صورة المنتج */}
                <div>
                  <label className="block text-sm font-medium mb-2">صورة المنتج</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-flore-border hover:border-flore-primary cursor-pointer overflow-hidden bg-flore-bg flex items-center justify-center transition-colors"
                  >
                    {imagePreview ? (
                      <Image src={imagePreview} alt="preview" fill className="object-cover" />
                    ) : (
                      <div className="text-center text-flore-text-secondary">
                        <Upload className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-sm">اضغط لرفع صورة</p>
                        <p className="text-xs mt-1">JPG, PNG, WebP - حتى 5MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* بيانات المنتج */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم المنتج (عربي) *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                      placeholder="باقة ورد أحمر"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">اسم المنتج (إنجليزي)</label>
                    <input
                      type="text"
                      value={form.name_en}
                      onChange={e => setForm({ ...form, name_en: e.target.value })}
                      className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                      placeholder="Red Rose Bouquet"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">التصنيف</label>
                      <select
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value as Product['category'] })}
                        className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">السعر (د.أ) *</label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                        placeholder="25"
                        dir="ltr"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">شارة (اختياري)</label>
                      <input
                        type="text"
                        value={form.badge}
                        onChange={e => setForm({ ...form, badge: e.target.value })}
                        className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                        placeholder="جديد"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">لون الشارة</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.badge_color}
                          onChange={e => setForm({ ...form, badge_color: e.target.value })}
                          className="w-10 h-10 rounded-lg border-2 border-flore-border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={form.badge_color}
                          onChange={e => setForm({ ...form, badge_color: e.target.value })}
                          className="flex-1 rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">الوصف (عربي)</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none resize-none"
                      rows={2}
                      placeholder="وصف المنتج..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.in_stock}
                        onChange={e => setForm({ ...form, in_stock: e.target.checked })}
                        className="rounded"
                      />
                      متوفر
                    </label>
                  </div>
                </div>
              </div>

              {uploadProgress && (
                <p className="text-sm text-flore-primary mt-4 text-center">{uploadProgress}</p>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* قائمة المنتجات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {product.badge && (
                  <div className="absolute top-3 right-3">
                    <Badge style={{ backgroundColor: product.badge_color || '#0D5C63' }} className="text-white">
                      {product.badge}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-noto font-medium mb-1">{product.name}</h3>
                <p className="text-flore-primary font-bold mb-3">{product.price} د.أ</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openEditForm(product)}
                  >
                    <Pencil className="h-3 w-3" />
                    تعديل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {products.length === 0 && !loading && (
        <div className="text-center py-20 text-flore-text-secondary">
          <p className="text-lg mb-2">لا توجد منتجات بعد</p>
          <Button onClick={openAddForm} className="gap-2 mt-4">
            <Plus className="h-4 w-4" />
            أضف أول منتج
          </Button>
        </div>
      )}
    </div>
  )
}