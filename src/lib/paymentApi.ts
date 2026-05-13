import type { CheckoutTotals } from '../utils/checkoutTotals'

const API_BASE = (import.meta.env.VITE_PAYMENTS_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

export type CheckoutAddressInput = {
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type CheckoutLineInput = {
  productId: string
  title: string
  quantity: number
  unitPrice: number
  size: string
  colorName: string
  sku?: string
}

export type CreatePaymentIntentPayload = {
  idempotencyKey: string
  email: string
  items: CheckoutLineInput[]
  shippingAddress: CheckoutAddressInput
  billingAddress: CheckoutAddressInput
  billingSameAsShipping: boolean
}

export type CreatePaymentIntentResponse = {
  orderId: string
  clientSecret: string
  paymentIntentId: string
  totals: CheckoutTotals & { currency?: string }
  reused?: boolean
}

export class PaymentApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'PaymentApiError'
    this.status = status
  }
}

export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload,
  accessToken: string,
): Promise<CreatePaymentIntentResponse> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/payments/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new PaymentApiError(
      'Payment service is unreachable. Start the payment API with npm run dev:server or npm run dev:all.',
      503,
    )
  }

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    if (response.status === 404) {
      throw new PaymentApiError(
        'Payment API route was not found. Start the payment API with npm run dev:server or npm run dev:all.',
        503,
      )
    }

    throw new PaymentApiError(
      data.error ??
        (response.status === 503
          ? 'Payment service is unavailable.'
          : 'Unable to start payment. Please try again.'),
      response.status,
    )
  }

  return data as CreatePaymentIntentResponse
}
