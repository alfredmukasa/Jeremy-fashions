import type { SortValue } from '../constants'
import type { Product } from '../types'
import { getSellingPrice } from './productPricing'

/**
 * `/shop?tag=new` is the latest upload, not a manual tag and not a long calendar window.
 *
 * Include active products whose `created_at` is within this many hours of the newest
 * product, so a drop uploaded together stays together and older catalog items stay on
 * `/shop`. Manual `new` tags are ignored because staff do not maintain them automatically.
 */
export const LATEST_UPLOAD_WINDOW_HOURS = 24

/** Safety cap so a bulk import in one window cannot turn New arrivals into the full catalog. */
export const LATEST_UPLOAD_LIMIT = 12

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

/**
 * Newest-first slice of the latest upload.
 * Products with no `created_at` are omitted. The manual `new` tag is not consulted.
 */
export function latestUploadedProducts(
  products: Product[],
  windowHours = LATEST_UPLOAD_WINDOW_HOURS,
  limit = LATEST_UPLOAD_LIMIT,
): Product[] {
  const ranked = [...products].sort(compareProductsByNewest)
  const newestMs = ranked.reduce((max, product) => Math.max(max, productTime(product)), 0)
  if (!newestMs || limit <= 0) return []

  const windowMs = windowHours * 60 * 60 * 1000
  return ranked
    .filter((product) => {
      const created = productTime(product)
      return created > 0 && newestMs - created <= windowMs
    })
    .slice(0, limit)
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
  return getSellingPrice(p.price, p.salePrice)
}
