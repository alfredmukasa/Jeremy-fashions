import { orderInQueue } from '../lib/orderOrganization'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { mergeSizeChartIntoAttributes, sizeChartHasMeasurements } from '../lib/sizeChart'
import type { ProductAttributes, SizeChart } from '../types'
import type { ProductRow } from './mappers'
import { GLOBAL_SETTINGS_ROW_ID } from './globalSettingsService'

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
  sizeChart: SizeChart | null
}

export type AdminWaitlistRow = {
  id: string
  created_at: string
  full_name: string
  email: string
  phone: string | null
  instagram: string | null
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
  percentage: number | null
  active: boolean
  expires_at: string | null
  discount_type?: 'percentage' | 'fixed'
  amount?: number | null
  min_subtotal?: number | null
  usage_limit?: number | null
  usage_count?: number | null
}

export type AdminDiscountPayload = {
  code: string
  percentage: number | null
  active: boolean
  expires_at: string | null
  discount_type: 'percentage' | 'fixed'
  amount: number | null
  min_subtotal: number
  usage_limit: number | null
}

export type AdminOrderItemProduct = {
  image_url?: string | null
  gallery_images?: string[] | null
}

export type AdminOrderItem = {
  id: string
  product_id: string | null
  title: string
  quantity: number
  unit_price: number
  sku: string | null
  size?: string | null
  color_name?: string | null
  line_total?: number | null
  products?: AdminOrderItemProduct | AdminOrderItemProduct[] | null
}

export type AdminOrderRow = {
  id: string
  order_number?: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  email: string
  customer_name?: string | null
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'unpaid' | 'processing' | 'paid' | 'refunded' | 'partial_refund' | 'failed'
  total_amount: number
  subtotal_amount?: number | null
  shipping_amount?: number | null
  tax_amount?: number | null
  discount_amount?: number | null
  refund_amount?: number | null
  currency: string
  notes: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id?: string | null
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  payment_metadata: Record<string, unknown> | null
  order_items?: AdminOrderItem[] | null
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

export type AdminContactMessageStatus = 'new' | 'read' | 'replied' | 'archived'

export type AdminContactMessageRow = {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string
  message: string
  status: AdminContactMessageStatus
  user_id: string | null
}

export type AdminDashboardStats = {
  productCount: number
  waitlistCount: number
  userCount: number
  pendingOrders: number
  pendingWaitlist: number
  lowStockCount: number
  revenueTotal: number
  newMessageCount: number
  messageCount: number
}

function sizeChartForSave(payload: AdminProductPayload) {
  const chart = payload.sizeChart
  if (!chart) return null
  const rows = chart.rows.map((row, index) => ({
    ...row,
    size: row.size.trim() || `Size ${index + 1}`,
  }))
  const columns = chart.columns
    .map((column) => ({ ...column, id: column.id.trim(), label: column.label.trim() || 'Column' }))
    .filter((column) => column.id)
  if ((rows.length > 0 && columns.length > 0) || chart.notes.trim() || sizeChartHasMeasurements(chart)) {
    return { ...chart, rows, columns }
  }
  return null
}

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

/** Gateway 504s on admin reads were about 150s. Stop the request before that so the page can recover. */
const ADMIN_READ_TIMEOUT_MS = 20_000

function adminReadSignal(): AbortSignal {
  return AbortSignal.timeout(ADMIN_READ_TIMEOUT_MS)
}

function isSchemaMismatch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /column|schema cache|could not find/i.test(message)
}

export async function adminListProducts(): Promise<ProductRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('products')
    .select(PRODUCT_COLUMNS)
    .order('created_at', { ascending: false })
    .abortSignal(adminReadSignal())

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
    attributes: mergeSizeChartIntoAttributes(
      (payload.attributes ?? {}) as Record<string, unknown>,
      sizeChartForSave(payload),
    ),
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
    attributes: mergeSizeChartIntoAttributes(
      (payload.attributes ?? {}) as Record<string, unknown>,
      sizeChartForSave(payload),
    ),
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
    .select('id, created_at, full_name, email, phone, instagram, interested_product, status, discount_code_sent')
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

function discountWriteRow(payload: AdminDiscountPayload, extended: boolean) {
  const code = payload.code.trim().replace(/\s+/g, '').toUpperCase()
  const base = {
    code,
    active: payload.active,
    expires_at: payload.expires_at,
    percentage: payload.discount_type === 'fixed' ? null : payload.percentage,
  }
  if (!extended) {
    return { ...base, percentage: payload.percentage ?? 0 }
  }
  return {
    ...base,
    discount_type: payload.discount_type,
    amount: payload.discount_type === 'fixed' ? payload.amount : null,
    min_subtotal: payload.min_subtotal,
    usage_limit: payload.usage_limit,
  }
}

