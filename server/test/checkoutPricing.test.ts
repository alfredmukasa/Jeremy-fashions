import assert from 'node:assert/strict'
import test from 'node:test'

import {
  STORE_CURRENCY,
  calculateOrderTotals,
  canonicalSize,
  compareStripePayment,
  evaluateDiscount,
  normalizeDiscountCode,
  sizeSelectionError,
  stripeLineDescription,
  toMinorUnits,
  type DiscountRule,
} from '../src/domain/checkoutPricing.ts'

const baseRule = (overrides: Partial<DiscountRule> = {}): DiscountRule => ({
  id: 'code-1',
  code: 'KREWNOX1',
  active: true,
  expiresAt: null,
  discountType: 'percentage',
  percentage: 10,
  amount: null,
  minSubtotal: 0,
  usageLimit: null,
  usageCount: 0,
  productIds: [],
  allowedEmails: [],
  ...overrides,
})

test('normalizes discount codes by trimming, removing whitespace, and uppercasing', () => {
  assert.equal(normalizeDiscountCode('  krewnox1 '), 'KREWNOX1')
  assert.equal(normalizeDiscountCode('save 10'), 'SAVE10')
})

test('applies a percentage once and never discounts below zero', () => {
  const decision = evaluateDiscount(
    baseRule({ percentage: 10 }),
    [{ productId: 'p1', quantity: 2, unitPrice: 50 }],
    'guest@example.com',
  )
  assert.equal(decision.ok, true)
  if (!decision.ok) return
  assert.equal(decision.amount, 10)

  const totals = calculateOrderTotals(
    [{ productId: 'p1', quantity: 2, unitPrice: 50 }],
    decision.amount,
  )
  assert.equal(totals.currency, 'CAD')
  assert.equal(totals.subtotal, 100)
  assert.equal(totals.discount, 10)
  assert.equal(totals.shipping, 12)
  assert.equal(totals.tax, 7.2)
  assert.equal(totals.total, 109.2)
  assert.equal(toMinorUnits(totals.total), 10920)
  assert.ok(totals.total >= 0)
})

test('applies a fixed amount only to restricted products and respects minimums', () => {
  const lines = [
    { productId: 'hoodie', quantity: 1, unitPrice: 80 },
    { productId: 'pants', quantity: 1, unitPrice: 40 },
  ]
  const tooSmall = evaluateDiscount(baseRule({ minSubtotal: 200 }), lines, 'a@b.co')
  assert.equal(tooSmall.ok, false)

  const restricted = evaluateDiscount(
    baseRule({
      discountType: 'fixed',
      percentage: null,
      amount: 15,
      productIds: ['hoodie'],
    }),
    lines,
    'a@b.co',
  )
  assert.equal(restricted.ok, true)
  if (!restricted.ok) return
  assert.equal(restricted.amount, 15)

  const miss = evaluateDiscount(
    baseRule({ productIds: ['missing'] }),
    lines,
    'a@b.co',
  )
  assert.equal(miss.ok, false)
})

test('rejects inactive, expired, exhausted, and email-restricted codes', () => {
  const lines = [{ productId: 'p1', quantity: 1, unitPrice: 40 }]
  assert.equal(evaluateDiscount(baseRule({ active: false }), lines, 'a@b.co').ok, false)
  assert.equal(
    evaluateDiscount(baseRule({ expiresAt: '2020-01-01T00:00:00.000Z' }), lines, 'a@b.co', new Date('2026-01-01')).ok,
    false,
  )
  assert.equal(evaluateDiscount(baseRule({ usageLimit: 1, usageCount: 1 }), lines, 'a@b.co').ok, false)
  assert.equal(
    evaluateDiscount(baseRule({ allowedEmails: ['vip@example.com'] }), lines, 'other@example.com').ok,
    false,
  )
  assert.equal(evaluateDiscount(baseRule({ allowedEmails: ['vip@example.com'] }), lines, 'VIP@example.com').ok, true)
})

test('caps a fixed discount at the eligible subtotal', () => {
  const decision = evaluateDiscount(
    baseRule({ discountType: 'fixed', percentage: null, amount: 80 }),
    [{ productId: 'p1', quantity: 1, unitPrice: 20 }],
    'a@b.co',
  )
  assert.equal(decision.ok, true)
  if (!decision.ok) return
  assert.equal(decision.amount, 20)
  const totals = calculateOrderTotals([{ productId: 'p1', quantity: 1, unitPrice: 20 }], decision.amount)
  assert.equal(totals.discount, 20)
  assert.equal(totals.total, 12)
  assert.ok(totals.total >= 0)
})

test('size selection uses the catalog list and keeps two sizes distinct', () => {
  assert.equal(canonicalSize(['S', 'M', 'L'], ' m '), 'M')
  assert.equal(sizeSelectionError(['S', 'M', 'L'], '', 'Hoodie'), 'Select a size for Hoodie.')
  assert.equal(sizeSelectionError(['S', 'M', 'L'], 'XL', 'Hoodie'), 'XL is not available for Hoodie.')
  assert.equal(sizeSelectionError(['S', 'M', 'L'], 'S', 'Hoodie'), null)
  assert.equal(sizeSelectionError([], '', 'Belt'), null)
  const key = (size: string) => `prod::${size}::Black`
  assert.notEqual(key('S'), key('M'))
})

test('compares Stripe minor units and currency before marking paid', () => {
  const match = compareStripePayment({
    orderTotal: 49.99,
    orderCurrency: 'cad',
    stripeAmount: 4999,
    stripeAmountReceived: 4999,
    stripeCurrency: 'cad',
  })
  assert.equal(match.matches, true)
  assert.equal(STORE_CURRENCY, 'CAD')

  const currencyMismatch = compareStripePayment({
    orderTotal: 49.99,
    orderCurrency: 'CAD',
    stripeAmount: 4999,
    stripeCurrency: 'usd',
  })
  assert.equal(currencyMismatch.matches, false)
  assert.equal(currencyMismatch.reason, 'currency_mismatch')

  const amountMismatch = compareStripePayment({
    orderTotal: 49.99,
    orderCurrency: 'CAD',
    stripeAmount: 5000,
    stripeCurrency: 'CAD',
  })
  assert.equal(amountMismatch.matches, false)
  assert.equal(amountMismatch.reason, 'amount_mismatch')
})

test('describes checkout lines with size for Stripe', () => {
  assert.equal(
    stripeLineDescription([{ title: 'Krewnox quarter zip hoodie', size: 'M', quantity: 1 }]),
    'Krewnox quarter zip hoodie · Size M × 1',
  )
})
