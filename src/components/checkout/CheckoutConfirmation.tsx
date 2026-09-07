import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { PaymentStatusBadge } from '../account/dashboard/PaymentStatusBadge'
import { StatusBadge } from '../account/dashboard/StatusBadge'
import { getOrderConfirmation } from '../../lib/paymentApi'
import { formatOrderNumber } from '../../lib/orderNumber'
import { normalizePaymentStatus, paymentStatusLabel } from '../../lib/paymentStatus'
import { formatPrice } from '../../utils/formatPrice'

import { Button } from '../common/Button'
import { Container } from '../layout/Container'

type CheckoutConfirmationProps = {
  orderId: string
  email: string
  isSignedIn: boolean
  accessToken?: string
}

export function CheckoutConfirmation({ orderId, email, isSignedIn, accessToken }: CheckoutConfirmationProps) {
  const startedAt = useQuery({
    queryKey: ['checkout', 'confirm-started', orderId],
    queryFn: () => Date.now(),
    staleTime: Infinity,
  })

  const confirmationQuery = useQuery({
    queryKey: ['checkout', 'order-confirmation', orderId, email, isSignedIn],
    queryFn: () => getOrderConfirmation(orderId, email, accessToken),
    refetchInterval: (query) => {
      const status = query.state.data?.paymentStatus
      if (!status || status === 'paid' || status === 'failed' || status === 'refunded') return false
      return 2000
    },
  })

  const order = confirmationQuery.data
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus ?? 'processing')
  const waitingTooLong = Boolean(startedAt.data && Date.now() - startedAt.data > 120_000 && paymentStatus === 'processing')

  const headline =
    paymentStatus === 'paid'
      ? 'Thank you for your order.'
      : paymentStatus === 'failed'
        ? 'Payment could not be completed.'
        : paymentStatus === 'refunded'
          ? 'This order has been refunded.'
          : 'We are confirming your payment.'

  const body =
    paymentStatus === 'paid'
      ? `Payment is confirmed. A receipt will be sent to ${order?.email ?? email}.`
      : paymentStatus === 'failed'
        ? 'Your card was not charged for this attempt. You can return to checkout and try again.'
        : waitingTooLong
          ? 'Stripe is still confirming this payment. If you were charged, your receipt will arrive by email. You do not need to pay again.'
          : `${paymentStatusLabel(paymentStatus)}. This page updates automatically after Stripe confirms the payment. Do not close this tab if you just completed 3-D Secure.`

  return (
    <Container className="py-12 sm:py-16 md:py-24">
      <div className="mx-auto max-w-3xl border border-neutral-200 bg-neutral-50 p-6 text-left sm:p-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Order confirmation</p>
        <h1 className="mt-4 font-serif text-3xl text-neutral-950 sm:text-4xl">{headline}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={paymentStatus} />
          {order?.status ? <StatusBadge status={order.status} /> : null}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600">{body}</p>

        <dl className="mt-8 grid gap-4 border-t border-neutral-200 pt-8 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Order number</dt>
            <dd className="mt-1 font-medium text-neutral-950">
              {order ? formatOrderNumber({ id: order.orderId, orderNumber: order.orderNumber }) : orderId.slice(0, 8).toUpperCase()}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Email</dt>
            <dd className="mt-1 text-neutral-900">{order?.email ?? email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Date</dt>
            <dd className="mt-1 text-neutral-900">
              {order?.paidAt || order?.createdAt
                ? new Date(order.paidAt ?? order.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Amount</dt>
            <dd className="mt-1 tabular-nums text-neutral-900">
              {order ? formatPrice(order.totalAmount, order.currency) : 'Confirming…'}
            </dd>
          </div>
        </dl>

        {order?.items.length ? (
          <div className="mt-8 border-t border-neutral-200 pt-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Items</p>
            <ul className="mt-4 space-y-3">
              {order.items.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                  <span className="min-w-0 text-neutral-900">
                    {item.title}
                    <span className="block text-xs text-neutral-500">Qty {item.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-neutral-900">
                    {formatPrice(item.unitPrice * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(order.subtotalAmount, order.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {order.shippingAmount === 0 ? 'Complimentary' : formatPrice(order.shippingAmount, order.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="tabular-nums">{formatPrice(order.taxAmount, order.currency)}</span>
              </div>
              {order.refundAmount > 0 ? (
                <div className="flex justify-between text-violet-800">
                  <span>Refunded</span>
                  <span className="tabular-nums">{formatPrice(order.refundAmount, order.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-2 text-base font-semibold text-neutral-950">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(order.totalAmount, order.currency)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {order?.shippingAddress ? (
          <div className="mt-8 border-t border-neutral-200 pt-8">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Shipping</p>
            <p className="mt-3 text-sm leading-relaxed text-neutral-800">
              {[
                order.shippingAddress.fullName,
                order.shippingAddress.line1,
                order.shippingAddress.line2,
                `${order.shippingAddress.city}, ${order.shippingAddress.region} ${order.shippingAddress.postalCode}`,
                order.shippingAddress.country,
              ]
                .filter(Boolean)
                .join('\n')
                .split('\n')
                .map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
            </p>
          </div>
        ) : null}

        <p className="mt-8 text-xs leading-relaxed text-neutral-500">
          Returns follow the{' '}
          <Link to={ROUTES.refundPolicy} className="underline underline-offset-2 hover:text-neutral-800">
            refund policy
          </Link>
          . Privacy details are in our{' '}
          <Link to={ROUTES.privacy} className="underline underline-offset-2 hover:text-neutral-800">
            privacy policy
          </Link>
          .
        </p>

        <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          {isSignedIn ? (
            <Link to={`${ROUTES.account}#orders`}>
              <Button className="w-full sm:w-auto">View order</Button>
            </Link>
          ) : (
            <Link to={`${ROUTES.register}?email=${encodeURIComponent(order?.email ?? email)}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                Create an account to track this order
              </Button>
            </Link>
          )}
          <Link to={ROUTES.shop}>
            <Button variant={isSignedIn ? 'outline' : 'primary'} className="w-full sm:w-auto">
              Continue shopping
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  )
}
