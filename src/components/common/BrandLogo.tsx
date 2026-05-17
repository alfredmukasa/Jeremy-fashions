import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BRAND } from '../../constants'
import { BRAND_LOGO } from '../../constants/brandAssets'
import { cn } from '../../utils/cn'

export type BrandLogoVariant = 'dark' | 'light'
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Square mark dimensions for header, footer, loaders, and auth panels. */
const SIZE_CLASS: Record<BrandLogoSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7 sm:h-8 sm:w-8',
  md: 'h-8 w-8 sm:h-9 sm:w-9',
  lg: 'h-10 w-10 sm:h-11 sm:w-11',
  xl: 'h-14 w-14 sm:h-16 sm:w-16',
}

type BrandLogoProps = {
  /** `light` = wordmark on dark surfaces; `dark` = wordmark on light surfaces. Mark is always shown as-is. */
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  /** @deprecated Use `variant="dark"` on light footers. */
  onFooter?: boolean
  showWordmark?: boolean
  className?: string
  linkTo?: string
  onClick?: () => void
  imgClassName?: string
}

export function BrandLogo({
  variant = 'dark',
  size = 'md',
  onFooter = false,
  showWordmark = false,
  className,
  linkTo,
  onClick,
  imgClassName,
}: BrandLogoProps) {
  const onLightSurface = onFooter || variant === 'dark'

  const content: ReactNode = (
    <>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md',
          SIZE_CLASS[size],
          onLightSurface && 'ring-1 ring-black/8',
        )}
      >
        <img
          src={BRAND_LOGO.mark}
          alt={BRAND}
          width={36}
          height={36}
          className={cn(
            'brand-logo h-full w-full object-contain transition-[opacity,transform] duration-500 ease-[var(--motion-ease)] group-hover/logo:scale-[1.03]',
            imgClassName,
          )}
          decoding="async"
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            'hidden font-serif text-[0.72rem] tracking-[0.22em] sm:inline sm:text-[0.78rem] md:text-[0.82rem]',
            onLightSurface ? 'text-[var(--text-primary)]' : 'text-white',
          )}
        >
          {BRAND}
        </span>
      ) : null}
    </>
  )

  const shellClass = cn(
    'group/logo inline-flex shrink-0 items-center gap-2.5 sm:gap-3',
    showWordmark && 'max-w-none',
    linkTo && 'transition-opacity duration-300 hover:opacity-85',
    className,
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className={shellClass} onClick={onClick} aria-label={BRAND}>
        {content}
      </Link>
    )
  }

  return <div className={shellClass}>{content}</div>
}
