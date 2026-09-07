import {
  emptySizeChart,
  fillStandardSizeChart,
  sizeChartColumnsForKind,
  syncSizeChartRows,
} from '../../lib/sizeChart'
import type { AdminProductPayload } from '../../services/adminService'
import type { ProductKind, SizeChart } from '../../types'
import { FieldLabel } from '../common/Input'

type AdminSizeChartFieldsProps = {
  form: AdminProductPayload
  productKind: ProductKind
  onChange: (next: AdminProductPayload) => void
}

export function AdminSizeChartFields({ form, productKind, onChange }: AdminSizeChartFieldsProps) {
  const chart = form.sizeChart ?? emptySizeChart(productKind, form.sizes)
  const columns = chart.columns.length ? chart.columns : sizeChartColumnsForKind(productKind)
  const showUnitToggle = productKind !== 'footwear'

  function updateChart(next: SizeChart) {
    onChange({ ...form, sizeChart: next })
  }

  function setCell(size: string, columnId: string, value: string) {
    const synced = syncSizeChartRows({ ...chart, columns }, form.sizes, productKind)
    updateChart({
      ...synced,
      rows: synced.rows.map((row) =>
        row.size === size ? { ...row, values: { ...row.values, [columnId]: value } } : row,
      ),
    })
  }

  return (
    <div className="space-y-4 border-t border-neutral-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Size chart</p>
          <p className="mt-2 max-w-xl text-sm text-neutral-600">
            Shown on the product page. Fill measurements for each selected size, or apply the standard block.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showUnitToggle ? (
            <div className="inline-flex border border-neutral-300 bg-white text-[10px] uppercase tracking-[0.16em]">
              {(['in', 'cm'] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => updateChart({ ...chart, unit })}
                  className={`px-3 py-2 ${
                    chart.unit === unit ? 'bg-neutral-950 text-white' : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() =>
              updateChart(fillStandardSizeChart(productKind, form.sizes, productKind === 'footwear' ? 'cm' : chart.unit))
            }
            className="border border-neutral-300 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-800 hover:border-neutral-500"
          >
            Fill standard
          </button>
        </div>
      </div>

      {form.sizes.length === 0 ? (
        <p className="text-sm text-neutral-500">Select sizes above to build the chart.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                <th className="px-2 py-2 font-medium">Size</th>
                {columns.map((column) => (
                  <th key={column.id} className="px-2 py-2 font-medium">
                    {column.label}
                    {showUnitToggle ? ` (${chart.unit})` : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {syncSizeChartRows(chart, form.sizes, productKind).rows.map((row) => (
                <tr key={row.size} className="border-b border-neutral-100">
                  <td className="px-2 py-2 font-medium text-neutral-900">{row.size}</td>
                  {columns.map((column) => (
                    <td key={column.id} className="px-2 py-2">
                      <input
                        aria-label={`${row.size} ${column.label}`}
                        value={row.values[column.id] ?? ''}
                        onChange={(e) => setCell(row.size, column.id, e.target.value)}
                        className="w-24 border border-neutral-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-900"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <FieldLabel id="size-chart-notes">Fit notes</FieldLabel>
        <textarea
          id="size-chart-notes"
          rows={3}
          value={chart.notes}
          onChange={(e) => updateChart({ ...chart, notes: e.target.value })}
          className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
          placeholder="How this piece fits, between-size advice, or measuring notes."
        />
      </div>
    </div>
  )
}
