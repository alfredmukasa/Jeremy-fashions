/** Map Supabase auth errors to branded, user-safe copy. */

export const AUTH_UNAVAILABLE_MESSAGE = 'Sign-in is temporarily unavailable. Please try again shortly.'
export const ACCOUNT_BLOCKED_MESSAGE =
  'This account has been suspended. Contact support if you need help.'

export function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase()

  if (
    lower.includes('suspended') ||
    lower.includes('banned') ||
    lower.includes('this account has been blocked') ||
    lower.includes('this account has been suspended')
  ) {
    return ACCOUNT_BLOCKED_MESSAGE
  }

  if (
    lower.includes('supabase is not configured') ||
    lower.includes('not configured for this environment') ||
    lower.includes('sign-in is not configured')
  ) {
    return AUTH_UNAVAILABLE_MESSAGE
  }
  if (lower.includes('expired') || lower.includes('otp_expired')) {
    return 'This link has expired. Request a new confirmation or reset email and try again.'
  }
  if (lower.includes('invalid') && (lower.includes('token') || lower.includes('code'))) {
    return 'This link is invalid or was already used. Sign in if your email is already confirmed.'
  }
  if (lower.includes('already') && lower.includes('confirmed')) {
    return 'Your email is already confirmed. You can sign in now.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in. Check your inbox for the confirmation link.'
  }
  if (lower.includes('storage') || lower.includes('localstorage') || lower.includes('quota')) {
    return 'Your browser blocked session storage. Turn off private browsing or allow site data, then try again.'
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'We could not reach the sign-in service. Check your connection and try again.'
  }
  if (lower.includes('provider') && (lower.includes('not enabled') || lower.includes('not found') || lower.includes('unsupported'))) {
    return 'Google sign-in is not available right now. Please use email and password, or try again shortly.'
  }

  return message
}
