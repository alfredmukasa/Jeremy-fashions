import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminUpdateCategory,
  type AdminCategoryPayload,
} from '../../services/adminService'

const emptyCategory = (): AdminCategoryPayload => ({
  name: '',
  slug: '',
  description: '',
  image_url: '',
})

export default function AdminCategoriesPage() {
  return (
    <RequireAdminPermission permission="categories.manage">
      <AdminCategoriesContent />
    </RequireAdminPermission>
  )
}

function AdminCategoriesContent() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminCategoryPayload>(emptyCategory)

  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories', 'rows'], queryFn: adminListCategories })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required.')
      if (editingId) return adminUpdateCategory(editingId, form)
      return adminCreateCategory(form)
    },
    onSuccess: () => {
      toast.success(editingId ? 'Category updated' : 'Category created')
      setEditingId(null)
      setForm(emptyCategory())
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteCategory,
    onSuccess: () => {
      toast.success('Category deleted')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  return (
    <div className="space-y-8">
      <AdminPageHeader eyebrow="Catalog" title="Categories" description="Manage storefront categories and banner imagery." />

      <form
        className="grid gap-4 border border-neutral-200 bg-white p-6 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <div>
          <FieldLabel id="cname">Name</FieldLabel>
          <Input id="cname" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <FieldLabel id="cslug">Slug</FieldLabel>
          <Input id="cslug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
        </div>
        <div className="md:col-span-2">
          <FieldLabel id="cdesc">Description</FieldLabel>
          <Input id="cdesc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel id="cimg">Banner image URL</FieldLabel>
          <Input id="cimg" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} />
        </div>
        <div className="flex gap-3 md:col-span-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {editingId ? 'Update category' : 'Add category'}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null)
                setForm(emptyCategory())
              }}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(categoriesQuery.data ?? []).map((category) => (
              <tr key={category.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-medium text-neutral-900">{category.name}</td>
                <td className="px-4 py-3 text-neutral-600">{category.slug}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 text-xs font-medium uppercase tracking-[0.15em] text-neutral-900 underline-offset-4 hover:underline"
                    onClick={() => {
                      setEditingId(category.id)
                      setForm({
                        name: category.name,
                        slug: category.slug,
                        description: category.description ?? '',
                        image_url: category.image_url ?? '',
                      })
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-[0.15em] text-red-600 underline-offset-4 hover:underline"
                    onClick={() => {
                      if (window.confirm(`Delete category “${category.name}”?`)) deleteMutation.mutate(category.id)
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
