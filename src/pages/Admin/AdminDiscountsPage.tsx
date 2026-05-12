import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import {
  adminCreateDiscount,
  adminDeleteDiscount,
  adminListDiscounts,
  adminUpdateDiscount,
  type AdminDiscountPayload,
} from '../../services/adminService'

const emptyDiscount = (): AdminDiscountPayload => ({
  code: '',
  percentage: 10,
  active: true,
  expires_at: null,
})

export default function AdminDiscountsPage() {
  return (
    <RequireAdminPermission permission="discounts.manage">
      <AdminDiscountsContent />
    </RequireAdminPermission>
  )
}

function AdminDiscountsContent() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminDiscountPayload>(emptyDiscount)

  const discountsQuery = useQuery({ queryKey: ['admin', 'discounts'], queryFn: adminListDiscounts })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim()) throw new Error('Code is required.')
      if (editingId) return adminUpdateDiscount(editingId, form)
      return adminCreateDiscount(form)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Discount updated' : 'Discount created')
      setEditingId(null)
      setForm(emptyDiscount())
      void queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteDiscount,
    onSuccess: () => {
      toast.success('Discount deleted')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Pricing" title="Discounts" description="Create and manage promotional discount codes." />

      <form
        className="grid gap-4 border border-neutral-200 bg-white p-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <div>
          <FieldLabel id="dcode">Code</FieldLabel>
          <Input id="dcode" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
        </div>
        <div>
          <FieldLabel id="dpercent">Percentage</FieldLabel>
          <Input
            id="dpercent"
            type="number"
            min={1}
            max={100}
            value={form.percentage}
            onChange={(e) => setForm((f) => ({ ...f, percentage: Number(e.target.value) }))}
            required
          />
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <input
            id="dactive"
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="h-4 w-4 rounded-none border-neutral-400"
          />
          <label htmlFor="dactive" className="text-sm text-neutral-700">
            Active
          </label>
        </div>
        <div className="flex gap-3 md:col-span-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {editingId ? 'Update discount' : 'Create discount'}
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Percent</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(discountsQuery.data ?? []).map((discount) => (
              <tr key={discount.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-medium text-neutral-900">{discount.code}</td>
                <td className="px-4 py-3">{discount.percentage}%</td>
                <td className="px-4 py-3">{discount.active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 text-xs font-medium uppercase tracking-[0.15em] text-neutral-900 underline-offset-4 hover:underline"
                    onClick={() => {
                      setEditingId(discount.id)
                      setForm({
                        code: discount.code,
                        percentage: discount.percentage,
                        active: discount.active,
                        expires_at: discount.expires_at,
                      })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-[0.15em] text-red-600 underline-offset-4 hover:underline"
                    onClick={() => {
                      if (window.confirm(`Delete discount ${discount.code}?`)) deleteMutation.mutate(discount.id)
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
