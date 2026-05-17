import { motion } from 'framer-motion'

import { BRAND } from '../../constants'
import { cn } from '../../utils/cn'

import { BrandLogo } from './BrandLogo'

type BrandLoaderProps = {
  label?: string
  className?: string
  variant?: 'dark' | 'light'
  fullScreen?: boolean
}

export function BrandLoader({
  label = 'Loading',
  className,
  variant = 'light',
  fullScreen = false,
}: BrandLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5 text-center',
        fullScreen && 'min-h-svh bg-neutral-950 px-6',
        !fullScreen && variant === 'dark' && 'text-[var(--text-primary)]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandLogo variant={variant} size="xl" />
      </motion.div>
      <motion.div className="h-px w-12 bg-current opacity-25" aria-hidden />
      <p
        className={cn(
          'text-[10px] font-medium uppercase tracking-[0.38em]',
          variant === 'dark' ? 'text-[var(--text-muted)]' : 'text-white/50',
        )}
      >
        {BRAND}
      </p>
      <p className={cn('text-xs', variant === 'dark' ? 'text-[var(--text-secondary)]' : 'text-white/40')}>
        {label}…
      </p>
    </div>
  )
}
