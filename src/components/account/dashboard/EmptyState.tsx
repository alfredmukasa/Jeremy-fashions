import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '../../../constants'
import { cn } from '../../../utils/cn'

import { Button } from '../../common/Button'

export function EmptyState({
  title,
  description,
  actionLabel = 'Start shopping',
  actionTo = ROUTES.shop,
  icon,
  className,
}: {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-sm border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10',
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
        >
          {icon}
        </div>
      ) : null}
      <h3 className="font-serif text-2xl text-neutral-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-600">{description}</p>
      <Link to={actionTo} className="mt-6 inline-flex">
        <Button>{actionLabel}</Button>
      </Link>
    </div>
  )
}
