import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { PaymentStatusBadge } from '../../components/account/dashboard/PaymentStatusBadge'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { formatOrderNumber } from '../../lib/orderNumber'
import { normalizePaymentStatus, paymentStatusLabel, readPaymentActivity } from '../../lib/paymentStatus'
import {
  adminListOrders,
  adminUpdateOrderStatus,
  type AdminOrderItem,
  type AdminOrderRow,
} from '../../services/adminService'
import { formatPrice } from '../../utils/formatPrice'

const FULFILLMENT_STATUSES: AdminOrderRow['status'][] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export default function AdminOrdersPage() {
  return (
    <RequireAdminPermission permission="orders.manage">
      <AdminOrdersContent />
    </RequireAdminPermission>
  )
}

function readText(source: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!source) return ''
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function addressLines(source: Record<string, unknown> | null | undefined): string[] {
  if (!source) return []
  const city = readText(source, ['city'])
  const region = readText(source, ['region', 'state', 'province'])
  const postal = readText(source, ['postalCode', 'postal_code'])
  return [
    readText(source, ['fullName', 'full_name', 'name']),
    readText(source, ['line1']),
    readText(source, ['line2']),
    [city, region, postal].filter(Boolean).join(', '),
    readText(source, ['country']),
    readText(source, ['phone']),
  ].filter(Boolean)
}

