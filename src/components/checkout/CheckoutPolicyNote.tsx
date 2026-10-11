import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineArrowUturnLeft, HiOutlineChevronDown, HiOutlineTruck } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import { useShippingRates } from '../../hooks/useShippingRates'
import { policyExcerpt, useCheckoutPolicies } from '../../lib/checkoutPolicies'
import { DEFAULT_SHIPPING_RATES, shippingRateNote } from '../../lib/shippingRates'
import { cn } from '../../utils/cn'

type CheckoutPolicyKind = 'shipping' | 'returns'

const policyLinkClass =
  'mt-2 inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-600 underline-offset-4 hover:underline'

/** Checkout returns copy, collapsed until the customer opens it. */
export function CheckoutReturnsAccordion({
  body,
  defaultOpen = false,
}: {
  body: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div>
      <h2>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 bg-transparent py-1 text-left"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-900">Returns</span>
          <HiOutlineChevronDown
            aria-hidden
            className={cn('h-4 w-4 shrink-0 text-neutral-500 transition duration-300', open && 'rotate-180')}
          />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            role="region"
            aria-label="Return policy"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{body}</p>
              <Link to={ROUTES.refundPolicy} className={policyLinkClass}>
                Return policy
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function CheckoutPolicyNote({
  kind,
  variant = 'full',
}: {
  kind: CheckoutPolicyKind
  variant?: 'full' | 'note'
}) {
  const { returnsBody } = useCheckoutPolicies()
  const shippingRatesQuery = useShippingRates()
  const isShipping = kind === 'shipping'
  const rateNote = shippingRateNote(shippingRatesQuery.data ?? DEFAULT_SHIPPING_RATES)
  const body = isShipping ? rateNote : returnsBody

  if (!isShipping && variant === 'full') {
    return <CheckoutReturnsAccordion body={body} />
  }

  const text = isShipping ? rateNote : policyExcerpt(body)

  return (
    <div>
      <p className="max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">{text}</p>
      <Link to={isShipping ? ROUTES.shipping : ROUTES.refundPolicy} className={policyLinkClass}>
        {isShipping ? 'Shipping details' : 'Return policy'}
      </Link>
    </div>
  )
}

/** Quiet shipping and returns notes for the bag summary. */
export function CheckoutAssuranceNotes() {
  const { returnsBody } = useCheckoutPolicies()
  const shippingRatesQuery = useShippingRates()
  const rateNote = shippingRateNote(shippingRatesQuery.data ?? DEFAULT_SHIPPING_RATES)

  return (
    <div className="mt-6 space-y-4 border-t border-neutral-200 pt-6">
      <div className="flex gap-3">
        <HiOutlineTruck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-500">Shipping</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{rateNote}</p>
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
