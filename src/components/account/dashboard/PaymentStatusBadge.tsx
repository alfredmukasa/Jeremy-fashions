import { cn } from '../../../utils/cn'
import {
  normalizePaymentStatus,
  paymentStatusLabel,
  paymentStatusTone,
} from '../../../lib/paymentStatus'

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const normalized = normalizePaymentStatus(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ring-1 ring-inset',
        paymentStatusTone(normalized),
        className,
      )}
    >
      {paymentStatusLabel(normalized)}
    </span>
  )
}
