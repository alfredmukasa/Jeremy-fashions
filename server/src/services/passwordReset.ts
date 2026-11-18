import { createHash, randomBytes } from 'node:crypto'

import { isValidContactEmail } from './contactMail.js'

/**
 * Password-reset token + email helpers.
 *
 * Kept free of `config`/`d1` imports so the pure crypto and email-building logic can be
 * unit tested without the server's required environment. The D1 persistence (create /
 * consume token rows) lives in `cloudflareAuth.ts`, which already owns the auth tables.
 */

/** Reset links are valid for one hour. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** A high-entropy single-use token. Only its SHA-256 hash is ever stored in D1. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function isResetTokenExpired(expiresAt: string, now: number = Date.now()): boolean {
  const expiry = Date.parse(expiresAt)
  return !Number.isFinite(expiry) || expiry <= now
}

/** Absolute reset link the customer clicks. `baseUrl` is the public site origin. */
export function buildResetLink(baseUrl: string, token: string): string {
  const url = new URL('/reset-password', baseUrl.replace(/\/$/, ''))
  url.searchParams.set('token', token)
  return url.toString()
}

export type ResetMailEnv = {
  resendApiKey?: string
  resendFrom?: string
  replyTo?: string
}

export type ResetMailDelivery = {
  delivered: boolean
  provider: 'resend' | 'unconfigured'
}

export function buildPasswordResetText(resetLink: string): string {
  return [
    'KREWNOX',
    'Reset your password',
    '',
    'We received a request to reset the password for your Krewnox account.',
    'Use the link below to choose a new password. It expires in 1 hour and can be used once.',
    '',
    resetLink,
    '',
    'If you did not request this, you can safely ignore this email — your password will not change.',
  ].join('\n')
}

export function buildPasswordResetHtml(resetLink: string): string {
  const safeLink = escapeHtml(resetLink)
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f5;font-family:Georgia,Times,serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e5e5;padding:32px;">
        <p style="margin:0;letter-spacing:0.28em;font-size:11px;color:#737373;text-transform:uppercase;">KREWNOX</p>
        <h1 style="margin:16px 0 8px;font-size:28px;font-weight:400;color:#0a0a0a;">Reset your password</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#525252;">We received a request to reset the password for your Krewnox account. Choose a new password with the button below. This link expires in 1 hour and can be used once.</p>
        <p style="margin:0 0 24px;">
          <a href="${safeLink}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:14px;">Choose a new password</a>
        </p>
        <p style="margin:0 0 8px;font-size:12px;color:#737373;">Or paste this link into your browser:</p>
        <p style="margin:0 0 24px;font-size:12px;color:#525252;word-break:break-all;">${safeLink}</p>
        <p style="margin:24px 0 0;font-size:12px;color:#737373;">If you did not request this, you can safely ignore this email — your password will not change.</p>
      </div>
    </div>
  </body>
</html>`
}

export async function deliverPasswordResetEmail(
  args: { email: string; resetLink: string },
  env: ResetMailEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<ResetMailDelivery> {
  if (!env.resendApiKey || !env.resendFrom) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL is not set; password reset email was not sent')
    return { delivered: false, provider: 'unconfigured' }
  }
  if (!isValidContactEmail(args.email)) {
    throw new Error('Reset recipient is not a valid email address.')
  }

  const payload: Record<string, unknown> = {
    from: env.resendFrom,
    to: [args.email],
    subject: 'Reset your Krewnox password',
    html: buildPasswordResetHtml(args.resetLink),
    text: buildPasswordResetText(args.resetLink),
  }
  if (env.replyTo && isValidContactEmail(env.replyTo)) {
    payload.reply_to = env.replyTo
  }

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend rejected the password reset email (${response.status}): ${detail.slice(0, 300)}`)
  }

  return { delivered: true, provider: 'resend' }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
