import { useState } from 'react'
import { setApiKey } from '../api'
import { KeyRound } from 'lucide-react'

export default function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('')

  const handleSave = () => {
    if (!key.trim()) return
    setApiKey(key.trim())
    onSave()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'var(--accent-subtle)',
            border: '1px solid rgba(240,180,41,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <KeyRound size={18} color="var(--accent)" />
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 22, color: 'var(--accent)' }}>API KEY REQUIRED</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set in your .env on the server</div>
          </div>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, marginTop: 0 }}>
          Enter the <span className="font-mono" style={{ color: 'var(--text-primary)', fontSize: 12 }}>API_KEY</span> value
          from your server's <span className="font-mono" style={{ color: 'var(--text-primary)', fontSize: 12 }}>.env</span> file.
          It will be stored in your browser for this session.
        </p>

        <input
          className="input"
          type="password"
          placeholder="Paste your API key..."
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          autoFocus
          style={{ marginBottom: 16, fontFamily: 'Space Mono, monospace', fontSize: 12 }}
        />

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSave} disabled={!key.trim()}>
          Continue to Flanufactured
        </button>
      </div>
    </div>
  )
}
