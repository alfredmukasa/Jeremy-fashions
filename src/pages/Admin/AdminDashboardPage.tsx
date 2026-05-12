import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '../../constants'
import { supabase } from '../../lib/supabase'
import { useAdminSession } from '../../components/admin/AdminSessionContext'
import { getCategories } from '../../services/productService'
import type { Category } from '../../types'
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminListProfiles,
  adminListWaitlist,
  adminUpdateProduct,
  adminUpdateWaitlistStatus,
  type AdminProductPayload,
  type AdminProfileRow,
  type AdminWaitlistRow,
} from '../../services/adminService'
import type { ProductRow } from '../../services/mappers'

import { Button } from '../../components/common/Button'
import { FieldLabel, Input } from '../../components/common/Input'
import { Container } from '../../components/layout/Container'

type Tab = 'overview' | 'products' | 'waitlist' | 'users'

function emptyPayload(categorySlug: string): AdminProductPayload {
  return {
    title: '',
    slug: '',
    description: '',
    price: 0,
    compare_price: null,
    category: categorySlug,
    brand: '',
    stock_quantity: 0,
    featured: false,
    rating: 0,
    image_url: '',
    gallery_images: [],
    tags: [],
    sku: '',
    status: 'draft',
    gender: 'unisex',
    sizes: [],
    colors: [{ name: 'Default', hex: '#1a1a1a' }],
    attributes: {},
  }
}

function rowToPayload(row: ProductRow): AdminProductPayload {
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images : []
  const tags = Array.isArray(row.tags) ? row.tags : []
  const sizes = Array.isArray(row.sizes) ? row.sizes : []
  const colors = Array.isArray(row.colors)
    ? (row.colors as { name?: string; hex?: string }[]).map((c) => ({
        name: typeof c?.name === 'string' ? c.name : 'Default',
        hex: typeof c?.hex === 'string' ? c.hex : '#1a1a1a',
      }))
    : [{ name: 'Default', hex: '#1a1a1a' }]

  return {
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    price: Number(row.price),
    compare_price: row.compare_price == null ? null : Number(row.compare_price),
    category: row.category,
    brand: row.brand ?? '',
    stock_quantity: row.stock_quantity ?? 0,
    featured: row.featured ?? false,
    rating: Number(row.rating ?? 0),
    image_url: row.image_url,
    gallery_images: gallery.filter((s): s is string => typeof s === 'string'),
    tags: tags.filter((s): s is string => typeof s === 'string'),
    sku: row.sku ?? '',
    status: (row.status as AdminProductPayload['status']) || 'active',
    gender: row.gender === 'men' || row.gender === 'women' ? row.gender : 'unisex',
    sizes: sizes.filter((s): s is string => typeof s === 'string'),
    colors: colors.length ? colors : [{ name: 'Default', hex: '#1a1a1a' }],
    attributes:
      row.attributes && typeof row.attributes === 'object' && !Array.isArray(row.attributes)
        ? (row.attributes as AdminProductPayload['attributes'])
        : {},
  }
}

