import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { WaitlistEntry } from '../types'

export type WaitlistResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' | 'invalid' | 'unknown'; message: string }

/**
 * Persists a waitlist signup to Supabase.
 */
export async function joinWaitlist(entry: WaitlistEntry): Promise<WaitlistResult> {
  const email = entry.email.trim().toLowerCase()
  const phone = entry.phone?.trim() || null

  if (!email) {
    return { ok: false, reason: 'invalid', message: 'Email is required.' }
  }

  // The public form only collects email — `full_name` is still `not null` in the
  // database (see supabase/migrations/0001_initial_schema.sql), so fall back to the
  // email's local-part rather than requiring a schema change for an admin-facing label.
  const fullName = entry.fullName?.trim() || email.split('@')[0] || 'Waitlist'

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      reason: 'unknown',
      message: 'Waitlist is unavailable until Supabase is configured.',
    }
  }

  const payload = {
    full_name: fullName,
    email,
    phone,
    instagram: entry.instagram?.trim() || null,
    interested_product: entry.interestedProductId ?? null,
  }

  const { error } = await supabase.from('waitlist').insert(payload)

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        reason: 'duplicate',
        message: 'You\'re already on the list — we\'ll be in touch.',
      }
    }
    console.error('[waitlistService.joinWaitlist]', error)
    return { ok: false, reason: 'unknown', message: error.message }
  }

  return { ok: true }
}

/**
 * Convenience helper for components that want to pre-flight a duplicate.
 * Storefront RLS denies anon SELECT on the waitlist table by design, so this
 * always returns `false` in live mode and relies on the unique-constraint
 * error path during insert. Available for future admin tooling.
 */
export async function checkExistingWaitlist(email: string): Promise<boolean> {
  if (!email) return false
  if (!isSupabaseConfigured || !supabase) return false

  const { data, error } = await supabase
    .from('waitlist')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle()

  if (error) {
    return false
  }

  return Boolean(data)
}
