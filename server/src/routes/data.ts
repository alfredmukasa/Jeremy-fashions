import { Router } from 'express'
import { queryD1, queryD1In } from '../lib/d1.js'
import { d1Client } from '../lib/d1Client.js'
import { readSession, type SessionUser } from '../lib/session.js'

export const dataRouter = Router()
const PUBLIC_READ = new Set(['products', 'categories', 'site_settings', 'global_settings'])
const PUBLIC_INSERT = new Set(['contact_messages', 'waitlist'])
const PUBLIC_SETTING_KEYS = ['hero_slides','footer_social','top_banner','home_product_header','return_policy','shipping_instructions','privacy_policy','terms_of_service','contact_recipient','storefront','shipping_rates']
const OWNER_COLUMN: Record<string, string> = { profiles: 'id', orders: 'user_id', user_shipping_addresses: 'user_id' }
const TABLES = new Set([...PUBLIC_READ, ...PUBLIC_INSERT, 'orders','order_items','profiles','discount_codes','user_shipping_addresses','audit_logs','admin_purchase_notifications','admin_purchase_notification_reads','admin_ownership_transfers','admin_login_limits'])

type Filter = { op: 'eq' | 'in' | 'neq' | 'not-in'; column: string; value: unknown }
type DataBody = {
  table?: string
  action?: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  columns?: string
  filters?: Filter[]
  orders?: Array<{ column: string; ascending?: boolean }>
  limit?: number | null
  offset?: number | null
  values?: Record<string, unknown> | Record<string, unknown>[] | null
  onConflict?: string
  single?: 'many' | 'one' | 'maybe'
  head?: boolean
}

function isAdmin(user: SessionUser | null): boolean { return user?.app_metadata?.role === 'admin' }
function bearer(header: string | undefined): SessionUser | null {
  if (!header?.startsWith('Bearer ')) return null
  return readSession(header.slice('Bearer '.length).trim())
}
function splitSelect(select: string): { columns: string[]; embeds: Array<{ table: string; columns: string }> } {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const char of select) {
    if (char === '(') depth += 1
    if (char === ')') depth = Math.max(0, depth - 1)
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue }
    current += char
  }
  if (current.trim()) parts.push(current.trim())
  const columns: string[] = []
  const embeds: Array<{ table: string; columns: string }> = []
  for (const part of parts) {
    const embed = part.match(/^([a-z_]+)\s*\(([\s\S]*)\)$/i)
    if (embed?.[1] && embed[2]) embeds.push({ table: embed[1], columns: embed[2] })
    else if (part) columns.push(part)
  }
  return { columns, embeds }
}
async function attachEmbeds(table: string, rows: Record<string, unknown>[], embeds: Array<{ table: string; columns: string }>) {
  for (const embed of embeds) {
    if (table !== 'orders' || embed.table !== 'order_items') continue
    const ids = rows.map((row) => String(row.id ?? '')).filter(Boolean)
    const items = await queryD1In<Record<string, unknown>>('SELECT * FROM order_items WHERE order_id', ids)
    const productEmbed = splitSelect(embed.columns).embeds.find((entry) => entry.table === 'products')
    let products: Record<string, unknown>[] = []
    if (productEmbed) {
      const productIds = [...new Set(items.map((item) => String(item.product_id ?? '')).filter(Boolean))]
      products = await queryD1In<Record<string, unknown>>('SELECT id, image_url, gallery_images FROM products WHERE id', productIds)
    }
    for (const row of rows) {
      row.order_items = items.filter((item) => item.order_id === row.id).map((item) => productEmbed ? { ...item, products: products.find((product) => product.id === item.product_id) ?? null } : item)
    }
  }
}

