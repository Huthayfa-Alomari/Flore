import { renderHook, act } from '@testing-library/react'
import { useCart as useCartStore } from '@/lib/store/cart-store'

const mockProduct = {
  id: '1',
  name: 'وردة',
  name_en: null,
  category: 'bouquets' as const,
  price: 45,
  currency: 'JOD',
  image: '',
  images: [],
  description: null,
  description_en: null,
  badge: null,
  badge_color: null,
  in_stock: true,
  model_url: null,
  ar_enabled: false,
  created_at: '',
  updated_at: '',
}

describe('Cart Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCartStore())
    act(() => {
      result.current.clearCart()
    })
  })

  it('adds item to cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ product: mockProduct, quantity: 1 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.id).toBe('1')
    expect(result.current.items[0].quantity).toBe(1)
  })

  it('updates quantity', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ product: mockProduct, quantity: 1 })
      result.current.updateQuantity('1', 3)
    })

    expect(result.current.items[0].quantity).toBe(3)
  })

  it('removes item from cart', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ product: mockProduct, quantity: 1 })
      result.current.removeItem('1')
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('calculates total correctly', () => {
    const { result } = renderHook(() => useCartStore())

    act(() => {
      result.current.addItem({ product: mockProduct, quantity: 2 })
    })

    expect(result.current.getTotal()).toBe(90)
  })
})