import { useState } from 'react'
import { HiOutlineChevronDown } from 'react-icons/hi2'

import type { CustomerOrderDetail } from '../../../services/orderService'
import { cn } from '../../../utils/cn'
import { formatPrice } from '../../../utils/formatPrice'

import { Button } from '../../common/Button'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { StatusBadge } from './StatusBadge'

function formatAddress(order: CustomerOrderDetail): string | null {
  const address = order.shippingAddress
  if (!address) return null
  return [
    address.fullName,
    address.line1,
    address.line2,
    `${address.city}, ${address.region} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')
}

export function OrderCard({ order }: { order: CustomerOrderDetail }) {
  const [expanded, setExpanded] = useState(false)
  const primaryItem = order.items[0]
  const address = formatAddress(order)
  const orderRef = order.id.slice(0, 8).toUpperCase()
  const detailsId = `order-card-details-${order.id}`

  return (
    <article className="rounded-sm border border-neutral-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
            {primaryItem?.imageUrl ? (
              <img src={primaryItem.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Order {orderRef}</p>
            <h3 className="mt-1 truncate font-medium text-neutral-950">
              {primaryItem?.title ?? 'Order items'}
              {order.items.length > 1 ? ` +${order.items.length - 1} more` : ''}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PaymentStatusBadge status={order.paymentStatus} />
              <StatusBadge status={order.status} />
              <span className="text-sm tabular-nums text-neutral-900">
                {formatPrice(order.totalAmount, order.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
          <Button
            variant="outline"
            className="px-4 py-2"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Hide details' : 'View details'}
            <HiOutlineChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
          </Button>
          <Button variant="ghost" className="px-4 py-2" disabled title="Reorder will be available soon">
            Reorder
          </Button>
        </div>
      </div>

      {expanded ? (
        <div id={detailsId} className="border-t border-neutral-100 px-5 py-5 sm:px-6">
          <dl className="grid gap-4 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Payment</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-neutral-900">
                <PaymentStatusBadge status={order.paymentStatus} />
                <span>{order.paymentMethod}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Tracking</dt>
              <dd className="mt-1 capitalize text-neutral-900">{order.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Shipping address</dt>
              <dd className="mt-1 text-neutral-900">{address ?? 'Not available yet'}</dd>
            </div>
          </dl>

          <ul className="mt-6 space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 border border-neutral-100 px-4 py-3">
                <OrderLine item={item} />
                <span className="text-sm tabular-nums text-neutral-900">
                  {formatPrice(item.unitPrice * item.quantity, order.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

function OrderLine({ item }: { item: CustomerOrderDetail['items'][number] }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="h-12 w-10 shrink-0 rounded-sm object-cover" loading="lazy" />
      ) : (
        <div className="h-12 w-10 shrink-0 rounded-sm bg-neutral-100" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-neutral-900">{item.title}</p>
        <p className="text-xs text-neutral-500">Qty {item.quantity}</p>
      </div>
    </div>
  )
}