export async function adminListDiscounts(): Promise<AdminDiscountRow[]> {
  const client = requireClient()
  const full = await client
    .from('discount_codes')
    .select('id, created_at, code, percentage, active, expires_at, discount_type, amount, min_subtotal, usage_limit, usage_count')
    .order('created_at', { ascending: false })
    .abortSignal(adminReadSignal())

  if (!full.error) return (full.data ?? []) as AdminDiscountRow[]
  if (!isSchemaMismatch(full.error)) throw new Error(full.error.message)

  const { data, error } = await client
    .from('discount_codes')
    .select('id, created_at, code, percentage, active, expires_at')
    .order('created_at', { ascending: false })
    .abortSignal(adminReadSignal())

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminDiscountRow[]
}

export async function adminCreateDiscount(payload: AdminDiscountPayload): Promise<AdminDiscountRow> {
  const client = requireClient()
  const full = await client.from('discount_codes').insert(discountWriteRow(payload, true) as never).select().single()
  if (!full.error) return full.data as AdminDiscountRow
  if (!/column|schema cache|could not find/i.test(full.error.message)) throw new Error(full.error.message)
  const { data, error } = await client.from('discount_codes').insert(discountWriteRow(payload, false) as never).select().single()
  if (error) throw new Error(error.message)
  return data as AdminDiscountRow
}

export async function adminUpdateDiscount(id: string, payload: AdminDiscountPayload): Promise<AdminDiscountRow> {
  const client = requireClient()
  const full = await client.from('discount_codes').update(discountWriteRow(payload, true) as never).eq('id', id).select().single()
  if (!full.error) return full.data as AdminDiscountRow
  if (!/column|schema cache|could not find/i.test(full.error.message)) throw new Error(full.error.message)
  const { data, error } = await client.from('discount_codes').update(discountWriteRow(payload, false) as never).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as AdminDiscountRow
}

export async function adminDeleteDiscount(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('discount_codes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

const ORDER_ITEM_SNAPSHOT =
  'id, product_id, title, quantity, unit_price, sku, size, color_name, line_total, products (image_url, gallery_images)'
const ORDER_ITEM_SNAPSHOT_NO_IMAGE = 'id, product_id, title, quantity, unit_price, sku, size, color_name, line_total'
const ORDER_ITEM_BASIC_WITH_IMAGE = 'id, product_id, title, quantity, unit_price, sku, products (image_url, gallery_images)'
const ORDER_ITEM_BASIC = 'id, product_id, title, quantity, unit_price, sku'

const ADMIN_ORDER_SELECTS = [
  `id, order_number, created_at, updated_at, user_id, email, status, payment_status, total_amount, subtotal_amount, shipping_amount, tax_amount, discount_amount, refund_amount, currency, notes, stripe_payment_intent_id, stripe_checkout_session_id, shipping_address, billing_address, payment_metadata, order_items (${ORDER_ITEM_SNAPSHOT})`,
  `id, order_number, created_at, updated_at, user_id, email, status, payment_status, total_amount, subtotal_amount, shipping_amount, tax_amount, discount_amount, refund_amount, currency, notes, stripe_payment_intent_id, stripe_checkout_session_id, shipping_address, billing_address, payment_metadata, order_items (${ORDER_ITEM_SNAPSHOT_NO_IMAGE})`,
  `id, order_number, created_at, updated_at, user_id, email, status, payment_status, total_amount, refund_amount, currency, notes, stripe_payment_intent_id, shipping_address, billing_address, payment_metadata, order_items (${ORDER_ITEM_BASIC_WITH_IMAGE})`,
  `id, order_number, created_at, updated_at, user_id, email, status, payment_status, total_amount, refund_amount, currency, notes, stripe_payment_intent_id, shipping_address, billing_address, payment_metadata, order_items (${ORDER_ITEM_BASIC})`,
  `id, created_at, updated_at, user_id, email, status, payment_status, total_amount, currency, notes, stripe_payment_intent_id, shipping_address, billing_address, payment_metadata, order_items (${ORDER_ITEM_BASIC})`,
]

const ADMIN_ORDER_PAGE_SIZE = 1000
const PROFILE_ID_CHUNK = 80

async function selectEveryOrder(client: ReturnType<typeof requireClient>, select: string): Promise<AdminOrderRow[]> {
  const rows: AdminOrderRow[] = []
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const from = pageIndex * ADMIN_ORDER_PAGE_SIZE
    const result = await client
      .from('orders')
      .select(select)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + ADMIN_ORDER_PAGE_SIZE - 1)
      .abortSignal(adminReadSignal())
    if (result.error) throw new Error(result.error.message)
    const page = (result.data ?? []) as unknown as AdminOrderRow[]
    rows.push(...page)
    if (page.length < ADMIN_ORDER_PAGE_SIZE) return rows
  }
  return rows
}

