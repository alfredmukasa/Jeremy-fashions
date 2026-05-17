import { BrandLoader } from '../common/BrandLoader'
import { cn } from '../../utils/cn'

export function AuthLoader({ className }: { className?: string }) {
  return (
    <BrandLoader
      className={cn('min-h-[50vh] bg-[var(--surface-base)] px-6', className)}
      variant="dark"
      label="Verifying session"
    />
  )
}
