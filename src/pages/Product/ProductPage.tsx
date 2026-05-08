import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineHeart, HiOutlineShoppingBag } from 'react-icons/hi2'

import type { Product } from '../../types'
import { ROUTES } from '../../constants'
import { getProductBySlug, getRelatedProducts } from '../../data/products'
import { getReviewsForProduct } from '../../data/reviews'
import { useCartStore } from '../../store/cartStore'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

import { Badge } from '../../components/common/Badge'
import { Button } from '../../components/common/Button'
import { Container } from '../../components/layout/Container'
import { ProductGallery } from '../../components/product/ProductGallery'
import { ProductGrid } from '../../components/product/ProductGrid'
import { ReviewsList } from '../../components/product/ReviewsList'
import { SectionHeading } from '../../components/common/SectionHeading'

function NotFound() {
  return (
    <Container className="py-24 text-center">
      <h1 className="font-serif text-3xl text-neutral-950">Product not found</h1>
      <Link to={ROUTES.shop} className="mt-6 inline-block text-sm uppercase tracking-[0.2em] underline">
        Back to shop
      </Link>
    </Container>
  )
}

type DetailProps = {
  product: Product
}

function ProductDetail({ product }: DetailProps) {
  const navigate = useNavigate()
  const [size, setSize] = useState(product.sizes[0] ?? '')
  const [color, setColor] = useState(product.colors[0]?.name ?? '')
  const [qty, setQty] = useState(1)

  const addLine = useCartStore((s) => s.addLine)
  const openCart = useUiStore((s) => s.openCart)
  const toggleWish = useWishlistStore((s) => s.toggle)
  const wishHas = useWishlistStore((s) => s.has(product.id))

  const reviews = useMemo(() => getReviewsForProduct(product.id), [product.id])
  const related = useMemo(() => getRelatedProducts(product, 4), [product])

  const unit = product.salePrice ?? product.price
  const compare = product.salePrice ? product.price : null

  function addToCart() {
    addLine(product.id, size, color, qty)
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
              {product.tags.map((t) => (
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
              {product.category.replace('-', ' ')} · {product.gender}
            </p>
            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-2xl font-medium tabular-nums text-neutral-950">{formatPrice(unit)}</span>
              {compare ? (
                <span className="text-sm tabular-nums text-neutral-400 line-through">{formatPrice(compare)}</span>
              ) : null}
            </div>
            <p className="mt-8 text-sm leading-relaxed text-neutral-600 md:text-base">{product.description}</p>

            <div className="mt-10 space-y-8">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colors.map((c) => (
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
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Size</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
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
                <p className="text-xs text-neutral-500">{product.stock} in stock — demo inventory</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1 sm:max-w-[280px]" onClick={addToCart}>
                <HiOutlineShoppingBag className="h-4 w-4" />
                Add to bag
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
          </div>
        </div>
      </Container>

      <section className="border-t border-neutral-200 bg-neutral-50 py-16 md:py-24">
        <Container>
          <SectionHeading title="Client reviews" eyebrow="Feedback" />
          {reviews.length ? (
            <div className="mt-12 max-w-3xl">
              <ReviewsList reviews={reviews} />
            </div>
          ) : (
            <p className="mt-10 text-sm text-neutral-600">No reviews yet — be the first in production.</p>
          )}
        </Container>
      </section>

      {related.length ? (
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
  const product = slug ? getProductBySlug(slug) : undefined

  if (!slug || !product) {
    return <NotFound />
  }

  return <ProductDetail key={slug} product={product} />
}
