import assert from 'node:assert/strict'
import test from 'node:test'
import { adminReturnPath } from '../src/lib/adminLoginPolicy.ts'
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
