import type { CustomerOrder } from '../../../services/orderService'
import { formatPrice } from '../../../utils/formatPrice'

/**
 * Shared order totals breakdown (subtotal, discount, shipping, tax, total).
 * Renders nothing when the order carries no stored breakdown (e.g. older orders
 * or the reduced fallback query) so we never show a fabricated "Complimentary".
 */
export function OrderTotals({ order }: { order: CustomerOrder }) {
  const price = (amount: number) => formatPrice(amount, order.currency)
  const { subtotalAmount, shippingAmount, taxAmount, discountAmount } = order

  const hasBreakdown =
    subtotalAmount != null ||
    shippingAmount != null ||
    taxAmount != null ||
    (discountAmount != null && discountAmount > 0)

  if (!hasBreakdown) return null

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">Order total</p>
      <dl className="mt-2 space-y-1 text-sm text-neutral-600">
        {subtotalAmount != null ? (
          <div className="flex justify-between gap-4">
            <dt>Subtotal</dt>
            <dd className="tabular-nums text-neutral-900">{price(subtotalAmount)}</dd>
          </div>
        ) : null}
        {discountAmount != null && discountAmount > 0 ? (
          <div className="flex justify-between gap-4">
            <dt>Discount</dt>
            <dd className="tabular-nums text-neutral-900">−{price(discountAmount)}</dd>
          </div>
        ) : null}
        {shippingAmount != null ? (
          <div className="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd className="tabular-nums text-neutral-900">
              {shippingAmount === 0 ? 'Complimentary' : price(shippingAmount)}
            </dd>
          </div>
        ) : null}
        {taxAmount != null && taxAmount > 0 ? (
          <div className="flex justify-between gap-4">
            <dt>Tax</dt>
            <dd className="tabular-nums text-neutral-900">{price(taxAmount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 border-t border-neutral-200 pt-1 font-medium text-neutral-950">
          <dt>Total</dt>
          <dd className="tabular-nums">{price(order.totalAmount)}</dd>
        </div>
      </dl>
    </div>
  )
}
