import { Link } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { useProducts } from '../../hooks/useCatalog'
import { useWishlistStore } from '../../store/wishlistStore'

import { Container } from '../../components/layout/Container'
import { ProductGrid } from '../../components/product/ProductGrid'

export default function SavedListPage() {
  const ids = useWishlistStore((s) => s.ids)
  const { data: products, loading, error } = useProducts()
  const saved = (products ?? []).filter((p) => ids.includes(p.id))

  return (
    <div className="pb-24">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-14 md:py-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-neutral-500">Saved</p>
          <h1 className="mt-3 font-serif text-4xl text-neutral-950 md:text-5xl">Your list</h1>
          <p className="mt-3 max-w-xl text-sm text-neutral-600">Pieces you have saved while signed in.</p>
        </Container>
      </div>
      <Container className="py-12 md:py-16">
        {loading && !products ? (
          <p className="text-sm text-neutral-600">Loading collection…</p>
        ) : error ? (
          <p className="text-sm text-neutral-600">Could not load products.</p>
        ) : saved.length ? (
          <ProductGrid products={saved} className="mt-4" />
        ) : (
          <div className="border border-neutral-200 bg-white p-10 text-center">
            <p className="text-sm text-neutral-600">Nothing saved yet.</p>
            <Link
              to={ROUTES.shop}
              className="mt-6 inline-block text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-950 underline-offset-4 hover:underline"
            >
              Explore shop
            </Link>
          </div>
        )}
      </Container>
    </div>
  )
}
