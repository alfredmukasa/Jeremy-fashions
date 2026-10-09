export function formatPrice(amount: number, currency = 'CAD') {
  const code = currency.toUpperCase()
  if (code === 'CAD') {
    return `CA$${amount.toFixed(2)}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Mertra-style: `78.00 CAD` */
export function formatPriceMertra(amount: number, currency = 'CAD') {
  const value = amount.toFixed(2)
  return `${value} ${currency}`
}
