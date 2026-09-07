import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

import { ROUTES } from '../../constants'
import { Button } from '../common/Button'

type StripePaymentFormProps = {
  returnUrl: string
  onSuccess: (paymentIntentId: string) => void
  onError: (message: string) => void
  submitLabel?: string
}

type WalletFlags = {
  applePay?: boolean
  googlePay?: boolean
  link?: boolean
}

export function StripePaymentForm({
  returnUrl,
  onSuccess,
  onError,
  submitLabel = 'Complete payment',
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wallets, setWallets] = useState<WalletFlags | null>(null)

  const walletsAvailable = Boolean(wallets?.applePay || wallets?.googlePay || wallets?.link)

  async function confirmCurrentPayment() {
    if (!stripe || !elements) {
      onError('Stripe is still loading. Please wait a moment and try again.')
      return
    }

    setIsSubmitting(true)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })

    if (result.error) {
      onError(result.error.message ?? 'Your payment could not be completed.')
      setIsSubmitting(false)
      return
    }

    const paymentIntent = result.paymentIntent
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess(paymentIntent.id)
      setIsSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'requires_action') {
      onError('Additional authentication is required. Complete the prompt from your bank and try again.')
      setIsSubmitting(false)
      return
    }

    onError('Payment was not completed. Check your details and try again.')
    setIsSubmitting(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await confirmCurrentPayment()
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      <div className={wallets === null || walletsAvailable ? 'space-y-4' : 'hidden'}>
        <ExpressCheckoutElement
          options={{
            layout: { maxColumns: 2, maxRows: 1 },
            buttonHeight: 48,
            buttonTheme: {
              applePay: 'black',
              googlePay: 'black',
            },
            paymentMethods: {
              applePay: 'auto',
              googlePay: 'auto',
              link: 'auto',
              paypal: 'never',
              amazonPay: 'never',
              klarna: 'never',
            },
            emailRequired: true,
          }}
          onReady={(event) => {
            setWallets(event.availablePaymentMethods ?? null)
          }}
          onConfirm={() => {
            void confirmCurrentPayment()
          }}
          onCancel={() => {
            setIsSubmitting(false)
          }}
          onLoadError={() => {
            setWallets(null)
          }}
        />
        {walletsAvailable ? (
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
            Or pay with card
          </p>
        ) : null}
      </div>

      <div className="min-w-0 overflow-x-auto border border-neutral-200 bg-white p-4 sm:p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
            business: { name: 'KREWNOX' },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>
      <p className="text-xs leading-relaxed text-neutral-500">
        Wallet buttons appear only when Stripe detects them on this device. By completing this purchase, you agree to our{' '}
        <Link to={ROUTES.terms} target="_blank" className="underline underline-offset-2 hover:text-neutral-800">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          to={ROUTES.refundPolicy}
          target="_blank"
          className="underline underline-offset-2 hover:text-neutral-800"
        >
          Refund Policy
        </Link>
        .
      </p>
      <Button type="submit" className="w-full" disabled={!stripe || !elements || isSubmitting}>
        {isSubmitting ? 'Processing payment…' : submitLabel}
      </Button>
    </form>
  )
}
