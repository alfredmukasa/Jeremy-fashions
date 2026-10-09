import { Link } from 'react-router-dom'
import { HiOutlineArrowUturnLeft, HiOutlineTruck } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import { policyExcerpt, useCheckoutPolicies } from '../../lib/checkoutPolicies'

type CheckoutPolicyKind = 'shipping' | 'returns'

export function CheckoutPolicyNote({
  kind,
  variant = 'full',
}: {
  kind: CheckoutPolicyKind
  variant?: 'full' | 'note'
}) {
  const { shippingBody, returnsBody } = useCheckoutPolicies()
  const isShipping = kind === 'shipping'
  const body = isShipping ? shippingBody : returnsBody
  const text = variant === 'note' ? policyExcerpt(body) : body

  return (
    <div>
      <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{text}</p>
      <Link
        to={isShipping ? ROUTES.shipping : ROUTES.refundPolicy}
        className="mt-2 inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 hover:underline"
      >
        {isShipping ? 'Shipping details' : 'Return policy'}
      </Link>
    </div>
  )
}

/** Quiet shipping and returns notes for the bag summary. */
export function CheckoutAssuranceNotes() {
  const { shippingBody, returnsBody } = useCheckoutPolicies()

  return (
    <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6">
      <div className="flex gap-3">
        <HiOutlineTruck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">Shipping</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{policyExcerpt(shippingBody)}</p>
          <p className="mt-1 text-xs text-neutral-500">Calculated at checkout.</p>
          <Link
            to={ROUTES.shipping}
            className="mt-1 inline-block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600 underline-offset-4 hover:underline"
          >
            Shipping details
          </Link>
        </div>
      </div>
      <div className="flex gap-3">
        <HiOutlineArrowUturnLeft className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">Returns</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{policyExcerpt(returnsBody)}</p>
          <Link
            to={ROUTES.refundPolicy}
            className="mt-1 inline-block text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-600 underline-offset-4 hover:underline"
          >
            Return policy
          </Link>
        </div>
      </div>
    </div>
  )
}
