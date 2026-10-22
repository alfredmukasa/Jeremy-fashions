import {
  ADMIN_LOGIN_LOCKOUT_MS,
  ADMIN_LOGIN_MAX_FAILURES,
} from '../../lib/adminLoginPolicy'

const STORAGE_KEY = 'krewnox_admin_login_lockout_v2'

const MAX_FAILURES = ADMIN_LOGIN_MAX_FAILURES
const LOCKOUT_MS = ADMIN_LOGIN_LOCKOUT_MS
let fallback: LockRecord = { failures: 0, lockedUntil: 0, windowStartedAt: 0 }

type LockRecord = {
  failures: number
  lockedUntil: number
  windowStartedAt: number
}

function read(): LockRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { failures: 0, lockedUntil: 0, windowStartedAt: 0 }
    const p = JSON.parse(raw) as Partial<LockRecord>
    return {
      failures:
        Number.isInteger(p.failures) && p.failures! >= 0 ? p.failures! : 0,
      lockedUntil:
        typeof p.lockedUntil === 'number' && Number.isFinite(p.lockedUntil)
          ? p.lockedUntil
          : 0,
      windowStartedAt:
        typeof p.windowStartedAt === 'number' &&
        Number.isFinite(p.windowStartedAt)
          ? p.windowStartedAt
          : 0,
    }
  } catch {
    return fallback
  }
}

function write(r: LockRecord) {
  fallback = r
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r))
  } catch {
    /* Server limits remain authoritative. */
  }
}

export function getAdminLoginLockoutRemainingMs(): number {
  const { lockedUntil } = read()
  return Math.max(0, lockedUntil - Date.now())
}

export function recordAdminLoginFailure(retryAfterSeconds = 0): void {
  const now = Date.now()
  let { failures, lockedUntil, windowStartedAt } = read()
  if (lockedUntil > now) return
  if (!windowStartedAt || now - windowStartedAt >= LOCKOUT_MS) {
    failures = 0
    windowStartedAt = now
  }
  failures += 1
  if (failures >= MAX_FAILURES || retryAfterSeconds > 0) {
    lockedUntil =
      now + (retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : LOCKOUT_MS)
    failures = 0
  }
  write({ failures, lockedUntil, windowStartedAt })
}

export function clearAdminLoginFailures(): void {
  fallback = { failures: 0, lockedUntil: 0, windowStartedAt: 0 }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* Storage can be unavailable in private mode. */
  }
}
