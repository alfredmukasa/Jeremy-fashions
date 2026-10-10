import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyOrderFulfillment,
  canMarkOrderShipped,
  customerAwaitingPayment,
  showCustomerFulfillmentBadge,
  DEFAULT_ADMIN_ORDER_QUEUE,
  DEFAULT_ORDER_SORT,
  orderInQueue,
  orderLineItems,
  organizeAdminOrders,
  sortOrganizedOrders,
} from '../src/lib/orderOrganization.ts'

test('default admin queue is paid and newest', () => {
  assert.equal(DEFAULT_ADMIN_ORDER_QUEUE, 'paid')
  assert.equal(DEFAULT_ORDER_SORT, 'newest')
})

test('paid queue is successful payment that is not shipped, delivered, or canceled', () => {
  assert.equal(orderInQueue('processing', 'paid', 'paid'), true)
  assert.equal(orderInQueue('pending', 'paid', 'paid'), true)
  assert.equal(orderInQueue('paid', 'paid', 'paid'), true)
  assert.equal(orderInQueue('shipped', 'paid', 'paid'), false)
  assert.equal(orderInQueue('delivered', 'paid', 'paid'), false)
  assert.equal(orderInQueue('cancelled', 'paid', 'paid'), false)
  assert.equal(orderInQueue('pending', 'unpaid', 'paid'), false)
  assert.equal(orderInQueue('processing', 'partial_refund', 'paid'), false)
  assert.equal(orderInQueue('processing', 'refunded', 'paid'), false)
})

test('completed is shipped or delivered, including lookup in history', () => {
  assert.equal(orderInQueue('shipped', 'paid', 'completed'), true)
  assert.equal(orderInQueue('delivered', 'unpaid', 'completed'), true)
  assert.equal(orderInQueue('processing', 'paid', 'completed'), false)
  assert.equal(orderInQueue('shipped', 'paid', 'history'), true)
  assert.equal(orderInQueue('processing', 'paid', 'history'), true)
  assert.equal(orderInQueue('pending', 'unpaid', 'history'), false)
})

test('refunded, failed, canceled, and awaiting payment stay in their own filters', () => {
  assert.equal(orderInQueue('processing', 'refunded', 'refunded'), true)
  assert.equal(orderInQueue('processing', 'partial_refund', 'refunded'), true)
  assert.equal(orderInQueue('processing', 'partial_refund', 'paid'), false)
  assert.equal(orderInQueue('pending', 'failed', 'failed'), true)
  assert.equal(orderInQueue('cancelled', 'unpaid', 'canceled'), true)
  assert.equal(orderInQueue('cancelled', 'failed', 'canceled'), true)
  assert.equal(orderInQueue('pending', 'unpaid', 'awaiting_payment'), true)
  assert.equal(orderInQueue('pending', 'processing', 'awaiting_payment'), true)
  assert.equal(orderInQueue('paid', 'unpaid', 'awaiting_payment'), true)
  assert.equal(orderInQueue('cancelled', 'unpaid', 'awaiting_payment'), false)
  assert.equal(orderInQueue('shipped', 'unpaid', 'awaiting_payment'), false)
  assert.equal(orderInQueue('pending', 'paid', 'awaiting_payment'), false)
})

test('customers see unpaid and failed orders as awaiting payment, and paid orders as history', () => {
  assert.equal(customerAwaitingPayment('pending', 'unpaid'), true)
  assert.equal(customerAwaitingPayment('pending', 'failed'), true)
  assert.equal(customerAwaitingPayment('delivered', 'unpaid'), true)
  assert.equal(customerAwaitingPayment('processing', 'paid'), false)
  assert.equal(customerAwaitingPayment('shipped', 'paid'), false)
  assert.equal(customerAwaitingPayment('processing', 'refunded'), false)
  assert.equal(customerAwaitingPayment('cancelled', 'unpaid'), false)
  assert.equal(customerAwaitingPayment('cancelled', 'failed'), false)
  assert.equal(showCustomerFulfillmentBadge('paid', 'unpaid'), false)
  assert.equal(showCustomerFulfillmentBadge('processing', 'paid'), true)
})

test('only the paid queue can be marked shipped', () => {
  assert.equal(canMarkOrderShipped('processing', 'paid'), true)
  assert.equal(canMarkOrderShipped('shipped', 'paid'), false)
  assert.equal(canMarkOrderShipped('pending', 'unpaid'), false)
})

test('paid queue keeps every unshipped paid order, newest first, including after one is shipped', () => {
  const orders = [
    { id: 'oldest', status: 'pending', payment_status: 'paid', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' },
    { id: 'middle', status: 'processing', payment_status: 'paid', created_at: '2026-02-01T00:00:00.000Z', updated_at: '2026-02-01T00:00:00.000Z' },
    { id: 'newest', status: 'paid', payment_status: 'paid', created_at: '2026-03-01T00:00:00.000Z', updated_at: '2026-03-01T00:00:00.000Z' },
    { id: 'shipped', status: 'shipped', payment_status: 'paid', created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-04-02T00:00:00.000Z' },
    { id: 'unpaid', status: 'pending', payment_status: 'unpaid', created_at: '2026-05-01T00:00:00.000Z', updated_at: '2026-05-01T00:00:00.000Z' },
  ]
  assert.deepEqual(
    organizeAdminOrders(orders, 'paid', 'newest').map((order) => order.id),
    ['newest', 'middle', 'oldest'],
  )
  assert.deepEqual(
    organizeAdminOrders(orders, 'history', 'newest').map((order) => order.id),
    ['shipped', 'newest', 'middle', 'oldest'],
  )

  const afterShip = applyOrderFulfillment(orders, 'newest', 'shipped', '2026-05-02T00:00:00.000Z')
  assert.equal(afterShip.length, orders.length)
  assert.deepEqual(
    organizeAdminOrders(afterShip, 'paid', 'newest').map((order) => order.id),
    ['middle', 'oldest'],
  )
  assert.deepEqual(
    organizeAdminOrders(afterShip, 'completed', 'newest').map((order) => order.id),
    ['newest', 'shipped'],
  )
})

test('line items are kept in full instead of the newest one or two products', () => {
  const items = [
    { id: '1', title: 'Hoodie' },
    { id: '2', title: 'Sweatpants' },
    { id: '3', title: 'Tracksuit' },
    { id: '4', title: 'Cap' },
  ]
  assert.deepEqual(orderLineItems(items).map((item) => item.title), ['Hoodie', 'Sweatpants', 'Tracksuit', 'Cap'])
  assert.deepEqual(orderLineItems(null), [])
  assert.deepEqual(orderLineItems(undefined), [])
})

test('newest paid orders come first, and completed uses the fulfillment timestamp', () => {
  const orders = [
    { id: 'old', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
    { id: 'new', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' },
  ]
  assert.deepEqual(
    sortOrganizedOrders(orders, 'paid', 'newest').map((order) => order.id),
    ['new', 'old'],
  )
  assert.deepEqual(
    sortOrganizedOrders(orders, 'paid', 'oldest').map((order) => order.id),
    ['old', 'new'],
  )
  assert.deepEqual(
    sortOrganizedOrders(orders, 'completed', 'newest').map((order) => order.id),
    ['old', 'new'],
  )
})
