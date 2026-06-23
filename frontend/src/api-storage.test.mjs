import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

function loadApiHelpers() {
  const source = fs.readFileSync(new URL('./api.js', import.meta.url), 'utf8')
    .replace("import axios from 'axios'", "const axios = { create: () => ({ interceptors: { request: { use: () => {} } }, get: () => {}, post: () => {}, put: () => {}, delete: () => {} }) }")
    .replaceAll('export function ', 'function ')
    .replaceAll('export const ', 'const ')

  const context = {
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    fetch: () => {},
    FormData: class {},
    URL: { createObjectURL: () => '', revokeObjectURL: () => {} },
    document: { createElement: () => ({ click: () => {} }) },
  }

  vm.runInNewContext(`${source}\nglobalThis.__helpers = { setApiKey, getApiKey, clearApiKey }`, context)
  return context
}

test('API key persists in localStorage across browser sessions', () => {
  const context = loadApiHelpers()

  context.__helpers.setApiKey('saved-key-123')

  assert.equal(context.localStorage.getItem('flanufactured_api_key'), 'saved-key-123')
  assert.equal(context.sessionStorage.getItem('flanufactured_api_key'), null)
  assert.equal(context.__helpers.getApiKey(), 'saved-key-123')
})

test('clearing the API key removes persisted and legacy session values', () => {
  const context = loadApiHelpers()
  context.localStorage.setItem('flanufactured_api_key', 'persisted-key')
  context.sessionStorage.setItem('flanufactured_api_key', 'legacy-session-key')

  context.__helpers.clearApiKey()

  assert.equal(context.localStorage.getItem('flanufactured_api_key'), null)
  assert.equal(context.sessionStorage.getItem('flanufactured_api_key'), null)
  assert.equal(context.__helpers.getApiKey(), '')
})

test('legacy session API key is migrated to localStorage when read', () => {
  const context = loadApiHelpers()
  context.sessionStorage.setItem('flanufactured_api_key', 'legacy-session-key')

  assert.equal(context.__helpers.getApiKey(), 'legacy-session-key')
  assert.equal(context.localStorage.getItem('flanufactured_api_key'), 'legacy-session-key')
  assert.equal(context.sessionStorage.getItem('flanufactured_api_key'), null)
})
