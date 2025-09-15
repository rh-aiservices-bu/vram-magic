import { useContext } from 'react'
import { WorkloadContext } from '../contexts/WorkloadContext'
import type { WorkloadContextValue } from '../types/contexts'

export function useWorkloadContext(): WorkloadContextValue {
  const context = useContext(WorkloadContext)
  if (context === undefined) {
    throw new Error('useWorkloadContext must be used within a WorkloadProvider')
  }
  return context
}
