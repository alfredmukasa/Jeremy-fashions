# Shipping contact number

Checkout and saved-address forms require a delivery contact number. Common international formatting is accepted (7–15 digits, optional leading +, at most 40 characters). This validates format, not number ownership or reachability.

Apply `supabase/migrations/0024_shipping_contact_phone.sql` before releasing the application. It adds a nullable text column and format constraint to `user_shipping_addresses`, preserving legacy addresses and existing RLS policies. New orders snapshot the number as `orders.shipping_address.phone`; no extra orders column is needed. Historical orders remain unchanged.

The admin order shipping details, customer order details, checkout confirmation, and receipt display the saved contact number. Selecting an older address without a number exposes an editable phone field at checkout.

## Validation

- Before changes: production build and 6 notification tests passed.
- After changes: production build passed; 44 tests passed across shipping validation, database migration/RLS, saved legacy address UI, existing UI regression tests, and server tests.
- Lint baseline and updated source both report 10 errors and 5 warnings in the existing rules/files. No new lint rule violations.
- Tests use synthetic contact details and local PostgreSQL-compatible PGlite; no real payment was charged.

Run `npm run test:shipping` for the focused regression checks.
