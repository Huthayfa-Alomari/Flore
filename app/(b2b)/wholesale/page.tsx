import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Flower, ArrowUpRight, TrendingUp, DollarSign, Layers } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WholesaleDashboard() {
  const supabase = createClient()

  // 1. التحقق من جلسة تسجيل الدخول على السيرفر
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. التحقق من دور المستخدم (RBAC) في جدول صلاحيات المستخدمين
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = roleData?.role
  const allowedRoles = ['shop_owner', 'vendor', 'admin']

  // إذا لم يكن الدور من الأدوار المصرح لها، يتم تحويله للرئيسية لحماية الأسعار وبيانات البورصة
  if (!role || !allowedRoles.includes(role)) {
    redirect('/')
  }

  // بيانات البورصة الحية التجريبية (Mock Exchange Data)
  const mockExchangeRates = [
    { name: 'الورد الجوري الأحمر (بلدي)', price: '0.45 JOD', change: '+2.4%', trend: 'up' },
    { name: 'زنبق الكازابلانكا الأبيض', price: '1.20 JOD', change: '-1.1%', trend: 'down' },
    { name: 'التوليب الهولندي المخملي', price: '0.85 JOD', change: '0.0%', trend: 'neutral' },
    { name: 'الأوركيد الملكي (مستورد)', price: '4.50 JOD', change: '+5.7%', trend: 'up' },
  ]

  return (
    <div className="min-h-screen bg-flore-bg pb-24 font-noto text-right" dir="rtl">
      {/* البانر العلوي الفاخر */}
      <div className="relative bg-gradient-to-l from-flore-primary to-flore-primary-dark text-white py-16 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -left-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-white/20 text-flore-gold px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
              قناة شريك معتمد
            </span>
          </div>
          <h1 className="font-amiri text-4xl md:text-6xl font-bold tracking-wide mb-4">
            بورصة فلورّي الحيّة للزهور (B2B)
          </h1>
          <p className="text-white/80 max-w-2xl text-base md:text-lg leading-relaxed">
            المنصة الرقمية الأولى وحلقة الوصل المباشرة لأصحاب المحلات، منسقي الحفلات، والموردين المعتمدين لتداول زهور القطف والسلع الفاخرة بأسعار السوق الفورية.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* إحصائيات السوق السريعة */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-flore-card border border-flore-border rounded-3xl p-6 shadow-luxury">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-flore-text-primary">1,420 JOD</p>
            <p className="text-sm text-flore-text-secondary mt-1">حجم التداول اليومي بالمنصة</p>
          </div>
          <div className="bg-flore-card border border-flore-border rounded-3xl p-6 shadow-luxury">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-flore-text-primary">246 طرد</p>
            <p className="text-sm text-flore-text-secondary mt-1">الوحدات المدرجة للمزاد الجاري</p>
          </div>
          <div className="bg-flore-card border border-flore-border rounded-3xl p-6 shadow-luxury">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-flore-text-primary">مستقر</p>
            <p className="text-sm text-flore-text-secondary mt-1">مؤشر العرض والطلب العام</p>
          </div>
        </div>

        {/* جدول الأسعار الحية للبورصة */}
        <div className="bg-flore-card border border-flore-border rounded-3xl shadow-luxury overflow-hidden mb-12">
          <div className="p-6 border-b border-flore-border flex items-center justify-between">
            <div>
              <h2 className="font-amiri text-2xl font-bold text-flore-text-primary">جدول الأسعار الفورية</h2>
              <p className="text-xs text-flore-text-secondary mt-1">تحديث حي ومباشر كل 5 دقائق</p>
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-flore-bg text-flore-text-secondary text-sm font-semibold border-b border-flore-border">
                  <th className="p-4">اسم الصنف الدراسي للزهرة</th>
                  <th className="p-4">سعر الوحدة الافتتاحي</th>
                  <th className="p-4">التغير خلال اليوم</th>
                  <th className="p-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-flore-border">
                {mockExchangeRates.map((rate, i) => (
                  <tr key={i} className="hover:bg-flore-subtle/20 transition-colors">
                    <td className="p-4 font-medium flex items-center gap-3">
                      <Flower className="h-5 w-5 text-flore-primary/60" />
                      {rate.name}
                    </td>
                    <td className="p-4 font-bold text-flore-text-primary">{rate.price}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        rate.trend === 'up' ? 'bg-green-50 text-green-700' :
                        rate.trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rate.change}
                      </span>
                    </td>
                    <td className="p-4">
                      <button className="inline-flex items-center gap-1 text-xs font-bold text-flore-primary hover:underline">
                        حجز الطرد
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* قسم الدعم وشروط الشركاء */}
        <div className="bg-flore-subtle/30 rounded-3xl p-8 border border-flore-border text-center max-w-3xl mx-auto">
          <h3 className="font-amiri text-xl font-bold text-flore-text-primary mb-3">هل أنت مورد معتمد وترغب بإدراج شحنتك؟</h3>
          <p className="text-sm text-flore-text-secondary mb-6 leading-relaxed">
            تخضع جميع الزهور والمنتجات المدرجة لفحوصات الجودة الصارمة والتبريد المحمي داخل أفران وسيارات أتيليه فلوري لضمان ديمومة العطور ونضارة الزهور.
          </p>
          <button className="bg-flore-primary text-white font-noto font-bold text-sm px-6 py-3 rounded-xl hover:bg-flore-primary-dark transition-all">
            التواصل مع مدير العمليات اللوجستية
          </button>
        </div>
      </div>
    </div>
  )
}
