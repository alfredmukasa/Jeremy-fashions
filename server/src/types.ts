export type CheckoutAddress = {
  fullName: string
  line1: string
  line2?: string
  city: string
  region: string
  postalCode: string
  country: string
}

export type CheckoutLineItem = {
  productId: string
  title: string
  quantity: number
  unitPrice: number
  size: string
  colorName: string
  sku?: string
}

export type CreatePaymentIntentBody = {
  idempotencyKey: string
  email: string
  currency?: string
  items: CheckoutLineItem[]
  shippingAddress: CheckoutAddress
  billingAddress: CheckoutAddress
  billingSameAsShipping: boolean
}

export type AuthenticatedUser = {
  id: string
  email: string
}
