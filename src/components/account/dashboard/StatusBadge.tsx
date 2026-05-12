import { cn } from '../../../utils/cn'
import { normalizeOrderStatus, orderStatusLabel, orderStatusTone } from '../../../lib/orderStatus'

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const normalized = normalizeOrderStatus(status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ring-1 ring-inset',
        orderStatusTone(normalized),
        className,
      )}
    >
      {orderStatusLabel(normalized)}
    </span>
  )
}
