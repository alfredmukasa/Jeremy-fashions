import { Router } from 'express'
import type { Request } from 'express'

import { queryD1 } from '../lib/d1.js'
import { readSession, type SessionUser } from '../lib/session.js'

export const purchaseInboxRouter = Router()

// Mirrors can_read_purchase_notifications() from migration 0022: broader than
// the SUPER_ADMIN-only settings routes so order and support admins see alerts.
const INBOX_ROLES = new Set(['SUPER_ADMIN', 'ORDER_MANAGER', 'SUPPORT_ADMIN'])

function inboxAdmin(req: Request): SessionUser | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const user = readSession(header.slice('Bearer '.length).trim())
  if (!user) return null
  if (user.app_metadata?.role !== 'admin') return null
  const role = (user.app_metadata?.admin_role as string | undefined) ?? 'SUPER_ADMIN'
  return INBOX_ROLES.has(role) ? user : null
}

type InboxRow = {
  order_id: string
  created_at: string
  email_sent_at: string | null
  email_last_error: string | null
  order_number: string | null
  total_amount: string | number | null
  currency: string | null
  is_read: number
}

// Port of the admin_purchase_inbox() Postgres function (migration 0022):
// one consistent snapshot with the exact unread count plus the 20 most
// relevant entries (unread first, then newest).
purchaseInboxRouter.get('/', async (req, res) => {
  res.set('Cache-Control', 'private, no-store')
  const admin = inboxAdmin(req)
  if (!admin)
    return res.status(403).json({ error: 'Not authorized to view purchase alerts.' })
  try {
    const unread = await queryD1<{ c: number }>(
      `SELECT count(*) AS c FROM admin_purchase_notifications n
       WHERE NOT EXISTS (
         SELECT 1 FROM admin_purchase_notification_reads r
         WHERE r.order_id = n.order_id AND r.admin_id = ?
       )`,
      [admin.id],
    )
    const rows = await queryD1<InboxRow>(
      `SELECT n.order_id, n.created_at, n.email_sent_at, n.email_last_error,
              o.order_number, o.total_amount, o.currency,
              (CASE WHEN EXISTS (
                 SELECT 1 FROM admin_purchase_notification_reads r
                 WHERE r.order_id = n.order_id AND r.admin_id = ?
               ) THEN 1 ELSE 0 END) AS is_read
       FROM admin_purchase_notifications n
       JOIN orders o ON o.id = n.order_id
       ORDER BY is_read ASC, n.created_at DESC, n.order_id DESC
       LIMIT 20`,
      [admin.id],
    )
    const items = rows.map((row) => ({
      order_id: row.order_id,
      created_at: row.created_at,
      order_number: row.order_number ?? null,
      total_amount: Number(row.total_amount ?? 0),
      currency: row.currency ?? null,
      is_read: row.is_read === 1,
      email_sent_at: row.email_sent_at ?? null,
      email_last_error: row.email_last_error ?? null,
    }))
    return res.json({ unreadCount: Number(unread[0]?.c ?? 0), items })
  } catch {
    return res
      .status(502)
      .json({ error: 'Purchase notifications could not be loaded. Try again.' })
  }
})
