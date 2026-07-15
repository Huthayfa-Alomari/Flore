import { render } from '@testing-library/react'
import { ProductCard } from '@/components/catalog/ProductCard'

const mockProduct = {
  id: '1',
  name: 'وردة حمراء',
  name_en: 'Red Rose',
  category: 'bouquets' as const,
  price: 45,
  currency: 'JOD',
  image: 'https://example.com/rose.jpg',
  images: [],
  description: 'بوكيه ورد فاخر',
  description_en: null,
  badge: 'الأكثر مبيعاً',
  badge_color: '#E7D8B9',
  in_stock: true,
  model_url: null,
  ar_enabled: false,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    const { getByText } = render(<ProductCard product={mockProduct} />)

    expect(getByText('وردة حمراء')).toBeDefined()
    expect(getByText('45 د.أ')).toBeDefined()
    expect(getByText('الأكثر مبيعاً')).toBeDefined()
  })

  it('has add to cart button', () => {
    const { getByText } = render(<ProductCard product={mockProduct} />)
    expect(getByText('أضف للسلة')).toBeDefined()
  })
})