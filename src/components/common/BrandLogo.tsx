import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { BRAND } from '../../constants'
import { BRAND_LOGO } from '../../constants/brandAssets'
import { cn } from '../../utils/cn'

export type BrandLogoVariant = 'dark' | 'light'
export type BrandLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASS: Record<BrandLogoSize, string> = {
  xs: 'h-5 max-h-5 max-w-[5rem]',
  sm: 'h-7 max-h-7 max-w-[7.5rem] sm:h-8 sm:max-h-8',
  md: 'h-8 max-h-8 max-w-[8.5rem] sm:h-9 sm:max-h-9',
  lg: 'h-10 max-h-10 max-w-[10rem] sm:h-11 sm:max-h-11',
  xl: 'h-14 max-h-14 max-w-[12rem] sm:h-16 sm:max-h-16',
}

type BrandLogoProps = {
  variant?: BrandLogoVariant
  size?: BrandLogoSize
  /** @deprecated Light footer uses `variant="dark"` without filters. */
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
  const src =
    onFooter || variant === 'dark' ? BRAND_LOGO.dark : BRAND_LOGO.light

  const content: ReactNode = (
    <>
      <img
        src={src}
        alt={BRAND}
        width={36}
        height={36}
        className={cn(
          'brand-logo block h-auto w-auto shrink-0 object-contain object-left transition-[opacity,transform] duration-500 ease-[var(--motion-ease)] group-hover/logo:scale-[1.02]',
          SIZE_CLASS[size],
          imgClassName,
        )}
        decoding="async"
      />
      {showWordmark ? (
        <span
          className={cn(
            'hidden font-serif text-[0.72rem] tracking-[0.22em] sm:inline sm:text-[0.78rem] md:text-[0.82rem]',
            variant === 'light' ? 'text-white' : 'text-[var(--text-primary)]',
          )}
        >
          {BRAND}
        </span>
      ) : null}
    </>
  )

  const shellClass = cn(
    'group/logo inline-flex max-w-[10rem] shrink-0 items-center gap-2.5 overflow-hidden sm:max-w-[11rem] sm:gap-3',
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
