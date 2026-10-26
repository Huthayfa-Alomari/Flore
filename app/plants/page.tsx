import Link from 'next/link'
import { Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductCard } from '@/components/catalog/ProductCard'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function PlantsPage() {
    const supabase = createClient()

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'plants')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })

    const items = (products || []) as Product[]

    return (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="mb-12 text-center animate-fade-up">
                <p className="flore-eyebrow mb-3">PLANTS</p>
                <h1 className="font-amiri text-3xl font-bold text-flore-text-primary md:text-4xl">
                    النباتات
                </h1>
                <p className="mt-3 text-sm text-flore-text-secondary">
                    نباتات طبيعية تضفي حياة وانتعاشاً لمساحتك
                </p>
            </div>

            {items.length === 0 ? (
                <div className="mx-auto max-w-sm py-16 text-center animate-fade-up">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-flore-subtle">
                        <Leaf className="h-9 w-9 text-flore-primary" />
                    </div>
                    <h2 className="font-amiri text-2xl font-bold text-flore-text-primary mb-2">
                        لا توجد نباتات متاحة حالياً
                    </h2>
                    <p className="mb-8 text-sm leading-relaxed text-flore-text-secondary">
                        نحدّث مجموعتنا باستمرار — تصفح باقاتنا الفاخرة في انتظار الجديد
                    </p>
                    <Link
                        href="/catalog"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-flore-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 ease-flore hover:bg-flore-primary-dark hover:shadow-luxury-soft active:scale-[0.97] cursor-pointer"
                    >
                        تصفح المجموعة
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    )
}
