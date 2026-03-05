import { NavLink } from 'react-router-dom'
import { Layers, Database, Settings } from 'lucide-react'

export default function Navbar() {
  return (
    <nav style={{
      height: 54,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginRight: 28 }}>
        <span className="font-display phosphor-glow" style={{ fontSize: 24, color: 'var(--accent)', lineHeight: 1 }}>
          FLANUFACTURED
        </span>
        <span className="font-mono" style={{ fontSize: 9, color: 'var(--text-dim)' }}>v1</span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        <NavLink to="/" end style={({ isActive }) => navStyle(isActive)}>
          <Layers size={13} /> Builder
        </NavLink>
        <NavLink to="/library" style={({ isActive }) => navStyle(isActive)}>
          <Database size={13} /> Schema Library
        </NavLink>
        <NavLink to="/settings" style={({ isActive }) => navStyle(isActive)}>
          <Settings size={13} /> Settings
        </NavLink>
      </div>
    </nav>
  )
}

function navStyle(isActive) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s',
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
    background: isActive ? 'var(--accent-subtle)' : 'transparent',
    border: isActive ? '1px solid rgba(74,222,128,0.2)' : '1px solid transparent',
  }
}
