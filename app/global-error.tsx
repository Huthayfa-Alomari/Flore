'use client'

import { useEffect } from 'react'

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
        <html lang="ar" dir="rtl" className="h-full bg-[#FAF6F0]">
            <body className="h-full antialiased font-sans m-0 p-0 text-right">
                <div className="flex min-h-screen items-center justify-center bg-[#FAF6F0] px-4">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col items-center gap-6">

                        {/* أيقونة تنبيهية واضحة ومستقلة */}
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-2xl animate-pulse">
                            ⚠️
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'serif' }}>
                                عذراً، حدث خطأ نظام حرج
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                واجه خادم المتجر صعوبة في تحميل الهيكل الأساسي للصفحة. يرجى النقر على زر التحديث أدناه لإعادة تشغيل المنصة بأمان.
                            </p>
                            <p className="text-xs text-gray-400 font-mono tracking-wide mt-2">
                                A critical framework error occurred. Please refresh the core engine.
                            </p>
                        </div>

                        {/* طباعة المعرف الأمني الفريد للخطأ */}
                        {error.digest && (
                            <div className="bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-full">
                                <p className="text-[11px] font-mono text-gray-400 select-all">
                                    Critical Ref ID: <span className="font-bold text-red-500">{error.digest}</span>
                                </p>
                            </div>
                        )}

                        {/* زر محاولة الاستشفاء الذاتي للمنصة */}
                        <button
                            onClick={() => reset()}
                            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all duration-200 font-bold text-sm py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.99]"
                        >
                            إعادة تحميل المنصة واستعادة الجلسة
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}