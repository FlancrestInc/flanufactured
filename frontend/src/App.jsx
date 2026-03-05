import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { SettingsProvider } from './SettingsContext'
import { loadSettings, applyTheme } from './useSettings'
import Navbar from './components/Navbar'
import Builder from './pages/Builder'
import Library from './pages/Library'
import Settings from './pages/Settings'
import { fetchSchemas } from './api'

// Apply saved theme immediately before first render
applyTheme(loadSettings())

export default function App() {
  const [loadedSchema, setLoadedSchema] = useState(null)
  const [schemaVersion, setSchemaVersion] = useState(0)

  // Session usage stats — lifted to App so Settings can read them
  const [usageStats, setUsageStats] = useState({
    schemasTotal: null,
    previewsThisSession: 0,
    rowsThisSession: 0,
    downloadsThisSession: 0,
  })

  // Load schema count from server on mount
  useEffect(() => {
    fetchSchemas()
      .then(schemas => setUsageStats(s => ({ ...s, schemasTotal: schemas.length })))
      .catch(() => {})
  }, [schemaVersion])

  const trackPreview  = (rows) => setUsageStats(s => ({ ...s, previewsThisSession: s.previewsThisSession + 1, rowsThisSession: s.rowsThisSession + rows }))
  const trackDownload = (rows) => setUsageStats(s => ({ ...s, downloadsThisSession: s.downloadsThisSession + 1, rowsThisSession: s.rowsThisSession + rows }))

  return (
    <SettingsProvider>
      <ToastProvider>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <Navbar />
            <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/" element={
                  <Builder
                    loadedSchema={loadedSchema}
                    onSchemaSaved={() => setSchemaVersion(v => v + 1)}
                    onPreview={trackPreview}
                    onDownload={trackDownload}
                  />
                } />
                <Route path="/library" element={
                  <Library key={schemaVersion} onLoadSchema={setLoadedSchema} onDownload={trackDownload} />
                } />
                <Route path="/settings" element={<Settings usageStats={usageStats} />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </SettingsProvider>
  )
}
