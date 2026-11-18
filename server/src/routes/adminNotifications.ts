import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { d1Client } from '../lib/d1Client.js'
import { readSession } from '../lib/session.js'
import {
  deliverAdminPurchaseEmail,
  readPurchaseEmailSettings,
} from '../services/adminPurchaseEmail.js'

export const adminNotificationsRouter = Router()

adminNotificationsRouter.use(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : ''
  if (!token)
    return res.status(401).json({ error: 'Staff sign-in is required.' })
  const session = readSession(token)
  if (!session)
    return res.status(401).json({ error: 'Staff sign-in is required.' })
  if (
    session.app_metadata.role !== 'admin' ||
    (session.app_metadata.admin_role ?? 'SUPER_ADMIN') !== 'SUPER_ADMIN'
  ) {
    return res.status(403).json({
      error: 'Only settings administrators can manage purchase alerts.',
    })
  }
  return next()
})

adminNotificationsRouter.get(
  '/purchase-notifications/status',
  async (_req, res) => {
    res.set('Cache-Control', 'private, no-store')
    let databaseConnected = false
    try {
      const check = await d1Client
        .from('admin_purchase_notifications')
        .select('order_id')
        .limit(1)
      databaseConnected = !check.error
    } catch {
      /* Report unavailable without exposing configuration. */
    }
    return res.json({
      databaseConnected,
      emailConfigured: Boolean(
        process.env.RESEND_API_KEY?.trim() &&
        process.env.RESEND_FROM_EMAIL?.trim(),
      ),
    })
  },
)

adminNotificationsRouter.post(
  '/purchase-notifications/test',
  rateLimit({ windowMs: 60_000, limit: 3 }),
  async (_req, res) => {
    try {
      const apiKey = process.env.RESEND_API_KEY?.trim()
      const from = process.env.RESEND_FROM_EMAIL?.trim()
      if (!apiKey || !from)
        return res
          .status(503)
          .json({ error: 'The email service is not configured.' })
      const settings = await readPurchaseEmailSettings(d1Client)
      await deliverAdminPurchaseEmail(
        `test-${randomUUID()}`,
        {
          from,
          to: [settings.to],
          subject: 'KREWNOX purchase alerts — test email',
          text: 'This is a test of KREWNOX admin purchase alerts. No purchase was made and no payment was charged. Future confirmed purchases will include the order number, items, total and a link to the admin orders page.',
        },
        apiKey,
      )
      return res.json({ accepted: true, to: settings.to })
    } catch {
      return res.status(502).json({
        error:
          'The test email was not accepted. Check the email service configuration and retry.',
      })
    }
  },
)
