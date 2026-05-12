import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import type { CartLine } from '../../types'
import { formatPrice } from '../../utils/formatPrice'
import type { CheckoutTotals } from '../../utils/checkoutTotals'

import { Button } from '../common/Button'

type CheckoutCartSummaryProps = {
  lines: CartLine[]
  totals: CheckoutTotals
  isSubmitting?: boolean
  submitLabel?: string
  showSubmit?: boolean
}

export function CheckoutCartSummary({
  lines,
  totals,
  isSubmitting = false,
  submitLabel = 'Pay securely',
  showSubmit = true,
}: CheckoutCartSummaryProps) {
  return (
    <aside className="h-fit border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Order summary</p>
      <ul className="mt-6 space-y-4">
        {lines.map((line) => {
          const { snapshot } = line
          const unit = snapshot.unitPrice
          return (
            <li key={line.key} className="flex gap-3 text-sm">
              <div className="h-16 w-14 shrink-0 overflow-hidden bg-white">
                <img src={snapshot.image} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-neutral-950">{snapshot.name}</p>
                <p className="text-xs text-neutral-500">
                  ×{line.quantity} · {line.colorName} · Size {line.size}
                </p>
                <p className="mt-1 text-xs tabular-nums text-neutral-800">{formatPrice(unit * line.quantity)}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPrice(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>Shipping</span>
          <span className="tabular-nums">
            {totals.shipping === 0 ? 'Complimentary' : formatPrice(totals.shipping)}
          </span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>Estimated tax</span>
          <span className="tabular-nums">{formatPrice(totals.tax)}</span>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-6 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatPrice(totals.total)}</span>
      </div>
      {showSubmit ? (
        <Button className="mt-8 w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Processing…' : submitLabel}
        </Button>
      ) : null}
      <Link
        to={ROUTES.cart}
        className="mt-4 block text-center text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-600 underline-offset-8 hover:underline"
      >
        Back to bag
      </Link>
    </aside>
  )
}
