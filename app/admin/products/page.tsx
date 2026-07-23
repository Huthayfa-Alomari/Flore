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
  { value: 'accessories', label: 'إكسسوارات' },
  { value: 'plants', label: 'نباتات' },
]

// عنصر صورة واحد داخل معرض الصور: إما ملف جديد لم يُرفع بعد، أو رابط موجود مسبقاً (عند التعديل)
type ImageItem = { file: File; preview: string } | { url: string }

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [images, setImages] = useState<ImageItem[]>([])
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelPreviewName, setModelPreviewName] = useState<string>('')
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
    setImages([])
    setModelFile(null)
    setModelPreviewName('')
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
    // تحميل كل الصور الموجودة مسبقاً للمنتج (المعرض كامل، وليس صورة الغلاف فقط)
    const existingUrls = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : [])
    setImages(existingUrls.map((url) => ({ url })))
    setModelFile(null)
    setModelPreviewName(product.model_url ? product.model_url.split('/').pop() || '' : '')
    setShowForm(true)
  }

  // يسمح باختيار عدة صور دفعة واحدة، ويضيفها فوق أي صور محددة مسبقاً بدل استبدالها
  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const oversized = files.find((f) => f.size > 5 * 1024 * 1024)
    if (oversized) {
      alert(`الصورة "${oversized.name}" أكبر من 5 ميجابايت`)
      return
    }

    const newItems: ImageItem[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file), // أخف وأسرع من base64 وأكثر توافقاً مع next/image
    }))
    setImages((prev) => [...prev, ...newItems])
    e.target.value = '' // للسماح باختيار نفس الملف مرة أخرى لاحقاً لو احتاج المستخدم لحذفه وإعادة إضافته
  }

  const removeImage = (index: number) => {
    setImages((prev) => {
      const item = prev[index]
      if ('preview' in item) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // يرفع كل الصور الجديدة (اللي لسا ملفات محلية) بالتوازي، ويبقي روابط الصور القديمة كما هي
  const uploadAllImages = async (): Promise<string[]> => {
    const urls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const item = images[i]
      if ('url' in item) {
        urls.push(item.url)
        continue
      }

      setUploadProgress(`جاري رفع الصورة ${i + 1} من ${images.length}...`)
      const ext = item.file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('products')
        .upload(fileName, item.file, { cacheControl: '3600', upsert: false })

      if (error) throw new Error(`فشل رفع الصورة ${i + 1}: ${error.message}`)

      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName)
      urls.push(publicUrl)
    }

    return urls
  }

  // يرفع نموذج الـ AR الجديد لو تم اختيار ملف، وإلا يبقي رابط الموديل القديم كما هو عند التعديل
  const uploadModel = async (): Promise<string | null> => {
    if (!modelFile) {
      return editingProduct?.model_url || null
    }

    setUploadProgress('جاري رفع نموذج الـ 3D...')
    const ext = modelFile.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('product-models')
      .upload(fileName, modelFile, { cacheControl: '3600', upsert: false })

    if (error) throw new Error(`فشل رفع النموذج: ${error.message}`)

    const { data: { publicUrl } } = supabase.storage.from('product-models').getPublicUrl(fileName)
    return publicUrl
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      alert('اسم المنتج والسعر مطلوبان')
      return
    }
    if (images.length === 0) {
      alert('أضف صورة واحدة على الأقل')
      return
    }
    if (form.ar_enabled && !modelFile && !editingProduct?.model_url) {
      alert('لتفعيل AR، ارفع ملف نموذج ثلاثي الأبعاد')
      return
    }

    setSaving(true)
    setUploadProgress('')

    try {
      const imageUrls = await uploadAllImages()
      const modelUrl = await uploadModel()
      setUploadProgress('جاري حفظ المنتج...')

      const productData = {
        name: form.name,
        name_en: form.name_en || null,
        category: form.category,
        price: parseFloat(form.price),
        currency: 'JOD',
        image: imageUrls[0], // صورة الغلاف = أول صورة بالمعرض
        images: imageUrls,
        description: form.description || null,
        description_en: form.description_en || null,
        badge: form.badge || null,
        badge_color: form.badge_color || null,
        in_stock: form.in_stock,
        model_url: modelUrl,
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
                {/* معرض صور المنتج (يدعم أكثر من صورة) */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    صور المنتج {images.length > 0 && `(${images.length})`}
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {images.map((item, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-flore-border group">
                          <Image
                            src={'preview' in item ? item.preview : item.url}
                            alt={`صورة ${index + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                          {index === 0 && (
                            <span className="absolute bottom-1 right-1 bg-flore-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                              الغلاف
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-flore-border hover:border-flore-primary cursor-pointer overflow-hidden bg-flore-bg flex items-center justify-center transition-colors"
                  >
                    <div className="text-center text-flore-text-secondary">
                      <Upload className="h-10 w-10 mx-auto mb-2" />
                      <p className="text-sm">{images.length > 0 ? 'اضغط لإضافة صور أخرى' : 'اضغط لرفع صورة أو أكثر'}</p>
                      <p className="text-xs mt-1">JPG, PNG, WebP - حتى 5MB لكل صورة</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
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
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.ar_enabled}
                        onChange={e => setForm({ ...form, ar_enabled: e.target.checked })}
                        className="rounded"
                      />
                      تفعيل AR
                    </label>
                  </div>

                  {form.ar_enabled && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        نموذج ثلاثي الأبعاد (.glb أو .usdz)
                      </label>
                      <input
                        type="file"
                        accept=".glb,.usdz,model/gltf-binary,model/vnd.usdz+zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setModelFile(file)
                            setModelPreviewName(file.name)
                          }
                        }}
                        className="text-sm w-full"
                      />
                      {modelPreviewName && (
                        <p className="text-xs text-flore-text-secondary mt-1">
                          الملف المحدد: {modelPreviewName}
                        </p>
                      )}
                    </div>
                  )}
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
