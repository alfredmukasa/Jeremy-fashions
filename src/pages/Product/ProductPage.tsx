import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlineShoppingBag } from 'react-icons/hi2'

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
      <h1 className="font-serif text-3xl text-neutral-950">Product not found</h1>
      <p className="mt-4 text-sm text-neutral-600">
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
      <h1 className="font-serif text-3xl text-neutral-950">Couldn&rsquo;t load this product</h1>
      <p className="mt-3 text-sm text-neutral-600">{message}</p>
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
    <div className="pb-24">
      <Container className="py-10 md:py-14">
        <div className="h-3 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="space-y-4">
            <div className="aspect-[3/4] animate-pulse rounded bg-neutral-100" />
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded bg-neutral-100" />
              ))}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 w-16 animate-pulse rounded-full bg-neutral-100" />
              ))}
            </div>
            <div className="mt-6 h-12 w-3/4 animate-pulse rounded bg-neutral-100" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
            <div className="mt-6 h-7 w-40 animate-pulse rounded bg-neutral-100" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-11/12 animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-10/12 animate-pulse rounded bg-neutral-100" />
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded bg-neutral-100" />
              <div className="h-12 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        </div>
      </Container>
    </div>
  )
}

function RelatedProductsSkeleton() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="mt-4 h-9 w-64 animate-pulse rounded bg-neutral-100" />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="aspect-[3/4] animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </Container>
    </section>
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

  function addToCart() {
    addLine(product, size, color, qty)
    openCart()
  }

  return (
    <div className="pb-24">
      <Container className="py-10 md:py-14">
        <nav className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">
          <Link to={ROUTES.home} className="hover:text-neutral-900">
            Home
          </Link>
          <span className="mx-2 text-neutral-300">/</span>
          <Link to={ROUTES.shop} className="hover:text-neutral-900">
            Shop
          </Link>
          <span className="mx-2 text-neutral-300">/</span>
          <span className="text-neutral-900">{product.name}</span>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <ProductGallery product={product} />
          <div>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 font-serif text-4xl tracking-tight text-neutral-950 md:text-5xl"
            >
              {product.name}
            </motion.h1>
            <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-neutral-500">
              {product.category?.replace('-', ' ') ?? 'Collection'} · {product.gender ?? 'unisex'}
            </p>
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-2xl font-medium tabular-nums text-neutral-950">{formatPrice(unit)}</span>
              {compare ? (
                <span className="text-sm tabular-nums text-neutral-400 line-through">{formatPrice(compare)}</span>
              ) : null}
            </div>
            <p className="mt-8 text-sm leading-relaxed text-neutral-600 md:text-base">{product.description}</p>

            {attributeEntries.length ? (
              <dl className="mt-8 grid gap-4 border border-neutral-200 bg-neutral-50 p-5 sm:grid-cols-2">
                {attributeEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())}
                    </dt>
                    <dd className="mt-1 text-sm text-neutral-800">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-10 space-y-8">
              {colors.length ? (
                <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.name)}
                      className={cn(
                        'flex items-center gap-2 border border-neutral-300 px-3 py-2 text-xs uppercase tracking-widest',
                        color === c.name && 'border-neutral-900',
                      )}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-neutral-200"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
              ) : null}
              {sizes.length ? (
                <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
                  {sizeLabelForKind(product.productKind)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={cn(
                        'min-w-[48px] border border-neutral-300 px-3 py-2 text-xs tabular-nums',
                        size === s && 'border-neutral-900 bg-neutral-950 text-white',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              ) : null}
              {!hasOptions ? (
                <p className="text-xs text-neutral-500">This piece has no selectable options.</p>
              ) : null}
              <div className="flex max-w-sm items-center gap-4">
                <div className="flex items-center border border-neutral-300">
                  <button type="button" className="px-4 py-3 text-lg" onClick={() => setQty(Math.max(1, qty - 1))}>
                    −
                  </button>
                  <span className="w-10 text-center text-sm tabular-nums">{qty}</span>
                  <button type="button" className="px-4 py-3 text-lg" onClick={() => setQty(qty + 1)}>
                    +
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : 'Currently unavailable — join the waitlist'}
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button
                className={cn('flex-1 sm:max-w-[280px]', product.stock === 0 && 'pointer-events-none opacity-40')}
                onClick={addToCart}
              >
                <HiOutlineShoppingBag className="h-4 w-4" />
                {product.stock === 0 ? 'Sold out' : 'Add to bag'}
              </Button>
              <Button
                variant="outline"
                className="flex-1 sm:max-w-[240px]"
                onClick={() => toggleWish(product.id)}
              >
                <HiOutlineHeart className={cn('h-4 w-4', wishHas && 'fill-neutral-950')} />
                {wishHas ? 'Saved' : 'Wishlist'}
              </Button>
            </div>

            {product.stock === 0 ? (
              <Link
                to={`${ROUTES.waitlist}?product=${product.slug}`}
                className="mt-4 inline-flex text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-700 underline-offset-4 hover:underline"
              >
                Join the waitlist for this piece
              </Link>
            ) : null}
          </div>
        </div>
      </Container>

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
                className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-600 underline-offset-8 hover:underline"
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

  // Reset scroll on slug change so users never land mid-page on navigation.
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
