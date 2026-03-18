import { useState, useEffect } from 'react'
import {
  KeyRound, Eye, EyeOff, RefreshCw, Copy, Check,
  ShieldCheck, AlertTriangle, Sun, Moon, Palette,
  Download, BarChart2, Clock, Trash2, BookOpen, ExternalLink,
} from 'lucide-react'
import { fetchKeyStatus, revealKey, rollKey, setInitialKey, clearKey, emergencyReset, setApiKey, clearApiKey } from '../api'
import { useToast } from '../components/Toast'
import { useSettingsContext } from '../SettingsContext'
import { ACCENT_PRESETS } from '../useSettings'

const LOCALES = [
  { value: 'en_US', label: 'English (US)' }, { value: 'en_GB', label: 'English (UK)' },
  { value: 'en_AU', label: 'English (Australia)' }, { value: 'fr_FR', label: 'French' },
  { value: 'de_DE', label: 'German' }, { value: 'es_ES', label: 'Spanish (Spain)' },
  { value: 'es_MX', label: 'Spanish (Mexico)' }, { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'ja_JP', label: 'Japanese' }, { value: 'zh_CN', label: 'Chinese (Simplified)' },
  { value: 'ko_KR', label: 'Korean' }, { value: 'nl_NL', label: 'Dutch' },
  { value: 'sv_SE', label: 'Swedish' }, { value: 'ru_RU', label: 'Russian' },
]

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 24,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <Icon size={15} color="var(--accent)" />
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Row helper ────────────────────────────────────────────────────────────────
function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0, minWidth: 200 }}>{children}</div>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: value ? 'var(--accent)' : 'var(--bg-hover)',
        border: `1px solid ${value ? 'var(--accent)' : 'var(--border-bright)'}`,
        cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: value ? 'var(--bg-primary)' : 'var(--text-muted)',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

