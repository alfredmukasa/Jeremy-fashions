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
    'bg-neutral-950 text-white hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-50',
  outline:
    'border border-neutral-900 text-neutral-950 bg-transparent hover:bg-neutral-950 hover:text-white',
  ghost: 'text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200',
  inverse: 'bg-white text-neutral-950 hover:bg-neutral-200',
}

export function Button({ variant = 'primary', className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-none px-6 py-3 text-[11px] font-medium uppercase tracking-[0.2em] transition-all duration-300',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
