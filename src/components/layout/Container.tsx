import type { ReactNode } from 'react'

import { cn } from '../../utils/cn'

export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-12', className)}>
      {children}
    </div>
  )
}
