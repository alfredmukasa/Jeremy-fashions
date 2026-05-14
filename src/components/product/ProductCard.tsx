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

const footerMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.32, ease: overlayEase },
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
  const showActionState = hover && !coarsePointer
  const showMobileCta = coarsePointer

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
      <motion.div className="relative" initial={false} style={{ transform: 'translateZ(0)' }}>
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
            style={{ transform: 'translateZ(0)' }}
          >
            {hasImage ? (
              <>
                <motion.img
                  src={imgA}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  animate={{ opacity: showActionState ? 0 : 1, scale: showActionState ? 1.04 : 1 }}
                  transition={{ duration: 0.55, ease: overlayEase }}
                  loading="lazy"
                />
                <motion.img
                  src={imgB}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover will-change-transform"
                  animate={{ opacity: showActionState ? 1 : 0, scale: showActionState ? 1.04 : 1 }}
                  transition={{ duration: 0.55, ease: overlayEase }}
                  loading="lazy"
                />
              </>
            ) : null}

            <motion.div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
              animate={{ opacity: showActionState ? 0.72 : 0.42 }}
              transition={{ duration: 0.38, ease: overlayEase }}
            />

            {tags.includes('new') ? (
              <span className="pointer-events-none absolute left-3 top-3 z-20">
                <Badge>New</Badge>
              </span>
            ) : null}

            <motion.div
              className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/78 px-2 py-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)] backdrop-blur-md"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: overlayEase }}
            >
              <span className="max-w-[7.5rem] truncate px-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-700">
                {categoryLabel}
              </span>
              <span className="h-3 w-px shrink-0 bg-neutral-300/80" aria-hidden />
              <button
                type="button"
                aria-label={wishHas ? 'Remove from wishlist' : 'Add to wishlist'}
                onClick={onWishlistClick}
                className={cn(
                  'pointer-events-auto rounded-full p-1.5 transition-colors duration-300',
                  wishHas ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900',
                )}
              >
                <HiOutlineHeart className={cn('h-3.5 w-3.5', wishHas && 'fill-neutral-900')} />
              </button>
            </motion.div>

            <motion.div
              className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-10"
              initial={false}
            >
              <AnimatePresence mode="wait" initial={false}>
                {showActionState ? (
                  <motion.div
                    key="action"
                    className="flex items-end justify-between gap-3"
                    {...footerMotion}
                  >
                    <motion.div
                      className="min-w-0"
                      initial={false}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                        initial={false}
                      >
                        <span className="text-sm font-medium tabular-nums tracking-wide text-white">
                          {formatPrice(price)}
                        </span>
                        {compare ? (
                          <span className="text-xs tabular-nums text-white/55 line-through">
                            {formatPrice(compare)}
                          </span>
                        ) : null}
                      </motion.div>
                    </motion.div>

                    <div className="pointer-events-auto shrink-0">
                      {soldOut ? (
                        <Link
                          to={`${ROUTES.waitlist}?product=${product.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-3.5 py-2 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/22"
                        >
                          Join the waiting list
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={quickAdd}
                          className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-3.5 py-2 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white/22"
                        >
                          Quick add
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    className="space-y-2"
                    {...footerMotion}
                  >
                    <motion.div className="space-y-1.5">
                      <p className="line-clamp-2 font-serif text-[1.05rem] leading-snug tracking-[-0.02em] text-white">
                        {product.name}
                      </p>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
                        <span className="text-sm font-medium tabular-nums tracking-wide text-white">
                          {formatPrice(price)}
                        </span>
                        {compare ? (
                          <span className="text-xs tabular-nums text-white/55 line-through">
                            {formatPrice(compare)}
                          </span>
                        ) : null}
                      </div>
                    </motion.div>

                    {showMobileCta ? (
                      <div className="pointer-events-auto flex justify-end pt-1">
                        {soldOut ? (
                          <Link
                            to={`${ROUTES.waitlist}?product=${product.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-3.5 py-2 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm"
                          >
                            Join the waiting list
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={quickAdd}
                            className="inline-flex items-center justify-center rounded-full border border-white/35 bg-white/12 px-3.5 py-2 text-[9px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm"
                          >
                            Quick add
                          </button>
                        )}
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </article>
  )
}
