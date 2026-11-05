export const META_PIXEL_ID = '1423982003235704'
const CONSENT_KEY = 'krewnox-advertising-consent'
type Pixel = ((...args: unknown[]) => void) & { queue: unknown[][]; loaded: boolean; version: string; callMethod?: (...args: unknown[]) => void; push?: Pixel }
declare global { interface Window { fbq?: Pixel; _fbq?: Pixel } }
let initialized = false
const sent = new Set<string>()
export function advertisingConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === 'granted' } catch { return false }
}
export function consentChoice(): string | null {
  try { return localStorage.getItem(CONSENT_KEY) } catch { return null }
}
export function setAdvertisingConsent(granted: boolean) {
  try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied') } catch { /* session choice cannot persist */ }
  if (!granted) window.fbq?.('consent', 'revoke')
  window.dispatchEvent(new Event('advertising-consent'))
}
export function trackingAllowed() {
  return typeof window !== 'undefined' && advertisingConsent() &&
    !/^\/(account|admin|auth|login|register|reset-password|forgot-password|staff)(\/|$)/.test(window.location.pathname) &&
    !/[?&](email|token|code|payment_intent|payment_intent_client_secret|access_token)=/i.test(window.location.search)
}
export function trackMeta(event: string, data: Record<string, unknown> = {}, onceKey?: string): boolean {
  if (!trackingAllowed()) return false
  if (onceKey && sent.has(onceKey)) return false
  try {
    if (!initialized) {
      const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue.push(args) } as Pixel
      n.queue = []; n.loaded = true; n.version = '2.0'; n.push = n
      window.fbq = window._fbq = n
      n('set', 'autoConfig', false, META_PIXEL_ID)
      n('consent', 'grant')
      n('init', META_PIXEL_ID)
      const script = document.createElement('script'); script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      document.head.appendChild(script)
      initialized = true
    }
    window.fbq?.('consent', 'grant')
    window.fbq?.('track', event, data, onceKey ? {eventID: onceKey} : {})
    if (onceKey) sent.add(onceKey)
    return true
  } catch { return false }
}
export function trackPurchase(order: {orderId: string; paymentStatus: string; totalAmount: number; currency: string}) {
  if (order.paymentStatus !== 'paid') return
  const key = `meta-purchase-${order.orderId}`
  try { if (localStorage.getItem(key)) return } catch { /* memory deduplication still applies */ }
  if (trackMeta('Purchase', {value: order.totalAmount, currency: order.currency.toUpperCase()}, key)) {
    try { localStorage.setItem(key, 'sent') } catch { /* optional persistence */ }
  }
}
