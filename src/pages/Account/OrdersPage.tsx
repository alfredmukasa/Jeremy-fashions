import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { useAuth } from '../../context/AuthContext'
import { listCustomerOrders } from '../../services/orderService'
import { formatPrice } from '../../utils/formatPrice'

import { PaymentStatusBadge } from '../../components/account/dashboard/PaymentStatusBadge'
import { StatusBadge } from '../../components/account/dashboard/StatusBadge'
import { Container } from '../../components/layout/Container'

export default function OrdersPage() {
  const { user } = useAuth()
  const ordersQuery = useQuery({
    queryKey: ['customer', 'orders', user?.id],
    queryFn: listCustomerOrders,
    enabled: Boolean(user?.id),
  })

  return (
    <MotionSafeOrdersPage userId={user?.id} ordersQuery={ordersQuery} />
  )
}

function MotionSafeOrdersPage({
  userId,
  ordersQuery,
}: {
  userId?: string
  ordersQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof listCustomerOrders>>>>
}) {
  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Orders</p>
          <h1 className="mt-3 font-serif text-4xl text-neutral-950 md:text-5xl">Your orders</h1>
          <p className="mt-3 max-w-xl text-sm text-neutral-600">
            Payment status updates automatically from Stripe after checkout.
          </p>
        </Container>
      </div>
      <Container className="py-12 md:py-16">
        {!userId || ordersQuery.isLoading || ordersQuery.isFetching ? (
          <p className="text-sm text-neutral-600">Loading orders…</p>
        ) : ordersQuery.isError ? (
          <MotionSafeOrdersError />
        ) : !ordersQuery.data?.length ? (
          <MotionSafeOrdersEmpty />
        ) : (
          <MotionSafeOrdersTable orders={ordersQuery.data} />
        )}
      </Container>
    </div>
  )
}

function MotionSafeOrdersError() {
  return (
    <div className="border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700">
      Unable to load your orders right now.
    </div>
  )
}

function MotionSafeOrdersEmpty() {
  return (
    <div className="border border-neutral-200 bg-white p-10 text-center">
      <p className="text-sm text-neutral-600">No orders yet.</p>
      <Link
        to={ROUTES.shop}
        className="mt-6 inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 underline-offset-4 hover:underline"
      >
        Continue shopping
      </Link>
    </div>
  )
}

function MotionSafeOrdersTable({
  orders,
}: {
  orders: Awaited<ReturnType<typeof listCustomerOrders>>
}) {
  return (
    <div className="overflow-x-auto border border-neutral-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Reference</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-neutral-100">
              <td className="px-4 py-3 text-neutral-600">
                {new Date(order.createdAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900">{order.id.slice(0, 8).toUpperCase()}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-900">
                {formatPrice(order.totalAmount)} {order.currency}
              </td>
              <td className="px-4 py-3">
                <PaymentStatusBadge status={order.paymentStatus} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