dataRouter.post('/', async (req, res) => {
  const body = (req.body ?? {}) as DataBody
  const table = body.table ?? ''
  const action = body.action ?? 'select'
  if (!TABLES.has(table)) return res.status(403).json({ data: null, error: { message: 'That table is not available.' } })
  const user = bearer(req.headers.authorization)
  const admin = isAdmin(user)
  const filters = Array.isArray(body.filters) ? [...body.filters] : []
  if (action === 'select' && !admin && !PUBLIC_READ.has(table) && !user) return res.status(401).json({ data: null, error: { message: 'Sign in to view this data.' } })
  if (action !== 'select' && !admin && !(action === 'insert' && PUBLIC_INSERT.has(table)) && !user) return res.status(401).json({ data: null, error: { message: 'Sign in to change this data.' } })
  if (!admin && action !== 'select' && !PUBLIC_INSERT.has(table) && !OWNER_COLUMN[table]) return res.status(403).json({ data: null, error: { message: 'You cannot change that data.' } })
  const ownerColumn = OWNER_COLUMN[table]
  if (!admin && user && ownerColumn && action !== 'insert' && action !== 'upsert') {
    if (!filters.some((filter) => filter.op === 'eq' && filter.column === ownerColumn && filter.value === user.id)) filters.push({ op: 'eq', column: ownerColumn, value: user.id })
  }
  if (!admin && user && ownerColumn && (action === 'insert' || action === 'upsert')) {
    const rows = Array.isArray(body.values) ? body.values : body.values ? [body.values] : []
    for (const row of rows) row[ownerColumn] = user.id
  }
  if (!admin && table === 'site_settings') filters.push({ op: 'in', column: 'key', value: PUBLIC_SETTING_KEYS })
  if (table === 'order_items' && !admin) return res.status(403).json({ data: null, error: { message: 'Order items are available from your orders.' } })
  if (body.head) {
    if (!admin) return res.status(403).json({ data: null, error: { message: 'You cannot count that table.' } })
    const countRows = await queryD1<{ total: number }>(`SELECT COUNT(*) AS total FROM ${table}`)
    return res.json({ data: null, count: Number(countRows[0]?.total ?? 0), error: null })
  }
  const parsed = splitSelect(body.columns || '*')
  let request = d1Client.from(table)
  if (action === 'select') request = request.select(parsed.columns.length ? parsed.columns.join(', ') : '*')
  for (const filter of filters) {
    if (filter.op === 'eq') request = request.eq(filter.column, filter.value)
    else if (filter.op === 'neq') request = request.neq(filter.column, filter.value)
    else if (filter.op === 'in' && Array.isArray(filter.value)) request = request.in(filter.column, filter.value)
    else if (filter.op === 'not-in' && Array.isArray(filter.value)) request = request.not(filter.column, 'in', `(${filter.value.map((value) => `"${String(value)}"`).join(',')})`)
  }
  for (const order of body.orders ?? []) request = request.order(order.column, { ascending: order.ascending !== false })
  if (typeof body.offset === 'number' && typeof body.limit === 'number') request = request.range(body.offset, body.offset + body.limit - 1)
  else if (typeof body.limit === 'number') request = request.limit(body.limit)
  if (action === 'insert' || action === 'upsert') {
    if (!body.values) return res.status(400).json({ data: null, error: { message: 'Missing values.' } })
    const rows = (Array.isArray(body.values) ? body.values : [body.values]).map((row) => { const copy = { ...row }; delete copy.password_hash; return copy })
    request = action === 'upsert' ? d1Client.from(table).upsert(rows, { onConflict: body.onConflict }) : d1Client.from(table).insert(rows)
  } else if (action === 'update') {
    const patch = { ...(body.values as Record<string, unknown>) }
    delete patch.password_hash
    request = request.update(patch)
  } else if (action === 'delete') request = request.delete()
  const result = body.single === 'one' ? await request.single() : body.single === 'maybe' ? await request.maybeSingle() : await request
  if (result.error) return res.status(400).json(result)
  if (action === 'select' && Array.isArray(result.data)) {
    await attachEmbeds(table, result.data, parsed.embeds)
  }
  // Do not cache database-backed POST responses: waitlist, inventory and admin changes must not appear stale.
  // Public product assets can be cached separately at the CDN with explicit invalidation.
  res.set('Cache-Control', 'no-store')
  return res.json(result)
})
