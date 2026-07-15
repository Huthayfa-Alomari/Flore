"use client"

import Link from 'next/link'
import { Flower2, Instagram, Phone, MapPin } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear() // تحديث تلقائي للسنة الحالية (2026)

  return (
    <footer className="bg-flore-primary text-white py-12 px-4 font-noto">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 text-right" dir="rtl">

        {/* القسم الأول: الشعار والوصف */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Flower2 className="h-8 w-8" />
            <span className="font-amiri text-2xl font-bold tracking-wide">Floré</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed">
            بوكيهات فاخرة بتصاميم حصرية، توصيل سريع وموثوق في عمّان، الزرقاء، وكافة أنحاء المملكة.
          </p>
          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[11px] text-white/80">
            العملة المعتمدة: الدينار الأردني (JOD)
          </div>
        </div>

        {/* القسم الثاني: روابط سريعة */}
        <div>
          <h3 className="font-bold text-base mb-4 border-b border-white/10 pb-2 inline-block min-w-[80px]">روابط سريعة</h3>
          <div className="space-y-2 text-sm">
            <Link href="/catalog" className="block text-white/70 hover:text-white transition-colors">المجموعة الفاخرة</Link>
            <Link href="/atelier" className="block text-white/70 hover:text-white transition-colors">الأتيليه والتحضير</Link>
            <Link href="/ar" className="block text-white/70 hover:text-white transition-colors">تجربة الواقع المعزز AR</Link>
          </div>
        </div>

        {/* القسم الثالث: تواصل معنا */}
        <div>
          <h3 className="font-bold text-base mb-4 border-b border-white/10 pb-2 inline-block min-w-[80px]">تواصل معنا</h3>
          <div className="space-y-3 text-sm">
            <a href="tel:+962790000000" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors justify-start">
              <Phone className="h-4 w-4 shrink-0" />
              <span>0790000000</span>
            </a>
            <a href="https://instagram.com/flore_jo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors justify-start">
              <Instagram className="h-4 w-4 shrink-0" />
              <span dir="ltr">@flore_jo</span>
            </a>
          </div>
        </div>

        {/* القسم الرابع: الموقع الجغرافي */}
        <div>
          <h3 className="font-bold text-base mb-4 border-b border-white/10 pb-2 inline-block min-w-[80px]">الموقع والتغطية</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>الأردن (عمّان والزرقاء)</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              نوفر خدمة التوصيل الخاص بسيارات مبردة لضمان سلامة وانتعاش الزهور.
            </p>
          </div>
        </div>

      </div>

      {/* خط الحقوق السفلي */}
      <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-white/10 text-center text-white/50 text-xs md:text-sm">
        © {currentYear} Floré. جميع الحقوق محفوظة | صمم بفخامة في الأردن
      </div>
    </footer>
  )
}