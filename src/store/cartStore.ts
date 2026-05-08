import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { CartLine } from '../types'
import { products } from '../data/products'

function lineKey(productId: string, size: string, colorName: string) {
  return `${productId}::${size}::${colorName}`
}

function getUnitPrice(productId: string) {
  const p = products.find((x) => x.id === productId)
  if (!p) return 0
  return p.salePrice ?? p.price
}

type CartState = {
  lines: CartLine[]
  addLine: (productId: string, size: string, colorName: string, quantity?: number) => void
  updateQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clear: () => void
  subtotal: () => number
  count: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addLine: (productId, size, colorName, quantity = 1) => {
        const key = lineKey(productId, size, colorName)
        const lines = get().lines
        const existing = lines.find((l) => l.key === key)
        if (existing) {
          set({
            lines: lines.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + quantity } : l,
            ),
          })
        } else {
          set({
            lines: [...lines, { key, productId, size, colorName, quantity }],
          })
        }
      },
      updateQuantity: (key, quantity) => {
        if (quantity < 1) {
          get().removeLine(key)
          return
        }
        set({
          lines: get().lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        })
      },
      removeLine: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [] }),
      subtotal: () =>
        get().lines.reduce((sum, line) => sum + getUnitPrice(line.productId) * line.quantity, 0),
      count: () => get().lines.reduce((n, line) => n + line.quantity, 0),
    }),
    {
      name: 'noir-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
    },
  ),
)
