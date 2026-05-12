export function getSellingPrice(price: number, salePrice?: number | null): number {
  if (salePrice == null) return roundMoney(price)
  return roundMoney(salePrice)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
