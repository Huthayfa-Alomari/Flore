import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

// أضفنا export هنا لنستخدم نفس الـ Type في ملف الـ utils والدوال الأخرى
export interface CartItem {
  product: Product
  quantity: number
  customization?: {
    flowers: string[]
    wrap: string
    vase: string
    message?: string
  }
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getCount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.find(i => i.product.id === item.product.id)
        if (existing) {
          set({
            items: get().items.map(i =>
              i.product.id === item.product.id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, item] })
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.product.id !== productId) })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set({
          items: get().items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        })
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce((sum, item) => {
          return sum + item.product.price * item.quantity
        }, 0)
      },
      getCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },
    }),
    {
      name: 'flore-cart',
    }
  )
)