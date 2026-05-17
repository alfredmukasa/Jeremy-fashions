export function formatPrice(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Mertra-style: `78.00 CAD` */
export function formatPriceMertra(amount: number, currency = 'CAD') {
  const value = amount.toFixed(2)
  return `${value} ${currency}`
}
