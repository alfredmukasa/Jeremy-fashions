import { DEFAULT_CONTACT_EMAIL } from '../constants/siteContent'

export const CONTACT_EMAIL_MAX_LENGTH = 254
export const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeContactEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidContactEmail(value: string): boolean {
  const email = normalizeContactEmail(value)
  if (!email || email.length > CONTACT_EMAIL_MAX_LENGTH) return false
  return CONTACT_EMAIL_PATTERN.test(email)
}

export function parseContactRecipient(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const email = (raw as { email?: unknown }).email
  if (typeof email !== 'string' || !isValidContactEmail(email)) return null
  return normalizeContactEmail(email)
}

export function contactRecipientPayload(email: string): Record<string, unknown> {
  return { email: normalizeContactEmail(email) }
}

export function supportEmailFromStorefront(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const email = (raw as { supportEmail?: unknown }).supportEmail
  if (typeof email !== 'string' || !isValidContactEmail(email)) return null
  return normalizeContactEmail(email)
}

/** Contact-form address wins. The storefront support email is the fallback. */
export function resolveConfiguredSupportEmail(contactRaw: unknown, storefrontRaw?: unknown): string {
  return parseContactRecipient(contactRaw) ?? supportEmailFromStorefront(storefrontRaw) ?? DEFAULT_CONTACT_EMAIL
}
