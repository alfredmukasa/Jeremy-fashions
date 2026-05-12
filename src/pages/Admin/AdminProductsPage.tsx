import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { AdminPageHeader } from '../../components/admin/AdminPageHeader'
import { AdminProductCategoryFields } from '../../components/admin/AdminProductCategoryFields'
import { AdminProductMediaFields } from '../../components/admin/AdminProductMediaFields'
import { AdminProductPreview } from '../../components/admin/AdminProductPreview'
import { RequireAdminPermission } from '../../components/admin/RequireAdminPermission'
import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { invalidateCatalog } from '../../hooks/useCatalog'
import { emptyAttributesForKind, resolveProductKind } from '../../lib/productCategoryConfig'
import { getCategories } from '../../services/productService'
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
  adminWriteAuditLog,
  type AdminProductPayload,
} from '../../services/adminService'
import type { ProductRow } from '../../services/mappers'
import { emptyProductPayload, productPayloadToPreview, productRowToPayload } from './adminProductForm'

export default function AdminProductsPage() {
  return (
    <RequireAdminPermission permission="products.manage">
      <AdminProductsContent />
    </RequireAdminPermission>
  )
}

function AdminProductsContent() {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadFolder, setUploadFolder] = useState<string>(() => crypto.randomUUID())
  const [form, setForm] = useState<AdminProductPayload>(() => emptyProductPayload(''))

  const categoriesQuery = useQuery({ queryKey: ['admin', 'categories'], queryFn: getCategories })
  const productsQuery = useQuery({ queryKey: ['admin', 'products'], queryFn: adminListProducts })

  const defaultCategory = categoriesQuery.data?.[0]?.slug ?? ''

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error('Title is required.')
      const payload = {
        ...(form.category ? form : { ...form, category: defaultCategory || form.category }),
        gallery_images: form.gallery_images.map((url) => url.trim()).filter(Boolean),
        image_url: form.image_url.trim(),
      }
      if (editingId) {
        await adminUpdateProduct(editingId, payload)
        await adminWriteAuditLog({ action: 'product.update', entity_type: 'product', entity_id: editingId })
        return 'updated'
      }
      const created = await adminCreateProduct(payload)
      await adminWriteAuditLog({ action: 'product.create', entity_type: 'product', entity_id: created.id })
      return 'created'
    },
    onSuccess: (result) => {
      toast.success(result === 'updated' ? 'Product updated' : 'Product created')
      setEditorOpen(false)
      invalidateCatalog('products')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      if (!window.confirm(`Delete “${title}” permanently? This cannot be undone.`)) return
      await adminDeleteProduct(id)
      await adminWriteAuditLog({ action: 'product.delete', entity_type: 'product', entity_id: id })
    },
    onSuccess: () => {
      toast.success('Product deleted')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Delete failed'),
  })

  function openCreate() {
    const category = categoriesQuery.data?.[0]
    const slug = category?.slug ?? (defaultCategory || 'hoodies')
    setEditingId(null)
    setUploadFolder(crypto.randomUUID())
    setForm(emptyProductPayload(slug, category?.productKind ?? 'apparel'))
    setEditorOpen(true)
  }

  function openEdit(row: ProductRow) {
    setEditingId(row.id)
    setUploadFolder(row.id)
    setForm(productRowToPayload(row))
    setEditorOpen(true)
  }

  const products = productsQuery.data ?? []
  const selectedCategory = categoriesQuery.data?.find((category) => category.slug === form.category)
  const previewProduct = useMemo(
    () => productPayloadToPreview(form, editingId ?? 'preview', selectedCategory?.productKind),
    [editingId, form, selectedCategory?.productKind],
  )
  const storefrontReady = Boolean(form.slug.trim() && form.status === 'active')

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalog"
        title="Products"
        description="Create, edit, and archive products with pricing, inventory, and media."
        actions={
          <Button type="button" onClick={openCreate} disabled={!categoriesQuery.data?.length}>
            Add product
          </Button>
        }
      />

      <div className="overflow-x-auto border border-neutral-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Preview</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-neutral-100">
                <td className="px-4 py-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="h-14 w-11 object-cover border border-neutral-200 bg-neutral-100" />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-neutral-900">{p.title}</td>
                <td className="px-4 py-3 text-neutral-600">{p.slug}</td>
                <td className="px-4 py-3 text-neutral-600">{p.category}</td>
                <td className="px-4 py-3">${Number(p.price).toFixed(2)}</td>
                <td className="px-4 py-3">{p.stock_quantity ?? 0}</td>
                <td className="px-4 py-3 capitalize text-neutral-600">{p.status}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="mr-3 text-xs font-medium uppercase tracking-[0.15em] text-neutral-900 underline-offset-4 hover:underline"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-[0.15em] text-red-600 underline-offset-4 hover:underline"
                    onClick={() => deleteMutation.mutate({ id: p.id, title: p.title })}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productsQuery.isLoading ? (
          <p className="p-8 text-sm text-neutral-600">Loading products…</p>
        ) : !products.length ? (
          <p className="p-8 text-sm text-neutral-600">No products yet — add one to get started.</p>
        ) : null}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto border border-neutral-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <h3 className="font-serif text-xl text-neutral-950">{editingId ? 'Edit product' : 'New product'}</h3>
              <button type="button" className="text-sm text-neutral-500 hover:text-neutral-900" onClick={() => setEditorOpen(false)}>
                Close
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveMutation.mutate()
              }}
              className="space-y-6 px-6 py-6"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel id="ptitle">Title</FieldLabel>
                  <Input id="ptitle" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <FieldLabel id="pslug">Slug</FieldLabel>
                  <Input id="pslug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
                </div>
                <div>
                  <FieldLabel id="pstatus">Status</FieldLabel>
                  <select
                    id="pstatus"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdminProductPayload['status'] }))}
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <div>
                  <FieldLabel id="pcat">Category</FieldLabel>
                  <select
                    id="pcat"
                    value={form.category}
                    onChange={(e) => {
                      const slug = e.target.value
                      const category = categoriesQuery.data?.find((item) => item.slug === slug)
                      const kind = resolveProductKind(slug, category?.productKind)
                      setForm((current) => ({
                        ...current,
                        category: slug,
                        sizes: current.category === slug ? current.sizes : [],
                        attributes: current.category === slug ? current.attributes : emptyAttributesForKind(kind),
                      }))
                    }}
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    {(categoriesQuery.data ?? []).map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel id="pgender">Gender</FieldLabel>
                  <select
                    id="pgender"
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as AdminProductPayload['gender'] }))}
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="unisex">unisex</option>
                    <option value="men">men</option>
                    <option value="women">women</option>
                  </select>
                </div>
                <div>
                  <FieldLabel id="pprice">Price</FieldLabel>
                  <Input id="pprice" type="number" step="0.01" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} required />
                </div>
                <div>
                  <FieldLabel id="pcompare">Compare at (optional)</FieldLabel>
                  <Input
                    id="pcompare"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.compare_price ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        compare_price: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <FieldLabel id="pstock">Stock</FieldLabel>
                  <Input id="pstock" type="number" min={0} value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))} required />
                </div>
                <div>
                  <FieldLabel id="pbrand">Brand</FieldLabel>
                  <Input id="pbrand" value={form.brand ?? ''} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
                </div>
                <div className="space-y-4 sm:col-span-2">
                  <AdminProductMediaFields form={form} uploadFolder={uploadFolder} onChange={setForm} />
                </div>
                <div className="sm:col-span-2">
                  <AdminProductCategoryFields
                    form={form}
                    categories={categoriesQuery.data ?? []}
                    onChange={setForm}
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input id="pfeat" type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="h-4 w-4 rounded-none border-neutral-400" />
                  <label htmlFor="pfeat" className="text-sm text-neutral-700">
                    Featured
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="pdesc">Description</FieldLabel>
                  <textarea id="pdesc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm" />
                </div>
                </div>
                <AdminProductPreview product={previewProduct} storefrontReady={storefrontReady} />
              </div>
              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-6">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