export default function AdminDashboardPage() {
  const session = useAdminSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [waitlist, setWaitlist] = useState<AdminWaitlistRow[]>([])
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdminProductPayload>(() => emptyPayload(''))

  const defaultCategory = categories[0]?.slug ?? ''

  const loadCategories = useCallback(async () => {
    try {
      const list = await getCategories()
      setCategories(list)
    } catch (e) {
      console.error(e)
      toast.error('Could not load categories.')
    }
  }, [])

  const loadProducts = useCallback(async () => {
    const data = await adminListProducts()
    setProducts(data)
  }, [])

  const loadWaitlist = useCallback(async () => {
    const data = await adminListWaitlist()
    setWaitlist(data)
  }, [])

  const loadProfiles = useCallback(async () => {
    const data = await adminListProfiles()
    setProfiles(data)
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadCategories(), loadProducts(), loadWaitlist(), loadProfiles()])
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }, [loadCategories, loadProducts, loadWaitlist, loadProfiles])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (defaultCategory && !form.category) {
      setForm((f) => ({ ...f, category: defaultCategory }))
    }
  }, [defaultCategory, form.category])

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setProducts([])
    setWaitlist([])
    setProfiles([])
    toast.success('Signed out')
    navigate(ROUTES.adminLogin, { replace: true })
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyPayload(defaultCategory || 'hoodies'))
    setEditorOpen(true)
  }

  function openEdit(row: ProductRow) {
    setEditingId(row.id)
    setForm(rowToPayload(row))
    setEditorOpen(true)
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await adminUpdateProduct(editingId, form)
        toast.success('Product updated')
      } else {
        await adminCreateProduct(form)
        toast.success('Product created')
      }
      setEditorOpen(false)
      await loadProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function removeProduct(id: string, title: string) {
    if (!window.confirm(`Delete “${title}” permanently? This cannot be undone.`)) return
    try {
      await adminDeleteProduct(id)
      toast.success('Product deleted')
      await loadProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  async function onWaitlistStatus(id: string, status: string) {
    try {
      await adminUpdateWaitlistStatus(id, status)
      toast.success('Waitlist updated')
      await loadWaitlist()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const counts = useMemo(() => {
    return {
      products: products.length,
      waitlist: waitlist.length,
      users: profiles.length,
      pendingWaitlist: waitlist.filter((w) => w.status === 'pending').length,
    }
  }, [products, waitlist, profiles])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products' },
    { id: 'waitlist', label: 'Waitlist' },
    { id: 'users', label: 'New users' },
  ]

  return (
    <div className="min-h-[80vh] pb-24">
      <div className="border-b border-neutral-200 bg-neutral-950 text-white">
        <Container className="flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/50">Jeremy Atelier</p>
            <h1 className="mt-2 font-serif text-3xl md:text-4xl">Admin dashboard</h1>
            <p className="mt-2 text-sm text-white/70">{session.user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                  tab === t.id
                    ? 'border-white bg-white text-neutral-950'
                    : 'border-white/30 bg-transparent text-white hover:border-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-10 md:py-14">
        {loading && (
          <p className="mb-8 text-sm text-neutral-600">Syncing data from Supabase…</p>
        )}

        {tab === 'overview' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border border-neutral-200 bg-white p-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Products</p>
              <p className="mt-3 font-serif text-3xl text-neutral-950">{counts.products}</p>
            </div>
            <div className="border border-neutral-200 bg-white p-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Waitlist</p>
              <p className="mt-3 font-serif text-3xl text-neutral-950">{counts.waitlist}</p>
              <p className="mt-1 text-xs text-neutral-500">{counts.pendingWaitlist} pending</p>
            </div>
            <div className="border border-neutral-200 bg-white p-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Profiles</p>
              <p className="mt-3 font-serif text-3xl text-neutral-950">{counts.users}</p>
              <p className="mt-1 text-xs text-neutral-500">Registered customers (auth)</p>
            </div>
            <div className="border border-neutral-200 bg-white p-6">
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">Storefront</p>
              <Link
                to={ROUTES.shop}
                className="mt-3 inline-block text-sm font-medium text-neutral-950 underline-offset-4 hover:underline"
              >
                Open shop →
              </Link>
            </div>
          </div>
        )}

        {tab === 'products' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-2xl text-neutral-950">Products</h2>
              <Button type="button" onClick={openCreate} disabled={!categories.length}>
                Add product
              </Button>
            </div>
            <div className="mt-8 overflow-x-auto border border-neutral-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
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
                          onClick={() => void removeProduct(p.id, p.title)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.length && !loading ? (
                <p className="p-8 text-sm text-neutral-600">No products yet — add one to get started.</p>
              ) : null}
            </div>
          </div>
        )}

        {tab === 'waitlist' && (
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">Waitlist</h2>
            <div className="mt-8 overflow-x-auto border border-neutral-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Product id</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3 text-neutral-600">
                        {new Date(w.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{w.full_name}</td>
                      <td className="px-4 py-3 text-neutral-600">{w.email}</td>
                      <td className="px-4 py-3 text-neutral-600">{w.phone ?? '—'}</td>
                      <td className="max-w-[120px] truncate px-4 py-3 font-mono text-xs text-neutral-500">
                        {w.interested_product ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={w.status}
                          onChange={(e) => void onWaitlistStatus(w.id, e.target.value)}
                          className="w-full max-w-[140px] border border-neutral-300 bg-white px-2 py-1 text-xs"
                        >
                          {['pending', 'notified', 'converted', 'archived'].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!waitlist.length && !loading ? (
                <p className="p-8 text-sm text-neutral-600">No waitlist entries yet.</p>
              ) : null}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">New users</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              Rows come from the <span className="font-mono text-xs">profiles</span> table, created when someone
              registers via Supabase Auth. Existing accounts created before this migration may be missing until they sign
              in again or you run a backfill.
            </p>
            <div className="mt-8 overflow-x-auto border border-neutral-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">User id</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((u) => (
                    <tr key={u.id} className="border-t border-neutral-100">
                      <td className="px-4 py-3 text-neutral-600">
                        {new Date(u.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 text-neutral-600">{u.full_name || '—'}</td>
                      <td className="max-w-[140px] truncate px-4 py-3 font-mono text-xs text-neutral-500">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!profiles.length && !loading ? (
                <p className="p-8 text-sm text-neutral-600">No profile rows yet — register a customer account to test.</p>
              ) : null}
            </div>
          </div>
        )}
      </Container>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-neutral-200 bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <h3 className="font-serif text-xl text-neutral-950">{editingId ? 'Edit product' : 'New product'}</h3>
              <button
                type="button"
                className="text-sm text-neutral-500 hover:text-neutral-900"
                onClick={() => setEditorOpen(false)}
              >
                Close
              </button>
            </div>
            <form onSubmit={saveProduct} className="space-y-4 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel id="ptitle">Title</FieldLabel>
                  <Input
                    id="ptitle"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <FieldLabel id="pslug">Slug</FieldLabel>
                  <Input
                    id="pslug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <FieldLabel id="pstatus">Status</FieldLabel>
                  <select
                    id="pstatus"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as AdminProductPayload['status'] }))
                    }
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
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
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
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gender: e.target.value as AdminProductPayload['gender'] }))
                    }
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="unisex">unisex</option>
                    <option value="men">men</option>
                    <option value="women">women</option>
                  </select>
                </div>
                <div>
                  <FieldLabel id="pprice">Price</FieldLabel>
                  <Input
                    id="pprice"
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    required
                  />
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
                  <Input
                    id="pstock"
                    type="number"
                    min={0}
                    value={form.stock_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, stock_quantity: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <FieldLabel id="prating">Rating (0–5)</FieldLabel>
                  <Input
                    id="prating"
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    value={form.rating}
                    onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <FieldLabel id="pbrand">Brand</FieldLabel>
                  <Input
                    id="pbrand"
                    value={form.brand ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel id="psku">SKU</FieldLabel>
                  <Input
                    id="psku"
                    value={form.sku ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="pimg">Image URL</FieldLabel>
                  <Input
                    id="pimg"
                    value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="pgal">Gallery URLs (comma-separated)</FieldLabel>
                  <Input
                    id="pgal"
                    value={form.gallery_images.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        gallery_images: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="ptags">Tags (comma-separated)</FieldLabel>
                  <Input
                    id="ptags"
                    value={form.tags.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tags: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="psizes">Sizes (comma-separated)</FieldLabel>
                  <Input
                    id="psizes"
                    value={form.sizes.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        sizes: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="pfeat"
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="h-4 w-4 rounded-none border-neutral-400"
                  />
                  <label htmlFor="pfeat" className="text-sm text-neutral-700">
                    Featured
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel id="pdesc">Description</FieldLabel>
                  <textarea
                    id="pdesc"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full border border-neutral-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-neutral-100 pt-6">
                <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
