const CONTACT_EMAIL_MAX_LENGTH = 254
const CONTACT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const DEFAULT_CONTACT_EMAIL = 'support@krewnox.ca'

export type ContactNotice = {
  firstName: string
  lastName: string
  email: string
  message: string
  to: string
}

export type ContactDelivery = {
  delivered: boolean
  provider: 'resend' | 'unconfigured'
}

type MailEnv = {
  resendApiKey?: string
  resendFrom?: string
}

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

export function resolveContactRecipient(raw: unknown): string {
  return parseContactRecipient(raw) ?? DEFAULT_CONTACT_EMAIL
}

export function supportEmailFromStorefront(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const email = (raw as { supportEmail?: unknown }).supportEmail
  if (typeof email !== 'string' || !isValidContactEmail(email)) return null
  return normalizeContactEmail(email)
}

export function resolveConfiguredSupportEmail(contactRaw: unknown, storefrontRaw?: unknown): string {
  return parseContactRecipient(contactRaw) ?? supportEmailFromStorefront(storefrontRaw) ?? DEFAULT_CONTACT_EMAIL
}

export function buildContactEmail(notice: ContactNotice): { subject: string; text: string } {
  const name = `${notice.firstName} ${notice.lastName}`.trim()
  return {
    subject: `New Krewnox message from ${name}`,
    text: [`From: ${name} <${notice.email}>`, '', notice.message].join('\n'),
  }
}

export async function deliverContactEmail(
  notice: ContactNotice,
  env: MailEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ContactDelivery> {
  const email = buildContactEmail(notice)
  if (!env.resendApiKey || !env.resendFrom) {
    console.warn('[contact-email] RESEND_API_KEY or RESEND_FROM_EMAIL is not set; message was stored but not emailed', {
      to: notice.to,
    })
    return { delivered: false, provider: 'unconfigured' }
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.resendFrom,
      to: [notice.to],
      reply_to: notice.email,
      subject: email.subject,
      text: email.text,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend rejected the contact email (${response.status}): ${detail.slice(0, 300)}`)
  }

  return { delivered: true, provider: 'resend' }
}
