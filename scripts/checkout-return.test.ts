import assert from 'node:assert/strict'
import test from 'node:test'

import { checkoutReturnOrderId } from '../src/lib/checkoutReturn.ts'

test('stripe return prefers the order id over the payment intent id', () => {
  assert.equal(
    checkoutReturnOrderId({
      orderFromUrl: '00533639-77ea-4d01-a1b1-bd2d2daff651',
      storedOrderId: 'stored-order',
      paymentIntentId: 'pi_123',
    }),
    '00533639-77ea-4d01-a1b1-bd2d2daff651',
  )
  assert.equal(
    checkoutReturnOrderId({
      orderFromUrl: '  ',
      storedOrderId: null,
      paymentIntentId: 'pi_123',
    }),
    'pi_123',
  )
  assert.equal(checkoutReturnOrderId({}), null)
})
