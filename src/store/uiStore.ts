import { create } from 'zustand'

import type { Product } from '../types'

type UiState = {
  cartOpen: boolean
  mobileNavOpen: boolean
  shopFiltersOpen: boolean
  quickViewProduct: Product | null
  setCartOpen: (open: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  setShopFiltersOpen: (open: boolean) => void
  openQuickView: (product: Product) => void
  closeQuickView: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  mobileNavOpen: false,
  shopFiltersOpen: false,
  quickViewProduct: null,
  setCartOpen: (open) => set({ cartOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setShopFiltersOpen: (open) => set({ shopFiltersOpen: open }),
  openQuickView: (product) => set({ quickViewProduct: product }),
  closeQuickView: () => set({ quickViewProduct: null }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
}))
