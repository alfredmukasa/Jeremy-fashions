import type { Product } from '../types'

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase()
}

function productSearchHaystack(product: Product): string {
  return [
    product.name,
    product.description,
    product.category,
    product.slug.replaceAll('-', ' '),
    product.brand,
    product.sku,
    ...product.tags,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
}

export function productMatchesQuery(product: Product, query: string) {
  const q = normalizeSearchQuery(query)
  if (!q) return true
  return productSearchHaystack(product).includes(q)
}

export function filterProductsBySearch(products: Product[], query: string, limit?: number) {
  const q = normalizeSearchQuery(query)
  if (!q) return []

  const matches = products.filter((product) => productMatchesQuery(product, q))
  return limit == null ? matches : matches.slice(0, limit)
}
