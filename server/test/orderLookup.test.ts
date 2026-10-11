import assert from 'node:assert/strict'
import test from 'node:test'

import { orderStatusLookup } from '../src/domain/orderLookup.ts'

test('order status lookup keeps uuids on orders.id and payment intents on the stripe column', () => {
  assert.deepEqual(orderStatusLookup('  00533639-77ea-4d01-a1b1-bd2d2daff651  '), {
    column: 'id',
    value: '00533639-77ea-4d01-a1b1-bd2d2daff651',
  })
  assert.deepEqual(orderStatusLookup('pi_3UPSS9DVpVt01GYl3'), {
    column: 'stripe_payment_intent_id',
    value: 'pi_3UPSS9DVpVt01GYl3',
  })
  assert.equal(orderStatusLookup('   '), null)
})
