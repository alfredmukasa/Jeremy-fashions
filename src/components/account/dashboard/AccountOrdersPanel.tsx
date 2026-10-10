import type { CustomerOrderDetail } from '../../../services/orderService'

import { OrderCard } from './OrderCard'
import { OrderHistoryTable } from './OrderHistoryTable'

export function AccountOrdersPanel({
  awaitingPayment,
  purchaseHistory,
  isLoading,
  isError,
}: {
  awaitingPayment: CustomerOrderDetail[]
  purchaseHistory: CustomerOrderDetail[]
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return <p className="text-sm text-neutral-600">Loading your orders…</p>
  }

  if (isError) {
    return (
      <div className="rounded-sm border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Unable to load your orders right now.
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <OrderHistoryTable orders={purchaseHistory} />
      <section aria-labelledby="awaiting-payment-heading" className="space-y-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Still to pay</p>
          <h2 id="awaiting-payment-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
            Awaiting payment
          </h2>
          <p className="mt-2 max-w-xl text-sm text-neutral-600">
            These orders are not paid yet. Finish payment so they can be prepared.
          </p>
        </div>
        {awaitingPayment.length ? (
          <div className="space-y-4">
            {awaitingPayment.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <p className="border border-neutral-200 bg-white px-6 py-8 text-sm text-neutral-600">
            You have no orders waiting for payment.
          </p>
        )}
      </section>
    </div>
  )
}
