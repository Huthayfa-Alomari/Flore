import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AccessoriesPage() {
    const supabase = createClient()

    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'accessories')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir="rtl">
            <div className="text-center mb-10">
                <h1 className="font-amiri text-4xl font-bold text-flore-text-primary mb-2">
                    الإكسسوارات
                </h1>
                <p className="text-flore-text-secondary">
                    أضف لمسة مميزة لباقتك أو اطلبها لحالها
                </p>
            </div>

            {(!products || products.length === 0) ? (
                <div className="text-center py-20 text-flore-text-secondary">
                    لا توجد إكسسوارات متاحة حالياً
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <Link
                            key={product.id}
                            href={`/product/${product.id}`}
                            className="bg-flore-card rounded-2xl overflow-hidden border border-flore-border shadow-luxury hover:shadow-xl transition-shadow"
                        >
                            <div className="relative aspect-square">
                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                            </div>
                            <div className="p-4">
                                <h3 className="font-noto font-medium mb-1">{product.name}</h3>
                                <p className="text-flore-primary font-bold">{product.price} د.أ</p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}