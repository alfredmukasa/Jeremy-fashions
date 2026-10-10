const API_BASE = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

export type ApiHealth = {
  ok: boolean
  stripeWebhookConfigured: boolean
  guestCheckoutAvailable: boolean
  contactEmailConfigured: boolean
}

export async function fetchApiHealth(): Promise<ApiHealth | null> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    if (!response.ok) return null
    const body = (await response.json()) as Partial<ApiHealth>
    return {
      ok: body.ok === true,
      stripeWebhookConfigured: body.stripeWebhookConfigured === true,
      guestCheckoutAvailable: body.guestCheckoutAvailable === true,
      contactEmailConfigured: body.contactEmailConfigured === true,
    }
  } catch {
    return null
  }
}
