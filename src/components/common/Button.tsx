import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../../utils/cn'

type Variant = 'primary' | 'outline' | 'ghost' | 'inverse'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
  className?: string
}

const styles: Record<Variant, string> = {
  primary:
    'border border-transparent bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 active:scale-[0.99] disabled:opacity-50',
  outline:
    'border border-[var(--accent)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]',
  ghost:
    'border border-transparent text-[var(--text-primary)] hover:bg-[var(--surface-muted)] active:bg-[var(--surface-muted)]',
  inverse:
    'border border-transparent bg-[var(--accent-contrast)] text-[var(--accent)] hover:opacity-90',
}

export function Button({ variant = 'primary', className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-none px-6 py-3 text-[11px] font-medium uppercase tracking-[0.22em] transition-all duration-300 ease-[var(--motion-ease)]',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
