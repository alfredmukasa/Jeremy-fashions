import assert from 'node:assert/strict'

import {
  addSizeChartColumn,
  addSizeChartRow,
  emptySizeChart,
  moveSizeChartColumn,
  moveSizeChartRow,
  parseSizeChart,
  removeSizeChartColumn,
  removeSizeChartRow,
  renameSizeChartColumn,
  setSizeChartCell,
} from '../src/lib/sizeChart.ts'
import { isValidContactEmail, parseContactRecipient } from '../src/lib/contactRecipient.ts'
import { rankRecommendedProducts } from '../src/lib/recommendations.ts'
import { parseStorePolicy, validateStorePolicy } from '../src/lib/storePolicy.ts'
import { DEFAULT_RETURN_POLICY } from '../src/constants/siteContent.ts'
import {
  buildContactEmail,
  deliverContactEmail,
  resolveContactRecipient,
} from '../server/src/services/contactMail.ts'
import type { Product } from '../src/types/index.ts'

function product(partial: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    slug: partial.id,
    description: '',
    category: 'hoodies',
    productKind: 'apparel',
    gender: 'unisex',
    sizes: [],
    colors: [],
    attributes: {},
    sizeChart: null,
    price: 100,
    rating: 0,
    images: [],
    stock: 1,
    tags: [],
    ...partial,
  }
}

const chart = emptySizeChart('apparel', ['S', 'M'])
const withColumn = addSizeChartColumn(chart, 'Shoulder')
assert.equal(withColumn.columns.at(-1)?.label, 'Shoulder')
assert.equal(withColumn.columns.length, chart.columns.length + 1)

const renamed = renameSizeChartColumn(withColumn, withColumn.columns.at(-1)!.id, 'Across shoulder')
assert.equal(renamed.columns.at(-1)?.label, 'Across shoulder')
assert.equal(renamed.columns.at(-1)?.id, withColumn.columns.at(-1)?.id)

const edited = setSizeChartCell(renamed, 0, renamed.columns[0].id, '36')
assert.equal(edited.rows[0].values[renamed.columns[0].id], '36')

const movedColumn = moveSizeChartColumn(edited, edited.columns.length - 1, -1)
assert.equal(movedColumn.columns.at(-2)?.label, 'Across shoulder')
assert.equal(movedColumn.rows[0].values[renamed.columns[0].id], '36')

const withRow = addSizeChartRow(movedColumn, 'Custom')
assert.equal(withRow.rows.at(-1)?.size, 'Custom')
const movedRow = moveSizeChartRow(withRow, withRow.rows.length - 1, -1)
assert.equal(movedRow.rows.at(-2)?.size, 'Custom')

const removedRow = removeSizeChartRow(movedRow, movedRow.rows.length - 2)
assert.equal(removedRow.rows.some((row) => row.size === 'Custom'), false)
const shoulderId = movedColumn.columns.find((column) => column.label === 'Across shoulder')!.id
const removedColumn = removeSizeChartColumn(removedRow, shoulderId)
assert.equal(removedColumn.columns.some((column) => column.id === shoulderId), false)
assert.equal(shoulderId in (removedColumn.rows[0]?.values ?? {}), false)

const parsed = parseSizeChart({
  unit: 'cm',
  columns: [
    { id: 'fit', label: 'Fit', kind: 'text' },
    { id: 'chest', label: 'Chest', kind: 'measurement' },
  ],
  rows: [{ id: 'row-a', size: 'One', values: { fit: 'Relaxed', chest: '40' } }],
  notes: 'Custom structure',
})
assert.ok(parsed)
assert.equal(parsed?.columns.length, 2)
assert.equal(parsed?.columns[0].kind, 'text')
assert.equal(parsed?.rows[0].values.fit, 'Relaxed')

const current = product({ id: 'current', name: 'Studio Hoodie', category: 'hoodies', tags: ['fleece'], rating: 4 })
const sameCategory = product({ id: 'same', name: 'Night Hoodie', category: 'hoodies', tags: ['fleece'], rating: 5 })
const sameKind = product({
  id: 'kind',
  name: 'Tee',
  category: 'tees',
  productKind: 'apparel',
  rating: 3,
})
const other = product({
  id: 'shoe',
  name: 'Runner',
  category: 'sneakers',
  productKind: 'footwear',
  rating: 5,
})
const recommended = rankRecommendedProducts(current, [current, other, sameKind, sameCategory], 4)
assert.deepEqual(recommended.map((item) => item.id), ['same', 'kind'])
assert.equal(rankRecommendedProducts(current, [current, other], 4).length, 0)

assert.equal(isValidContactEmail(' Team@Krewnox.ca '), true)
assert.equal(isValidContactEmail('not-an-email'), false)
assert.equal(isValidContactEmail('a@b'), false)
assert.equal(parseContactRecipient({ email: 'Hello@Example.com' }), 'hello@example.com')
assert.equal(parseContactRecipient({ email: 'bad' }), null)
assert.equal(resolveContactRecipient({ email: 'ops@krewnox.ca' }), 'ops@krewnox.ca')
assert.equal(resolveContactRecipient({}), 'support@krewnox.ca')

const unpublished = parseStorePolicy({}, DEFAULT_RETURN_POLICY)
assert.equal(unpublished.published, false)
const published = parseStorePolicy({ title: 'Returns', body: '14 days.' }, DEFAULT_RETURN_POLICY, '2026-10-04T00:00:00.000Z')
assert.equal(published.published, true)
assert.equal(published.body, '14 days.')
assert.equal(validateStorePolicy({ title: '', body: 'Hello' }), 'A title is required.')
assert.equal(validateStorePolicy({ title: 'Returns', body: '14 days.' }), null)

const sentTo: string[] = []
const delivery = await deliverContactEmail(
  {
    to: 'buyer-care@krewnox.ca',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    message: 'Where is my order?',
  },
  { resendApiKey: 'test-key', resendFrom: 'Krewnox <support@krewnox.ca>' },
  async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { to: string[]; reply_to: string; text: string }
    sentTo.push(...body.to)
    assert.equal(body.reply_to, 'ada@example.com')
    assert.match(body.text, /Where is my order/)
    return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 })
  },
)
assert.equal(delivery.delivered, true)
assert.deepEqual(sentTo, ['buyer-care@krewnox.ca'])
assert.match(buildContactEmail({
  to: 'buyer-care@krewnox.ca',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  message: 'Hello',
}).subject, /Ada Lovelace/)

const unconfigured = await deliverContactEmail(
  {
    to: 'buyer-care@krewnox.ca',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    message: 'Hello there friend',
  },
  {},
  async () => {
    throw new Error('mailer should not be called')
  },
)
assert.equal(unconfigured.delivered, false)

console.log('store feature checks passed')
