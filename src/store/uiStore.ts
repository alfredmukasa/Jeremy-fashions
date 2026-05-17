import { create } from 'zustand'

type UiState = {
  cartOpen: boolean
  mobileNavOpen: boolean
  shopFiltersOpen: boolean
  setCartOpen: (open: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  setShopFiltersOpen: (open: boolean) => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  mobileNavOpen: false,
  shopFiltersOpen: false,
  setCartOpen: (open) => set({ cartOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setShopFiltersOpen: (open) => set({ shopFiltersOpen: open }),
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
}))
