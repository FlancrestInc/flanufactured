import { useState, useMemo, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import Portal from './Portal'

const NAVBAR_HEIGHT = 54 // px — must match the nav height in Navbar.jsx

export default function FieldTypePicker({ fieldTypes, currentType, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
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
    for (const cat of Object.keys(fieldTypes || {})) {
      const types = fieldTypes[cat] || []
      for (const t of types) flat.push({ ...t, category: cat })
    }
    return flat
  }, [fieldTypes])

  const categories = useMemo(() => (
    Object.keys(fieldTypes || {}).map(name => ({
      name,
      count: (fieldTypes[name] || []).length,
    }))
  ), [fieldTypes])

  const visibleTypes = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allTypes.filter(t => {
      if (activeCategory !== 'All' && t.category !== activeCategory) return false
      if (!q) return true
      return (
        t.label.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    })
  }, [allTypes, search, activeCategory])

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
            width: 1120,
            maxWidth: '96vw',
            maxHeight: 'calc(100vh - 54px - 64px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'fadeIn 0.18s ease',
          }}
          >
          {/* Header */}
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Choose a Type</span>

              <div style={{ flex: 1 }} />

              <div style={{ position: 'relative', width: 260, maxWidth: '45vw' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  className="input"
                  style={{ paddingLeft: 36, fontSize: 14 }}
                  placeholder="Find Type..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14} /></button>
            </div>
          </div>

          {/* Body: category nav + grid */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            <aside style={{
              width: 180,
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
              background: 'var(--bg-primary)',
            }}>
              {[{ name: 'All', count: allTypes.length }, ...categories].map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: 'none',
                    borderLeft: activeCategory === cat.name ? '3px solid var(--accent)' : '3px solid transparent',
                    background: activeCategory === cat.name ? 'var(--bg-elevated)' : 'transparent',
                    color: activeCategory === cat.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: activeCategory === cat.name ? 700 : 500,
                  }}
                >
                  <span>{cat.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({cat.count})</span>
                </button>
              ))}
            </aside>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bg-elevated)' }}>
              {visibleTypes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No types match "{search}"
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '22px 30px' }}>
                  {visibleTypes.map(t => (
                    <button
                      key={t.type}
                      onClick={() => { onSelect(t.type); onClose() }}
                      style={{
                        textAlign: 'left',
                        border: 'none',
                        borderLeft: currentType === t.type ? '2px solid var(--accent)' : '2px solid transparent',
                        background: currentType === t.type ? 'var(--bg-hover)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        padding: '0 0 0 10px',
                        minHeight: 76,
                      }}
                    >
                      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2, marginBottom: 5 }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                        {t.description}
                      </div>
                      {t.examples?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {t.examples.slice(0, 3).join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}
