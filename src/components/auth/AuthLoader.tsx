import { cn } from '../../utils/cn'

export function AuthLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-neutral-600',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Verifying session</p>
    </div>
  )
}
