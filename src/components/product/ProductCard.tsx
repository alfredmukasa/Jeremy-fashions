import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { HiOutlineHeart } from 'react-icons/hi2'

import type { Product } from '../../types'
import { ROUTES } from '../../constants'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistHas } from '../../store/wishlistStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Badge } from '../common/Badge'

type Props = {
  product: Product
  className?: string
}

const overlayEase = [0.22, 1, 0.36, 1] as const

const revealMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.3, ease: overlayEase },
}

function formatCategory(category?: string) {
  return category?.replace(/-/g, ' ') ?? 'Collection'
}

export function ProductCard({ product, className }: Props) {
  const [hover, setHover] = useState(false)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const openCart = useUiStore((s) => s.openCart)
  const openQuickView = useUiStore((s) => s.openQuickView)
  const addLine = useCartStore((s) => s.addLine)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore(selectWishlistHas(product.id))

  const images = product.images ?? []
  const tags = product.tags ?? []
  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const imgA = images[0]
  const imgB = images[1] ?? images[0]
  const hasImage = Boolean(imgA)
  const price = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null
  const soldOut = product.stock === 0
  const categoryLabel = formatCategory(product.category)
  const isNew = tags.includes('new')
  const showHoverChrome = hover && !coarsePointer
  const showImageAlt = showHoverChrome && hasImage && imgB !== imgA

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)')
    const sync = () => setCoarsePointer(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function quickAdd(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    const size = sizes[0] ?? 'One Size'
    const color = colors[0]?.name ?? 'Default'
    addLine(product, size, color, 1)
    openCart()
  }

  function onWishlistClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    toggleWish(product.id)
  }

  function onOpenQuickView() {
    openQuickView(product)
  }

  return (
    <article
      className={cn('group/product relative', className)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="relative" style={{ transform: 'translateZ(0)' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenQuickView}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpenQuickView()
            }
          }}
          className="group/card block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
          aria-label={`Quick view ${product.name}`}
          aria-haspopup="dialog"
        >
          <motion.div
            className={cn(
              'relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-muted)]',
              'shadow-[var(--shadow-soft)] transition-[box-shadow] duration-500',
              'group-hover/product:shadow-[var(--shadow-lift)]',
            )}
          >
            {hasImage ? (
              <>
                <motion.img
                  src={imgA}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-[opacity,transform]"
                  animate={{ opacity: showImageAlt ? 0 : 1, scale: showHoverChrome ? 1.03 : 1 }}
                  transition={{ duration: 0.5, ease: overlayEase }}
                  loading="lazy"
                />
                <motion.img
                  src={imgB}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-[opacity,transform]"
                  animate={{ opacity: showImageAlt ? 1 : 0, scale: showHoverChrome ? 1.03 : 1 }}
                  transition={{ duration: 0.5, ease: overlayEase }}
                  loading="lazy"
                />
              </>
            ) : null}

            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
              animate={{ opacity: showHoverChrome ? 0.55 : 0.2 }}
              transition={{ duration: 0.35, ease: overlayEase }}
            />

            <AnimatePresence>
              {showHoverChrome && isNew ? (
                <motion.span
                  key="new-badge"
                  className="pointer-events-none absolute left-3 top-3 z-20"
                  {...revealMotion}
                >
                  <Badge>New</Badge>
                </motion.span>
              ) : null}
            </AnimatePresence>

            <button
              type="button"
              aria-label={wishHas ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={onWishlistClick}
              className={cn(
                'absolute right-3 top-3 z-20 rounded-full border border-white/20 bg-white/80 p-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)] backdrop-blur-md transition-colors duration-300',
                wishHas ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900',
              )}
            >
              <HiOutlineHeart className={cn('h-3.5 w-3.5', wishHas && 'fill-neutral-900')} />
            </button>

            <AnimatePresence>
              {showHoverChrome ? (
                <motion.div
                  key="quick-add"
                  className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4"
                  {...revealMotion}
                >
                  {soldOut ? (
                    <Link
                      to={`${ROUTES.waitlist}?product=${product.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-4 py-2.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/22"
                    >
                      Join the waiting list
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={quickAdd}
                      className="pointer-events-auto inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-4 py-2.5 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/22"
                    >
                      Quick add
                    </button>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none mt-3 space-y-1 px-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-w-0 font-serif text-[1.02rem] leading-snug tracking-[-0.02em] text-[var(--text-primary)]">
            {product.name}
          </p>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'pointer-events-auto -mr-0.5 shrink-0 rounded-full p-1.5 text-neutral-400 transition-colors duration-300 lg:hidden',
              wishHas && 'text-neutral-900',
            )}
            onClick={onWishlistClick}
          >
            <HiOutlineHeart className={cn('h-4 w-4', wishHas && 'fill-neutral-900')} />
          </button>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium tabular-nums tracking-wide text-[var(--text-primary)]">
            {formatPrice(price)}
          </span>
          {compare ? (
            <span className="text-xs tabular-nums text-neutral-400 line-through">{formatPrice(compare)}</span>
          ) : null}
        </div>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">{categoryLabel}</p>
      </div>
    </article>
  )
}
