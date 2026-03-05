import { useState, useEffect } from 'react'

export default function FieldOptions({ field, onChange }) {
  const opts = field.options || {}
  const set = (key, value) => onChange({ ...field, options: { ...opts, [key]: value } })

  const labelStyle = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }
  const col = { display: 'flex', flexDirection: 'column', gap: 4 }
  const row = { display: 'flex', gap: 12, flexWrap: 'wrap' }

  // ── Custom list ────────────────────────────────────────────────────────────
  // Keep raw textarea string in local state so newlines aren't stripped while typing
  const [customRaw, setCustomRaw] = useState(() => (opts.values || []).join('\n'))
  useEffect(() => {
    setCustomRaw((opts.values || []).join('\n'))
  }, [field.id]) // only reset when field identity changes, not on every render

  if (field.type === 'custom_list') return (
    <div style={col}>
      <label style={labelStyle}>Values — one per line, picked randomly</label>
      <textarea
        className="input"
        rows={6}
        style={{ resize: 'vertical', fontFamily: 'Space Mono, monospace', fontSize: 12 }}
        value={customRaw}
        onChange={e => setCustomRaw(e.target.value)}
        onBlur={e => set('values', e.target.value.split('\n').filter(v => v.trim() !== ''))}
        placeholder={"apple\nbanana\ncherry"}
      />
      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
        {customRaw.split('\n').filter(v => v.trim()).length} values
      </div>
    </div>
  )

  // ── Weighted list ──────────────────────────────────────────────────────────
  // Keep a local array of {value, weight} rows for editing
  const [weightedRows, setWeightedRows] = useState(
    () => (opts.items || [{ value: '', weight: 1 }])
  )
  useEffect(() => {
    setWeightedRows(opts.items?.length ? opts.items : [{ value: '', weight: 1 }])
  }, [field.id])

  const commitWeighted = (rows) => {
    setWeightedRows(rows)
    onChange({ ...field, options: { ...opts, items: rows } })
  }

  if (field.type === 'weighted_list') return (
    <div style={col}>
      <label style={labelStyle}>Items — value and relative weight</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <span style={{ ...labelStyle, flex: 1, marginBottom: 0 }}>Value</span>
        <span style={{ ...labelStyle, width: 70, marginBottom: 0 }}>Weight</span>
        <span style={{ width: 28 }} />
      </div>
      {weightedRows.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1, fontSize: 12, fontFamily: 'Space Mono, monospace' }}
            placeholder="value"
            value={item.value}
            onChange={e => {
              const next = weightedRows.map((r, j) => j === i ? { ...r, value: e.target.value } : r)
              commitWeighted(next)
            }}
          />
          <input
            className="input"
            type="number"
            min={1}
            style={{ width: 70, fontSize: 12 }}
            value={item.weight}
            onChange={e => {
              const next = weightedRows.map((r, j) => j === i ? { ...r, weight: +e.target.value || 1 } : r)
              commitWeighted(next)
            }}
          />
          <button
            className="btn btn-danger btn-sm"
            style={{ flexShrink: 0, padding: '4px 7px' }}
            onClick={() => commitWeighted(weightedRows.filter((_, j) => j !== i))}
            disabled={weightedRows.length <= 1}
          >×</button>
        </div>
      ))}
      <button
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
        onClick={() => commitWeighted([...weightedRows, { value: '', weight: 1 }])}
      >
        + Add row
      </button>
    </div>
  )

  // ── Fixed value ────────────────────────────────────────────────────────────
  if (field.type === 'fixed_value') return (
    <div style={col}>
      <label style={labelStyle}>Value</label>
      <input className="input" value={opts.value || ''} onChange={e => set('value', e.target.value)} placeholder="Enter fixed value" />
    </div>
  )

  // ── Number ────────────────────────────────────────────────────────────────
  if (field.type === 'number') return (
    <div style={row}>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Min</label><input className="input" type="number" value={opts.min ?? 0} onChange={e => set('min', +e.target.value)} /></div>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Max</label><input className="input" type="number" value={opts.max ?? 1000} onChange={e => set('max', +e.target.value)} /></div>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Decimals</label><input className="input" type="number" min={0} max={8} value={opts.decimals ?? 0} onChange={e => set('decimals', +e.target.value)} /></div>
    </div>
  )

  // ── Sequence ──────────────────────────────────────────────────────────────
  if (field.type === 'sequence') return (
    <div style={row}>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Start</label><input className="input" type="number" value={opts.start ?? 1} onChange={e => set('start', +e.target.value)} /></div>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Step</label><input className="input" type="number" value={opts.step ?? 1} onChange={e => set('step', +e.target.value)} /></div>
    </div>
  )

  // ── Email ─────────────────────────────────────────────────────────────────
  if (field.type === 'email') return (
    <div style={col}>
      <label style={labelStyle}>Force domain (optional)</label>
      <input className="input" value={opts.domain || ''} onChange={e => set('domain', e.target.value)} placeholder="example.com" style={{ maxWidth: 240 }} />
    </div>
  )

  // ── Date ──────────────────────────────────────────────────────────────────
  if (field.type === 'date') return (
    <div style={row}>
      <div style={{ ...col, flex: 1 }}>
        <label style={labelStyle}>Start date</label>
        <input className="input" value={opts.start_date || '-5y'} onChange={e => set('start_date', e.target.value)} placeholder="-5y or 2020-01-01" />
      </div>
      <div style={{ ...col, flex: 1 }}>
        <label style={labelStyle}>End date</label>
        <input className="input" value={opts.end_date || 'today'} onChange={e => set('end_date', e.target.value)} placeholder="today or 2025-12-31" />
      </div>
      <div style={{ ...col, flex: 1 }}>
        <label style={labelStyle}>Format</label>
        <input className="input" value={opts.format || '%Y-%m-%d'} onChange={e => set('format', e.target.value)} placeholder="%Y-%m-%d" />
      </div>
    </div>
  )

  // ── Lorem ipsum ───────────────────────────────────────────────────────────
  if (field.type === 'lorem_ipsum') return (
    <div style={{ ...col, maxWidth: 180 }}>
      <label style={labelStyle}>Sentences</label>
      <input className="input" type="number" min={1} max={20} value={opts.sentences ?? 3} onChange={e => set('sentences', +e.target.value)} />
    </div>
  )

  // ── Text block ────────────────────────────────────────────────────────────
  if (field.type === 'text') return (
    <div style={{ ...col, maxWidth: 220 }}>
      <label style={labelStyle}>Max characters</label>
      <input className="input" type="number" min={20} max={2000} value={opts.max_chars ?? 300} onChange={e => set('max_chars', +e.target.value)} />
    </div>
  )

  // ── Words ─────────────────────────────────────────────────────────────────
  if (field.type === 'words') return (
    <div style={{ ...col, maxWidth: 180 }}>
      <label style={labelStyle}>Word count</label>
      <input className="input" type="number" min={1} max={20} value={opts.count ?? 3} onChange={e => set('count', +e.target.value)} />
    </div>
  )

  // ── Price ─────────────────────────────────────────────────────────────────
  if (field.type === 'price') return (
    <div style={row}>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Min</label><input className="input" type="number" step="0.01" value={opts.min ?? 0.99} onChange={e => set('min', +e.target.value)} /></div>
      <div style={{ ...col, flex: 1 }}><label style={labelStyle}>Max</label><input className="input" type="number" step="0.01" value={opts.max ?? 999.99} onChange={e => set('max', +e.target.value)} /></div>
    </div>
  )

  // ── Gender ────────────────────────────────────────────────────────────────
  if (field.type === 'gender') return (
    <div style={col}>
      <label style={labelStyle}>Options (one per line)</label>
      <textarea
        className="input"
        rows={5}
        style={{ resize: 'vertical', fontFamily: 'Space Mono, monospace', fontSize: 12 }}
        defaultValue={(opts.values || ['Male', 'Female', 'Non-binary', 'Agender', 'Genderfluid']).join('\n')}
        onBlur={e => set('values', e.target.value.split('\n').filter(Boolean))}
      />
    </div>
  )

  // ── Regex ─────────────────────────────────────────────────────────────────
  if (field.type === 'regex') return (
    <div style={col}>
      <label style={labelStyle}>Pattern</label>
      <input className="input" value={opts.pattern || ''} onChange={e => set('pattern', e.target.value)} placeholder="[A-Z]{3}[0-9]{4}" style={{ fontFamily: 'Space Mono, monospace', fontSize: 12 }} />
    </div>
  )

  return null
}
