import type { ReactNode } from 'react'

import { cn } from '../../utils/cn'

export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border border-neutral-300 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-neutral-600',
        className,
      )}
    >
      {children}
    </span>
  )
}
