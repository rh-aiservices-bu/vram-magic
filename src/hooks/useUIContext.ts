import { useContext } from 'react'
import { UIContext } from '../contexts/UIContext'
import type { UIContextValue } from '../types/contexts'

export function useUIContext(): UIContextValue {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider')
  }
  return context
}
