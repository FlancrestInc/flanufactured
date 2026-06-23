import test from 'node:test'
import assert from 'node:assert/strict'

import { clampBlankPercent, optionsForTypeChange } from './field-row-options.js'

test('clampBlankPercent keeps values between 0 and 100', () => {
  assert.equal(clampBlankPercent(-10), 0)
  assert.equal(clampBlankPercent(35), 35)
  assert.equal(clampBlankPercent(150), 100)
})

test('clampBlankPercent treats non-numeric input as 0', () => {
  assert.equal(clampBlankPercent(''), 0)
  assert.equal(clampBlankPercent('nope'), 0)
})

test('optionsForTypeChange preserves only blank percent', () => {
  assert.deepEqual(
    optionsForTypeChange({ blank_percent: 25, domain: 'example.com' }),
    { blank_percent: 25 },
  )
})

test('optionsForTypeChange drops default blank percent', () => {
  assert.deepEqual(optionsForTypeChange({ blank_percent: 0, domain: 'example.com' }), {})
})
