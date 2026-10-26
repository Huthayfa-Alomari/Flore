import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-flore-bg px-4" dir="rtl">
            <div className="max-w-sm text-center animate-fade-up">
                <div className="mx-auto mb-6 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-flore-subtle">
                    <WifiOff className="h-9 w-9 text-flore-primary" />
                </div>
                <p className="flore-eyebrow mb-3">OFFLINE</p>
                <h1 className="font-amiri text-3xl font-bold text-flore-text-primary mb-3">
                    أنت غير متصل
                </h1>
                <p className="mb-8 text-sm leading-relaxed text-flore-text-secondary">
                    يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-flore-border bg-flore-card px-6 py-3 text-sm font-medium text-flore-text-primary transition-all duration-200 ease-flore hover:border-flore-primary/40 hover:bg-flore-subtle/50 active:scale-[0.97] cursor-pointer"
                >
                    العودة للرئيسية
                </Link>
            </div>
        </div>
    )
}
