import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { CartLine, CartLineSnapshot, Product } from '../types'
import { getSellingPrice } from '../utils/productPricing'

function lineKey(productId: string, size: string, colorName: string) {
  return `${productId}::${size}::${colorName}`
}

function snapshotFor(product: Product): CartLineSnapshot {
  return {
    name: product.name,
    slug: product.slug,
    image: product.images[0] ?? '',
    unitPrice: getSellingPrice(product.price, product.salePrice),
    category: product.category,
  }
}

type CartState = {
  lines: CartLine[]
  addLine: (product: Product, size: string, colorName: string, quantity?: number) => void
  updateQuantity: (key: string, quantity: number) => void
  removeLine: (key: string) => void
  clear: () => void
  reconcileCatalogPrices: (products: Product[]) => void
  subtotal: () => number
  count: () => number
}

export function selectCartItemCount(state: Pick<CartState, 'lines'>) {
  return state.lines.reduce((total, line) => total + line.quantity, 0)
}

export function selectCartSubtotal(state: Pick<CartState, 'lines'>) {
  return state.lines.reduce((total, line) => total + line.snapshot.unitPrice * line.quantity, 0)
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addLine: (product, size, colorName, quantity = 1) => {
        const key = lineKey(product.id, size, colorName)
        const lines = get().lines
        const snapshot = snapshotFor(product)
        const existing = lines.find((l) => l.key === key)
        if (existing) {
          set({
            lines: lines.map((l) =>
              l.key === key
                ? { ...l, quantity: l.quantity + quantity, snapshot }
                : l,
            ),
          })
        } else {
          set({
            lines: [
              ...lines,
              {
                key,
                productId: product.id,
                size,
                colorName,
                quantity,
                snapshot,
              },
            ],
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
      reconcileCatalogPrices: (products) => {
        const productMap = new Map(products.map((product) => [product.id, product]))
        set({
          lines: get().lines.map((line) => {
            const product = productMap.get(line.productId)
            if (!product) return line
            return { ...line, snapshot: snapshotFor(product) }
          }),
        })
      },
      subtotal: () =>
        get().lines.reduce((sum, line) => sum + line.snapshot.unitPrice * line.quantity, 0),
      count: () => get().lines.reduce((n, line) => n + line.quantity, 0),
    }),
    {
      name: 'noir-cart',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      // Drop legacy lines from v1 (which lacked snapshots) so the cart never
      // renders into a broken state after this upgrade.
      migrate: (persistedState, version) => {
        if (version < 2) return { lines: [] }
        return persistedState as { lines: CartLine[] }
      },
    },
  ),
)
