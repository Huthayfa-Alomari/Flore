'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button' // تأكد من مطابقة حالة الأحرف (B أو b) حسب مجلد المشروع لديك

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // تسجيل الخطأ في أنظمة المراقبة (مثل Sentry) أو الـ Console للتحليل
        console.error('[Floré Runtime Error Alert]:', error)
    }, [error])

    return (
        <div className="flex min-h-[70vh] items-center justify-center bg-flore-bg px-4 font-noto" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-flore-card rounded-3xl p-8 text-center shadow-luxury border border-flore-border flex flex-col items-center gap-5"
            >
                {/* أيقونة حذر فاخرة */}
                <div className="p-4 bg-purple-50 rounded-full text-flore-primary animate-pulse">
                    <AlertCircle className="h-10 w-10" />
                </div>

                <div className="space-y-2">
                    <h2 className="font-amiri text-3xl font-bold text-flore-text-primary">
                        عذراً، حدث خطأ غير متوقع
                    </h2>
                    <p className="text-flore-text-secondary text-sm leading-relaxed">
                        حدث تداخل رقمي أثناء تحضير التجربة. يرجى الضغط على زر إعادة المحاولة أو العودة لاحقاً بينما يقوم فريق الأتيليه بفحص الأمر.
                    </p>
                    <p className="text-xs text-gray-400 font-sans tracking-wide mt-1">
                        Something went wrong. Our team has been notified.
                    </p>
                </div>

                {/* معرف الخطأ للـ Debugging والدعم الفني */}
                {error.digest && (
                    <div className="bg-flore-bg px-3 py-1.5 rounded-lg border border-flore-border/60">
                        <p className="text-[11px] font-mono text-flore-text-secondary select-all">
                            Error Reference ID: <span className="font-bold text-flore-primary">{error.digest}</span>
                        </p>
                    </div>
                )}

                {/* أزرار التحكم لإنقاذ تجربة المستخدم */}
                <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                    <Button
                        onClick={() => reset()}
                        className="w-full bg-flore-primary text-white hover:bg-flore-primary/90 flex items-center justify-center gap-2 py-3 rounded-xl shadow-md transition-all font-bold"
                    >
                        <RotateCcw className="h-4 w-4" />
                        إعادة المحاولة الفورية
                    </Button>

                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                        className="w-full border-flore-border text-flore-text-primary hover:bg-gray-50 py-3 rounded-xl transition-all"
                    >
                        العودة للرئيسية
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}