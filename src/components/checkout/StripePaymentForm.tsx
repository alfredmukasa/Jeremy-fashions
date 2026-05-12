import { useState, type FormEvent } from 'react'
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

import { Button } from '../common/Button'

type StripePaymentFormProps = {
  returnUrl: string
  onSuccess: (paymentIntentId: string) => void
  onError: (message: string) => void
  submitLabel?: string
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
      setIsSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'processing') {
      onSuccess(paymentIntent.id)
      setIsSubmitting(false)
      return
    }

    onError('Payment was not completed. Check your card details and try again.')
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border border-neutral-200 bg-white p-4 sm:p-5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      <Button type="submit" className="w-full" disabled={!stripe || !elements || isSubmitting}>
        {isSubmitting ? 'Processing payment…' : submitLabel}
      </Button>
    </form>
  )
}
