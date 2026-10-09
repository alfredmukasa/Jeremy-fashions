import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import type { CartLine } from '../../types'
import { formatPrice } from '../../utils/formatPrice'
import type { CheckoutTotals } from '../../utils/checkoutTotals'

import { Button } from '../common/Button'

type CheckoutCartSummaryProps = {
  lines: CartLine[]
  totals: CheckoutTotals
  currency?: string
  isSubmitting?: boolean
  submitLabel?: string
  showSubmit?: boolean
  discountCode?: string
  discountMessage?: string | null
  discountError?: string | null
  isApplyingDiscount?: boolean
  onDiscountCodeChange?: (value: string) => void
  onApplyDiscount?: () => void
  onRemoveDiscount?: () => void
  discountInputId?: string
}

export function CheckoutCartSummary({
  lines,
  totals,
  currency = 'CAD',
  isSubmitting = false,
  submitLabel = 'Pay securely',
  showSubmit = true,
  discountCode = '',
  discountMessage = null,
  discountError = null,
  isApplyingDiscount = false,
  onDiscountCodeChange,
  onApplyDiscount,
  onRemoveDiscount,
  discountInputId = 'discount-code',
}: CheckoutCartSummaryProps) {
  const price = (amount: number) => formatPrice(amount, currency)
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
                <p className="mt-1 text-xs tabular-nums text-neutral-800">{price(unit * line.quantity)}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm">
        <div className="flex justify-between text-neutral-600">
          <span>Subtotal</span>
          <span className="tabular-nums">{price(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 ? (
          <div className="flex justify-between text-emerald-800">
            <span>Discount</span>
            <span className="tabular-nums">−{price(totals.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-neutral-600">
          <span>Shipping</span>
          <span className="tabular-nums">
            {totals.shipping === 0 ? 'Complimentary' : price(totals.shipping)}
          </span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>Estimated tax</span>
          <span className="tabular-nums">{price(totals.tax)}</span>
        </div>
      </div>
      {onApplyDiscount ? (
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <label htmlFor={discountInputId} className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
            Discount code
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id={discountInputId}
              value={discountCode}
              onChange={(event) => onDiscountCodeChange?.(event.target.value)}
              className="min-w-0 flex-1 border border-neutral-300 bg-white px-3 py-2 text-sm uppercase"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onApplyDiscount}
              disabled={isApplyingDiscount}
              className="border border-neutral-950 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em]"
            >
              {isApplyingDiscount ? 'Checking' : 'Apply'}
            </button>
          </div>
          {discountMessage ? <p className="mt-2 text-xs text-emerald-800">{discountMessage}</p> : null}
          {discountError ? <p className="mt-2 text-xs text-rose-700">{discountError}</p> : null}
          {onRemoveDiscount && totals.discount > 0 ? (
            <button type="button" onClick={onRemoveDiscount} className="mt-2 text-xs text-neutral-600 underline">
              Remove code
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-6 text-base font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{price(totals.total)}</span>
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
