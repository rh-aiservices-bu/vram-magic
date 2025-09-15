import { useContext } from 'react'
import { AppContext } from '../contexts/AppContext'
import type { AppState, AppAction } from '../types/contexts'

export interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}
