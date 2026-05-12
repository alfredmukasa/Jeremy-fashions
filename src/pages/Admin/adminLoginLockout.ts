const STORAGE_KEY = 'jeremy_admin_login_lockout'

const MAX_FAILURES = 8
const LOCKOUT_MS = 5 * 60 * 1000

type LockRecord = { failures: number; lockedUntil: number }

function read(): LockRecord {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { failures: 0, lockedUntil: 0 }
    const p = JSON.parse(raw) as Partial<LockRecord>
    return {
      failures: typeof p.failures === 'number' ? p.failures : 0,
      lockedUntil: typeof p.lockedUntil === 'number' ? p.lockedUntil : 0,
    }
  } catch {
    return { failures: 0, lockedUntil: 0 }
  }
}

function write(r: LockRecord) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(r))
}

export function getAdminLoginLockoutRemainingMs(): number {
  const { lockedUntil } = read()
  return Math.max(0, lockedUntil - Date.now())
}

export function recordAdminLoginFailure(): void {
  const now = Date.now()
  let { failures, lockedUntil } = read()
  if (lockedUntil > now) return
  failures += 1
  if (failures >= MAX_FAILURES) {
    lockedUntil = now + LOCKOUT_MS
    failures = 0
  }
  write({ failures, lockedUntil })
}

export function clearAdminLoginFailures(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
