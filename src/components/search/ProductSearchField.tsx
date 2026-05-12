import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'

import { ROUTES } from '../../constants'
import { useProductSearch } from '../../hooks/useProductSearch'
import { formatPrice } from '../../utils/formatPrice'
import { cn } from '../../utils/cn'

type Props = {
  overlay?: boolean
  className?: string
  fieldClassName?: string
  inputClassName?: string
  iconClassName?: string
  placeholder?: string
  suggestionLimit?: number
  onNavigate?: () => void
}

export function ProductSearchField({
  overlay = false,
  className,
  fieldClassName,
  inputClassName,
  iconClassName,
  placeholder = 'Search collection',
  suggestionLimit = 6,
  onNavigate,
}: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const urlQuery = location.pathname === ROUTES.shop ? (searchParams.get('q') ?? '') : ''
  const [query, setQuery] = useState(urlQuery)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const blurTimeout = useRef<number | null>(null)
  const listboxId = useId()
  const inputId = useId()
  const { results, loading, error, hasQuery, ready } = useProductSearch(query, {
    limit: suggestionLimit,
  })

  useEffect(() => {
    return () => {
      if (blurTimeout.current !== null) {
        window.clearTimeout(blurTimeout.current)
      }
    }
  }, [])

  const showPanel = open && hasQuery
  const showLoading = showPanel && loading
  const showEmpty = showPanel && ready && !loading && !error && results.length === 0
  const showResults = showPanel && !loading && !error && results.length > 0

  function closePanel() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function goToShopSearch(term: string) {
    const q = term.trim()
    closePanel()
    onNavigate?.()
    if (!q) {
      navigate(ROUTES.shop)
      return
    }
    navigate(`${ROUTES.shop}?q=${encodeURIComponent(q)}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (activeIndex >= 0 && results[activeIndex]) {
      closePanel()
      onNavigate?.()
      navigate(ROUTES.product(results[activeIndex].slug))
      return
    }
    goToShopSearch(query)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showPanel && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      if (hasQuery) setOpen(true)
      return
    }

    if (e.key === 'Escape') {
      closePanel()
      return
    }

    if (!showResults) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((current) => (current + 1) % results.length)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1))
    }
  }

  function onBlur() {
    blurTimeout.current = window.setTimeout(() => closePanel(), 120)
  }

  function onFocus() {
    if (blurTimeout.current !== null) {
      window.clearTimeout(blurTimeout.current)
      blurTimeout.current = null
    }
    if (query.trim()) setOpen(true)
  }

  const fieldClass = cn(
    'relative flex min-w-0 flex-1 items-center gap-2 border-b pb-2',
    overlay ? 'border-white/40' : 'border-neutral-300',
    fieldClassName,
  )

  const inputClass = cn(
    'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400',
    overlay ? 'text-white placeholder:text-white/50' : 'text-neutral-900',
    inputClassName,
  )

  const iconClass = cn('h-4 w-4 shrink-0', overlay ? 'text-white/80' : 'text-neutral-500', iconClassName)

  return (
    <form onSubmit={onSubmit} className={cn('relative min-w-0 flex-1', className)} role="search">
      <div className={fieldClass}>
        <HiOutlineMagnifyingGlass className={iconClass} aria-hidden="true" />
        <input
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(-1)
            setOpen(true)
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={inputClass}
          aria-label={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-activedescendant={
            showResults && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
        />
      </div>

      {showPanel ? (
        <div
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden border shadow-xl',
            overlay
              ? 'border-white/15 bg-neutral-950 text-white'
              : 'border-neutral-200 bg-white text-neutral-900',
          )}
        >
          {showLoading ? (
            <p className="px-4 py-3 text-xs text-neutral-500">Searching collection…</p>
          ) : null}

          {error ? (
            <p className="px-4 py-3 text-xs text-red-600">Couldn&rsquo;t load search results.</p>
          ) : null}

          {showEmpty ? (
            <p className="px-4 py-3 text-xs text-neutral-500">No pieces match that search.</p>
          ) : null}

          {showResults ? (
            <ul id={listboxId} role="listbox" aria-label="Product suggestions" className="max-h-80 overflow-y-auto py-1">
              {results.map((product, index) => {
                const price = product.salePrice ?? product.price
                const image = product.images[0]
                const active = index === activeIndex

                return (
                  <li
                    key={product.id}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={active}
                  >
                    <Link
                      to={ROUTES.product(product.slug)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        closePanel()
                        onNavigate?.()
                      }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-left transition',
                        active
                          ? overlay
                            ? 'bg-white/10'
                            : 'bg-neutral-50'
                          : overlay
                            ? 'hover:bg-white/5'
                            : 'hover:bg-neutral-50',
                      )}
                    >
                      <div className="h-12 w-10 shrink-0 overflow-hidden bg-neutral-100">
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="truncate text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                          {product.category}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums">{formatPrice(price)}</p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {hasQuery ? (
            <div className={cn('border-t px-4 py-3', overlay ? 'border-white/10' : 'border-neutral-100')}>
              <button
                type="submit"
                className={cn(
                  'text-[11px] font-medium uppercase tracking-[0.22em] transition hover:opacity-80',
                  overlay ? 'text-white/90' : 'text-neutral-900',
                )}
              >
                View all results for &ldquo;{query.trim()}&rdquo;
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
