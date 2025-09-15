import { useContext } from 'react'
import { SimulationContext } from '../contexts/SimulationContext'
import type { SimulationContextValue } from '../types/contexts'

export function useSimulationContext(): SimulationContextValue {
  const context = useContext(SimulationContext)
  if (context === undefined) {
    throw new Error('useSimulationContext must be used within a SimulationProvider')
  }
  return context
}
