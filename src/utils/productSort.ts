import type { SortValue } from '../constants'
import type { Product } from '../types'

/** Products tagged or created within this window count as "new" on /shop?tag=new */
export const NEW_ARRIVAL_WINDOW_DAYS = 45

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

export function isNewArrival(product: Product, windowDays = NEW_ARRIVAL_WINDOW_DAYS): boolean {
  if (product.tags.includes('new')) return true
  const created = productTime(product)
  if (!created) return false
  const windowMs = windowDays * 24 * 60 * 60 * 1000
  return Date.now() - created <= windowMs
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
