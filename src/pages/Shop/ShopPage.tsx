import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { HiOutlineArrowUturnLeft } from 'react-icons/hi2'

import { ROUTES, SORT_OPTIONS, type SortValue } from '../../constants'
import type { Product } from '../../types'
import { useCategories, useProducts } from '../../hooks/useCatalog'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { productMatchesQuery } from '../../utils/productSearch'
import { isNewArrival, sortProducts } from '../../utils/productSort'

import { Container } from '../../components/layout/Container'
import { FilterSidebar, type FilterState } from '../../components/product/FilterSidebar'
import { ProductGrid } from '../../components/product/ProductGrid'
import { cn } from '../../utils/cn'

function effectivePrice(p: Product) {
  return p.salePrice ?? p.price
}

const defaultFilters: FilterState = {
  categories: [],
  genders: [],
  priceMin: 0,
  priceMax: 1000,
}

const PER_PAGE = 24

function ShopGridSkeleton() {
  return (
    <div className="grid grid-cols-2 product-grid-gap md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[3/4] skeleton-shimmer bg-[var(--surface-muted)]" />
          <div className="mx-auto h-1 w-8 skeleton-shimmer" />
          <div className="h-3 w-full skeleton-shimmer" />
          <div className="h-3 w-1/3 skeleton-shimmer" />
        </div>
      ))}
    </div>
  )
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryParam = searchParams.get('q') ?? ''
  const [queryState, setQueryState] = useState(() => ({ source: queryParam, value: queryParam }))
  const query = queryState.source === queryParam ? queryState.value : queryParam
  const debounced = useDebouncedValue(query, 250)
  const [sort, setSort] = useState<SortValue>('newest')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [page, setPage] = useState(1)

  const { data: products, loading: productsLoading, error: productsError } = useProducts()
  const { data: categories } = useCategories()

  const wishIds = useWishlistStore((s) => s.ids)
  const filtersOpen = useUiStore((s) => s.shopFiltersOpen)
  const setFiltersOpen = useUiStore((s) => s.setShopFiltersOpen)
  const categoryParam = searchParams.get('category')
  const tagFilter = searchParams.get('tag')
  const focusSearch = searchParams.get('focus') === 'search'
  const wishOnly = searchParams.get('wishlist') === '1'

  useEffect(() => {
    if (!focusSearch) return
    searchInputRef.current?.focus()
  }, [focusSearch])
  const activeFilters = useMemo(
    () => ({
      ...filters,
      categories: categoryParam ? [categoryParam] : filters.categories,
    }),
    [categoryParam, filters],
  )

  const filtered = useMemo(() => {
    let list = products ?? []

    if (wishOnly) {
      list = list.filter((p) => wishIds.includes(p.id))
    }

    if (tagFilter === 'new') {
      list = list.filter(isNewArrival)
    }

    const q = debounced.trim()
    if (q) {
      list = list.filter((product) => productMatchesQuery(product, q))
    }

    if (activeFilters.categories.length) {
      list = list.filter((p) => activeFilters.categories.includes(p.category))
    }

    if (activeFilters.genders.length) {
      list = list.filter((p) => activeFilters.genders.includes(p.gender))
    }

    list = list.filter((p) => {
      const pr = effectivePrice(p)
      return pr >= activeFilters.priceMin && pr <= activeFilters.priceMax
    })

    return sortProducts(list, sort)
  }, [activeFilters, debounced, sort, tagFilter, wishIds, wishOnly, products])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  const categoryOptions = useMemo(
    () => (categories ?? []).map((c) => ({ slug: c.slug, name: c.name })),
    [categories],
  )

  const showSkeleton = productsLoading && (!products || products.length === 0)

  const pageTitle =
    tagFilter === 'new' ? 'New arrivals' : wishOnly ? 'Saved pieces' : categoryParam ? categoryParam.replace(/-/g, ' ') : 'Shop all'

  return (
    <div className="pb-8">
      <Container className="pt-8 md:pt-12">
        <h1 className="shop-title-mertra text-center">{pageTitle}</h1>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-primary)] transition hover:opacity-70"
          >
            <HiOutlineArrowUturnLeft className="h-3.5 w-3.5" />
            Back home
          </Link>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="rounded-md bg-[var(--surface-muted)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-primary)] transition hover:opacity-70"
            >
              Filters
            </button>
            <label className="flex items-center gap-2 rounded-md bg-[var(--surface-muted)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Sort
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortValue)
                  setPage(1)
                }}
                className="border-0 bg-transparent py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)] outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {query || debounced || focusSearch ? (
          <div className="mt-6">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQueryState({ source: queryParam, value: e.target.value })
                setPage(1)
                const next = new URLSearchParams(searchParams)
                const v = e.target.value.trim()
                if (v) next.set('q', v)
                else next.delete('q')
                setSearchParams(next, { replace: true })
              }}
              placeholder="Search collection"
              className="w-full max-w-md border border-[var(--border-subtle)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
            />
          </div>
        ) : null}

        <div className="mt-10" aria-busy={showSkeleton}>
          {productsError ? (
            <div className="border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Couldn&rsquo;t load the collection
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{productsError.message}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] underline"
              >
                Retry
              </button>
            </div>
          ) : showSkeleton ? (
            <ShopGridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">No pieces match</p>
              <button
                type="button"
                onClick={() => {
                  setFilters(defaultFilters)
                  setPage(1)
                }}
                className="mt-4 text-[10px] uppercase tracking-[0.24em] underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <ProductGrid products={paged} />

              {totalPages > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-14 flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium uppercase tracking-[0.2em]"
                >
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-[var(--text-muted)] transition enabled:hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    [ Prev ]
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const n = i + 1
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={cn(
                          'min-w-[1.25rem] transition',
                          n === currentPage ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                        )}
                      >
                        {n}
                      </button>
                    )
                  })}
                  {totalPages > 5 ? <span className="text-[var(--text-muted)]">…</span> : null}
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="text-[var(--text-muted)] transition enabled:hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    [ Next ]
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </Container>

      <div
        className={cn(
          'fixed inset-0 z-[60]',
          filtersOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <button
          type="button"
          aria-label="Close filters"
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-sm transition',
            filtersOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setFiltersOpen(false)}
        />
        <div
          className={cn(
            'absolute left-0 top-0 flex h-full w-[min(420px,100%)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            filtersOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em]">Refine</p>
            <button
              type="button"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]"
              onClick={() => setFiltersOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <FilterSidebar
              value={activeFilters}
              onChange={(next) => {
                setFilters(next)
                setPage(1)
              }}
              categoryOptions={categoryOptions}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
