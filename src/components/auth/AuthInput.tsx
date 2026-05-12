import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../../utils/cn'

export const AuthInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function AuthInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition',
        'placeholder:text-neutral-500 focus:border-white/40 focus:bg-white/[0.07]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    />
  )
})
