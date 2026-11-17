import { queryD1 } from '../lib/d1.js'
import {
  normalizeCategoryRow,
  normalizeProductRow,
  normalizeSiteSetting,
  type PublicCategoryRow,
  type PublicProductRow,
  type PublicSiteSetting,
} from '../domain/publicCatalogRows.js'

const PUBLIC_SETTING_KEYS = [
  'hero_slides',
  'footer_social',
  'top_banner',
  'home_product_header',
  'return_policy',
  'shipping_instructions',
  'privacy_policy',
  'terms_of_service',
  'contact_recipient',
] as const

const GLOBAL_SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001'
const CACHE_MS = 30_000

export type PublicCatalog = {
  products: PublicProductRow[]
  categories: PublicCategoryRow[]
  siteSettings: PublicSiteSetting[]
  waitlistMode: boolean
}

type ProductRecord = Record<string, unknown>
type CategoryRecord = Record<string, unknown>
type SettingRecord = { key?: unknown; value?: unknown; updated_at?: unknown }
type WaitlistRecord = { waitlist_mode?: unknown }

let cache: { at: number; value: PublicCatalog } | null = null

export async function readPublicCatalog(): Promise<PublicCatalog> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value

  const settingPlaceholders = PUBLIC_SETTING_KEYS.map(() => '?').join(', ')
  const [products, categories, settings, waitlist] = await Promise.all([
    queryD1<ProductRecord>(
      `SELECT id, created_at, title, slug, description, price, compare_price, category, brand,
              stock_quantity, featured, rating, image_url, gallery_images, tags, sku, status,
              gender, sizes, colors, attributes
       FROM products
       WHERE status = 'active'
       ORDER BY created_at DESC`,
    ),
    queryD1<CategoryRecord>(
      `SELECT id, name, slug, description, image_url, product_kind
       FROM categories
       ORDER BY name ASC`,
    ),
    queryD1<SettingRecord>(
      `SELECT key, value, updated_at FROM site_settings WHERE key IN (${settingPlaceholders})`,
      [...PUBLIC_SETTING_KEYS],
    ),
    queryD1<WaitlistRecord>(`SELECT waitlist_mode FROM global_settings WHERE id = ?`, [GLOBAL_SETTINGS_ROW_ID]),
  ])

  const value: PublicCatalog = {
    products: products.map(normalizeProductRow),
    categories: categories.map(normalizeCategoryRow),
    siteSettings: settings.map(normalizeSiteSetting),
    waitlistMode: waitlist[0]?.waitlist_mode === 1 || waitlist[0]?.waitlist_mode === true,
  }
  cache = { at: Date.now(), value }
  return value
}