export async function adminListOrders(): Promise<AdminOrderRow[]> {
  const client = requireClient()
  let rows: AdminOrderRow[] | null = null
  let lastError = 'Unable to load orders.'
  for (const select of ADMIN_ORDER_SELECTS) {
    try {
      rows = await selectEveryOrder(client, select)
      break
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
      if (!isSchemaMismatch(error)) break
    }
  }
  if (!rows) throw new Error(lastError)

  const userIds = [...new Set(rows.map((order) => order.user_id).filter((id): id is string => Boolean(id)))]
  if (userIds.length === 0) return rows

  const names = new Map<string, string | null>()
  for (let index = 0; index < userIds.length; index += PROFILE_ID_CHUNK) {
    const chunk = userIds.slice(index, index + PROFILE_ID_CHUNK)
    const profiles = await client.from('profiles').select('id, full_name').in('id', chunk)
    if (profiles.error) return rows
    for (const profile of profiles.data ?? []) {
      names.set(profile.id as string, profile.full_name as string | null)
    }
  }
  return rows.map((order) => ({
    ...order,
    customer_name: order.user_id ? names.get(order.user_id) ?? null : null,
  }))
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

export async function adminDeleteSiteSetting(key: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('site_settings').delete().eq('key', key)
  if (error) throw new Error(error.message)
}

export async function adminGetWaitlistMode(): Promise<boolean> {
  const client = requireClient()
  const { data, error } = await client
    .from('global_settings')
    .select('waitlist_mode')
    .eq('id', GLOBAL_SETTINGS_ROW_ID)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data?.waitlist_mode)
}

export async function adminSetWaitlistMode(enabled: boolean): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from('global_settings')
    .update({ waitlist_mode: enabled, updated_at: new Date().toISOString() })
    .eq('id', GLOBAL_SETTINGS_ROW_ID)

  if (error) throw new Error(error.message)
}

export async function adminDeleteWaitlistEntry(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('waitlist').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminGetDashboardStats(): Promise<AdminDashboardStats> {
  const client = requireClient()
  const [productsRes, waitlistRes, profilesRes, ordersRes, messagesRes] = await Promise.all([
    client.from('products').select('id, stock_quantity, price, status').abortSignal(adminReadSignal()),
    client.from('waitlist').select('id, status').abortSignal(adminReadSignal()),
    client.from('profiles').select('id', { count: 'exact', head: true }).abortSignal(adminReadSignal()),
    client.from('orders').select('id, status, total_amount, payment_status').abortSignal(adminReadSignal()),
    client.from('contact_messages').select('id, status').abortSignal(adminReadSignal()),
  ])

  if (productsRes.error) throw new Error(productsRes.error.message)
  if (waitlistRes.error) throw new Error(waitlistRes.error.message)
  if (profilesRes.error) throw new Error(profilesRes.error.message)
  if (ordersRes.error) throw new Error(ordersRes.error.message)

  const products = productsRes.data ?? []
  const waitlist = waitlistRes.data ?? []
  const orders = ordersRes.data ?? []
  const messages = messagesRes.error ? [] : (messagesRes.data ?? [])

  return {
    productCount: products.length,
    waitlistCount: waitlist.length,
    userCount: profilesRes.count ?? 0,
    pendingOrders: orders.filter((o) => orderInQueue(o.status, o.payment_status, 'paid')).length,
    pendingWaitlist: waitlist.filter((w) => w.status === 'pending').length,
    lowStockCount: products.filter((p) => (p.stock_quantity ?? 0) <= 5 && p.status === 'active').length,
    revenueTotal: orders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0),
    messageCount: messages.length,
    newMessageCount: messages.filter((m) => m.status === 'new').length,
  }
}

export async function adminListContactMessages(): Promise<AdminContactMessageRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('contact_messages')
    .select('id, created_at, updated_at, first_name, last_name, email, message, status, user_id')
    .order('created_at', { ascending: false })
    .abortSignal(adminReadSignal())

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminContactMessageRow[]
}

export async function adminUpdateContactMessageStatus(
  id: string,
  status: AdminContactMessageStatus,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('contact_messages').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function adminDeleteContactMessage(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('contact_messages').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
