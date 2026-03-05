import { Loader } from 'lucide-react'

export default function PreviewTable({ data, loading, error }) {
  const centerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, color: 'var(--text-secondary)', fontSize: 13,
  }

  if (loading) return (
    <div style={{ ...centerStyle, gap: 10 }}>
      <Loader size={16} className="animate-spin" />
      <span>Generating preview…</span>
    </div>
  )

  if (error) return (
    <div style={{ ...centerStyle, color: 'var(--danger)' }}>{error}</div>
  )

  if (!data || data.length === 0) return (
    <div style={centerStyle}>Add fields and click Preview to see sample data</div>
  )

  const columns = Object.keys(data[0])

  return (
    // outer: fills the flex column parent fully, clips overflow
    <div style={{ flex: 1, overflow: 'auto', display: 'block' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 12,
        fontFamily: 'Space Mono, monospace',
      }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', zIndex: 1 }}>
            {columns.map(col => (
              <th key={col} style={{
                padding: '8px 12px',
                textAlign: 'left',
                color: 'var(--accent)',
                fontWeight: 700,
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(col => {
                const val = row[col]
                const display = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
                return (
                  <td key={col} style={{
                    padding: '7px 12px',
                    color: 'var(--text-primary)',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 11,
                  }} title={display}>
                    {display === 'true' || display === 'false'
                      ? <span style={{ color: display === 'true' ? 'var(--success)' : 'var(--text-dim)' }}>{display}</span>
                      : display
                    }
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
