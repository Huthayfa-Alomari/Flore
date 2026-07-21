"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { ShoppingBag, Heart, Settings, LogOut, Store, Camera, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { formatPrice, formatDate, orderStatuses } from '@/lib/utils'
import type { Order, Profile } from '@/types'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'settings'>('orders')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const { clearCart } = useCart()

  // حقول التعديل بتبويب الإعدادات (controlled inputs)
  const [fullNameInput, setFullNameInput] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
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

  // يتحقق من دور المستخدم لعرض رابط بوابة التجار (B2B) فقط لأصحاب المحلات/الموردين/الأدمن.
  // هذا مجرد إخفاء بصري مريح؛ الحماية الفعلية موجودة أصلاً داخل app/(b2b)/wholesale/page.tsx نفسها
  const fetchUserRole = useCallback(async (userId: string) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    setUserRole(data?.role || null)
  }, [supabase])

  const fetchOrders = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setOrders(data as Order[])
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchProfile(user.id)
      fetchOrders(user.id)
      fetchUserRole(user.id)
    }
    getUser()
  }, [supabase, router, fetchProfile, fetchOrders, fetchUserRole])

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-flore-primary" />
      </div>
    )
  }

  const tabs = [
    { id: 'orders' as const, label: 'طلباتي', icon: ShoppingBag },
    { id: 'wishlist' as const, label: 'المفضلة', icon: Heart },
    { id: 'settings' as const, label: 'الإعدادات', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-flore-bg py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-flore-card rounded-3xl p-8 shadow-luxury mb-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative w-20 h-20 rounded-full bg-flore-primary flex items-center justify-center text-white text-2xl font-bold overflow-hidden group"
            >
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="صورة البروفايل" fill className="object-cover" sizes="80px" />
              ) : (
                profile?.full_name?.[0] || user?.email?.[0] || 'ف'
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
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
          <h1 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
            {profile?.full_name || user?.email?.split('@')[0] || 'مستخدم فلوري'}
          </h1>
          <span className="inline-block bg-flore-gold/20 text-flore-gold-dark px-3 py-1 rounded-full text-sm font-medium">
            {profile?.membership === 'vip' ? 'VIP' : profile?.membership === 'golden' ? 'ذهبي' : 'كلاسيك'}
          </span>
          <div className="flex justify-center gap-8 mt-6 text-sm text-flore-text-secondary">
            <div>الطلبات: <span className="font-bold text-flore-primary">{profile?.total_orders || 0}</span></div>
            <div>إجمالي الإنفاق: <span className="font-bold text-flore-primary">{formatPrice(profile?.total_spent || 0)}</span></div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-flore-primary text-white'
                  : 'bg-flore-card text-flore-text-secondary hover:bg-flore-subtle'
                  }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="bg-flore-card rounded-3xl p-6 shadow-luxury">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-center text-flore-text-secondary py-8">لا توجد طلبات بعد</p>
              ) : (
                orders.map((order) => {
                  const statusInfo = orderStatuses.find(s => s.value === order.status)
                  return (
                    <div key={order.id} className="border border-flore-border rounded-2xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold">طلب #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-flore-text-secondary">{formatDate(order.created_at)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo?.color || ''}`}>
                          {statusInfo?.label || order.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            {item.image && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-flore-text-secondary">{item.qty}x</p>
                            </div>
                            <p className="text-sm font-bold">{formatPrice(item.price * item.qty)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-flore-border mt-3 pt-3 flex justify-between">
                        <span className="font-bold">الإجمالي</span>
                        <span className="font-bold text-flore-primary">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <p className="text-center text-flore-text-secondary py-8">قائمة المفضلة فارغة</p>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-flore-text-secondary mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-flore-text-secondary mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-xl border-2 border-flore-border bg-flore-bg p-3 focus:border-flore-primary focus:outline-none"
                />
              </div>

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl text-center">{saveError}</p>
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

              {/* بوابة التجار (B2B) — تظهر فقط لأصحاب الأدوار المصرح لها */}
              {userRole && ['shop_owner', 'vendor', 'admin'].includes(userRole) && (
                <Link href="/wholesale">
                  <Button variant="outline" className="w-full gap-2 text-flore-primary border-flore-primary/30 hover:bg-flore-subtle">
                    <Store className="h-4 w-4" />
                    بوابة التجار (أسعار الجملة)
                  </Button>
                </Link>
              )}

              <Button onClick={handleLogout} variant="outline" className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50">
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