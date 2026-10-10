import { requireSupabaseAdmin } from '../lib/supabase.js'
import {
  evaluateDiscount,
  normalizeDiscountCode,
  type DiscountRule,
  type DiscountType,
  type PricedLine,
} from '../domain/checkoutPricing.js'

export type AppliedDiscount = {
  id: string
  code: string
  amount: number
}

type DiscountRow = {
  id: string
  code: string
  active: boolean
  expires_at: string | null
  percentage: number | null
  discount_type?: string | null
  amount?: number | string | null
  min_subtotal?: number | string | null
  usage_limit?: number | null
  usage_count?: number | null
  product_ids?: string[] | null
  allowed_emails?: string[] | null
}

function asDiscountType(value: string | null | undefined): DiscountType {
  return value === 'fixed' ? 'fixed' : 'percentage'
}

function mapRule(row: DiscountRow): DiscountRule {
  return {
    id: row.id,
    code: row.code,
    active: Boolean(row.active),
    expiresAt: row.expires_at,
    discountType: asDiscountType(row.discount_type),
    percentage: row.percentage == null ? null : Number(row.percentage),
    amount: row.amount == null ? null : Number(row.amount),
    minSubtotal: Number(row.min_subtotal ?? 0),
    usageLimit: row.usage_limit == null ? null : Number(row.usage_limit),
    usageCount: Number(row.usage_count ?? 0),
    productIds: Array.isArray(row.product_ids) ? row.product_ids : [],
    allowedEmails: Array.isArray(row.allowed_emails)
      ? row.allowed_emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
      : [],
  }
}

async function findDiscountRow(code: string): Promise<DiscountRow | null> {
  const db = requireSupabaseAdmin()
  const full = await db.from('discount_codes').select('*').eq('code', code).maybeSingle()
  if (!full.error) return (full.data as DiscountRow | null) ?? null

  const fallback = await db
    .from('discount_codes')
    .select('id, code, percentage, active, expires_at')
    .eq('code', code)
    .maybeSingle()
  if (fallback.error || !fallback.data) return null
  return fallback.data as DiscountRow
}

export async function resolveDiscount(args: {
  code: string | null | undefined
  email: string
  lines: PricedLine[]
  now?: Date
}): Promise<{ applied: AppliedDiscount | null; error: string | null }> {
  const normalized = normalizeDiscountCode(args.code ?? '')
  if (!normalized) return { applied: null, error: null }

  const row = await findDiscountRow(normalized)
  if (!row) return { applied: null, error: 'That code is not valid.' }

  const decision = evaluateDiscount(mapRule(row), args.lines, args.email, args.now)
  if (!decision.ok) return { applied: null, error: decision.error }

  return {
    applied: { id: row.id, code: row.code, amount: decision.amount },
    error: null,
  }
}

export async function recordDiscountRedemption(codeId: string): Promise<void> {
  try {
    const db = requireSupabaseAdmin()
    const { data, error } = await db.rpc('increment_discount_usage', { p_code_id: codeId })
    if (!error) {
      if (data === false) {
        console.warn('[discounts] usage limit already reached', { codeId })
      }
      return
    }
    const fallback = await db.from('discount_codes').select('usage_count, usage_limit').eq('id', codeId).maybeSingle()
    if (fallback.error || !fallback.data || fallback.data.usage_count == null) return
    const next = Number(fallback.data.usage_count) + 1
    if (fallback.data.usage_limit != null && next > Number(fallback.data.usage_limit)) return
    await db.from('discount_codes').update({ usage_count: next }).eq('id', codeId)
  } catch (error) {
    console.warn('[discounts] usage count was not incremented', {
      codeId,
      message: error instanceof Error ? error.message : 'unknown',
    })
  }
}
