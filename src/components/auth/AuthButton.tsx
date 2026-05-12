import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '../../utils/cn'

type Variant = 'primary' | 'outline' | 'ghost'

const styles: Record<Variant, string> = {
  primary: 'bg-white text-neutral-950 hover:bg-neutral-200 border border-transparent',
  outline: 'border border-white/30 bg-transparent text-white hover:border-white/60 hover:bg-white/5',
  ghost: 'text-neutral-300 hover:bg-white/5 hover:text-white',
}

export const AuthButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }
>(function AuthButton({ className, variant = 'primary', type = 'button', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'w-full px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.22em] transition duration-300',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
