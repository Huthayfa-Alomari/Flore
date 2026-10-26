import { Flower2 } from 'lucide-react'

export default function CatalogLoading() {
    return (
        <div className="min-h-screen bg-flore-bg pb-24 font-noto text-right" dir="rtl">
            <div className="mx-auto max-w-7xl px-4 py-12">

                {/* زهرة فلوري النابضة — لمسة انتظار أنيقة */}
                <div className="mb-10 flex justify-center">
                    <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-flore-subtle">
                        <Flower2 className="h-6 w-6 text-flore-primary" />
                    </div>
                </div>

                {/* 1. رأس الصفحة الهيكلي (Catalog Header Skeleton) */}
                <div className="mb-12 flex flex-col items-center space-y-3">
                    <div className="h-10 w-64 animate-pulse rounded-2xl bg-flore-subtle" />
                    <div className="h-4 w-44 animate-pulse rounded-xl bg-flore-subtle/70" />
                </div>

                {/* 2. شريط تصنيفات الأتيليه الهيكلي (Category Tabs Skeleton) */}
                <div className="mb-10 flex justify-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-10 w-28 flex-shrink-0 animate-pulse rounded-full bg-flore-subtle/80"
                        />
                    ))}
                </div>

                {/* 3. شبكة عرض باقات الزهور الفاخرة (Product Grid Skeleton) */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="flex h-[420px] flex-col justify-between rounded-3xl border border-flore-border/40 bg-flore-card p-4 shadow-luxury-soft"
                        >
                            {/* هالة صورة الباقة الفاخرة */}
                            <div className="mb-4 h-64 w-full animate-pulse rounded-2xl bg-flore-subtle" />

                            {/* تفاصيل النصوص الهيكلية */}
                            <div className="flex-1 space-y-2.5 px-1">
                                <div className="h-5 w-3/4 animate-pulse rounded-xl bg-flore-subtle" />
                                <div className="h-4 w-1/2 animate-pulse rounded-xl bg-flore-subtle/70" />
                            </div>

                            {/* شريط السعر وزر الاقتناء السفلي */}
                            <div className="mt-4 flex items-center justify-between border-t border-flore-border/30 pt-4">
                                {/* السعر بالدينار الأردني */}
                                <div className="h-6 w-16 animate-pulse rounded-xl bg-flore-subtle" />
                                {/* زر الإضافة للسلة */}
                                <div className="h-9 w-24 animate-pulse rounded-full bg-flore-subtle/80" />
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}
