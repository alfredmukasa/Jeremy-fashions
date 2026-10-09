import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { PaymentStatusBadge } from '../../components/account/dashboard/PaymentStatusBadge'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { formatOrderNumber } from '../../lib/orderNumber'
import { normalizePaymentStatus, paymentStatusLabel, readPaymentActivity } from '../../lib/paymentStatus'
import { adminListOrders, adminUpdateOrderStatus, type AdminOrderRow } from '../../services/adminService'
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

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Stripe activity</th>
              <th className="px-4 py-3 font-medium">Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {(ordersQuery.data ?? []).map((order) => (
              <AdminOrderRowView
                key={order.id}
                order={order}
                open={openId === order.id}
                onToggle={() => setOpenId((current) => (current === order.id ? null : order.id))}
                onStatusChange={(status) => updateMutation.mutate({ id: order.id, status })}
              />
            ))}
          </tbody>
        </table>
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
  const items = order.order_items ?? []

  return (
    <>
    <tr className="border-t border-neutral-100 align-top">
      <td className="px-4 py-3 font-medium text-neutral-900">
        <button type="button" className="text-left underline-offset-4 hover:underline" onClick={onToggle}>
          {formatOrderNumber({ id: order.id, orderNumber: order.order_number })}
        </button>
        <p className="mt-1 text-xs font-normal text-neutral-500">{recipient}</p>
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900">{order.email}</td>
      <td className="px-4 py-3">
        <p>{money(order, Number(order.total_amount))}</p>
        {discount > 0 ? <p className="mt-1 text-xs text-neutral-500">Discount {money(order, discount)}</p> : null}
        {refundAmount > 0 ? (
          <p className="mt-1 text-xs text-violet-800">Refund {money(order, refundAmount)}</p>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          <PaymentStatusBadge status={order.payment_status} />
          <p className="text-xs text-neutral-500">{paymentStatusLabel(normalizePaymentStatus(order.payment_status))}</p>
          {order.stripe_payment_intent_id ? (
            <p className="font-mono text-[11px] text-neutral-500">{order.stripe_payment_intent_id}</p>
          ) : (
            <p className="text-xs text-neutral-500">No Stripe payment intent yet</p>
          )}
          {paidAt ? (
            <p className="text-xs text-neutral-500">
              Paid {new Date(paidAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {activity.length ? (
          <ul className="space-y-2 text-xs">
            {activity.map((event, index) => (
              <li key={`${event.type}-${event.at ?? index}`}>
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
          <p className="text-xs text-neutral-500">Waiting for Stripe webhook activity</p>
        )}
      </td>
      <td className="px-4 py-3">
        <select
          value={order.status}
          onChange={(e) => onStatusChange(e.target.value as AdminOrderRow['status'])}
          className="w-full max-w-[180px] border border-neutral-300 bg-white px-2 py-1 text-xs capitalize"
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
      </td>
    </tr>
    {open ? (
      <tr className="border-t border-neutral-100 bg-neutral-50">
        <td colSpan={7} className="px-4 py-4 text-sm text-neutral-700">
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Customer</p>
              <p className="mt-2 text-neutral-950">{order.customer_name || recipient}</p>
              <p>{order.email}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-neutral-500">
                {order.user_id ? `Account ${order.user_id}` : 'Guest checkout'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Shipping</p>
              {shippingLines.length ? (
                <div className="mt-2 space-y-0.5">
                  {shippingLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-neutral-500">No shipping address was saved on this order.</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Totals</p>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-4"><dt>Subtotal</dt><dd>{money(order, subtotal)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Discount</dt><dd>{money(order, discount)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Shipping</dt><dd>{money(order, shipping)}</dd></div>
                <div className="flex justify-between gap-4"><dt>Tax</dt><dd>{money(order, tax)}</dd></div>
                <div className="flex justify-between gap-4 font-medium text-neutral-950"><dt>Total</dt><dd>{money(order, Number(order.total_amount))}</dd></div>
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
                    <span>
                      {item.title}
                      {item.size ? ` · Size ${item.size}` : ''}
                      {item.sku ? ` · ${item.sku}` : ''}
                      <span className="text-neutral-500"> · Qty {item.quantity}</span>
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
        </td>
      </tr>
    ) : null}
    </>
  )
}
