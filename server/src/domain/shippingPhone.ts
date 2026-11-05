/** Accept international numbers with common formatting; store as text. */
export function isValidShippingPhone(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  return phone.length <= 40 && /^\+?[0-9 () .-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}
