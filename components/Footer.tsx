"use client"

import Link from 'next/link'
import { Instagram, Phone, MapPin, Snowflake } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-flore-bg-alt border-t border-flore-border font-noto" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">

        <div className="grid md:grid-cols-12 gap-10 md:gap-8 text-right">

          {/* الهوية */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display italic text-[28px] font-semibold tracking-wide text-flore-text-primary">
                Floré
              </span>
              <span className="w-1 h-1 rounded-full bg-flore-gold-dark" />
            </div>
            <p className="text-flore-text-secondary text-sm leading-7 max-w-xs">
              بوكيهات فاخرة بتصاميم حصرية، توصيل سريع وموثوق في عمّان، الزرقاء، وكافة أنحاء المملكة.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-flore-subtle text-flore-text-secondary rounded-full text-[11px]">
              <Snowflake className="h-3 w-3 text-flore-primary" />
              العملة المعتمدة: الدينار الأردني (JOD)
            </div>
          </div>

          {/* روابط سريعة */}
          <div className="md:col-span-2">
            <h3 className="flore-eyebrow flore-eyebrow-right !text-[10px] mb-5">استكشف</h3>
            <div className="space-y-3 text-sm">
              <Link href="/catalog" className="block text-flore-text-secondary hover:text-flore-primary transition-colors duration-200">المجموعة الفاخرة</Link>
              <Link href="/atelier" className="block text-flore-text-secondary hover:text-flore-primary transition-colors duration-200">الأتيليه والتحضير</Link>
              <Link href="/ar" className="block text-flore-text-secondary hover:text-flore-primary transition-colors duration-200">تجربة الواقع المعزز AR</Link>
            </div>
          </div>

          {/* تواصل معنا */}
          <div className="md:col-span-3">
            <h3 className="flore-eyebrow flore-eyebrow-right !text-[10px] mb-5">تواصل معنا</h3>
            <div className="space-y-3 text-sm">
              <a href="tel:+962788570246" className="flex items-center gap-2.5 text-flore-text-secondary hover:text-flore-primary transition-colors duration-200">
                <Phone className="h-[15px] w-[15px] shrink-0 text-flore-sage" />
                <span className="flore-price" dir="ltr">0788 570 246</span>
              </a>
              <a href="https://instagram.com/flore_jo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-flore-text-secondary hover:text-flore-primary transition-colors duration-200">
                <Instagram className="h-[15px] w-[15px] shrink-0 text-flore-sage" />
                <span dir="ltr">@flore_jor</span>
              </a>
            </div>
          </div>

          {/* الموقع */}
          <div className="md:col-span-3">
            <h3 className="flore-eyebrow flore-eyebrow-right !text-[10px] mb-5">الموقع والتغطية</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-flore-text-secondary">
                <MapPin className="h-[15px] w-[15px] shrink-0 text-flore-sage" />
                <span>الأردن — عمّان والزرقاء</span>
              </div>
              <p className="text-flore-text-secondary/80 text-xs leading-6">
                نوفر خدمة التوصيل الخاص بسيارات مبردة لضمان سلامة وانتعاش الزهور.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* خط الحقوق */}
      <div className="border-t border-flore-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-flore-text-secondary/70 text-xs">
            © {currentYear} Floré — جميع الحقوق محفوظة
          </p>
          <p className="text-flore-text-secondary/50 text-[11px]">
            صُمم بعناية في الأردن
            <span className="inline-block w-1 h-1 rounded-full bg-flore-gold-dark mx-2 align-middle" />
            <span className="font-display italic">Luxury in every detail</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
