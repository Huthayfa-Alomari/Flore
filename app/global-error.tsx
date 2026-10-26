'use client'

import { useEffect } from 'react'
import './globals.css'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // تسجيل الخطأ الفادح فوراً لمعالجته من قِبل مهندسي المنصة
        console.error('[Floré Critical Root Collapse]:', error)
    }, [error])

    return (
        // يجب تضمين وسم html و body هنا لأن هذا الملف يلغي الـ Root Layout تماماً عند استدعائه
        <html lang="ar" dir="rtl" className="h-full">
            <body className="m-0 h-full bg-flore-bg p-0 text-right font-noto text-flore-text-primary">
                <div className="flex min-h-screen items-center justify-center bg-flore-bg px-4">
                    <div className="flex w-full max-w-md animate-fade-up flex-col items-center gap-6 rounded-3xl border border-flore-border/70 bg-flore-card p-8 text-center shadow-luxury">

                        {/* أيقونة تنبيهية هادئة — دون رموز تعبيرية */}
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-flore-error/20 bg-flore-error/5">
                            <AlertCircle className="h-8 w-8 text-flore-error" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="font-amiri text-2xl font-bold text-flore-text-primary">
                                عذراً، حدث خطأ نظام حرج
                            </h2>
                            <p className="text-sm leading-relaxed text-flore-text-secondary">
                                واجه خادم المتجر صعوبة في تحميل الهيكل الأساسي للصفحة. يرجى النقر على زر التحديث أدناه لإعادة تشغيل المنصة بأمان.
                            </p>
                            <p className="mt-2 font-display text-[11px] tracking-wide text-flore-text-secondary/70" dir="ltr">
                                A critical framework error occurred. Please refresh the core engine.
                            </p>
                        </div>

                        {/* طباعة المعرف الأمني الفريد للخطأ */}
                        {error.digest && (
                            <div className="w-full rounded-xl border border-flore-border/60 bg-flore-bg px-3 py-2">
                                <p className="select-all font-mono text-[11px] text-flore-text-secondary" dir="ltr">
                                    Critical Ref ID: <span className="font-bold text-flore-error">{error.digest}</span>
                                </p>
                            </div>
                        )}

                        {/* زر محاولة الاستشفاء الذاتي للمنصة */}
                        <button
                            onClick={() => reset()}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-flore-primary px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.97]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            إعادة تحميل المنصة واستعادة الجلسة
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
