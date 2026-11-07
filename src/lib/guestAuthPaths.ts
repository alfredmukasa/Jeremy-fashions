import { ROUTES } from '../constants'

export function guestLoginPath(email?: string) {
  const trimmed = email?.trim()
  return trimmed ? `${ROUTES.login}?email=${encodeURIComponent(trimmed)}` : ROUTES.login
}

export function guestRegisterPath(email?: string) {
  const trimmed = email?.trim()
  return trimmed ? `${ROUTES.register}?email=${encodeURIComponent(trimmed)}` : ROUTES.register
}
