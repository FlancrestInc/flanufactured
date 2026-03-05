import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { useSettingsContext } from '../SettingsContext'

const LOCALES = [
  { value: 'en_US', label: 'English (US)' }, { value: 'en_GB', label: 'English (UK)' },
  { value: 'en_AU', label: 'English (Australia)' }, { value: 'en_CA', label: 'English (Canada)' },
  { value: 'fr_FR', label: 'French (France)' }, { value: 'fr_CA', label: 'French (Canada)' },
  { value: 'de_DE', label: 'German' }, { value: 'es_ES', label: 'Spanish (Spain)' },
  { value: 'es_MX', label: 'Spanish (Mexico)' }, { value: 'it_IT', label: 'Italian' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' }, { value: 'pt_PT', label: 'Portuguese (Portugal)' },
  { value: 'nl_NL', label: 'Dutch' }, { value: 'pl_PL', label: 'Polish' },
  { value: 'ru_RU', label: 'Russian' }, { value: 'ja_JP', label: 'Japanese' },
  { value: 'zh_CN', label: 'Chinese (Simplified)' }, { value: 'ko_KR', label: 'Korean' },
  { value: 'sv_SE', label: 'Swedish' }, { value: 'da_DK', label: 'Danish' },
]

export default function DownloadModal({ onDownload, onClose, loading }) {
  const { settings } = useSettingsContext()

  const [rows, setRows]     = useState(settings.exportRows)
  const [format, setFormat] = useState(settings.exportFormat)
  const [locale, setLocale] = useState(settings.exportLocale)
  const [seed, setSeed]     = useState('')

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="font-display" style={{ fontSize: 20, color: 'var(--accent)' }}>DOWNLOAD DATA</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Row count <span style={{ color: 'var(--text-dim)' }}>(max {settings.maxRowsOverride.toLocaleString()})</span>
            </label>
            <input className="input" type="number" min={1} max={settings.maxRowsOverride}
              value={rows} onChange={e => setRows(Math.min(settings.maxRowsOverride, +e.target.value))} />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Format</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['json', 'csv'].map(f => (
                <button key={f} className={`btn ${format === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }} onClick={() => setFormat(f)}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Locale</label>
            <select className="select" value={locale} onChange={e => setLocale(e.target.value)}>
              {LOCALES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Seed <span style={{ color: 'var(--text-dim)' }}>(optional — for reproducible results)</span>
            </label>
            <input className="input" type="number" value={seed}
              onChange={e => setSeed(e.target.value)} placeholder="e.g. 42" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={loading || rows < 1}
            onClick={() => onDownload({ rows, format, locale, seed: seed ? +seed : undefined, prettyPrint: settings.exportPrettyPrint })}>
            <Download size={14} />
            {loading ? 'Generating…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
