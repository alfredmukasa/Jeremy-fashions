import { useLayoutEffect, useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SORT_OPTIONS, type SortValue } from '../../constants'
import { categories, products } from '../../data/products'
import type { Product } from '../../types'
import { useUiStore } from '../../store/uiStore'
import { useWishlistStore } from '../../store/wishlistStore'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'

import { Container } from '../../components/layout/Container'
import { SectionHeading } from '../../components/common/SectionHeading'
import { FilterSidebar, type FilterState } from '../../components/product/FilterSidebar'
import { ProductGrid } from '../../components/product/ProductGrid'
import { Input } from '../../components/common/Input'
import { cn } from '../../utils/cn'

function effectivePrice(p: Product) {
  return p.salePrice ?? p.price
}

function sortProducts(list: Product[], sort: SortValue) {
  const next = [...list]
  switch (sort) {
    case 'price-asc':
      return next.sort((a, b) => effectivePrice(a) - effectivePrice(b))
    case 'price-desc':
      return next.sort((a, b) => effectivePrice(b) - effectivePrice(a))
    case 'rating':
      return next.sort((a, b) => b.rating - a.rating)
    case 'newest':
      return next.sort((a, b) => b.id.localeCompare(a.id))
    default:
      return next
  }
}

const defaultFilters: FilterState = {
  categories: [],
  genders: [],
  priceMin: 0,
  priceMax: 900,
}

export default function ShopPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const debounced = useDebouncedValue(query, 250)
  const [sort, setSort] = useState<SortValue>('featured')
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const wishIds = useWishlistStore((s) => s.ids)
  const filtersOpen = useUiStore((s) => s.shopFiltersOpen)
  const setFiltersOpen = useUiStore((s) => s.setShopFiltersOpen)

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    const t = window.setTimeout(() => setQuery(q), 0)
    return () => clearTimeout(t)
  }, [searchParams])

  useLayoutEffect(() => {
    const cat = searchParams.get('category')
    const id = requestAnimationFrame(() => {
      setFilters((prev) => ({
        ...prev,
        categories: cat ? [cat] : [],
      }))
    })
    return () => cancelAnimationFrame(id)
  }, [searchParams])

  const tagFilter = searchParams.get('tag')
  const wishOnly = searchParams.get('wishlist') === '1'

  const filtered = useMemo(() => {
    let list = products

    if (wishOnly) {
      list = list.filter((p) => wishIds.includes(p.id))
    }

    if (tagFilter === 'new') {
      list = list.filter((p) => p.tags.includes('new'))
    }

    const q = debounced.trim().toLowerCase()
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.description,
          p.category,
          p.slug.replaceAll('-', ' '),
          ...p.tags,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    if (filters.categories.length) {
      list = list.filter((p) => filters.categories.includes(p.category))
    }

    if (filters.genders.length) {
      list = list.filter((p) => filters.genders.includes(p.gender))
    }

    list = list.filter((p) => {
      const pr = effectivePrice(p)
      return pr >= filters.priceMin && pr <= filters.priceMax
    })

    if (sort !== 'featured') {
      list = sortProducts(list, sort)
    }

    return list
  }, [debounced, filters, sort, tagFilter, wishIds, wishOnly])

  return (
    <div className="pb-20">
      <div className="border-b border-neutral-200 bg-neutral-50">
        <Container className="py-16 md:py-20">
          <SectionHeading
            eyebrow="Shop"
            title="The collection."
            subtitle="Filter by category, silhouette, and price — all pieces are in-stock for this demo experience."
          />
        </Container>
      </div>

      <Container className="py-10 md:py-14">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, tag, or keyword"
              className="bg-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center border border-neutral-900 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] md:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              Filters
            </button>
            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-neutral-600">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortValue)}
                className="border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900"
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

        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
          <div className="hidden lg:block">
            <FilterSidebar
              value={filters}
              onChange={setFilters}
              categoryOptions={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            />
          </div>

          <div>
            <p className="text-xs text-neutral-500">
              {filtered.length} piece{filtered.length === 1 ? '' : 's'}
            </p>
            <ProductGrid products={filtered} className="mt-6" />
          </div>
        </div>
      </Container>

      {/* Mobile filter drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[60] lg:hidden',
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
            'absolute left-0 top-0 h-full w-[min(420px,92%)] overflow-y-auto bg-white p-6 shadow-2xl transition-transform',
            filtersOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <p className="font-medium uppercase tracking-[0.2em]">Filters</p>
            <button type="button" className="text-sm text-neutral-600" onClick={() => setFiltersOpen(false)}>
              Close
            </button>
          </div>
          <div className="mt-6">
            <FilterSidebar
              value={filters}
              onChange={setFilters}
              categoryOptions={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
