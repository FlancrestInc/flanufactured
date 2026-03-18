/**
 * api.js — All server communication for the Flanufactured frontend.
 *
 * An axios instance is created with baseURL '/api'. A request interceptor
 * injects the X-API-Key header from sessionStorage on every call.
 *
 * The API key is stored in sessionStorage (not localStorage) so it is cleared
 * when the browser tab is closed, providing a mild security improvement.
 *
 * Exports:
 *   setApiKey / getApiKey / clearApiKey  — sessionStorage helpers
 *   fetchKeyStatus / revealKey / rollKey / setInitialKey  — Settings endpoints
 *   fetchFieldTypes                       — Type registry for the picker modal
 *   generateData / generateCSV            — Inline data generation
 *   fetchSchemas / fetchSchema / createSchema / updateSchema / deleteSchema
 *   importSchemaFile / exportSchemaFile   — Schema library CRUD
 *   triggerDownload                       — Trigger a browser file download
 */
import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

// Inject stored API key into every request
client.interceptors.request.use((config) => {
  const key = sessionStorage.getItem('flanufactured_api_key') || ''
  if (key) config.headers['X-API-Key'] = key
  return config
})

export function setApiKey(key) { sessionStorage.setItem('flanufactured_api_key', key) }
export function getApiKey()    { return sessionStorage.getItem('flanufactured_api_key') || '' }
export function clearApiKey()  { sessionStorage.removeItem('flanufactured_api_key') }

// ── Settings / Key management ──────────────────────────────────────────────
export const fetchKeyStatus   = ()    => fetch('/api/settings/key-status').then(r => r.json())
export const revealKey        = ()    => client.get('/settings/key-reveal').then(r => r.data)
export const rollKey          = ()    => client.post('/settings/key-roll').then(r => r.data)
export const clearKey         = ()    => client.post('/settings/key-clear').then(r => r.data)
export const emergencyReset   = ()    => fetch('/api/settings/key-emergency-reset', { method: 'POST' })
  .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.detail || 'Failed') }); return r.json() })
export const setInitialKey    = (key) => fetch('/api/settings/key-set', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key }),
}).then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })

// ── Field types ────────────────────────────────────────────────────────────
export const fetchFieldTypes = () => client.get('/field-types').then(r => r.data)

// ── Generate ───────────────────────────────────────────────────────────────
export const generateData = (payload) => client.post('/generate', payload).then(r => r.data)

export const generateCSV = async (payload) => {
  const key = sessionStorage.getItem('flanufactured_api_key') || ''
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify({ ...payload, format: 'csv' }),
  })
  if (!res.ok) throw new Error('Generate failed')
  return res.blob()
}

// ── Schemas ────────────────────────────────────────────────────────────────
export const fetchSchemas  = ()           => client.get('/schemas').then(r => r.data)
export const fetchSchema   = (id)         => client.get(`/schemas/${id}`).then(r => r.data)
export const createSchema  = (payload)    => client.post('/schemas', payload).then(r => r.data)
export const updateSchema  = (id, p)      => client.put(`/schemas/${id}`, p).then(r => r.data)
export const deleteSchema  = (id)         => client.delete(`/schemas/${id}`)
export const importSchemaFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post('/schemas/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const exportSchemaFile = async (id, name) => {
  const key = sessionStorage.getItem('flanufactured_api_key') || ''
  const res = await fetch(`/api/schemas/${id}/export`, { headers: { 'X-API-Key': key } })
  const blob = await res.blob()
  triggerDownload(blob, `${name}.schema.json`, 'application/json')
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
