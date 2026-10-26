import { Flower2 } from 'lucide-react'

// app/loading.tsx — غلاف تحميل بسيط وآمن (مكوّن خادم)
export default function Loading() {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-4">
            {/* زهرة فلوري النابضة بهدوء */}
            <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-flore-subtle">
                <Flower2 className="h-7 w-7 text-flore-primary" />
            </div>

            {/* خطوط هيكلية ناعمة */}
            <div className="w-full max-w-xs space-y-3">
                <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-flore-subtle" />
                <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-flore-subtle/70" />
            </div>
        </div>
    )
}
