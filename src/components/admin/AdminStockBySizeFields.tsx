import type { AdminProductPayload } from '../../services/adminService'
import { FieldLabel, Input } from '../common/Input'

type Props = {
  form: AdminProductPayload
  onChange: (next: AdminProductPayload) => void
}

export function AdminStockBySizeFields({ form, onChange }: Props) {
  if (form.sizes.length === 0) return null

  return (
    <div className="sm:col-span-2 space-y-3">
      <FieldLabel id="psizestock">Stock by size (optional)</FieldLabel>
      <p className="text-xs text-neutral-500">
        Leave blank to use the product-level stock only. Filled sizes are enforced at checkout.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {form.sizes.map((size) => (
          <div key={size}>
            <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500" htmlFor={`psize-${size}`}>
              {size}
            </label>
            <Input
              id={`psize-${size}`}
              type="number"
              min={0}
              value={form.stock_by_size[size] ?? ''}
              onChange={(event) => {
                const next = { ...form.stock_by_size }
                if (event.target.value === '') {
                  delete next[size]
                } else {
                  next[size] = Math.max(0, Math.floor(Number(event.target.value) || 0))
                }
                onChange({ ...form, stock_by_size: next })
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
