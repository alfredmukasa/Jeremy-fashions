# Admin purchase notifications

Apply `supabase/migrations/0022_admin_purchase_notifications.sql` before deploying this feature. It adds two RLS-protected tables, a paid-order trigger, an inbox RPC and Realtime publication entries. It does not backfill or email historical orders.

The existing server paths that confirm payment and send the customer receipt also send an independent admin alert. The admin recipient is configured in Settings → New purchase alerts; blank uses the saved support email. Customer receipts keep their existing recipient and content. Both use the existing server-only Resend configuration. Stripe configuration is unchanged.

Each paid order gets one persistent notification. Email delivery uses an atomic lease, a saved payload, a sent timestamp and a Resend idempotency key. A provider failure leaves payment intact and allows the existing webhook retry or confirmation-status flow to retry the email. Customer receipt delivery runs independently. The inbox count is per admin, updates through Supabase Realtime, and polls every 15 seconds as a fallback. Unread entries appear before read history.

Only admins with order access can read notifications or mark their own entries read. Only the server can write email delivery state. Settings administrators can send a clearly labeled test email to the saved recipient; this creates no order or charge.

Run `npm run test:notifications` after installing root and server dependencies. The database test uses isolated PostgreSQL via PGlite, including trigger behavior, no historical backfill, RLS, per-admin reads and counts above the displayed 20 entries. Email tests mock the provider to check recipients, disabled alerts, concurrent claims and retry behavior.
