"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import {
  ShoppingBag, Heart, Settings, LogOut, Camera, Loader2, Check, MapPin,
  Package, UserRound, AlertCircle, Phone, Flower2, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatPrice, formatDate, orderStatuses } from '@/lib/utils'
import type { Order, Profile } from '@/types'

// خريطة الحالات → شارات النظام (سج للتسليم، ذهبي للمدفوع، إطار رفيع للانتظار)
const badgeFor = (
  status: string
): { variant: 'default' | 'secondary' | 'gold' | 'sage' | 'outline'; className?: string } => {
  switch (status) {
    case 'delivered':
      return { variant: 'default' }
    case 'cancelled':
      return { variant: 'outline', className: 'border-flore-error/30 text-flore-error' }
    case 'pending':
      return { variant: 'outline' }
    case 'paid':
      return { variant: 'gold' }
    default:
      return { variant: 'secondary' }
  }
}

// عرض منطقة التوصيل بالعربية بدل القيمة الخام
const regionLabel = (region: string | null): string => {
  switch (region) {
    case 'amman':
      return 'عمّان'
    case 'zarqa':
      return 'الزرقاء'
    case 'irbid':
      return 'إربد'
    case 'other':
      return 'أخرى'
    default:
      return region || ''
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'addresses' | 'settings'>('orders')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { clearCart } = useCart()

  const [fullNameInput, setFullNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [addresses, setAddresses] = useState<{ id: string; label: string; region: string | null; address: string; is_default: boolean }[]>([])
  const [newAddress, setNewAddress] = useState({ label: '', region: 'amman', address: '' })
  const [savingAddress, setSavingAddress] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data as Profile)
      setFullNameInput((data as Profile).full_name || '')
      setPhoneInput((data as Profile).phone || '')
    }
    setLoading(false)
  }, [supabase])

  const fetchOrders = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setOrders(data as Order[])
  }, [supabase])

  const fetchAddresses = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setAddresses(data)
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // بوابة الدخول — عرض أنيق يرشد للتسجيل بدل التحويل الفوري
        setLoading(false)
        return
      }
      setUser(user)
      fetchProfile(user.id)
      fetchOrders(user.id)
      fetchAddresses(user.id)
    }
    getUser()
  }, [supabase, router, fetchProfile, fetchOrders, fetchAddresses])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearCart()
    router.push('/')
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    setSaveError('')
    setSaveSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullNameInput.trim() || null, phone: phoneInput.trim() || null })
      .eq('id', user.id)

    if (error) {
      setSaveError('فشل حفظ التعديلات. حاول مجدداً')
    } else {
      setProfile((prev) => prev ? { ...prev, full_name: fullNameInput, phone: phoneInput } : prev)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
    setSavingProfile(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }

    setUploadingAvatar(true)
    setSaveError('')

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw new Error(updateError.message)

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev)
    } catch {
      setSaveError('فشل رفع الصورة. تأكد من إعداد مساحة التخزين وحاول مجدداً')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleAddAddress = async () => {
    if (!user || !newAddress.label.trim() || !newAddress.address.trim()) return
    setSavingAddress(true)
    const { data, error } = await supabase
      .from('saved_addresses')
      .insert({ user_id: user.id, ...newAddress })
      .select()
      .single()
    if (!error && data) {
      setAddresses(prev => [data, ...prev])
      setNewAddress({ label: '', region: 'amman', address: '' })
    }
    setSavingAddress(false)
  }

  const handleDeleteAddress = async (id: string) => {
    await supabase.from('saved_addresses').delete().eq('id', id)
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
          <Flower2 className="h-7 w-7 animate-pulse text-flore-primary" />
        </div>
        <p className="text-sm text-flore-text-secondary">جاري تحميل حسابك...</p>
      </div>
    )
  }

  // بوابة الدخول — دعوة أنيقة لتسجيل الدخول
  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center animate-fade-up">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
          <UserRound className="h-9 w-9 text-flore-primary" />
        </div>
        <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">
          حسابك في انتظارك
        </h1>
        <p className="mb-8 max-w-sm leading-relaxed text-flore-text-secondary">
          سجّل دخولك لمتابعة طلباتك وعناوينك وتفضيلاتك لدى فلوري
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login">
            <Button size="lg">تسجيل الدخول</Button>
          </Link>
          <Link href="/catalog">
            <Button variant="outline" size="lg">متابعة التسوق</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'orders' as const, label: 'طلباتي', icon: ShoppingBag },
    { id: 'wishlist' as const, label: 'المفضلة', icon: Heart },
    { id: 'addresses' as const, label: 'عناويني', icon: MapPin },
    { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-flore-bg px-4 py-10 sm:px-6 md:py-14">
      <div className="mx-auto max-w-4xl">

        {/* ترويسة الصفحة */}
        <header className="mb-10 text-center animate-fade-up">
          <p className="flore-eyebrow mb-4">MY ACCOUNT</p>
          <h1 className="font-amiri text-4xl font-bold text-flore-text-primary">حسابي</h1>
        </header>

        {/* بطاقة المستخدم */}
        <section className="mb-8 rounded-3xl border border-flore-border/70 bg-flore-card p-6 shadow-luxury-soft animate-fade-up md:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="تغيير صورة البروفايل"
                className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-flore-primary font-amiri text-4xl font-bold text-white ring-2 ring-flore-gold/50 ring-offset-4 ring-offset-flore-card transition-transform duration-200 ease-flore hover:scale-[1.03] active:scale-95"
              >
                {profile?.avatar_url ? (
                  <Image src={profile.avatar_url} alt="صورة البروفايل" fill className="object-cover" sizes="96px" />
                ) : (
                  profile?.full_name?.[0] || user?.email?.[0] || 'ف'
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 ease-flore group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <h2 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
              {profile?.full_name || user?.email?.split('@')[0] || 'مستخدم فلوري'}
            </h2>

            {profile?.phone && (
              <p className="mb-3 flex items-center gap-1.5 text-sm text-flore-text-secondary">
                <Phone className="h-3.5 w-3.5" />
                <span className="flore-price" dir="ltr">{profile.phone}</span>
              </p>
            )}

            <div className="mb-6">
              <Badge variant={profile?.membership === 'vip' || profile?.membership === 'golden' ? 'gold' : 'secondary'}>
                {profile?.membership === 'vip' ? 'VIP' : profile?.membership === 'golden' ? 'ذهبي' : 'كلاسيك'}
              </Badge>
            </div>

            <div className="flex w-full items-center justify-center gap-8 border-t border-flore-border/70 pt-6 text-sm">
              <div className="text-flore-text-secondary">
                الطلبات:{' '}
                <span className="font-amiri text-lg font-bold text-flore-primary">
                  <span className="flore-price" dir="ltr">{profile?.total_orders || 0}</span>
                </span>
              </div>
              <div className="h-8 w-px bg-flore-border/70" aria-hidden="true" />
              <div className="text-flore-text-secondary">
                إجمالي الإنفاق:{' '}
                <span className="font-amiri text-lg font-bold text-flore-primary">
                  <span className="flore-price" dir="ltr">{formatPrice(profile?.total_spent || 0)}</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* التبويبات — أزرار حبّية */}
        <div className="mb-8 flex gap-1.5 rounded-full border border-flore-border/70 bg-flore-card p-1.5 shadow-luxury-soft animate-fade-up">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 py-2.5 text-xs font-medium transition-all duration-200 ease-flore sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-flore-primary text-white shadow-luxury-soft'
                    : 'text-flore-text-secondary hover:bg-flore-subtle/60 hover:text-flore-text-primary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* محتوى التبويبات */}
        <div key={activeTab} className="rounded-3xl border border-flore-border/70 bg-flore-card p-5 shadow-luxury-soft animate-fade-up md:p-8">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
                    <Package className="h-7 w-7 text-flore-primary" />
                  </div>
                  <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-2">
                    لا توجد طلبات بعد
                  </h3>
                  <p className="mb-6 text-sm text-flore-text-secondary">
                    اكتشف مجموعتنا الفاخرة واختر باقتك المفضلة
                  </p>
                  <Link href="/catalog">
                    <Button variant="primary" className="gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      تصفح المجموعة
                    </Button>
                  </Link>
                </div>
              ) : (
                orders.map((order) => {
                  const statusInfo = orderStatuses.find(s => s.value === order.status)
                  const badge = badgeFor(order.status)
                  return (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-flore-border/70 p-5 transition-colors duration-200 ease-flore hover:border-flore-sage/60"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-flore-text-primary">
                            طلب #<span className="flore-price" dir="ltr">{order.id.slice(0, 8)}</span>
                          </p>
                          <p className="mt-1 text-xs text-flore-text-secondary">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.payment_status === 'paid' && (
                            <Badge variant="gold">مدفوع</Badge>
                          )}
                          {order.payment_status === 'failed' && (
                            <Badge variant="outline" className="border-flore-error/30 text-flore-error">
                              فشل الدفع
                            </Badge>
                          )}
                          <Badge variant={badge.variant} className={badge.className}>
                            {statusInfo?.label || order.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {item.image && (
                              <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-flore-border/60">
                                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-flore-text-primary">{item.name}</p>
                              <p className="text-xs text-flore-text-secondary">
                                <span className="flore-price">{item.qty}x</span>
                              </p>
                            </div>
                            <p className="whitespace-nowrap text-sm font-bold text-flore-text-primary">
                              <span className="flore-price" dir="ltr">{formatPrice(item.price * item.qty, '')}</span>{' '}
                              <span className="text-xs font-medium text-flore-text-secondary">د.أ</span>
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-flore-border/70 pt-4">
                        <span className="text-sm font-medium text-flore-text-secondary">الإجمالي</span>
                        <span className="font-amiri text-lg font-bold text-flore-primary">
                          <span className="flore-price" dir="ltr">{formatPrice(order.total, '')}</span>{' '}
                          <span className="text-sm font-medium text-flore-text-secondary">د.أ</span>
                        </span>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-flore-subtle">
                <Heart className="h-7 w-7 text-flore-primary" />
              </div>
              <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-2">
                قائمة المفضلة فارغة
              </h3>
              <p className="mb-6 text-sm text-flore-text-secondary">
                احفظ الباقات التي أعجبتك لتجدها هنا بسهولة
              </p>
              <Link href="/catalog">
                <Button variant="outline">استكشف المجموعة</Button>
              </Link>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-4">
              {addresses.length === 0 && (
                <div className="rounded-2xl bg-flore-subtle/50 p-5 text-center text-sm text-flore-text-secondary">
                  لا توجد عناوين محفوظة بعد — أضف عنوانك الأول أدناه
                </div>
              )}

              {addresses.map(addr => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-flore-border/70 p-5 transition-colors duration-200 ease-flore hover:border-flore-sage/60"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flore-subtle text-flore-primary">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-flore-text-primary">{addr.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-flore-text-secondary">{addr.address}</p>
                      {addr.region && (
                        <p className="mt-1 text-xs text-flore-text-secondary">{regionLabel(addr.region)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-flore-error transition-colors duration-200 ease-flore hover:bg-flore-error/10"
                    aria-label={`حذف عنوان ${addr.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                </div>
              ))}

              <div className="space-y-3 border-t border-flore-border/70 pt-5">
                <p className="flex items-center gap-2 text-sm font-bold text-flore-text-primary">
                  <MapPin className="h-4 w-4 text-flore-primary" />
                  إضافة عنوان جديد
                </p>
                <Input
                  type="text"
                  placeholder="مسمّى العنوان (مثال: المنزل)"
                  value={newAddress.label}
                  onChange={e => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                />
                <select
                  value={newAddress.region}
                  onChange={e => setNewAddress(prev => ({ ...prev, region: e.target.value }))}
                  aria-label="منطقة التوصيل"
                  className="w-full cursor-pointer rounded-2xl border border-flore-border bg-flore-card px-4 py-3 text-sm text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-sage focus:outline-none focus:ring-4 focus:ring-flore-primary/10"
                >
                  <option value="amman">عمّان</option>
                  <option value="zarqa">الزرقاء</option>
                  <option value="irbid">إربد</option>
                  <option value="other">أخرى</option>
                </select>
                <textarea
                  placeholder="العنوان بالتفصيل"
                  value={newAddress.address}
                  onChange={e => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-2xl border border-flore-border bg-flore-card px-4 py-3 text-sm text-flore-text-primary transition-all duration-200 ease-flore placeholder:text-flore-text-secondary/50 hover:border-flore-sage focus:outline-none focus:ring-4 focus:ring-flore-primary/10"
                />
                <Button onClick={handleAddAddress} disabled={savingAddress} className="w-full">
                  {savingAddress ? 'جاري الحفظ...' : 'حفظ العنوان'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div>
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-flore-text-primary">
                  الاسم الكامل
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-flore-text-primary">
                  رقم الهاتف
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  dir="ltr"
                />
              </div>

              {saveError && (
                <p className="flex items-center justify-center gap-2 rounded-2xl bg-flore-error/5 px-4 py-3 text-center text-sm text-flore-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {saveError}
                </p>
              )}

              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full gap-2">
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    تم الحفظ
                  </>
                ) : (
                  'حفظ التعديلات'
                )}
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full gap-2 border-flore-error/30 text-flore-error hover:border-flore-error/50 hover:bg-flore-error/10"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
