import { createContext, useContext } from 'react'
import { useSettings } from './useSettings'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, updateSettings] = useSettings()
  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider')
  return ctx
}
