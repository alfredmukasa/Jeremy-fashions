import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { ProductAttributes } from '../types'
import type { ProductRow } from './mappers'

const PRODUCT_COLUMNS =
  'id, created_at, title, slug, description, price, compare_price, category, brand, ' +
  'stock_quantity, featured, rating, image_url, gallery_images, tags, sku, ' +
  'status, gender, sizes, colors, attributes'

export type ProductStatus = 'active' | 'draft' | 'archived'

export type AdminProductPayload = {
  title: string
  slug: string
  description: string
  price: number
  compare_price: number | null
  category: string
  brand: string
  stock_quantity: number
  featured: boolean
  rating: number
  image_url: string
  gallery_images: string[]
  tags: string[]
  sku: string | null
  status: ProductStatus
  gender: 'men' | 'women' | 'unisex'
  sizes: string[]
  colors: { name: string; hex: string }[]
  attributes: ProductAttributes
}

export type AdminWaitlistRow = {
  id: string
  created_at: string
  full_name: string
  email: string
  phone: string | null
  interested_product: string | null
  status: string
  discount_code_sent: boolean
}

export type AdminProfileRow = {
  id: string
  created_at: string
  email: string | null
  full_name: string | null
  suspended: boolean
  account_status: 'active' | 'suspended' | 'banned'
}

export type AdminCategoryRow = {
  id: string
  created_at: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  product_kind: 'apparel' | 'footwear' | 'accessories' | null
}

export type AdminCategoryPayload = {
  name: string
  slug: string
  description: string
  image_url: string
}

export type AdminDiscountRow = {
  id: string
  created_at: string
  code: string
  percentage: number
  active: boolean
  expires_at: string | null
}

export type AdminDiscountPayload = {
  code: string
  percentage: number
  active: boolean
  expires_at: string | null
}

export type AdminOrderRow = {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  email: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'unpaid' | 'processing' | 'paid' | 'refunded' | 'partial_refund' | 'failed'
  total_amount: number
  currency: string
  notes: string | null
  stripe_payment_intent_id: string | null
  payment_metadata: Record<string, unknown> | null
}

export type AdminAuditRow = {
  id: string
  created_at: string
  actor_id: string | null
  actor_email: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
}

export type AdminDashboardStats = {
  productCount: number
  waitlistCount: number
  userCount: number
  pendingOrders: number
  pendingWaitlist: number
  lowStockCount: number
  revenueTotal: number
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

export async function adminListProducts(): Promise<ProductRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown) as ProductRow[]
}

export async function adminCreateProduct(payload: AdminProductPayload): Promise<ProductRow> {
  const client = requireClient()
  const row = {
    title: payload.title.trim(),
    slug: payload.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    description: payload.description,
    price: payload.price,
    compare_price: payload.compare_price,
    category: payload.category,
    brand: payload.brand?.trim() || null,
    stock_quantity: payload.stock_quantity,
    featured: payload.featured,
    rating: payload.rating,
    image_url: payload.image_url.trim(),
    gallery_images: payload.gallery_images,
    tags: payload.tags,
    sku: payload.sku?.trim() || null,
    status: payload.status,
    gender: payload.gender,
    sizes: payload.sizes,
    colors: payload.colors,
    attributes: payload.attributes,
  }

  const { data, error } = await client.from('products').insert(row).select(PRODUCT_COLUMNS).single()

  if (error) throw new Error(error.message)
  return data as unknown as ProductRow
}

export async function adminUpdateProduct(id: string, payload: AdminProductPayload): Promise<ProductRow> {
  const client = requireClient()
  const row = {
    title: payload.title.trim(),
    slug: payload.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    description: payload.description,
    price: payload.price,
    compare_price: payload.compare_price,
    category: payload.category,
    brand: payload.brand?.trim() || null,
    stock_quantity: payload.stock_quantity,
    featured: payload.featured,
    rating: payload.rating,
    image_url: payload.image_url.trim(),
    gallery_images: payload.gallery_images,
    tags: payload.tags,
    sku: payload.sku?.trim() || null,
    status: payload.status,
    gender: payload.gender,
    sizes: payload.sizes,
    colors: payload.colors,
    attributes: payload.attributes,
  }

  const { data, error } = await client.from('products').update(row).eq('id', id).select(PRODUCT_COLUMNS).single()

  if (error) throw new Error(error.message)
  return data as unknown as ProductRow
}

export async function adminDeleteProduct(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminListWaitlist(): Promise<AdminWaitlistRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('waitlist')
    .select('id, created_at, full_name, email, phone, interested_product, status, discount_code_sent')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminWaitlistRow[]
}

export async function adminUpdateWaitlistStatus(id: string, status: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('waitlist').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminListProfiles(): Promise<AdminProfileRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, created_at, email, full_name, suspended, account_status')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminProfileRow[]
}

