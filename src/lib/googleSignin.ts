/**
 * Google sign-in is PAUSED on the live Cloudflare storefront. The store runs its
 * backend on Cloudflare D1 and customers log in with email + password, so the
 * "Continue with Google" button is hidden on the customer login/register screens.
 *
 * This is deliberately a single, easily-reversible switch. The full Google OAuth
 * implementation is preserved on branch `cursor/auth-google-reset-f4a6` (PR #23);
 * the `GoogleAuthButton` component is also kept in the codebase. To re-enable
 * Google sign-in later (once the OAuth endpoints are deployed), set the env var
 * `VITE_GOOGLE_SIGNIN_ENABLED=true` at build time — no code change required.
 *
 * Defaults to OFF: anything other than the string "true" keeps the button hidden.
 */
export function isGoogleSigninEnabled(): boolean {
  return import.meta.env.VITE_GOOGLE_SIGNIN_ENABLED === 'true'
}