function money(order: AdminOrderRow, amount: number) {
  return formatPrice(amount, order.currency || 'CAD')
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function itemImageUrl(item: AdminOrderItem): string | null {
  const product = Array.isArray(item.products) ? item.products[0] : item.products
  const primary = nonEmpty(product?.image_url)
  if (primary) return primary
  const gallery = product?.gallery_images
  if (!Array.isArray(gallery)) return null
  for (const entry of gallery) {
    const url = nonEmpty(entry)
    if (url) return url
  }
  return null
}

function variantLabel(item: AdminOrderItem): string | null {
  const parts: string[] = []
  const size = nonEmpty(item.size)
  const color = nonEmpty(item.color_name)
  if (size) parts.push(`Size ${size}`)
  if (color) parts.push(color)
  return parts.length ? parts.join(' · ') : null
}

function quantityLabel(quantity: number): string {
  const count = Number(quantity)
  return Number.isFinite(count) ? `Qty ${count}` : 'Qty —'
}

const ORDER_ROW_GRID =
  'xl:grid-cols-[minmax(0,1.7fr)_minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(7rem,0.75fr)_minmax(6.5rem,0.95fr)_minmax(0,0.9fr)]'

function OrderPreview({ items }: { items: AdminOrderItem[] }) {
  const first = items[0]
  if (!first) {
    return <p className="text-xs text-neutral-500">No items saved</p>
  }

  const extra = items.length - 1
  const variant = variantLabel(first)
  const title = nonEmpty(first.title) ?? 'Item'

  return (
    <div className="flex min-w-0 items-start gap-3">
      <PreviewImage src={itemImageUrl(first)} />
      <div className="min-w-0">
        <p className="break-words font-medium text-neutral-950">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{quantityLabel(first.quantity)}</p>
        {variant ? <p className="break-words text-xs text-neutral-600">{variant}</p> : null}
        {extra > 0 ? <p className="mt-1 text-xs font-medium text-neutral-500">+{extra} more</p> : null}
      </div>
    </div>
  )
}

function PreviewImage({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="flex h-14 w-11 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-100 px-1 text-center text-[8px] uppercase leading-tight tracking-wider text-neutral-400">
        No image
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-14 w-11 shrink-0 border border-neutral-200 bg-neutral-100 object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function FieldLabel({ children }: { children: string }) {
  return <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500 xl:sr-only">{children}</p>
}

function AdminOrdersContent() {
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useState<string | null>(null)
  const ordersQuery = useQuery({ queryKey: ['admin', 'orders'], queryFn: adminListOrders })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminOrderRow['status'] }) => adminUpdateOrderStatus(id, status),
    onSuccess: () => {
      toast.success('Fulfillment status updated')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Fulfillment"
        title="Orders"
        description="Payment status is set by Stripe. Fulfillment is separate — do not treat Paid as Shipped."
      />

      <div className="border border-neutral-200 bg-white">
        <div
          className={`hidden bg-neutral-50 px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500 xl:grid ${ORDER_ROW_GRID}`}
        >
          <div className="py-3">Preview</div>
          <div className="py-3">Order</div>
          <div className="py-3">Customer</div>
          <div className="py-3">Total</div>
          <div className="py-3">Payment</div>
          <div className="py-3">Fulfillment</div>
        </div>
        {(ordersQuery.data ?? []).map((order) => (
          <AdminOrderRowView
            key={order.id}
            order={order}
            open={openId === order.id}
            onToggle={() => setOpenId((current) => (current === order.id ? null : order.id))}
            onStatusChange={(status) => updateMutation.mutate({ id: order.id, status })}
          />
        ))}
        {ordersQuery.isError ? (
          <p className="p-8 text-sm text-neutral-600">
            Orders table is not available yet. Apply the latest Supabase migration to enable fulfillment tracking.
          </p>
        ) : !ordersQuery.data?.length ? (
          <p className="p-8 text-sm text-neutral-600">No orders yet.</p>
        ) : null}
      </div>
    </div>
  )
}

function AdminOrderRowView({
  order,
  open,
  onToggle,
  onStatusChange,
}: {
  order: AdminOrderRow
  open: boolean
  onToggle: () => void
  onStatusChange: (status: AdminOrderRow['status']) => void
}) {
  const activity = readPaymentActivity(order.payment_metadata).slice(-3).reverse()
  const paidAt =
    typeof order.payment_metadata?.paid_at === 'string' ? order.payment_metadata.paid_at : null
  const refundAmount =
    Number(order.refund_amount ?? 0) ||
    (typeof order.payment_metadata?.stripe_amount_refunded === 'number'
      ? order.payment_metadata.stripe_amount_refunded / 100
      : 0)

  const metadata = order.payment_metadata ?? {}
  const subtotal = Number(order.subtotal_amount ?? metadata.subtotal ?? order.total_amount)
  const shipping = Number(order.shipping_amount ?? metadata.shipping ?? 0)
  const tax = Number(order.tax_amount ?? metadata.tax ?? 0)
  const discount = Number(order.discount_amount ?? metadata.discount ?? 0)
  const sessionId =
    order.stripe_checkout_session_id ||
    (typeof metadata.stripe_checkout_session_id === 'string' ? metadata.stripe_checkout_session_id : null)
  const shippingLines = addressLines(order.shipping_address)
  const recipient = shippingLines[0] || order.customer_name || '—'
  const items = Array.isArray(order.order_items) ? order.order_items : []
  const customerName = order.customer_name || recipient

  return (
    <article className="border-t border-neutral-100">
      <div className={`grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2 md:gap-x-6 xl:items-start xl:gap-x-3 ${ORDER_ROW_GRID}`}>
        <div className="min-w-0 md:col-span-2 xl:col-span-1">
          <FieldLabel>Preview</FieldLabel>
          <OrderPreview items={items} />
        </div>
        <div className="min-w-0">
          <FieldLabel>Order</FieldLabel>
          <button type="button" className="break-words text-left font-medium text-neutral-900 underline-offset-4 hover:underline" onClick={onToggle}>
            {formatOrderNumber({ id: order.id, orderNumber: order.order_number })}
          </button>
          <p className="mt-1 text-xs text-neutral-500">
            {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <div className="min-w-0">
          <FieldLabel>Customer</FieldLabel>
          <p className="break-words font-medium text-neutral-900">{customerName}</p>
          <p className="mt-1 break-all text-xs text-neutral-600">{order.email}</p>
        </div>
        <div className="min-w-0">
          <FieldLabel>Total</FieldLabel>
          <p className="whitespace-nowrap tabular-nums text-neutral-950">{money(order, Number(order.total_amount))}</p>
          {discount > 0 ? <p className="mt-1 text-xs text-neutral-500">Discount {money(order, discount)}</p> : null}
          {refundAmount > 0 ? (
            <p className="mt-1 text-xs text-violet-800">Refund {money(order, refundAmount)}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <FieldLabel>Payment</FieldLabel>
          <div className="space-y-2">
            <PaymentStatusBadge status={order.payment_status} className="max-w-full whitespace-normal" />
            <p className="text-xs text-neutral-500">{paymentStatusLabel(normalizePaymentStatus(order.payment_status))}</p>
            {paidAt ? (
              <p className="text-xs text-neutral-500">
                Paid {new Date(paidAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            ) : null}
          </div>
        </div>
        <div className="min-w-0">
          <FieldLabel>Fulfillment</FieldLabel>
          <select
            value={order.status}
            onChange={(e) => onStatusChange(e.target.value as AdminOrderRow['status'])}
            className="w-full min-w-0 max-w-full border border-neutral-300 bg-white px-2 py-1 text-xs capitalize"
          >
            {FULFILLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
            {order.status === 'paid' ? (
              <option value="paid" disabled>
                paid (set by Stripe)
              </option>
            ) : null}
          </select>
        </div>
      </div>
      <div className="px-4 pb-4 text-xs text-neutral-600">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Stripe activity</p>
        {order.stripe_payment_intent_id ? (
          <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">{order.stripe_payment_intent_id}</p>
        ) : (
          <p className="mt-1 text-neutral-500">No Stripe payment intent yet</p>
        )}
        {activity.length ? (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {activity.map((event, index) => (
              <li key={`${event.type}-${event.at ?? index}`} className="break-words">
                <span className="font-medium text-neutral-900">{event.type}</span>
                {event.at ? (
                  <span className="text-neutral-500">
                    {' '}
                    · {new Date(event.at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-neutral-500">Waiting for Stripe webhook activity</p>
        )}
      </div>
      {open ? (
        <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Customer</p>
              <p className="mt-2 break-words text-neutral-950">{customerName}</p>
              <p className="break-all">{order.email}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                {order.user_id ? `Account ${order.user_id}` : 'Guest checkout'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Shipping</p>
              {shippingLines.length ? (
                <div className="mt-2 space-y-0.5">
                  {shippingLines.map((line) => (
                    <p key={line} className="break-words">{line}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-neutral-500">No shipping address was saved on this order.</p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Totals</p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd className="tabular-nums">{money(order, subtotal)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Discount</dt><dd className="tabular-nums">{money(order, discount)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Shipping</dt><dd className="tabular-nums">{money(order, shipping)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Tax</dt><dd className="tabular-nums">{money(order, tax)}</dd></div>
                <div className="flex justify-between gap-4 font-medium text-neutral-950"><dt>Total</dt><dd className="tabular-nums">{money(order, Number(order.total_amount))}</dd></div>
              </dl>
              {sessionId ? <p className="mt-3 break-all font-mono text-[11px] text-neutral-500">{sessionId}</p> : null}
              {metadata.payment_review_required === true ? (
                <p className="mt-2 text-xs text-amber-800">Stripe amount did not match this order. Payment was not marked paid.</p>
              ) : null}
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Items</p>
            {items.length ? (
              <ul className="mt-2 divide-y divide-neutral-200 border border-neutral-200 bg-white">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 break-words">
                      {nonEmpty(item.title) ?? 'Item'}
                      {item.size ? ` · Size ${item.size}` : ''}
                      {item.color_name ? ` · ${item.color_name}` : ''}
                      {item.sku ? ` · ${item.sku}` : ''}
                      <span className="text-neutral-500"> · {quantityLabel(item.quantity)}</span>
                    </span>
                    <span className="tabular-nums">
                      {money(order, Number(item.line_total ?? Number(item.unit_price) * item.quantity))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-neutral-500">No line items were saved on this order.</p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}
