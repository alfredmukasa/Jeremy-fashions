import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { PaymentStatusBadge } from '../../components/account/dashboard/PaymentStatusBadge'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { normalizePaymentStatus, paymentStatusLabel, readPaymentActivity } from '../../lib/paymentStatus'
import { adminListOrders, adminUpdateOrderStatus, type AdminOrderRow } from '../../services/adminService'

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

function AdminOrdersContent() {
  const queryClient = useQueryClient()
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
        description="Stripe updates payment status automatically. Use this view for shipping and fulfillment progress."
      />

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
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
  onStatusChange,
}: {
  order: AdminOrderRow
  onStatusChange: (status: AdminOrderRow['status']) => void
}) {
  const activity = readPaymentActivity(order.payment_metadata).slice(-3).reverse()
  const paidAt =
    typeof order.payment_metadata?.paid_at === 'string' ? order.payment_metadata.paid_at : null

  return (
    <tr className="border-t border-neutral-100 align-top">
      <td className="px-4 py-3 text-neutral-600">
        {new Date(order.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900">{order.email}</td>
      <td className="px-4 py-3">
        ${Number(order.total_amount).toFixed(2)} {order.currency}
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
  )
}
