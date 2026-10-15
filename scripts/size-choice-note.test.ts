import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_SIZE_CHOICE_NOTE, emptySizeChart, parseSizeChart, sizeChoiceNote } from '../src/lib/sizeChart.ts'

test('blank fit notes use the size-button default', () => {
  assert.equal(sizeChoiceNote(''), DEFAULT_SIZE_CHOICE_NOTE)
  assert.equal(sizeChoiceNote('   '), DEFAULT_SIZE_CHOICE_NOTE)
  assert.equal(sizeChoiceNote(null), DEFAULT_SIZE_CHOICE_NOTE)
})

test('an admin fit note replaces the default sentence', () => {
  assert.equal(sizeChoiceNote('  Relaxed through the body.  '), 'Relaxed through the body.')
})

test('previous automatic size-chart footnotes stay the default until edited', () => {
  assert.equal(
    sizeChoiceNote(
      'Garment measurements, not body measurements. If you are between sizes, size up for a relaxed fit.',
    ),
    DEFAULT_SIZE_CHOICE_NOTE,
  )
})

test('new size charts start with the editable default fit note', () => {
  assert.equal(emptySizeChart('apparel').notes, DEFAULT_SIZE_CHOICE_NOTE)
  assert.equal(emptySizeChart('footwear').notes, DEFAULT_SIZE_CHOICE_NOTE)
  assert.equal(emptySizeChart('accessories').notes, DEFAULT_SIZE_CHOICE_NOTE)
})

test('a custom fit note is kept even when the size chart has no rows yet', () => {
  const parsed = parseSizeChart({
    unit: 'in',
    columns: [{ id: 'chest', label: 'Chest' }],
    rows: [],
    notes: 'True to size.',
  })
  assert.equal(parsed?.notes, 'True to size.')
  assert.equal(sizeChoiceNote(parsed?.notes), 'True to size.')
})
