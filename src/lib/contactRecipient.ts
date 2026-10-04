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
