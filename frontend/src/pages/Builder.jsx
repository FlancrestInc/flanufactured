import { useState, useEffect, useCallback, useRef } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Plus, Eye, Download, Save, FolderOpen, FileUp, FileDown, RefreshCw, Trash2 } from 'lucide-react'
import { fetchFieldTypes, generateData, generateCSV, createSchema, updateSchema, importSchemaFile, triggerDownload } from '../api'
import FieldRow from '../components/FieldRow'
import PreviewTable from '../components/PreviewTable'
import SaveSchemaModal from '../components/SaveSchemaModal'
import DownloadModal from '../components/DownloadModal'
import { useToast } from '../components/Toast'
import { useSettingsContext } from '../SettingsContext'

let _nextId = 1
const uid = () => `f${_nextId++}`

// Auto-assign names to fields that have a type but no name
function autoNameFields(fields) {
  const counts = {}
  return fields.map(f => {
    if (f.name.trim() || !f.type) return f
    const base = f.type
    if (!(base in counts)) { counts[base] = 0; return { ...f, name: base } }
    counts[base]++
    return { ...f, name: `${base}_${counts[base] - 1}` }
  })
}


const emptyField = () => ({ id: uid(), name: '', type: '', options: {} })

export default function Builder({ loadedSchema, onSchemaSaved, onPreview, onDownload }) {
  const toast = useToast()
  const { settings } = useSettingsContext()
  const [fieldTypes, setFieldTypes] = useState({})
  const [fields, setFields] = useState([emptyField()])
  const [schemaName, setSchemaName] = useState('')
  const [currentSchemaId, setCurrentSchemaId] = useState(null)

  const [preview, setPreview] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)


  // ── Resizable split pane ───────────────────────────────────────────────────
  const [leftPercent, setLeftPercent] = useState(52)
  const splitRef = useRef(null)
  const dragging = useRef(false)

  const onSplitterMouseDown = (e) => {
    e.preventDefault()
    dragging.current = true
    const container = splitRef.current
    const onMove = (e) => {
      if (!dragging.current || !container) return
      const rect = container.getBoundingClientRect()
      const pct = Math.min(75, Math.max(25, ((e.clientX - rect.left) / rect.width) * 100))
      setLeftPercent(pct)
    }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Load field types on mount
  useEffect(() => {
    fetchFieldTypes()
      .then(setFieldTypes)
      .catch(() => toast('Failed to load field types — check your API key', 'error'))
  }, [])

  // Load schema from library
  useEffect(() => {
    if (!loadedSchema) return
    setFields(loadedSchema.fields.map(f => ({ ...f, id: uid() })))
    setSchemaName(loadedSchema.name)
    setCurrentSchemaId(loadedSchema.id)
    setPreview([])
  }, [loadedSchema])

  const validFields = fields.filter(f => f.type)  // names auto-assigned if empty

  const handleDragEnd = ({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id)
      const newIndex = fields.findIndex(f => f.id === over.id)
      setFields(arrayMove(fields, oldIndex, newIndex))
    }
  }

  const handlePreview = useCallback(async () => {
    if (!validFields.length) {
      toast('Add at least one field with a type selected', 'error')
      return
    }
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const namedFields = autoNameFields(validFields)
      const data = await generateData({ fields: namedFields, rows: settings.previewRows, format: 'json', locale: 'en_US' })
      setPreview(data)
      onPreview?.(data.length)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Preview failed'
      setPreviewError(msg)
    } finally {
      setPreviewLoading(false)
    }
  }, [validFields])

  const handleDownload = async ({ rows, format, locale, seed }) => {
    setDownloadLoading(true)
    try {
      const payload = { fields: autoNameFields(validFields), rows, format, locale, seed }
      if (format === 'csv') {
        const blob = await generateCSV(payload)
        triggerDownload(blob, `flanufactured.csv`, 'text/csv')
      } else {
        const data = await generateData({ ...payload, format: 'json' })
        const indent = payload.prettyPrint !== false ? 2 : 0
        const blob = new Blob([JSON.stringify(data, null, indent)], { type: 'application/json' })
        triggerDownload(blob, `flanufactured.json`)
      }
      setShowDownloadModal(false)
      onDownload?.(rows)
      toast(`Downloaded ${rows} rows as ${format.toUpperCase()}`, 'success')
    } catch (e) {
      toast('Download failed — check fields and try again', 'error')
    } finally {
      setDownloadLoading(false)
    }
  }

  const handleSave = async (name) => {
    if (!validFields.length) { toast('Add at least one field with a type selected', 'error'); return }
    try {
      let saved
      if (currentSchemaId) {
        saved = await updateSchema(currentSchemaId, { name, fields: validFields })
        toast(`Schema "${name}" updated`, 'success')
      } else {
        saved = await createSchema({ name, fields: validFields })
        setCurrentSchemaId(saved.id)
        toast(`Schema "${name}" saved`, 'success')
      }
      setSchemaName(name)
      setShowSaveModal(false)
      onSchemaSaved?.()
    } catch (e) {
      toast('Save failed', 'error')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const schema = await importSchemaFile(file)
      setFields(schema.fields.map(f => ({ ...f, id: uid() })))
      setSchemaName(schema.name)
      setCurrentSchemaId(schema.id)
      setPreview([])
      toast(`Imported "${schema.name}"`, 'success')
      onSchemaSaved?.()
    } catch (e) {
      toast('Import failed — invalid schema file', 'error')
    }
    e.target.value = ''
  }

  const handleExportSchema = () => {
    const schema = { name: schemaName || 'Untitled', fields: validFields }
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' })
    triggerDownload(blob, `${schemaName || 'schema'}.schema.json`, 'application/json')
  }

  const handleClear = () => {
    setFields([emptyField()])
    setSchemaName('')
    setCurrentSchemaId(null)
    setPreview([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        background: 'var(--bg-surface)',
      }}>
        {/* Schema name */}
        <input
          className="input"
          style={{ width: 220, fontSize: 13 }}
          placeholder="Untitled schema"
          value={schemaName}
          onChange={e => setSchemaName(e.target.value)}
        />

        <div className="divider" style={{ width: 1, height: 24, borderTop: 'none', borderLeft: '1px solid var(--border)', margin: '0 4px' }} />

        <button className="btn btn-ghost btn-sm" onClick={handleClear} title="New schema">
          <RefreshCw size={13} /> New
        </button>

        {/* Import */}
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }} title="Import schema JSON">
          <FileUp size={13} /> Import
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>

        {/* Export schema */}
        <button className="btn btn-ghost btn-sm" onClick={handleExportSchema} disabled={!validFields.length} title="Export schema as JSON">
          <FileDown size={13} /> Export Schema
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn btn-secondary btn-sm" onClick={handlePreview} disabled={!validFields.length}>
          <Eye size={13} /> Preview
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => setShowSaveModal(true)} disabled={!validFields.length}>
          <Save size={13} /> {currentSchemaId ? 'Update' : 'Save'}
        </button>

        <button className="btn btn-primary btn-sm" onClick={() => setShowDownloadModal(true)} disabled={!validFields.length}>
          <Download size={13} /> Download Data
        </button>
      </div>

      {/* Split: fields left, preview right */}
      <div ref={splitRef} style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>

        {/* Fields panel */}
        <div style={{ flex: `0 0 ${leftPercent}%`, display: 'flex', flexDirection: 'column', borderRight: 'none', minWidth: 0, overflow: 'hidden' }}>
          {/* Sticky header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 12px', flexShrink: 0, background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="font-display" style={{ fontSize: 18, color: 'var(--text-primary)' }}>FIELDS</span>
              <span className="badge badge-muted">{fields.length}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setFields(f => [...f, emptyField()])}>
              <Plus size={13} /> Add Field
            </button>
          </div>

          {/* Scrollable field list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fields.map((field, i) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    index={i}
                    fieldTypes={fieldTypes}
                    onChange={updated => setFields(fs => fs.map(f => f.id === updated.id ? updated : f))}
                    onDelete={() => setFields(fs => fs.filter(f => f.id !== field.id))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {fields.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-dim)', fontSize: 13 }}>
              No fields yet — add one to get started
            </div>
          )}
          </div>{/* end scrollable list */}
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onSplitterMouseDown}
          style={{
            width: 6, flexShrink: 0, cursor: 'col-resize', background: 'var(--border)',
            transition: 'background 0.15s', zIndex: 10,
            borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
          onMouseLeave={e => { if (!dragging.current) e.currentTarget.style.background = 'var(--border)' }}
        />

        {/* Preview panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* Sticky preview header */}
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="font-display" style={{ fontSize: 18 }}>PREVIEW</span>
              {preview.length > 0 && <span className="badge badge-green">{preview.length} rows</span>}
            </div>
            {preview.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handlePreview}>
                <RefreshCw size={12} /> Refresh
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PreviewTable data={preview} loading={previewLoading} error={previewError} />
          </div>
        </div>
      </div>

      {showSaveModal && (
        <SaveSchemaModal
          initialName={schemaName}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
      {showDownloadModal && (
        <DownloadModal
          onDownload={handleDownload}
          onClose={() => setShowDownloadModal(false)}
          loading={downloadLoading}
        />
      )}
    </div>
  )
}


