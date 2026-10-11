const ORDER_KEY = 'krewnox-checkout-order-id'
const EMAIL_KEY = 'krewnox-checkout-email'

/** Prefer the order id carried on the return URL, then the handoff stored before payment. */
export function checkoutReturnOrderId(input: {
  orderFromUrl?: string | null
  storedOrderId?: string | null
  paymentIntentId?: string | null
}): string | null {
  for (const candidate of [input.orderFromUrl, input.storedOrderId, input.paymentIntentId]) {
    const value = candidate?.trim()
    if (value) return value
  }
  return null
}

export function rememberCheckoutHandoff(orderId: string, email: string) {
  writeKey(ORDER_KEY, orderId)
  writeKey(EMAIL_KEY, email)
}

export function readCheckoutHandoff(): { orderId: string | null; email: string | null } {
  return {
    orderId: readKey(ORDER_KEY),
    email: readKey(EMAIL_KEY),
  }
}

export function clearCheckoutHandoff() {
  for (const key of [ORDER_KEY, EMAIL_KEY]) {
    removeKey(key)
  }
}

function writeKey(key: string, value: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, value)
    window.localStorage.setItem(key, value)
  } catch {
    // Private browsing can reject storage. The return URL still carries the order id.
  }
}

function readKey(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function removeKey(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