export async function adminUpdateProfileStatus(
  id: string,
  accountStatus: AdminProfileRow['account_status'],
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('profiles')
    .update({
      account_status: accountStatus,
      suspended: accountStatus !== 'active',
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function adminListCategories(): Promise<AdminCategoryRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('categories')
    .select('id, created_at, name, slug, description, image_url, product_kind')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminCategoryRow[]
}

export async function adminCreateCategory(payload: AdminCategoryPayload): Promise<AdminCategoryRow> {
  const client = requireClient()
  const row = {
    name: payload.name.trim(),
    slug: payload.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    description: payload.description.trim() || null,
    image_url: payload.image_url.trim() || null,
  }

  const { data, error } = await client.from('categories').insert(row).select().single()
  if (error) throw new Error(error.message)
  return data as AdminCategoryRow
}

export async function adminUpdateCategory(id: string, payload: AdminCategoryPayload): Promise<AdminCategoryRow> {
  const client = requireClient()
  const row = {
    name: payload.name.trim(),
    slug: payload.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    description: payload.description.trim() || null,
    image_url: payload.image_url.trim() || null,
  }

  const { data, error } = await client.from('categories').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as AdminCategoryRow
}

export async function adminDeleteCategory(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminListDiscounts(): Promise<AdminDiscountRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('discount_codes')
    .select('id, created_at, code, percentage, active, expires_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminDiscountRow[]
}

export async function adminCreateDiscount(payload: AdminDiscountPayload): Promise<AdminDiscountRow> {
  const client = requireClient()
  const row = {
    code: payload.code.trim().toUpperCase(),
    percentage: payload.percentage,
    active: payload.active,
    expires_at: payload.expires_at,
  }

  const { data, error } = await client.from('discount_codes').insert(row).select().single()
  if (error) throw new Error(error.message)
  return data as AdminDiscountRow
}

export async function adminUpdateDiscount(id: string, payload: AdminDiscountPayload): Promise<AdminDiscountRow> {
  const client = requireClient()
  const row = {
    code: payload.code.trim().toUpperCase(),
    percentage: payload.percentage,
    active: payload.active,
    expires_at: payload.expires_at,
  }

  const { data, error } = await client.from('discount_codes').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as AdminDiscountRow
}

export async function adminDeleteDiscount(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('discount_codes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminListOrders(): Promise<AdminOrderRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('orders')
    .select(
      'id, created_at, updated_at, user_id, email, status, payment_status, total_amount, currency, notes, stripe_payment_intent_id, payment_metadata',
    )
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminOrderRow[]
}

export async function adminUpdateOrderStatus(id: string, status: AdminOrderRow['status']): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminListAuditLogs(): Promise<AdminAuditRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('audit_logs')
    .select('id, created_at, actor_id, actor_email, action, entity_type, entity_id, metadata')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminAuditRow[]
}

export async function adminWriteAuditLog(input: {
  action: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const client = requireClient()
  const {
    data: { user },
  } = await client.auth.getUser()

  const { error } = await client.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    action: input.action,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) throw new Error(error.message)
}

export async function adminGetSiteSettings(): Promise<Record<string, unknown>> {
  const client = requireClient()
  const { data, error } = await client.from('site_settings').select('key, value')

  if (error) throw new Error(error.message)
  const out: Record<string, unknown> = {}
  for (const row of data ?? []) {
    out[row.key as string] = row.value
  }
  return out
}

export async function adminUpsertSiteSetting(key: string, value: Record<string, unknown>): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('site_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
}

export async function adminDeleteWaitlistEntry(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('waitlist').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminGetDashboardStats(): Promise<AdminDashboardStats> {
  const client = requireClient()
  const [productsRes, waitlistRes, profilesRes, ordersRes] = await Promise.all([
    client.from('products').select('id, stock_quantity, price, status'),
    client.from('waitlist').select('id, status'),
    client.from('profiles').select('id', { count: 'exact', head: true }),
    client.from('orders').select('id, status, total_amount, payment_status'),
  ])

  if (productsRes.error) throw new Error(productsRes.error.message)
  if (waitlistRes.error) throw new Error(waitlistRes.error.message)
  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const products = productsRes.data ?? []
  const waitlist = waitlistRes.data ?? []
  const orders = ordersRes.data ?? []

  return {
    productCount: products.length,
    waitlistCount: waitlist.length,
    userCount: profilesRes.count ?? 0,
    pendingOrders: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
    pendingWaitlist: waitlist.filter((w) => w.status === 'pending').length,
    lowStockCount: products.filter((p) => (p.stock_quantity ?? 0) <= 5 && p.status === 'active').length,
    revenueTotal: orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0),
  }
}
