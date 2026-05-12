import { loadStripe, type Stripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const isStripeConfigured =
  typeof publishableKey === 'string' &&
  publishableKey.length > 0 &&
  !publishableKey.toLowerCase().includes('your_publishable')

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe() {
  if (!isStripeConfigured) {
    return Promise.resolve(null)
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey as string)
  }

  return stripePromise
}
