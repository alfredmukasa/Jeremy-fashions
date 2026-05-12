import type { User } from '@supabase/supabase-js'

/**
 * Admin role is enforced in RLS via JWT `app_metadata.role === "admin"`.
 * Optionally restrict which emails may use the admin UI (client hint only; RLS remains authoritative).
 */
export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  return user.app_metadata?.role === 'admin'
}

/** Lowercased emails from VITE_ADMIN_ALLOWED_EMAILS (comma-separated). Empty = no extra client filter. */
export function getAdminAllowedEmails(): string[] {
  const raw = import.meta.env.VITE_ADMIN_ALLOWED_EMAILS
  if (typeof raw !== 'string' || !raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowedForAdmin(email: string | null | undefined): boolean {
  const allow = getAdminAllowedEmails()
  if (!allow.length) return true
  if (!email) return false
  return allow.includes(email.trim().toLowerCase())
}
