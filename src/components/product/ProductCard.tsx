import type { MouseEvent } from 'react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlinePlus } from 'react-icons/hi2'

import type { Product } from '../../types'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistHas } from '../../store/wishlistStore'
import { formatPriceMertra } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

type Props = {
  product: Product
  className?: string
}

const overlayEase = [0.22, 1, 0.36, 1] as const

export function ProductCard({ product, className }: Props) {
  const [hover, setHover] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const [coarsePointer, setCoarsePointer] = useState(false)
  const openCart = useUiStore((s) => s.openCart)
  const openQuickView = useUiStore((s) => s.openQuickView)
  const addLine = useCartStore((s) => s.addLine)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore(selectWishlistHas(product.id))

  const images = product.images ?? []
  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const imgA = images[imageIndex] ?? images[0]
  const imgB = images[1] ?? images[0]
  const hasImage = Boolean(imgA)
  const price = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null
  const soldOut = product.stock === 0
  const showHoverChrome = hover && !coarsePointer
  const showImageAlt = showHoverChrome && hasImage && images.length > 1 && imageIndex === 0 && imgB !== imgA
  const hasMultipleImages = images.length > 1

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
      <motion.div
        role="button"
        tabIndex={0}
        onClick={onOpenQuickView}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenQuickView()
          }
        }}
        className="block w-full cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
        aria-label={`View ${product.name}`}
        aria-haspopup="dialog"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
          {hasImage ? (
            <>
              <motion.img
                src={imgA}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                animate={{ opacity: showImageAlt ? 0 : 1 }}
                transition={{ duration: 0.4, ease: overlayEase }}
                loading="lazy"
              />
              {images.length > 1 ? (
                <motion.img
                  src={imgB}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  animate={{ opacity: showImageAlt ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: overlayEase }}
                  loading="lazy"
                />
              ) : null}
            </>
          ) : null}

          {soldOut ? (
            <span className="absolute left-2 top-2 z-20 rounded-full bg-neutral-950 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
              Sold out
            </span>
          ) : null}

          <button
            type="button"
            aria-label={wishHas ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={onWishlistClick}
            className={cn(
              'absolute right-2 top-2 z-20 hidden p-1 text-neutral-400 transition-colors hover:text-neutral-900 md:inline-flex',
              wishHas && 'text-neutral-900',
            )}
          >
            <HiOutlineHeart className={cn('h-4 w-4', wishHas && 'fill-neutral-900')} />
          </button>

          {!soldOut ? (
            <button
              type="button"
              aria-label="Quick add"
              onClick={quickAdd}
              className={cn(
                'absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition',
                'opacity-100 md:opacity-0 md:group-hover/product:opacity-100',
              )}
            >
              <HiOutlinePlus className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {hasMultipleImages ? (
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
            {images.slice(0, 6).map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation()
                  setImageIndex(i)
                }}
                className={cn(
                  'h-1 w-1 rounded-full transition-colors',
                  i === imageIndex ? 'bg-neutral-900' : 'bg-neutral-300',
                )}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 h-1" aria-hidden />
        )}

        <div className="mt-2 space-y-0.5">
          <p className="product-title-mertra line-clamp-3">{product.name}</p>
          <p className="product-price-mertra tabular-nums">
            {formatPriceMertra(price)}
            {compare ? (
              <span className="ml-2 text-[var(--text-muted)] line-through">{formatPriceMertra(compare)}</span>
            ) : null}
          </p>
        </div>
      </motion.div>
    </article>
  )
}
