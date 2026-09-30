import type { SortValue } from '../constants'
import type { Product } from '../types'

/** New Arrivals shows the most recently uploaded active products. */
export const NEW_ARRIVAL_LIMIT = 50

/** Homepage restock grid keeps the newest pieces, not the full catalog. */
export const HOME_NEW_ARRIVAL_LIMIT = 8

function productTime(p: Product): number {
  if (p.createdAt) {
    const t = new Date(p.createdAt).getTime()
    if (Number.isFinite(t)) return t
  }
  return 0
}

export function compareProductsByNewest(a: Product, b: Product): number {
  const diff = productTime(b) - productTime(a)
  if (diff !== 0) return diff
  return b.id.localeCompare(a.id)
}

/** Latest uploaded products first, capped so New Arrivals stays a fresh drop. */
export function latestProducts(list: Product[], limit = NEW_ARRIVAL_LIMIT): Product[] {
  return [...list].sort(compareProductsByNewest).slice(0, Math.max(0, limit))
}

export function sortProducts(list: Product[], sort: SortValue): Product[] {
  const next = [...list]
  switch (sort) {
    case 'price-asc':
      return next.sort((a, b) => effectivePrice(a) - effectivePrice(b))
    case 'price-desc':
      return next.sort((a, b) => effectivePrice(b) - effectivePrice(a))
    case 'rating':
      return next.sort((a, b) => b.rating - a.rating)
    case 'featured':
      return next.sort((a, b) => {
        const featuredDiff = Number(b.featured) - Number(a.featured)
        if (featuredDiff !== 0) return featuredDiff
        return compareProductsByNewest(a, b)
      })
    case 'newest':
    default:
      return next.sort(compareProductsByNewest)
  }
}

function effectivePrice(p: Product) {
  return p.salePrice ?? p.price
}
