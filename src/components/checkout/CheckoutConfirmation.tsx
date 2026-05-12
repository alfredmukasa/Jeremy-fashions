import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { PaymentStatusBadge } from '../account/dashboard/PaymentStatusBadge'
import { paymentStatusLabel } from '../../lib/paymentStatus'
import { getCustomerOrderPaymentStatus } from '../../services/orderService'
import { formatPrice } from '../../utils/formatPrice'

import { Button } from '../common/Button'
import { Container } from '../layout/Container'

type CheckoutConfirmationProps = {
  orderId: string
  total: number
  email: string
}

export function CheckoutConfirmation({ orderId, total, email }: CheckoutConfirmationProps) {
  const paymentQuery = useQuery({
    queryKey: ['customer', 'order-payment', orderId],
    queryFn: () => getCustomerOrderPaymentStatus(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.paymentStatus
      if (!status || status === 'paid' || status === 'failed') return false
      return 2000
    },
  })

  const paymentStatus = paymentQuery.data?.paymentStatus ?? 'processing'
  const headline =
    paymentStatus === 'paid'
      ? 'Thank you for your order.'
      : paymentStatus === 'failed'
        ? 'Payment could not be completed.'
        : 'We are confirming your payment.'

  return (
    <Container className="py-24">
      <div className="mx-auto max-w-2xl border border-neutral-200 bg-neutral-50 p-8 text-center sm:p-12">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Checkout complete</p>
        <h1 className="mt-4 font-serif text-4xl text-neutral-950">{headline}</h1>
        <div className="mt-4 flex justify-center">
          <PaymentStatusBadge status={paymentStatus} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-neutral-600">
          {paymentStatus === 'paid'
            ? `A receipt for ${formatPrice(total)} will be sent to ${email}.`
            : paymentStatus === 'failed'
              ? 'Your order was not charged. You can return to checkout and try again.'
              : `${paymentStatusLabel(paymentStatus)}. This page updates automatically once Stripe confirms the payment.`}{' '}
          Your order reference is{' '}
          <span className="font-medium text-neutral-900">{orderId.slice(0, 8).toUpperCase()}</span>.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to={ROUTES.orders}>
            <Button>View orders</Button>
          </Link>
          <Link to={ROUTES.shop}>
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    </Container>
  )
}
