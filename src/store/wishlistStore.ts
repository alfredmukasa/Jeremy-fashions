import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type WishlistState = {
  ids: string[]
  toggle: (productId: string) => void
  has: (productId: string) => boolean
}

function normalizeWishlistIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

export function selectWishlistCount(state: Pick<WishlistState, 'ids'>) {
  return state.ids.length
}

export function selectWishlistHas(productId: string) {
  return (state: Pick<WishlistState, 'ids'>) => state.ids.includes(productId)
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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
      migrate: (persistedState) => {
        const state = persistedState as { ids?: unknown }
        return { ids: normalizeWishlistIds(state?.ids) }
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<WishlistState>),
        ids: normalizeWishlistIds((persistedState as { ids?: unknown } | undefined)?.ids),
      }),
    },
  ),
)
