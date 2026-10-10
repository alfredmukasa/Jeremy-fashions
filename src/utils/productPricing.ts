export type CatalogPrice = {
  selling: number
  compare: number | null
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Resolve the charged price and optional strikethrough.
 * - compare/sale omitted or equal to price → charge price
 * - compare/sale lower than price → charge the lower amount (sale)
 * - compare/sale higher than price → charge price, show the higher as compare-at
 *
 * This accepts both the historical “compare_price is the sale” catalog rows and
 * the admin “Compare at is higher” convention without overcharging.
 */
export function resolveCatalogPrice(price: number, compareOrSale?: number | null): CatalogPrice {
  const list = roundMoney(Number(price) || 0)
  if (compareOrSale == null || !Number.isFinite(Number(compareOrSale))) {
    return { selling: list, compare: null }
  }
  const other = roundMoney(Number(compareOrSale))
  if (other <= 0 || other === list) return { selling: list, compare: null }
  if (other < list) return { selling: other, compare: list }
  return { selling: list, compare: other }
}

export function getSellingPrice(price: number, salePrice?: number | null): number {
  return resolveCatalogPrice(price, salePrice).selling
}

export function catalogPriceFor(product: { price: number; salePrice?: number | null }): CatalogPrice {
  return resolveCatalogPrice(product.price, product.salePrice)
}

export function sizeStockRemaining(
  stockBySize: Record<string, number> | undefined,
  size: string,
): number | null {
  if (!stockBySize) return null
  const wanted = size.trim().toLowerCase()
  if (!wanted) return null
  const key = Object.keys(stockBySize).find((entry) => entry.trim().toLowerCase() === wanted)
  if (!key) return null
  const remaining = Number(stockBySize[key])
  return Number.isFinite(remaining) ? remaining : null
}
