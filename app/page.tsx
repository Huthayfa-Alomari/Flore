import { createClient } from '@/lib/supabase/server'
import HomeContent from '@/components/home/HomeContent'
import type { Product } from '@/types'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'الرئيسية | FLORÉ Luxury',
  description: 'أفخم البوكيهات والتجمعات الزهرية في الأردن — توصيل سريع لعمّان والمدن الرئيسية',
}

async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('in_stock', true)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data as Product[]) || []
}

export default async function HomePage() {
  const products = await getFeaturedProducts()
  return <HomeContent featuredProducts={products} />
}
