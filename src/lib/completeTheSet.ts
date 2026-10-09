import { scoreRecommendedProduct } from './recommendations'
import type { CartLine, Product } from '../types'

/**
 * One related piece for the bag. Skips anything already in the cart,
 * the current products, sold-out pieces, and products that are not related.
 */
export function pickCompleteTheSet(catalog: Product[], lines: CartLine[]): Product | null {
  if (!catalog.length || !lines.length) return null

  const inCart = new Set(lines.map((line) => line.productId))
  const anchors = lines
    .map((line) => catalog.find((product) => product.id === line.productId))
    .filter((product): product is Product => Boolean(product))

  if (!anchors.length) return null

  let best: { product: Product; score: number } | null = null

  for (const anchor of anchors) {
    for (const candidate of catalog) {
      if (!candidate?.id || inCart.has(candidate.id) || candidate.stock === 0) continue
      const score = scoreRecommendedProduct(anchor, candidate)
      if (score <= 0) continue
      if (
        !best ||
        score > best.score ||
        (score === best.score && candidate.name.localeCompare(best.product.name) < 0)
      ) {
        best = { product: candidate, score }
      }
    }
  }

  return best?.product ?? null
}
