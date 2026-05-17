import { useMemo, type ReactNode } from 'react'

import type { Gender } from '../../types'
import { cn } from '../../utils/cn'

export type FilterState = {
  categories: string[]
  genders: Gender[]
  priceMin: number
  priceMax: number
}

type Props = {
  value: FilterState
  onChange: (next: FilterState) => void
  categoryOptions: { slug: string; name: string }[]
  className?: string
}

const genders: { value: Gender; label: string }[] = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
]

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition duration-200',
        active
          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-white'
          : 'border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
      )}
    >
      {label}
    </button>
  )
}

function FilterSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('border-b border-[var(--border-subtle)] pb-8 last:border-0 last:pb-0', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-primary)]">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function FilterSidebar({ value, onChange, categoryOptions, className }: Props) {
  const bounds = useMemo(() => ({ min: 0, max: 900 }), [])

  function toggleCategory(slug: string) {
    const set = new Set(value.categories)
    if (set.has(slug)) set.delete(slug)
    else set.add(slug)
    onChange({ ...value, categories: [...set] })
  }

  function toggleGender(g: Gender) {
    const set = new Set(value.genders)
    if (set.has(g)) set.delete(g)
    else set.add(g)
    onChange({ ...value, genders: [...set] })
  }

  const activeCount =
    value.categories.length + value.genders.length + (value.priceMin > 0 || value.priceMax < 1000 ? 1 : 0)

  return (
    <aside className={cn('space-y-8', className)}>
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={() =>
            onChange({
              categories: [],
              genders: [],
              priceMin: 0,
              priceMax: 1000,
            })
          }
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
        >
          Clear all ({activeCount})
        </button>
      ) : null}

      {categoryOptions.length > 0 ? (
        <FilterSection title="Category">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((c) => (
              <FilterPill
                key={c.slug}
                label={c.name}
                active={value.categories.includes(c.slug)}
                onClick={() => toggleCategory(c.slug)}
              />
            ))}
          </div>
        </FilterSection>
      ) : null}

      <FilterSection title="Gender">
        <div className="flex flex-wrap gap-2">
          {genders.map((g) => (
            <FilterPill
              key={g.value}
              label={g.label}
              active={value.genders.includes(g.value)}
              onClick={() => toggleGender(g.value)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price range">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)]/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]" htmlFor="min-p">
                Min
              </label>
              <input
                id="min-p"
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={value.priceMin}
                onChange={(e) =>
                  onChange({ ...value, priceMin: Math.min(Number(e.target.value) || 0, value.priceMax) })
                }
                className="mt-2 w-full border-0 border-b border-[var(--border-subtle)] bg-transparent px-0 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]" htmlFor="max-p">
                Max
              </label>
              <input
                id="max-p"
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={value.priceMax}
                onChange={(e) =>
                  onChange({ ...value, priceMax: Math.max(Number(e.target.value) || 0, value.priceMin) })
                }
                className="mt-2 w-full border-0 border-b border-[var(--border-subtle)] bg-transparent px-0 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)]"
              />
            </div>
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            ${value.priceMin} – ${value.priceMax}
          </p>
        </div>
      </FilterSection>
    </aside>
  )
}
