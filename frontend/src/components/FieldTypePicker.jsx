import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react'
import Portal from './Portal'

const CATEGORY_ORDER = ['Core','Personal','Location','Internet','Finance','Vehicle','DateTime','Text','Wacky']
const NAVBAR_HEIGHT = 54 // px — must match the nav height in Navbar.jsx

export default function FieldTypePicker({ fieldTypes, currentType, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [hoveredType, setHoveredType] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    searchRef.current?.focus()
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const allTypes = useMemo(() => {
    const flat = []
    for (const cat of CATEGORY_ORDER) {
      const types = fieldTypes[cat] || []
      for (const t of types) flat.push({ ...t, category: cat })
    }
    return flat
  }, [fieldTypes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allTypes.filter(t => {
      if (!showAdvanced && t.advanced) return false
      if (!q) return true
      return (
        t.label.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    })
  }, [allTypes, search, showAdvanced])

  const grouped = useMemo(() => {
    const g = {}
    for (const t of filtered) {
      if (!g[t.category]) g[t.category] = []
      g[t.category].push(t)
    }
    return g
  }, [filtered])

  const advancedCount = allTypes.filter(t => t.advanced).length

  return (
    <Portal>
      {/* Full-screen backdrop — positioned below navbar */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: NAVBAR_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 40,
          paddingBottom: 24,
          animation: 'fadeIn 0.15s ease',
          overflowY: 'auto',
        }}
      >
        {/* Modal — stop click propagation so clicks inside don't close it */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-bright)',
            borderRadius: 10,
            width: 680,
            maxWidth: '95vw',
            maxHeight: 'calc(100vh - 54px - 64px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="font-display" style={{ fontSize: 22, color: 'var(--accent)' }}>SELECT FIELD TYPE</span>
              <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                className="input"
                style={{ paddingLeft: 30, fontSize: 13 }}
                placeholder="Search types…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Footer row: count + advanced toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {filtered.length} type{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAdvanced(a => !a)}
                style={{ fontSize: 11, color: showAdvanced ? 'var(--accent)' : 'var(--text-muted)', gap: 4 }}
              >
                {showAdvanced ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {showAdvanced ? 'Hide' : 'Show'} advanced ({advancedCount})
              </button>
            </div>
          </div>

          {/* Body: list + preview */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Type list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {Object.entries(grouped).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No types match "{search}"
                </div>
              )}
              {CATEGORY_ORDER.filter(c => grouped[c]).map(cat => (
                <div key={cat}>
                  <div style={{
                    padding: '6px 16px 4px',
                    fontSize: 10,
                    fontFamily: 'Space Mono, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-primary)',
                    borderTop: '1px solid var(--border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}>
                    {cat}
                  </div>
                  {grouped[cat].map(t => (
                    <div
                      key={t.type}
                      onClick={() => { onSelect(t.type); onClose() }}
                      onMouseEnter={() => setHoveredType(t)}
                      style={{
                        padding: '8px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: (hoveredType?.type === t.type || currentType === t.type)
                          ? 'var(--bg-elevated)' : 'transparent',
                        borderLeft: currentType === t.type
                          ? '2px solid var(--accent)'
                          : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: currentType === t.type ? 'var(--accent)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          {t.label}
                          {t.advanced && (
                            <span className="badge badge-muted" style={{ fontSize: 9, padding: '1px 5px' }}>ADV</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Preview panel */}
            <div style={{
              width: 220,
              flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              padding: 16,
              overflowY: 'auto',
              background: 'var(--bg-primary)',
            }}>
              {hoveredType ? (
                <div className="animate-fade-in" key={hoveredType.type}>
                  <div className="font-display" style={{ fontSize: 16, color: 'var(--accent)', marginBottom: 6 }}>
                    {hoveredType.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                    {hoveredType.description}
                  </div>
                  {hoveredType.examples?.length > 0 && (
                    <>
                      <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Examples
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {hoveredType.examples.map((ex, i) => (
                          <div key={i} style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-bright)',
                            borderRadius: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                            fontFamily: 'Space Mono, monospace',
                            color: 'var(--accent)',
                            wordBreak: 'break-all',
                          }}>
                            {ex}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--text-muted)', marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    type: {hoveredType.type}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>
                  Hover a type<br/>to see examples
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
