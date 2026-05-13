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
        'inline-flex items-center rounded-none border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
