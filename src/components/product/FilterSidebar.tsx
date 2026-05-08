import { useMemo } from 'react'

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

  return (
    <aside className={cn('space-y-10', className)}>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Category</p>
        <div className="mt-4 space-y-2">
          {categoryOptions.map((c) => {
            const active = value.categories.includes(c.slug)
            return (
              <label key={c.slug} className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleCategory(c.slug)}
                  className="h-4 w-4 rounded-none border-neutral-400 text-neutral-900 focus:ring-neutral-900"
                />
                <span>{c.name}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Gender</p>
        <div className="mt-4 space-y-2">
          {genders.map((g) => {
            const active = value.genders.includes(g.value)
            return (
              <label key={g.value} className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleGender(g.value)}
                  className="h-4 w-4 rounded-none border-neutral-400 text-neutral-900 focus:ring-neutral-900"
                />
                <span>{g.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500">Price</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500" htmlFor="min-p">
              Min
            </label>
            <input
              id="min-p"
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={value.priceMin}
              onChange={(e) =>
                onChange({ ...value, priceMin: Math.min(Number(e.target.value), value.priceMax) })
              }
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500" htmlFor="max-p">
              Max
            </label>
            <input
              id="max-p"
              type="number"
              min={bounds.min}
              max={bounds.max}
              value={value.priceMax}
              onChange={(e) =>
                onChange({ ...value, priceMax: Math.max(Number(e.target.value), value.priceMin) })
              }
              className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}
