import { useEffect } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'

import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'
import { convertMeasurement, howToMeasureCopy } from '../../lib/sizeChart'
import type { ProductKind, SizeChart, SizeChartUnit } from '../../types'
import { cn } from '../../utils/cn'

type SizeChartTableProps = {
  chart: SizeChart
  displayUnit?: SizeChartUnit
  highlightSize?: string
  compact?: boolean
}

export function SizeChartTable({ chart, displayUnit, highlightSize, compact = false }: SizeChartTableProps) {
  const unit = displayUnit ?? chart.unit
  const sizeLabel = chart.columns.some((column) => column.id === 'us') ? 'US' : 'Size'

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left">
        <caption className="sr-only">Size chart measurements in {unit === 'cm' ? 'centimetres' : 'inches'}</caption>
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className={cn('py-3 pr-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]', compact && 'py-2')}>
              {sizeLabel}
            </th>
            {chart.columns.map((column) => (
              <th
                key={column.id}
                className={cn('px-3 py-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]', compact && 'py-2')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row) => {
            const active = highlightSize === row.size
            return (
              <tr
                key={row.size}
                className={cn(
                  'border-b border-[var(--border-subtle)] last:border-b-0',
                  active && 'bg-[var(--surface-muted)]',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'whitespace-nowrap py-3 pr-4 text-sm font-medium text-[var(--text-primary)]',
                    compact && 'py-2 text-xs',
                  )}
                >
                  {row.size}
                </th>
                {chart.columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'whitespace-nowrap px-3 py-3 text-sm tabular-nums text-[var(--text-secondary)]',
                      compact && 'py-2 text-xs',
                    )}
                  >
                    {formatCell(row.values[column.id] ?? '', chart.unit, unit, column.id)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatCell(value: string, from: SizeChartUnit, to: SizeChartUnit, columnId: string) {
  if (!value.trim()) return '—'
  if (columnId === 'us' || columnId === 'uk' || columnId === 'eu') return value
  const converted = convertMeasurement(value, from, to)
  if (to === from) return value
  if (columnId === 'cm') return converted
  return `${converted} ${to}`
}

type SizeChartDialogProps = {
  open: boolean
  title?: string
  kind: ProductKind
  chart: SizeChart
  highlightSize?: string
  displayUnit: SizeChartUnit
  onDisplayUnitChange: (unit: SizeChartUnit) => void
  onClose: () => void
}

export function SizeChartDialog({
  open,
  title = 'Size chart',
  kind,
  chart,
  highlightSize,
  displayUnit,
  onDisplayUnitChange,
  onClose,
}: SizeChartDialogProps) {
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close size chart"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-chart-title"
        className="relative z-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">Fit guide</p>
            <h2 id="size-chart-title" className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-secondary)]">{howToMeasureCopy(kind)}</p>
          {kind !== 'footwear' ? (
            <div className="flex shrink-0 border border-[var(--border-subtle)]">
              {(['in', 'cm'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onDisplayUnitChange(unit)}
                  className={cn(
                    'px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] transition',
                    displayUnit === unit
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <SizeChartTable chart={chart} displayUnit={kind === 'footwear' ? chart.unit : displayUnit} highlightSize={highlightSize} />
        </div>

        {chart.notes.trim() ? (
          <p className="mt-6 text-xs leading-relaxed text-[var(--text-muted)]">{chart.notes}</p>
        ) : null}
      </div>
    </div>
  )
}
