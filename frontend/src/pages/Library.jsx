import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Download, FileDown, Edit3, RefreshCw, Database, Copy } from 'lucide-react'
import { fetchSchemas, deleteSchema, fetchSchema, getApiKey } from '../api'
import DownloadModal from '../components/DownloadModal'
import { useToast } from '../components/Toast'
import { useSettingsContext } from '../SettingsContext'

export default function Library({ onLoadSchema, onDownload }) {
  const toast = useToast()
  const { settings } = useSettingsContext()
  const navigate = useNavigate()
  const [schemas, setSchemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadTarget, setDownloadTarget] = useState(null) // {id, name}
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => {
    setLoading(true)
    fetchSchemas()
      .then(setSchemas)
      .catch(() => toast('Failed to load schemas', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, name) => {
    if (settings.confirmBeforeDelete && !confirmDelete) { setConfirmDelete({ id, name }); return }
    try {
      await deleteSchema(id)
      setSchemas(s => s.filter(x => x.id !== id))
      toast(`Deleted "${name}"`, 'success')
    } catch {
      toast('Delete failed', 'error')
    }
    setConfirmDelete(null)
  }

  const handleLoadInBuilder = async (id) => {
    try {
      const schema = await fetchSchema(id)
      onLoadSchema(schema)
      toast(`Loaded "${schema.name}" into builder`, 'info')
      // Small delay ensures state is set before navigation renders Builder
      setTimeout(() => navigate('/'), 50)
    } catch {
      toast('Failed to load schema', 'error')
    }
  }

  const handleDownload = async ({ rows, format, locale, seed }) => {
    setDownloadLoading(true)
    try {
      const key = getApiKey()
      const res = await fetch(`/api/generate/${downloadTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
        body: JSON.stringify({ rows, format, locale, seed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ? JSON.stringify(err.detail) : 'Generate failed')
      }
      const blob = await res.blob()
      const ext = format === 'csv' ? 'csv' : 'json'
      triggerDownload(blob, `${downloadTarget.name}.${ext}`)
      setDownloadTarget(null)
      onDownload?.(rows)
      toast(`Downloaded ${rows} rows from "${downloadTarget.name}"`, 'success')
    } catch (e) {
      toast(`Download failed: ${e.message}`, 'error')
    } finally {
      setDownloadLoading(false)
    }
  }

  const handleExportSchema = async (id, name) => {
    const key = getApiKey()
    const res = await fetch(`/api/schemas/${id}/export`, { headers: { 'X-API-Key': key } })
    const blob = await res.blob()
    triggerDownload(blob, `${name}.schema.json`, 'application/json')
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, margin: 0, color: 'var(--accent)' }}>SCHEMA LIBRARY</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {schemas.length} saved schema{schemas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Empty state */}
      {!loading && schemas.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '64px 0',
          color: 'var(--text-muted)',
          border: '1px dashed var(--border)',
          borderRadius: 8,
        }}>
          <Database size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ fontSize: 14 }}>No schemas saved yet</div>
          <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-dim)' }}>Build one in the Schema Builder and save it</div>
        </div>
      )}

      {/* Schema cards */}
      <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {schemas.map(schema => (
          <div key={schema.id} className="card" style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{schema.name}</span>
                <span className="badge badge-amber">{schema.field_count} field{schema.field_count !== 1 ? 's' : ''}</span>
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 16, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  ID: {schema.id}
                  <button
                    onClick={() => { navigator.clipboard.writeText(schema.id); toast('ID copied', 'success') }}
                    title="Copy ID"
                    style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  >
                    <Copy size={10} />
                  </button>
                </span>
                <span>Created: {new Date(schema.created).toLocaleDateString()}</span>
                <span>Modified: {new Date(schema.modified).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handleLoadInBuilder(schema.id)} title="Load into Builder">
                <Edit3 size={13} /> Load into Builder
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleExportSchema(schema.id, schema.name)} title="Export schema JSON">
                <FileDown size={13} /> Schema
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setDownloadTarget(schema)} title="Download data">
                <Download size={13} /> Data
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(schema)} title="Delete schema">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Download modal */}
      {downloadTarget && (
        <DownloadModal
          onDownload={handleDownload}
          onClose={() => setDownloadTarget(null)}
          loading={downloadLoading}
        />
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <h3 className="font-display" style={{ fontSize: 20, color: 'var(--danger)', margin: '0 0 12px' }}>DELETE SCHEMA</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</strong>?
              This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ border: '1px solid var(--danger)' }}
                onClick={() => handleDelete(confirmDelete.id, confirmDelete.name)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
