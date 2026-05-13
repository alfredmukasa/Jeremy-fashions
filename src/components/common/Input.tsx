import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export function FieldLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="eyebrow mb-2 block">
      {children}
    </label>
  )
}

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]',
        className,
      )}
      {...rest}
    />
  )
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[120px] w-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]',
        className,
      )}
      {...rest}
    />
  )
}
