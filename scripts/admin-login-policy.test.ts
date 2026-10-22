import assert from 'node:assert/strict'
import test from 'node:test'
import {
  adminReturnPath,
  rememberAdminOAuthReturn,
  readAdminOAuthReturn,
  clearAdminOAuthReturn,
} from '../src/lib/adminLoginPolicy.ts'
import {
  clearAdminLoginFailures,
  getAdminLoginLockoutRemainingMs,
  recordAdminLoginFailure,
} from '../src/pages/Admin/adminLoginLockout.ts'

test('staff redirects reject external destinations, slash escapes and login loops', () => {
  const base = '/krewnox-admin'
  for (const value of [
    'https://evil.example',
    '//evil.example',
    '/shop',
    '/krewnox-admin/login',
    '/krewnox-admin/login#again',
    '/krewnox-admin/\\evil',
    '/krewnox-admin/\nwrong',
  ])
    assert.equal(adminReturnPath(value, base), base)
  assert.equal(
    adminReturnPath('/krewnox-admin/orders', base),
    '/krewnox-admin/orders',
  )
  assert.equal(adminReturnPath('/ops/settings', '/ops'), '/ops/settings')
})

test('staff OAuth intent is tab-scoped, expires, clears for other flows, and handles blocked storage', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  )
  const originalNow = Date.now
  const values = new Map<string, string>()
  let now = 1_000_000
  Date.now = () => now
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  })
  try {
    assert.equal(rememberAdminOAuthReturn('/krewnox-admin/orders'), true)
    assert.equal(readAdminOAuthReturn(), '/krewnox-admin/orders')
    clearAdminOAuthReturn()
    assert.equal(readAdminOAuthReturn(), null)
    rememberAdminOAuthReturn('/krewnox-admin')
    now += 600_001
    assert.equal(readAdminOAuthReturn(), null)
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    assert.equal(rememberAdminOAuthReturn('/krewnox-admin'), false)
    assert.equal(readAdminOAuthReturn(), null)
    clearAdminOAuthReturn()
  } finally {
    Date.now = originalNow
    if (originalStorage)
      Object.defineProperty(globalThis, 'sessionStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'sessionStorage')
  }
})

test('browser password cooldown survives shared storage, expires and handles unavailable storage', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  )
  const originalNow = Date.now
  const values = new Map<string, string>()
  let now = 1_000_000
  Date.now = () => now
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  })
  try {
    clearAdminLoginFailures()
    for (let i = 0; i < 4; i++) recordAdminLoginFailure()
    assert.equal(getAdminLoginLockoutRemainingMs(), 0)
    recordAdminLoginFailure()
    assert.equal(getAdminLoginLockoutRemainingMs(), 900_000)
    values.clear()
    assert.equal(
      getAdminLoginLockoutRemainingMs(),
      0,
      'a successful sign-in in another tab clears browser feedback',
    )
    recordAdminLoginFailure(30)
    assert.equal(getAdminLoginLockoutRemainingMs(), 30_000)
    now += 31_000
    assert.equal(getAdminLoginLockoutRemainingMs(), 0)
    clearAdminLoginFailures()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked')
      },
    })
    for (let i = 0; i < 5; i++) recordAdminLoginFailure()
    assert.equal(getAdminLoginLockoutRemainingMs(), 900_000)
    clearAdminLoginFailures()
  } finally {
    Date.now = originalNow
    if (originalStorage)
      Object.defineProperty(globalThis, 'localStorage', originalStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
