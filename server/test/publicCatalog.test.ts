import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeCategoryRow, normalizeProductRow, normalizeSiteSetting, parseJsonValue } from '../src/domain/publicCatalogRows.ts'

test('parses JSON text stored by D1 and leaves plain strings alone', () => {
  assert.deepEqual(parseJsonValue('["s","m"]'), ['s', 'm'])
  assert.equal(parseJsonValue('not-json'), 'not-json')
  assert.deepEqual(parseJsonValue({ slides: [] }), { slides: [] })
})

test('normalizes a D1 product row into the storefront shape', () => {
  const row = normalizeProductRow({
    id: 'p1',
    created_at: '2026-01-01T00:00:00.000Z',
    title: 'Krewnox quarter zip hoodie',
    slug: 'quarter-zip-hoodie',
    description: 'A hoodie',
    price: '120.00',
    compare_price: null,
    category: 'hoodie',
    brand: 'Krewnox',
    stock_quantity: 30,
    featured: 1,
    rating: '4.5',
    image_url: 'https://example.com/hoodie.jpg',
    gallery_images: '["https://example.com/2.jpg"]',
    tags: '["new"]',
    sku: 'KZ-1',
    status: 'active',
    gender: 'unisex',
    sizes: '["S","M"]',
    colors: '[{"name":"Black","hex":"#111"}]',
    attributes: '{"fit":"regular"}',
  })

  assert.equal(row.featured, true)
  assert.deepEqual(row.gallery_images, ['https://example.com/2.jpg'])
  assert.deepEqual(row.sizes, ['S', 'M'])
  assert.deepEqual(row.colors, [{ name: 'Black', hex: '#111' }])
  assert.deepEqual(row.attributes, { fit: 'regular' })
})

test('normalizes categories and site settings', () => {
  const category = normalizeCategoryRow({
    id: 'c1',
    name: 'Hoodies',
    slug: 'hoodie',
    description: null,
    image_url: null,
    product_kind: 'apparel',
  })
  assert.equal(category.slug, 'hoodie')

  const setting = normalizeSiteSetting({
    key: 'hero_slides',
    value: '{"slides":[{"src":"https://example.com/hero.jpg","alt":"Hero"}]}',
    updated_at: '2026-01-01T00:00:00.000Z',
  })
  assert.deepEqual(setting.value, { slides: [{ src: 'https://example.com/hero.jpg', alt: 'Hero' }] })
})
