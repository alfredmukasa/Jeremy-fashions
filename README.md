# KREWNOX storefront

Production fashion storefront for [krewnox.ca](https://krewnox.ca): React 19 + Vite + TypeScript on the client, Express payment API on Vercel, Supabase Auth/Postgres, and Stripe PaymentIntents in CAD.

`PROJECT_SETUP.md` is the original frontend-only MVP brief. Do not follow it for current architecture or payments.

## Pricing

Catalog rows have `price` plus optional `compare_price`. Checkout and the storefront charge the **lower** of the two:

- Higher second amount → compare-at strikethrough, charge `price`
- Lower second amount → sale, charge the lower amount
- Missing or equal → charge `price`

Admin labels this field **Compare at / sale**. Staff should not enter a number they do not want charged if it is lower than Price.

## Inventory

Product-level `stock_quantity` is always decremented atomically after payment. Optional `stock_by_size` (migration `0021_checkout_integrity_and_rbac.sql`) enforces per-size remaining units when filled. Full refunds restock when the order had stock decremented.

## Auth and orders

- `profiles.suspended` / `account_status` block sign-in after migration 0021 (`account_is_blocked()`).
- `claim_guest_orders()` attaches guest checkouts with the same email to a newly signed-in account.
- Admin write RLS uses JWT `app_metadata.admin_role`. Apply 0021 before relying on that.

## Contact and newsletter

`POST /api/contact/submit` (also `/notify`) validates, stores the message, and emails support. The home newsletter writes to the waitlist table — it is not a demo form.

## Payments health

`GET /api/health` reports whether `STRIPE_WEBHOOK_SECRET`, the Supabase service role (guest checkout), and Resend are configured. The admin overview warns when the webhook secret or guest checkout key is missing.

## Applying migration 0021

Apply `supabase/migrations/0021_checkout_integrity_and_rbac.sql` in the Supabase SQL editor for the live project. Do **not** replay `0004_promote_alfred_mukasa_admin.sql`. Live history already includes extra timestamped migrations; 0021 is additive.

Until 0021 is applied, the app falls back: catalog queries omit `stock_by_size`, checkout still charges the lower catalog price, and guest-order claim / blocked-account RPC no-ops.

## Scripts

```bash
npm run dev
npm run dev:server
npx tsx --test server/test/*.test.ts
npx tsx scripts/verify-store-features.ts
```
