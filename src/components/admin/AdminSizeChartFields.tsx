import {
  addSizeChartColumn,
  addSizeChartRow,
  emptySizeChart,
  fillStandardSizeChart,
  moveSizeChartColumn,
  moveSizeChartRow,
  removeSizeChartColumn,
  removeSizeChartRow,
  renameSizeChartColumn,
  renameSizeChartRow,
  setSizeChartCell,
  setSizeChartColumnKind,
  sizeChartColumnKind,
  sizeChartHasMeasurements,
} from '../../lib/sizeChart'
import type { AdminProductPayload } from '../../services/adminService'
import type { ProductKind, SizeChart, SizeChartColumnKind } from '../../types'
import { FieldLabel } from '../common/Input'

type AdminSizeChartFieldsProps = {
  form: AdminProductPayload
  productKind: ProductKind
  onChange: (next: AdminProductPayload) => void
}

export function AdminSizeChartFields({ form, productKind, onChange }: AdminSizeChartFieldsProps) {
  const chart = form.sizeChart ?? emptySizeChart(productKind, form.sizes)
  const showUnitToggle = productKind !== 'footwear'

  function updateChart(next: SizeChart) {
    onChange({ ...form, sizeChart: next })
  }

  function confirmAction(message: string) {
    return window.confirm(message)
  }

  function fillStandard() {
    if (
      sizeChartHasMeasurements(chart) &&
      !confirmAction('Replace the current size chart with the standard measurements?')
    ) {
      return
    }
    updateChart(fillStandardSizeChart(productKind, form.sizes, productKind === 'footwear' ? 'cm' : chart.unit))
  }

  function removeColumn(columnId: string, label: string) {
    if (!confirmAction(`Remove the “${label || 'untitled'}” column and its measurements?`)) return
    updateChart(removeSizeChartColumn(chart, columnId))
  }

  function removeRow(index: number, size: string) {
    if (!confirmAction(`Remove the “${size || 'untitled'}” row?`)) return
    updateChart(removeSizeChartRow(chart, index))
  }

  return (
    <div className="space-y-4 border-t border-neutral-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Size chart</p>
          <p className="mt-2 max-w-xl text-sm text-neutral-600">
            Build any table for this product. Add or remove rows and columns, rename headers, and edit each cell.
            Saved charts appear on the product page.
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
            onClick={() => updateChart(addSizeChartRow(chart))}
            className="border border-neutral-300 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-800 hover:border-neutral-500"
          >
            Add row
          </button>
          <button
            type="button"
            onClick={() => updateChart(addSizeChartColumn(chart))}
            className="border border-neutral-300 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-800 hover:border-neutral-500"
          >
            Add column
          </button>
          <button
            type="button"
            onClick={fillStandard}
            className="border border-neutral-300 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-800 hover:border-neutral-500"
          >
            Fill standard
          </button>
        </div>
      </div>

      {chart.columns.length === 0 && chart.rows.length === 0 ? (
        <p className="text-sm text-neutral-500">Add a row and a column to start the chart.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 align-top text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                <th className="min-w-36 px-2 py-2 font-medium">Size</th>
                {chart.columns.map((column, columnIndex) => {
                  const kind = sizeChartColumnKind(column)
                  return (
                    <th key={column.id} className="min-w-40 px-2 py-2 font-medium">
                      <input
                        aria-label={`Column ${columnIndex + 1} header`}
                        value={column.label}
                        maxLength={40}
                        onChange={(event) => updateChart(renameSizeChartColumn(chart, column.id, event.target.value))}
                        className="w-full border border-neutral-300 bg-white px-2 py-1.5 text-xs normal-case tracking-normal text-neutral-900 outline-none focus:border-neutral-900"
                      />
                      <label className="mt-2 block text-[10px] normal-case tracking-normal text-neutral-500">
                        <span className="sr-only">Column type for {column.label || `column ${columnIndex + 1}`}</span>
                        <select
                          aria-label={`Column type for ${column.label || `column ${columnIndex + 1}`}`}
                          value={kind}
                          onChange={(event) =>
                            updateChart(
                              setSizeChartColumnKind(chart, column.id, event.target.value as SizeChartColumnKind),
                            )
                          }
                          className="mt-1 w-full border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800"
                        >
                          <option value="measurement">Measurement{showUnitToggle ? ` (${chart.unit})` : ''}</option>
                          <option value="text">Text attribute</option>
                        </select>
                      </label>
                      <div className="mt-2 flex flex-wrap gap-1 normal-case tracking-normal">
                        <button
                          type="button"
                          aria-label={`Move ${column.label || 'column'} left`}
                          disabled={columnIndex === 0}
                          onClick={() => updateChart(moveSizeChartColumn(chart, columnIndex, -1))}
                          className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-700 disabled:opacity-40"
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${column.label || 'column'} right`}
                          disabled={columnIndex === chart.columns.length - 1}
                          onClick={() => updateChart(moveSizeChartColumn(chart, columnIndex, 1))}
                          className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-700 disabled:opacity-40"
                        >
                          Right
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${column.label || 'column'} column`}
                          onClick={() => removeColumn(column.id, column.label)}
                          className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row, rowIndex) => (
                <tr key={row.id ?? `${row.size}-${rowIndex}`} className="border-b border-neutral-100 align-top">
                  <td className="px-2 py-2">
                    <input
                      aria-label={`Row ${rowIndex + 1} label`}
                      value={row.size}
                      maxLength={40}
                      onChange={(event) => updateChart(renameSizeChartRow(chart, rowIndex, event.target.value))}
                      className="w-full border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${row.size || 'row'} up`}
                        disabled={rowIndex === 0}
                        onClick={() => updateChart(moveSizeChartRow(chart, rowIndex, -1))}
                        className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-700 disabled:opacity-40"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${row.size || 'row'} down`}
                        disabled={rowIndex === chart.rows.length - 1}
                        onClick={() => updateChart(moveSizeChartRow(chart, rowIndex, 1))}
                        className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-700 disabled:opacity-40"
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${row.size || 'row'} row`}
                        onClick={() => removeRow(rowIndex, row.size)}
                        className="border border-neutral-300 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                  {chart.columns.map((column) => (
                    <td key={column.id} className="px-2 py-2">
                      <input
                        aria-label={`${row.size || `Row ${rowIndex + 1}`} ${column.label || 'column'}`}
                        value={row.values[column.id] ?? ''}
                        maxLength={40}
                        onChange={(event) => updateChart(setSizeChartCell(chart, rowIndex, column.id, event.target.value))}
                        className="w-full min-w-24 border border-neutral-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neutral-900"
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
          maxLength={2000}
          value={chart.notes}
          onChange={(event) => updateChart({ ...chart, notes: event.target.value })}
          className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
          placeholder="How this piece fits, between-size advice, or measuring notes."
        />
      </div>
    </div>
  )
}
