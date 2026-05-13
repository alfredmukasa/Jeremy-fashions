import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HiOutlineChevronDown, HiOutlineHeart, HiOutlineShoppingBag } from 'react-icons/hi2'

import type { Product } from '../../types'
import { ROUTES } from '../../constants'
import { useProduct, useRelatedProducts } from '../../hooks/useCatalog'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore, selectWishlistHas } from '../../store/wishlistStore'
import { sizeLabelForKind } from '../../lib/productCategoryConfig'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { ProductGallery } from '../../components/product/ProductGallery'
import { ProductGrid } from '../../components/product/ProductGrid'
import { SectionHeading } from '../../components/common/SectionHeading'

function NotFound() {
  return (
    <Container className="py-24 text-center">
      <h1 className="display-serif text-3xl text-[var(--text-primary)]">Product not found</h1>
      <p className="mt-4 text-sm text-[var(--text-secondary)]">
        The piece you&rsquo;re looking for is no longer available.
      </p>
      <Link
        to={ROUTES.shop}
        className="mt-6 inline-block text-sm uppercase tracking-[0.2em] underline"
      >
        Back to shop
      </Link>
    </Container>
  )
}

function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Container className="py-24 text-center">
      <h1 className="display-serif text-3xl text-[var(--text-primary)]">Couldn&rsquo;t load this product</h1>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-block text-[11px] uppercase tracking-[0.25em] underline"
      >
        Try again
      </button>
    </Container>
  )
}

function ProductDetailSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-24"
    >
      <Container className="py-10 md:py-14">
        <motion.div className="h-3 w-48 skeleton-shimmer" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div className="space-y-4">
            <div className="aspect-[3/4] skeleton-shimmer" />
            <motion.div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-square skeleton-shimmer" />
              ))}
            </motion.div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-16 skeleton-shimmer" />
              ))}
            </div>
            <div className="mt-6 h-12 w-3/4 skeleton-shimmer" />
            <motion.div className="mt-3 h-4 w-1/2 skeleton-shimmer" />
            <div className="mt-6 h-7 w-40 skeleton-shimmer" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full skeleton-shimmer" />
              <div className="h-4 w-11/12 skeleton-shimmer" />
              <div className="h-4 w-10/12 skeleton-shimmer" />
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="h-12 skeleton-shimmer" />
              <div className="h-12 skeleton-shimmer" />
            </div>
          </div>
        </div>
      </Container>
    </motion.div>
  )
}

function RelatedProductsSkeleton() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="h-3 w-24 skeleton-shimmer" />
        <div className="mt-4 h-9 w-64 skeleton-shimmer" />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[3/4] skeleton-shimmer" />
              <div className="h-3 w-3/4 skeleton-shimmer" />
              <div className="h-3 w-1/3 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

function DetailAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--text-primary)]">
          {title}
        </span>
        <HiOutlineChevronDown
          className={cn('h-4 w-4 text-[var(--text-muted)] transition duration-300', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <motion.div className="pb-5 text-sm leading-relaxed text-[var(--text-secondary)]">{children}</motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

type DetailProps = {
  product: Product
}

function ProductDetail({ product }: DetailProps) {
  const navigate = useNavigate()
  const sizes = product.sizes ?? []
  const colors = product.colors ?? []
  const tags = product.tags ?? []
  const [size, setSize] = useState(sizes[0] ?? '')
  const [color, setColor] = useState(colors[0]?.name ?? '')
  const [qty, setQty] = useState(1)

  const addLine = useCartStore((s) => s.addLine)
  const openCart = useUiStore((s) => s.openCart)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore(selectWishlistHas(product.id))

  const { data: related, loading: relatedLoading } = useRelatedProducts(product, 4)

  const unit = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null
  const hasOptions = sizes.length > 0 || colors.length > 0
  const attributeEntries = Object.entries(product.attributes).filter(([, value]) => value?.trim())
  const soldOut = product.stock === 0

  function addToCart() {
    addLine(product, size, color, qty)
    openCart()
  }

  const purchaseActions = (
  <>
    <Button
      className={cn('flex-1 sm:max-w-[280px]', soldOut && 'pointer-events-none opacity-40')}
      onClick={addToCart}
    >
      <HiOutlineShoppingBag className="h-4 w-4" />
      {soldOut ? 'Sold out' : 'Add to bag'}
    </Button>
    <Button
      variant="outline"
      className="flex-1 sm:max-w-[240px]"
      onClick={() => toggleWish(product.id)}
    >
      <HiOutlineHeart className={cn('h-4 w-4', wishHas && 'fill-[var(--text-primary)]')} />
      {wishHas ? 'Saved' : 'Wishlist'}
    </Button>
  </>
)

  return (
    <div className="pb-28 md:pb-24">
      <Container className="py-10 md:py-14">
        <nav className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          <Link to={ROUTES.home} className="transition hover:text-[var(--text-primary)]">
            Home
          </Link>
          <span className="mx-2 text-[var(--border-strong)]">/</span>
          <Link to={ROUTES.shop} className="transition hover:text-[var(--text-primary)]">
            Shop
          </Link>
          <span className="mx-2 text-[var(--border-strong)]">/</span>
          <span className="text-[var(--text-primary)]">{product.name}</span>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <ProductGallery product={product} />
          <div className="lg:sticky lg:top-[calc(var(--header-offset)+var(--announcement-height)+1.5rem)] lg:self-start">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="display-serif mt-6 text-4xl text-[var(--text-primary)] md:text-5xl"
            >
              {product.name}
            </motion.h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              {product.category?.replace('-', ' ') ?? 'Collection'} · {product.gender ?? 'unisex'}
            </p>
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-2xl font-medium tabular-nums text-[var(--text-primary)]">{formatPrice(unit)}</span>
              {compare ? (
                <span className="text-sm tabular-nums text-[var(--text-muted)] line-through">{formatPrice(compare)}</span>
              ) : null}
            </div>
            <p className="mt-8 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">{product.description}</p>

            {attributeEntries.length ? (
              <dl className="surface-panel mt-8 grid gap-4 p-5 sm:grid-cols-2">
                {attributeEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
                    </dt>
                    <dd className="mt-1 text-sm text-[var(--text-primary)]">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-10 space-y-8">
              {colors.length ? (
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-muted)]">Color</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        className={cn(
                          'flex items-center gap-2 border border-[var(--border-subtle)] px-3 py-2 text-xs uppercase tracking-widest transition',
                          color === c.name && 'border-[var(--accent)]',
                        )}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-[var(--border-subtle)]"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {sizes.length ? (
                <motion.div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-muted)]">
                    {sizeLabelForKind(product.productKind)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={cn(
                          'min-w-[48px] border border-[var(--border-subtle)] px-3 py-2 text-xs tabular-nums transition',
                          size === s && 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}
              {!hasOptions ? (
                <p className="text-xs text-[var(--text-muted)]">This piece has no selectable options.</p>
              ) : null}
              <div className="flex max-w-sm items-center gap-4">
                <div className="inline-flex items-center border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    className="px-4 py-3 text-lg transition hover:bg-[var(--surface-muted)]"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
                  <button
                    type="button"
                    className="px-4 py-3 text-lg transition hover:bg-[var(--surface-muted)]"
                    onClick={() => setQty(qty + 1)}
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : 'Currently unavailable — join the waitlist'}
                </p>
              </div>
            </div>

            <div className="mt-10 hidden flex-col gap-3 sm:flex sm:flex-row">{purchaseActions}</div>

            {soldOut ? (
              <Link
                to={`${ROUTES.waitlist}?product=${product.slug}`}
                className="mt-4 hidden text-[11px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)] underline-offset-4 hover:underline sm:inline-flex"
              >
                Join the waitlist for this piece
              </Link>
            ) : null}

            <div className="mt-12 border-t border-[var(--border-subtle)]">
              <DetailAccordion title="Details" defaultOpen>
                <p>{product.description}</p>
              </DetailAccordion>
              <DetailAccordion title="Shipping">
                Complimentary standard shipping on orders over $250. Express delivery is available at checkout for
                domestic addresses.
              </DetailAccordion>
              <DetailAccordion title="Returns">
                Unworn pieces may be returned within 30 days. Final sale and altered items are excluded.
              </DetailAccordion>
              <DetailAccordion title="Care">
                Follow the garment label. Store folded or on wide hangers to preserve structure and finish.
              </DetailAccordion>
            </div>
          </div>
        </div>
      </Container>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-overlay)] p-4 backdrop-blur-md sm:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">{product.name}</p>
            <p className="text-sm tabular-nums text-[var(--text-secondary)]">{formatPrice(unit)}</p>
          </div>
          <Button className={cn('shrink-0 px-5', soldOut && 'pointer-events-none opacity-40')} onClick={addToCart}>
            {soldOut ? 'Sold out' : 'Add to bag'}
          </Button>
        </div>
      </div>

      {relatedLoading && !related ? (
        <RelatedProductsSkeleton />
      ) : related?.length ? (
        <section className="py-16 md:py-24">
          <Container>
            <SectionHeading title="You may also like" eyebrow="Related" />
            <ProductGrid products={related} className="mt-12" />
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--text-secondary)] underline-offset-8 hover:underline"
              >
                Back
              </button>
            </div>
          </Container>
        </section>
      ) : null}
    </div>
  )
}

export default function ProductPage() {
  const { slug } = useParams()
  const normalizedSlug = slug ? decodeURIComponent(slug) : undefined
  const { data: product, loading, error } = useProduct(normalizedSlug)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [normalizedSlug])

  if (!normalizedSlug) {
    return <NotFound />
  }

  if (loading && !product) {
    return <ProductDetailSkeleton />
  }

  if (error) {
    return (
      <LoadFailed
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!product) {
    return <NotFound />
  }

  return <ProductDetail key={normalizedSlug} product={product} />
}