export default function Settings({ usageStats }) {
  const toast = useToast()
  const { settings, updateSettings } = useSettingsContext()

  // API key state
  const [keyStatus, setKeyStatus] = useState(null)
  const [fullKey, setFullKey] = useState(null)
  const [showKey, setShowKey] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newKeyInput, setNewKeyInput] = useState('')
  const [settingKey, setSettingKey] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [resetting, setResetting] = useState(false)

  const loadStatus = async () => {
    try { setKeyStatus(await fetchKeyStatus()) }
    catch { toast('Could not reach server', 'error') }
  }
  useEffect(() => { loadStatus() }, [])

  // ── Key age helpers ───────────────────────────────────────────────────────
  const keyAgeDays = keyStatus?.key_created_at
    ? Math.floor((Date.now() - new Date(keyStatus.key_created_at).getTime()) / 86400000)
    : null
  const keyIsOld = keyAgeDays !== null && keyAgeDays >= 365

  const keyAgeLabel = keyAgeDays === null ? null
    : keyAgeDays === 0 ? 'Created today'
    : keyAgeDays === 1 ? 'Created 1 day ago'
    : `Created ${keyAgeDays} days ago`

  // ── Key actions ───────────────────────────────────────────────────────────
  const handleReveal = async () => {
    if (fullKey) { setShowKey(s => !s); return }
    try { const d = await revealKey(); setFullKey(d.key); setShowKey(true) }
    catch { toast('Could not reveal key — check your session', 'error') }
  }

  const handleCopy = async () => {
    const key = fullKey
    if (!key) { toast('Reveal the key first', 'error'); return }
    await navigator.clipboard.writeText(key)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast('Key copied to clipboard', 'success')
  }

  const handleRoll = async () => {
    if (!confirm('Roll the API key? Your session will update automatically, but any other clients using the old key will need updating.')) return
    setRolling(true)
    try {
      const d = await rollKey()
      setFullKey(d.new_key); setApiKey(d.new_key)
      setKeyStatus(s => ({ ...s, has_key: true, key_preview: d.key_preview, key_created_at: d.key_created_at }))
      setShowKey(true)
      toast('New API key generated — copy it now!', 'success', 6000)
    } catch { toast('Failed to roll key', 'error') }
    finally { setRolling(false) }
  }

  const handleSetInitial = async () => {
    if (newKeyInput.trim().length < 8) { toast('Key must be at least 8 characters', 'error'); return }
    setSettingKey(true)
    try {
      const d = await setInitialKey(newKeyInput.trim())
      setApiKey(newKeyInput.trim()); setFullKey(newKeyInput.trim())
      setKeyStatus({ has_key: true, key_preview: d.key_preview, key_created_at: d.key_created_at })
      setNewKeyInput(''); setShowKey(false)
      toast('API key set', 'success')
    } catch { toast('Failed — a key may already be configured', 'error') }
    finally { setSettingKey(false) }
  }

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    setNewKeyInput(Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }

  const handleClearKey = async () => {
    if (!confirm('Clear the stored API key? The server will revert to the API_KEY environment variable. Your session will be cleared.')) return
    setClearing(true)
    try {
      await clearKey()
      clearApiKey()
      setFullKey(null); setShowKey(false)
      await loadStatus()
      toast('Stored key cleared — server reverted to environment key', 'success')
    } catch { toast('Failed to clear key — your session key may be wrong', 'error') }
    finally { setClearing(false) }
  }

  const handleEmergencyReset = async () => {
    if (!confirm('Emergency reset: clear the stored key without authentication?\n\nThis only works when no API_KEY is set in the environment. The server will return to unconfigured state.')) return
    setResetting(true)
    try {
      await emergencyReset()
      clearApiKey()
      setFullKey(null); setShowKey(false)
      await loadStatus()
      toast('Emergency reset complete — server is unconfigured', 'success')
    } catch (e) { toast(e.message || 'Emergency reset failed or is disabled on this server', 'error') }
    finally { setResetting(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const label = { fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 760, margin: '0 auto', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display" style={{ fontSize: 30, margin: 0, color: 'var(--accent)' }}>SETTINGS</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Application configuration and preferences</p>
      </div>

      {/* ── Appearance ────────────────────────────────────────────────────── */}
      <Section icon={Palette} title="Appearance">

        <SettingRow label="Theme" hint="Switch between dark and light mode">
          <div style={{ display: 'flex', gap: 8 }}>
            {['dark', 'light'].map(t => (
              <button
                key={t}
                className={`btn ${settings.theme === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center', gap: 6 }}
                onClick={() => updateSettings({ theme: t })}
              >
                {t === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Accent color" hint="Phosphor terminal color used throughout the UI">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Preset swatches */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(ACCENT_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  onClick={() => updateSettings({ accentColor: key })}
                  title={preset.label}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: preset.color,
                    cursor: 'pointer',
                    border: settings.accentColor === key
                      ? `3px solid var(--text-primary)`
                      : '3px solid transparent',
                    outline: settings.accentColor === key
                      ? `2px solid ${preset.color}`
                      : 'none',
                    transition: 'all 0.15s',
                    boxShadow: settings.accentColor === key
                      ? `0 0 10px ${preset.glow}`
                      : 'none',
                  }}
                />
              ))}
              {/* Custom swatch */}
              <div
                onClick={() => updateSettings({ accentColor: 'custom' })}
                title="Custom color"
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: settings.accentCustomHex || '#ffffff',
                  cursor: 'pointer',
                  border: settings.accentColor === 'custom'
                    ? '3px solid var(--text-primary)'
                    : '3px solid var(--border-bright)',
                  transition: 'all 0.15s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                  opacity: settings.accentColor === 'custom' ? 1 : 0.6,
                }} />
              </div>
            </div>

            {/* Custom hex input */}
            {settings.accentColor === 'custom' && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={settings.accentCustomHex || '#4ade80'}
                  onChange={e => updateSettings({ accentColor: 'custom', accentCustomHex: e.target.value })}
                  style={{ width: 36, height: 30, padding: 2, background: 'none', border: '1px solid var(--border-bright)', borderRadius: 4, cursor: 'pointer' }}
                />
                <input
                  className="input"
                  value={settings.accentCustomHex || ''}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateSettings({ accentColor: 'custom', accentCustomHex: v })
                  }}
                  style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, flex: 1 }}
                  placeholder="#4ade80"
                />
              </div>
            )}

            {/* Current color label */}
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {settings.accentColor === 'custom'
                ? `Custom: ${settings.accentCustomHex}`
                : ACCENT_PRESETS[settings.accentColor]?.label}
            </div>
          </div>
        </SettingRow>

      </Section>

      {/* ── Export Defaults ───────────────────────────────────────────────── */}
      <Section icon={Download} title="Export Defaults">

        <SettingRow label="Row count" hint="Default number of rows in the Download dialog">
          <input
            className="input"
            type="number" min={1} max={10000}
            value={settings.exportRows}
            onChange={e => updateSettings({ exportRows: Math.min(10000, Math.max(1, +e.target.value)) })}
          />
        </SettingRow>

        <SettingRow label="Format" hint="Default output format">
          <div style={{ display: 'flex', gap: 8 }}>
            {['json', 'csv'].map(f => (
              <button key={f} className={`btn ${settings.exportFormat === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => updateSettings({ exportFormat: f })}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Locale" hint="Default locale for generated data">
          <select className="select" value={settings.exportLocale} onChange={e => updateSettings({ exportLocale: e.target.value })}>
            {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </SettingRow>

        <SettingRow label="JSON pretty-print" hint="Indent JSON output for readability. Disable for compact files.">
          <Toggle value={settings.exportPrettyPrint} onChange={v => updateSettings({ exportPrettyPrint: v })} />
        </SettingRow>

        <SettingRow label="Max rows (session cap)" hint={`Server hard cap is set in .env. This session-level limit overrides it downward. Current: ${settings.maxRowsOverride.toLocaleString()}`}>
          <input
            className="input"
            type="number" min={1} max={10000}
            value={settings.maxRowsOverride}
            onChange={e => updateSettings({ maxRowsOverride: Math.min(10000, Math.max(1, +e.target.value)) })}
          />
        </SettingRow>

      </Section>

      {/* ── Preview ───────────────────────────────────────────────────────── */}
      <Section icon={BarChart2} title="Preview">

        <SettingRow label="Preview row count" hint="Number of rows shown in the Builder preview panel (1–100)">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              type="number" min={1} max={100}
              value={settings.previewRows}
              onChange={e => updateSettings({ previewRows: Math.min(100, Math.max(1, +e.target.value)) })}
              style={{ flex: 1 }}
            />
            <span className="badge badge-muted" style={{ flexShrink: 0 }}>{settings.previewRows} rows</span>
          </div>
        </SettingRow>

        <SettingRow label="Confirm before delete" hint="Show a confirmation dialog before deleting a saved schema">
          <Toggle value={settings.confirmBeforeDelete} onChange={v => updateSettings({ confirmBeforeDelete: v })} />
        </SettingRow>

      </Section>

      {/* ── Usage Stats ───────────────────────────────────────────────────── */}
      <Section icon={BarChart2} title="Usage Stats">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {[
            { label: 'Schemas saved',    value: usageStats?.schemasTotal ?? '—' },
            { label: 'Previews this session', value: usageStats?.previewsThisSession ?? 0 },
            { label: 'Rows generated',   value: (usageStats?.rowsThisSession ?? 0).toLocaleString() },
            { label: 'Downloads',        value: usageStats?.downloadsThisSession ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '14px 16px',
              textAlign: 'center',
            }}>
              <div className="font-display" style={{ fontSize: 28, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
          Session stats reset on page reload. Schema count reflects current server state.
        </div>
      </Section>

      {/* ── API Key ───────────────────────────────────────────────────────── */}
      <Section icon={KeyRound} title="API Key">

        {/* Status badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          {keyStatus?.has_key
            ? <span className="badge badge-green"><ShieldCheck size={10} style={{ marginRight: 3 }} />Active</span>
            : <span className="badge badge-danger"><AlertTriangle size={10} style={{ marginRight: 3 }} />Not configured</span>
          }

          {/* Key age */}
          {keyAgeLabel && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12,
              color: keyIsOld ? 'var(--danger)' : 'var(--text-muted)',
            }}>
              <Clock size={11} />
              {keyAgeLabel}
            </span>
          )}
        </div>

        {/* Old key warning */}
        {keyIsOld && (
          <div style={{
            marginBottom: 16, padding: '10px 14px',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius)',
            fontSize: 12, color: 'var(--danger)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              This API key is <strong>{keyAgeDays} days old</strong> — over 365 days.
              Consider rolling it to a new key for better security hygiene.
            </span>
          </div>
        )}

        {keyStatus === null && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>}

        {/* First-run: no key yet */}
        {keyStatus && !keyStatus.has_key && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, marginTop: 0 }}>
              No API key configured. Set one below — it will be saved to your server's data volume.
            </p>
            <label style={label}>New API key</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="input" style={{ fontFamily: 'Space Mono, monospace', fontSize: 12 }}
                type="text" placeholder="Enter or generate a key…"
                value={newKeyInput} onChange={e => setNewKeyInput(e.target.value)} />
              <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={generateRandomKey}>
                <RefreshCw size={13} /> Generate
              </button>
            </div>
            <button className="btn btn-primary" onClick={handleSetInitial} disabled={settingKey || newKeyInput.length < 8}>
              {settingKey ? 'Setting…' : 'Set API Key'}
            </button>
          </div>
        )}

        {/* Key management */}
        {/* Emergency reset — always visible as a recovery tool */}
        {keyStatus !== null && (
          <div style={{
            marginTop: 20, padding: '12px 14px',
            background: 'rgba(248,113,113,0.05)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={12} /> Emergency Reset
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Locked out and can't authenticate? This clears the stored key without a password.
              Only works when <span style={{ fontFamily: 'Space Mono, monospace' }}>API_KEY</span> is
              not set in the server environment (i.e., still the default <span style={{ fontFamily: 'Space Mono, monospace' }}>changeme</span>).
            </p>
            <button className="btn btn-secondary" onClick={handleEmergencyReset} disabled={resetting}
              style={{ fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(248,113,113,0.4)' }}>
              <Trash2 size={12} />
              {resetting ? 'Resetting…' : 'Emergency Reset'}
            </button>
          </div>
        )}

        {keyStatus?.has_key && (
          <div>
            <label style={label}>Current key</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <div style={{
                flex: 1, background: 'var(--bg-primary)',
                border: '1px solid var(--border-bright)', borderRadius: 'var(--radius)',
                padding: '7px 12px', fontFamily: 'Space Mono, monospace', fontSize: 12,
                color: showKey && fullKey ? 'var(--accent)' : 'var(--text-muted)',
                letterSpacing: showKey && fullKey ? 0 : '0.1em',
                overflowX: 'auto', whiteSpace: 'nowrap',
              }}>
                {showKey && fullKey ? fullKey : (keyStatus.key_preview || '••••••••••••••••••••••••••••••••')}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleReveal} title={showKey ? 'Hide' : 'Reveal'}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy">
                {copied ? <Check size={14} color="var(--accent)" /> : <Copy size={14} />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleRoll} disabled={rolling}>
                <RefreshCw size={13} className={rolling ? 'animate-spin' : ''} />
                {rolling ? 'Rolling…' : 'Roll Key'}
              </button>
              <button className="btn btn-secondary" onClick={handleClearKey} disabled={clearing}
                style={{ color: 'var(--danger)', borderColor: 'rgba(248,113,113,0.4)' }}>
                <Trash2 size={13} />
                {clearing ? 'Clearing…' : 'Clear Key'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Roll generates a new key. Clear removes the stored key, reverting to the environment default.
              </span>
            </div>

            {showKey && fullKey && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--warning)',
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                Copy this key somewhere safe. It's stored server-side in your data volume.
              </div>
            )}
          </div>
        )}

        {/* API docs links */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={12} /> API Documentation
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/docs" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Swagger UI <ExternalLink size={11} />
            </a>
            <a href="/redoc" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ReDoc <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </Section>
    </div>
  )
}
