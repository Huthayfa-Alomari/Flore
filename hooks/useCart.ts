'use client'

import { useCart as useCartStore } from '@/lib/store/cart-store'

export function useCart() {
  const store = useCartStore()

  return {
    items: store.items,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    total: store.getTotal(),
    itemCount: store.getCount(),
  }
}
