import type { Category } from '../../types'
import {
  attributeFieldsForKind,
  resolveProductKind,
  sizeLabelForKind,
  sizePresetsForKind,
} from '../../lib/productCategoryConfig'
import type { AdminProductPayload } from '../../services/adminService'
import { FieldLabel, Input } from '../common/Input'

type AdminProductCategoryFieldsProps = {
  form: AdminProductPayload
  categories: Category[]
  onChange: (next: AdminProductPayload) => void
}

export function AdminProductCategoryFields({ form, categories, onChange }: AdminProductCategoryFieldsProps) {
  const selectedCategory = categories.find((category) => category.slug === form.category)
  const productKind = resolveProductKind(form.category, selectedCategory?.productKind)
  const attributeFields = attributeFieldsForKind(productKind)
  const sizePresets = sizePresetsForKind(productKind)

  function toggleSize(size: string) {
    const selected = new Set(form.sizes)
    if (selected.has(size)) selected.delete(size)
    else selected.add(size)
    onChange({ ...form, sizes: Array.from(selected) })
  }

  return (
    <div className="space-y-6 border border-neutral-200 bg-neutral-50 p-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Category profile</p>
        <p className="mt-2 text-sm text-neutral-700">
          {productKind === 'footwear'
            ? 'Footwear uses shoe sizing and construction details similar to specialty shoe retailers.'
            : productKind === 'accessories'
              ? 'Accessories use compact sizing and material-focused details.'
              : 'Apparel uses letter sizing and fabric-focused details.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {attributeFields.map((field) => (
          <div key={field.key} className={field.key === 'care' ? 'sm:col-span-2' : undefined}>
            <FieldLabel id={`attr-${field.key}`}>{field.label}</FieldLabel>
            <Input
              id={`attr-${field.key}`}
              value={form.attributes[field.key] ?? ''}
              onChange={(e) =>
                onChange({
                  ...form,
                  attributes: {
                    ...form.attributes,
                    [field.key]: e.target.value,
                  },
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <FieldLabel id="psizes">{sizeLabelForKind(productKind)}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {sizePresets.map((size) => {
            const active = form.sizes.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`border px-3 py-2 text-xs uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500'
                }`}
              >
                {size}
              </button>
            )
          })}
        </div>
        <Input
          id="psizes"
          value={form.sizes.join(', ')}
          onChange={(e) =>
            onChange({
              ...form,
              sizes: e.target.value
                .split(',')
                .map((size) => size.trim())
                .filter(Boolean),
            })
          }
          placeholder="Custom sizes, comma-separated"
        />
      </div>
    </div>
  )
}
