/**
 * useSettings.js — Application settings persistence and theme engine.
 *
 * All user preferences are stored under a single localStorage key
 * ('flanufactured_settings') as a flat JSON object.
 *
 * DEFAULTS        Baseline values for every setting.
 * ACCENT_PRESETS  Five named phosphor colors with derived CSS token values
 *                 (glow, subtle, bright, dim, button text color).
 * applyTheme()    Writes CSS custom properties directly to document.documentElement,
 *                 so every component picks up changes instantly without re-renders.
 *                 Called once on app load (in App.jsx, before first render) and
 *                 again whenever settings change.
 * useSettings()   React hook — returns [settings, updateSettings]. Persists on
 *                 every change and calls applyTheme() automatically.
 */
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'flanufactured_settings'

export const DEFAULTS = {
  // Appearance
  theme: 'dark',            // 'dark' | 'light'
  accentColor: 'green',     // 'green' | 'amber' | 'cyan' | 'white' | 'pink' | 'custom'
  accentCustomHex: '#4ade80',

  // Export defaults
  exportRows: 100,
  exportFormat: 'json',
  exportLocale: 'en_US',
  exportPrettyPrint: true,

  // Preview
  previewRows: 10,

  // Generation
  maxRowsOverride: 10000,

  // UX
  confirmBeforeDelete: true,
}

export const ACCENT_PRESETS = {
  green:  { label: 'Phosphor Green', color: '#4ade80', glow: 'rgba(74,222,128,0.18)',  subtle: 'rgba(74,222,128,0.08)',  dim: '#22c55e', bright: '#86efac', text: '#0d1117' },
  amber:  { label: 'Amber',          color: '#f0b429', glow: 'rgba(240,180,41,0.18)',  subtle: 'rgba(240,180,41,0.08)',  dim: '#c48f1a', bright: '#f5cc5a', text: '#0d0d0f' },
  cyan:   { label: 'Cyan',           color: '#22d3ee', glow: 'rgba(34,211,238,0.18)',  subtle: 'rgba(34,211,238,0.08)',  dim: '#06b6d4', bright: '#67e8f9', text: '#0d1117' },
  white:  { label: 'White',          color: '#e2e8f0', glow: 'rgba(226,232,240,0.12)', subtle: 'rgba(226,232,240,0.06)', dim: '#cbd5e1', bright: '#f8fafc', text: '#0d1117' },
  pink:   { label: 'Pink',           color: '#f472b6', glow: 'rgba(244,114,182,0.18)', subtle: 'rgba(244,114,182,0.08)', dim: '#ec4899', bright: '#f9a8d4', text: '#0d1117' },
}

function hexToAccent(hex) {
  // Derive glow/subtle from custom hex
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return {
    label: 'Custom', color: hex,
    glow:   `rgba(${r},${g},${b},0.18)`,
    subtle: `rgba(${r},${g},${b},0.08)`,
    dim:    hex, bright: hex, text: '#0d1117',
  }
}

export function getAccentTokens(settings) {
  if (settings.accentColor === 'custom') return hexToAccent(settings.accentCustomHex || '#4ade80')
  return ACCENT_PRESETS[settings.accentColor] || ACCENT_PRESETS.green
}

export function applyTheme(settings) {
  const root = document.documentElement
  const accent = getAccentTokens(settings)

  // Accent variables
  root.style.setProperty('--accent',        accent.color)
  root.style.setProperty('--accent-dim',    accent.dim)
  root.style.setProperty('--accent-bright', accent.bright)
  root.style.setProperty('--accent-glow',   accent.glow)
  root.style.setProperty('--accent-subtle', accent.subtle)

  // Theme variables
  if (settings.theme === 'light') {
    root.style.setProperty('--bg-primary',     '#f4f5f7')
    root.style.setProperty('--bg-surface',     '#ffffff')
    root.style.setProperty('--bg-elevated',    '#eef0f3')
    root.style.setProperty('--bg-hover',       '#e4e7eb')
    root.style.setProperty('--text-primary',   '#1a1d23')
    root.style.setProperty('--text-secondary', '#4a5160')
    root.style.setProperty('--text-muted',     '#6b7385')
    root.style.setProperty('--text-dim',       '#9ba3b2')
    root.style.setProperty('--border',         '#d8dce4')
    root.style.setProperty('--border-bright',  '#c4c9d4')
  } else {
    root.style.setProperty('--bg-primary',     '#111318')
    root.style.setProperty('--bg-surface',     '#181c22')
    root.style.setProperty('--bg-elevated',    '#1e232b')
    root.style.setProperty('--bg-hover',       '#252b35')
    root.style.setProperty('--text-primary',   '#f0ede6')
    root.style.setProperty('--text-secondary', '#ccc8bf')
    root.style.setProperty('--text-muted',     '#909aaa')
    root.style.setProperty('--text-dim',       '#44505f')
    root.style.setProperty('--border',         '#2a3140')
    root.style.setProperty('--border-bright',  '#3a4455')
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  applyTheme(settings)
}

export function useSettings() {
  const [settings, setSettingsState] = useState(() => loadSettings())

  // Apply theme on mount and whenever settings change
  useEffect(() => { applyTheme(settings) }, [settings])

  const updateSettings = useCallback((patch) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  return [settings, updateSettings]
}
