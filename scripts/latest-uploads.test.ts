import assert from 'node:assert/strict'
import test from 'node:test'

import type { Product } from '../src/types/index.ts'
import {
  LATEST_UPLOAD_LIMIT,
  LATEST_UPLOAD_WINDOW_HOURS,
  latestUploadedProducts,
  sortProducts,
} from '../src/utils/productSort.ts'

function product(partial: Pick<Product, 'id' | 'createdAt'> & Partial<Product>): Product {
  return {
    name: partial.id,
    slug: partial.id,
    description: '',
    category: 'tracksuits',
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

const catalog = [
  product({
    id: 'tracksuit',
    name: 'Krewnox tracksuit set',
    createdAt: '2026-09-27T15:02:53.270Z',
    category: 'tracksuits',
    price: 180,
  }),
  product({
    id: 'sweatpants',
    name: 'Krewnox sweatpants',
    createdAt: '2026-09-26T03:46:18.745Z',
    category: 'sweatpants',
    price: 90,
    tags: ['new'],
  }),
  product({
    id: 'hoodie',
    name: 'Krewnox quarter zip hoodie',
    createdAt: '2026-09-26T03:35:49.783Z',
    category: 'hoodies',
    price: 120,
  }),
]

test('latest upload is products created within 24 hours of the newest, capped at 12', () => {
  assert.equal(LATEST_UPLOAD_WINDOW_HOURS, 24)
  assert.equal(LATEST_UPLOAD_LIMIT, 12)

  const latest = latestUploadedProducts(catalog)
  assert.deepEqual(
    latest.map((item) => item.name),
    ['Krewnox tracksuit set'],
  )
})

test('a manual new tag does not keep an older upload on the new page', () => {
  const latest = latestUploadedProducts(catalog)
  assert.equal(
    latest.some((item) => item.tags.includes('new')),
    false,
  )
})

test('pieces uploaded together stay on the new page', () => {
  const drop = [
    product({ id: 'a', createdAt: '2026-10-01T18:00:00.000Z' }),
    product({ id: 'b', createdAt: '2026-10-01T17:20:00.000Z' }),
    product({ id: 'older', createdAt: '2026-09-30T17:00:00.000Z', tags: ['new'] }),
  ]
  assert.deepEqual(
    latestUploadedProducts(drop).map((item) => item.id),
    ['a', 'b'],
  )
})

test('caps a same-window bulk import at the 12 newest', () => {
  const bulk = Array.from({ length: 15 }, (_, index) =>
    product({
      id: `p${String(index).padStart(2, '0')}`,
      createdAt: new Date(Date.UTC(2026, 9, 1, 12, 0, index)).toISOString(),
    }),
  )
  const latest = latestUploadedProducts(bulk)
  assert.equal(latest.length, 12)
  assert.equal(latest[0]?.id, 'p14')
  assert.equal(latest[11]?.id, 'p03')
})

test('returns an empty list when nothing has an upload time', () => {
  assert.deepEqual(latestUploadedProducts([]), [])
  assert.deepEqual(latestUploadedProducts([product({ id: 'untimed', createdAt: undefined })]), [])
})

test('category and sort still apply to the latest-upload set', () => {
  const mixed = [
    product({ id: 'new-hoodie', createdAt: '2026-10-02T12:00:00.000Z', category: 'hoodies', price: 40 }),
    product({ id: 'new-pants', createdAt: '2026-10-02T11:00:00.000Z', category: 'sweatpants', price: 200 }),
    product({ id: 'old-hoodie', createdAt: '2026-09-01T12:00:00.000Z', category: 'hoodies', price: 10 }),
  ]
  const latest = latestUploadedProducts(mixed).filter((item) => item.category === 'hoodies')
  assert.deepEqual(
    sortProducts(latest, 'price-asc').map((item) => item.id),
    ['new-hoodie'],
  )
  assert.deepEqual(
    sortProducts(latestUploadedProducts(mixed), 'price-desc').map((item) => item.id),
    ['new-pants', 'new-hoodie'],
  )
})
