# Admin sign-in

The admin page supports Google OAuth through the existing Supabase provider and exact callback URL. A short-lived, per-tab marker preserves the staff return path without adding query parameters to the allowlisted callback. The callback verifies the signed-in user with Supabase and requires the existing admin role and optional email allowlist. Google never grants an admin role. Return paths stay inside the configured admin area. Customer Google sign-in clears any abandoned staff marker before starting its normal flow.

The staff password form uses `/api/admin/auth/password`. Apply `0023_admin_login_limits.sql` before deploying. The endpoint permits five attempts per email and source IP in a 15-minute window, plus 20 attempts per source IP across email addresses. Successful staff sign-in clears the email/IP counter. Limits are stored in a service-only table, so browser-storage clearing and serverless restarts do not reset them. Identifiers are SHA-256 hashes; passwords and session tokens are not stored in this table. Expired buckets are cleaned up during requests.

Password entry is limited to 128 characters on both client and server. No new minimum length or composition rule is imposed at sign-in, so existing credentials remain usable. Supabase continues to enforce its password policy on account creation and password changes. No credentials are changed by this feature.

These extra limits apply to the website's staff password endpoint. Direct requests to Supabase Auth retain Supabase's own rate limits; this is not a project-wide account lockout or a substitute for MFA. Provider-level password verification hooks or CAPTCHA would require separate Supabase configuration and may affect other sign-in flows. Existing customer authentication and payment settings are unchanged.

Tests: `node --import ./server/node_modules/tsx/dist/loader.mjs --test server/test/adminLogin.test.ts scripts/admin-login-limits.test.ts scripts/admin-login-policy.test.ts`.
