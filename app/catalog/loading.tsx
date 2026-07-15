export default function CatalogLoading() {
    return (
        <div className="min-h-screen bg-flore-bg pb-24 font-noto text-right" dir="rtl">
            <div className="max-w-7xl mx-auto px-4 py-12">

                {/* 1. رأس الصفحة الهيكلي (Catalog Header Skeleton) */}
                <div className="flex flex-col items-center mb-12 space-y-3">
                    <div className="h-10 w-64 bg-gray-200/70 animate-pulse rounded-2xl" />
                    <div className="h-4 w-44 bg-gray-200/40 animate-pulse rounded-xl" />
                </div>

                {/* 2. شريط تصنيفات الأتيليه الهيكلي (Category Tabs Skeleton) */}
                <div className="flex justify-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-10 w-28 bg-gray-200/50 animate-pulse rounded-full flex-shrink-0"
                        />
                    ))}
                </div>

                {/* 3. شبكة عرض باقات الزهور الفاخرة (Product Grid Skeleton) */}
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="bg-flore-card rounded-3xl p-4 border border-flore-border/40 shadow-luxury flex flex-col justify-between h-[420px]"
                        >
                            {/* هالة صورة الباقة الفاخرة */}
                            <div className="w-full h-64 bg-gray-200/70 animate-pulse rounded-2xl mb-4" />

                            {/* تفاصيل النصوص الهيكلية */}
                            <div className="space-y-2.5 flex-1 px-1">
                                <div className="h-5 w-3/4 bg-gray-200/70 animate-pulse rounded-xl" />
                                <div className="h-4 w-1/2 bg-gray-200/40 animate-pulse rounded-xl" />
                            </div>

                            {/* شريط السعر وزر الاقتناء السفلي */}
                            <div className="flex justify-between items-center pt-4 border-t border-flore-border/20 mt-4">
                                {/* السعر بالدينار الأردني */}
                                <div className="h-6 w-16 bg-gray-200/70 animate-pulse rounded-xl" />
                                {/* زر الإضافة للسلة */}
                                <div className="h-9 w-24 bg-gray-200/60 animate-pulse rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    )
}