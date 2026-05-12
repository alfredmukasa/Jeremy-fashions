import { useState } from 'react'
import { HiOutlineChevronDown } from 'react-icons/hi2'

import { ORDER_STATUSES } from '../../../lib/orderStatus'
import type { CustomerOrderDetail } from '../../../services/orderService'
import { cn } from '../../../utils/cn'
import { formatPrice } from '../../../utils/formatPrice'

import { Button } from '../../common/Button'
import { EmptyState } from './EmptyState'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { StatusBadge } from './StatusBadge'

const PAGE_SIZE = 5

export function OrderHistoryTable({ orders }: { orders: CustomerOrderDetail[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    const haystack = [
      order.id,
      order.items.map((item) => item.title).join(' '),
    ]
      .join(' ')
      .toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase())
    return matchesStatus && matchesQuery
  })

  const visible = filtered.slice(0, visibleCount)
  const canLoadMore = visibleCount < filtered.length

  if (!orders.length) {
    return (
      <EmptyState
        title="No orders yet"
        description="Start shopping to see your orders here."
        actionLabel="Explore the collection"
      />
    )
  }

  return (
    <section id="order-history" className="space-y-6" aria-labelledby="order-history-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Order history</p>
          <h2 id="order-history-heading" className="mt-2 font-serif text-2xl text-neutral-950 md:text-3xl">
            Full order history
          </h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="block">
            <span className="sr-only">Search orders</span>
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
              placeholder="Search by reference or product"
              className="w-full rounded-sm border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-neutral-950 sm:min-w-72"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setVisibleCount(PAGE_SIZE)
              }}
              className="w-full rounded-sm border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-neutral-950 sm:min-w-44"
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length ? (
        <>
          <div className="hidden overflow-hidden rounded-sm border border-neutral-200 bg-white shadow-sm lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => (
                  <OrderHistoryRow key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 lg:hidden">
            {visible.map((order) => (
              <OrderHistoryCard key={order.id} order={order} />
            ))}
          </div>

          {canLoadMore ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Load more orders
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-sm border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="font-serif text-2xl text-neutral-950">No matching orders</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600">
            Try another search term or status filter.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => {
              setQuery('')
              setStatusFilter('all')
              setVisibleCount(PAGE_SIZE)
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </section>
  )
}

function OrderHistoryRow({ order }: { order: CustomerOrderDetail }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `order-row-details-${order.id}`

  return (
    <>
      <tr className="border-t border-neutral-100 transition-colors hover:bg-neutral-50/80">
        <td className="px-4 py-4 font-medium text-neutral-900">{order.id.slice(0, 8).toUpperCase()}</td>
        <td className="px-4 py-4 text-neutral-600">
          {new Date(order.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </td>
        <td className="px-4 py-4 text-neutral-600">{order.items.length}</td>
        <td className="px-4 py-4 tabular-nums text-neutral-900">
          {formatPrice(order.totalAmount, order.currency)}
        </td>
        <td className="px-4 py-4">
          <PaymentStatusBadge status={order.paymentStatus} />
        </td>
        <td className="px-4 py-4">
          <StatusBadge status={order.status} />
        </td>
        <td className="px-4 py-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Hide' : 'Expand'}
            <HiOutlineChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-t border-neutral-100 bg-neutral-50/60">
          <td colSpan={7} className="px-4 py-4">
            <OrderHistoryDetails id={detailsId} order={order} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

function OrderHistoryCard({ order }: { order: CustomerOrderDetail }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `order-card-history-${order.id}`

  return (
    <article className="rounded-sm border border-neutral-200 bg-white p-4 shadow-sm">
      <OrderHistoryCardHeader order={order} />
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Hide details' : 'View details'}
        <HiOutlineChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
      </button>
      {expanded ? (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <OrderHistoryDetails id={detailsId} order={order} />
        </div>
      ) : null}
    </article>
  )
}

function OrderHistoryCardHeader({ order }: { order: CustomerOrderDetail }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          {order.id.slice(0, 8).toUpperCase()}
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          {new Date(order.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <div className="text-right">
        <div className="flex flex-col items-end gap-2">
          <PaymentStatusBadge status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm tabular-nums text-neutral-900">
          {formatPrice(order.totalAmount, order.currency)}
        </p>
      </div>
    </div>
  )
}

function OrderHistoryDetails({ id, order }: { id: string; order: CustomerOrderDetail }) {
  const address = order.shippingAddress
  return (
    <div id={id} className="grid gap-4 text-sm text-neutral-600 lg:grid-cols-2">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Payment</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-neutral-900">
          <PaymentStatusBadge status={order.paymentStatus} />
          <span>{order.paymentMethod}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Tracking status</p>
        <p className="mt-1 capitalize text-neutral-900">{order.status}</p>
      </div>
      <div className="lg:col-span-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Shipping address</p>
        <p className="mt-1 text-neutral-900">
          {address
            ? [address.fullName, address.line1, address.line2, `${address.city}, ${address.region} ${address.postalCode}`, address.country]
                .filter(Boolean)
                .join(', ')
            : 'Not available yet'}
        </p>
      </div>
      <div className="lg:col-span-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Ordered products</p>
        <ul className="mt-2 space-y-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 border border-neutral-100 px-3 py-2">
              <span className="truncate text-neutral-900">{item.title}</span>
              <span className="shrink-0 text-neutral-600">
                {item.quantity} × {formatPrice(item.unitPrice, order.currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
