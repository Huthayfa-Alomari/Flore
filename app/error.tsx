'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/Button'

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
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                className="flex w-full max-w-md flex-col items-center gap-5 rounded-3xl border border-flore-border/70 bg-flore-card p-8 text-center shadow-luxury-soft"
            >
                {/* أيقونة حذر فاخرة — نبرة خطأ هادئة */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-flore-error/20 bg-flore-error/5">
                    <AlertCircle className="h-8 w-8 text-flore-error" />
                </div>

                <div className="space-y-2">
                    <h2 className="font-amiri text-3xl font-bold text-flore-text-primary">
                        عذراً، حدث خطأ غير متوقع
                    </h2>
                    <p className="text-sm leading-relaxed text-flore-text-secondary">
                        حدث تداخل رقمي أثناء تحضير التجربة. يرجى الضغط على زر إعادة المحاولة أو العودة لاحقاً بينما يقوم فريق الأتيليه بفحص الأمر.
                    </p>
                    <p className="mt-2 font-display text-[11px] tracking-wide text-flore-text-secondary/70" dir="ltr">
                        Something went wrong. Our team has been notified.
                    </p>
                </div>

                {/* معرف الخطأ للـ Debugging والدعم الفني */}
                {error.digest && (
                    <div className="rounded-xl border border-flore-border/60 bg-flore-bg px-3 py-1.5">
                        <p className="select-all font-mono text-[11px] text-flore-text-secondary" dir="ltr">
                            Error Reference ID: <span className="font-bold text-flore-primary">{error.digest}</span>
                        </p>
                    </div>
                )}

                {/* أزرار التحكم لإنقاذ تجربة المستخدم */}
                <div className="mt-1 flex w-full flex-col gap-3 sm:flex-row">
                    <Button onClick={() => reset()} className="w-full gap-2">
                        <RefreshCw className="h-4 w-4" />
                        إعادة المحاولة الفورية
                    </Button>

                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                        className="w-full gap-2"
                    >
                        <Home className="h-4 w-4" />
                        العودة للرئيسية
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}
