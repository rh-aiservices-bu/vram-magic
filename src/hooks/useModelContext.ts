import { useContext } from 'react'
import { ModelContext } from '../contexts/ModelContext'
import type { ModelContextValue } from '../types/contexts'

export function useModelContext(): ModelContextValue {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider')
  }
  return context
}
