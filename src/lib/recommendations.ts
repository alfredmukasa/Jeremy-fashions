import type { Product } from '../types'

function sharedTagCount(current: Product, candidate: Product): number {
  const tags = new Set((current.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  let count = 0
  for (const tag of candidate.tags ?? []) {
    if (tags.has(tag.trim().toLowerCase())) count += 1
  }
  return count
}

/** Higher scores are closer matches. Zero means the product is not related. */
export function scoreRecommendedProduct(current: Product, candidate: Product): number {
  if (!candidate.id || candidate.id === current.id) return 0
  let score = 0
  if (current.category && candidate.category === current.category) score += 6
  if (current.productKind && candidate.productKind === current.productKind) score += 3
  score += sharedTagCount(current, candidate) * 2
  if (score > 0 && current.gender && candidate.gender === current.gender) score += 1
  return score
}

export function rankRecommendedProducts(current: Product, catalog: Product[], limit: number): Product[] {
  const cap = Math.max(0, limit)
  if (!current?.id || cap === 0) return []

  return catalog
    .filter((product) => product && product.id !== current.id)
    .map((product) => ({ product, score: scoreRecommendedProduct(current, product) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if ((b.product.rating ?? 0) !== (a.product.rating ?? 0)) return (b.product.rating ?? 0) - (a.product.rating ?? 0)
      return a.product.name.localeCompare(b.product.name)
    })
    .slice(0, cap)
    .map((entry) => entry.product)
}
