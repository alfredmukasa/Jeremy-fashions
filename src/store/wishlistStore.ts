import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type WishlistState = {
  ids: string[]
  toggle: (productId: string) => void
  has: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        const ids = get().ids
        if (ids.includes(productId)) {
          set({ ids: ids.filter((id) => id !== productId) })
        } else {
          set({ ids: [...ids, productId] })
        }
      },
      has: (productId) => get().ids.includes(productId),
    }),
    {
      name: 'noir-wishlist',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
)
