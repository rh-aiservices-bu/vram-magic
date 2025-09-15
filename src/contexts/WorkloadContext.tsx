import { createContext, ReactNode, useMemo, useCallback } from 'react'
import { Workload, WorkloadSlot, Profile } from '../types'
import type { WorkloadContextValue, WorkloadValidationResult } from '../types/contexts'
import { useAppContext } from '../hooks/useAppContext'
import { actionCreators } from './appActions'
import { validateWorkloadSlots, hasErrors } from '../utils/validation'
import { WORKLOAD_SLOT_CONSTRAINTS } from '../constants'

const WorkloadContext = createContext<WorkloadContextValue | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface WorkloadProviderProps {
  children: ReactNode
}

function WorkloadProvider({ children }: WorkloadProviderProps) {
  const { state, dispatch } = useAppContext()
  const { workloads, workloadSlots, profiles } = state

  // Calculate validation state
  const validation = useMemo((): WorkloadValidationResult => {
    const errors = validateWorkloadSlots(workloadSlots)
    const totalPercentage = workloadSlots.reduce((sum, slot) => sum + slot.percentage, 0)
    const remainingPercentage = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE - totalPercentage
    const hasActiveSlots = workloadSlots.some(slot => slot.isActive)

    return {
      isValid: !hasErrors(errors),
      errors,
      totalPercentage,
      remainingPercentage,
      hasActiveSlots,
    }
  }, [workloadSlots])

  // Action implementations - memoized to prevent recreation on every render
  const updateSlot = useCallback((index: number, updates: Partial<WorkloadSlot>) => {
    dispatch(actionCreators.updateWorkloadSlot(index, updates))
  }, [dispatch])

  const updateSlots = useCallback((slots: WorkloadSlot[]) => {
    dispatch(actionCreators.updateWorkloadSlots(slots))
  }, [dispatch])

  const resetSlots = useCallback(() => {
    dispatch(actionCreators.resetWorkloadSlots())

    dispatch(
      actionCreators.addNotification({
        id: `slots-reset-${crypto.randomUUID()}`,
        type: 'info',
        message: 'Workload slots have been reset',
        timestamp: Date.now(),
        autoClose: true,
      })
    )
  }, [dispatch])

  const setSlotWorkload = useCallback((index: number, workload: Workload | null) => {
    const updates: Partial<WorkloadSlot> = {
      workload,
      isActive: workload !== null && workloadSlots[index].percentage > 0,
    }

    dispatch(actionCreators.updateWorkloadSlot(index, updates))
  }, [dispatch, workloadSlots])

  const setSlotPercentage = useCallback((index: number, percentage: number) => {
    const clampedPercentage = Math.max(0, Math.min(100, percentage))
    const updates: Partial<WorkloadSlot> = {
      percentage: clampedPercentage,
      isActive: clampedPercentage > 0 && workloadSlots[index].workload !== null,
    }

    dispatch(actionCreators.updateWorkloadSlot(index, updates))
  }, [dispatch, workloadSlots])

  const setSlotActive = useCallback((index: number, isActive: boolean) => {
    const slot = workloadSlots[index]
    if (!isActive) {
      // Deactivating slot - set percentage to 0
      dispatch(actionCreators.updateWorkloadSlot(index, { isActive: false, percentage: 0 }))
    } else if (slot.workload && slot.percentage === 0) {
      // Activating slot with workload but no percentage - set default percentage
      const defaultPercentage = Math.min(20, validation.remainingPercentage)
      dispatch(
        actionCreators.updateWorkloadSlot(index, {
          isActive: true,
          percentage: defaultPercentage,
        })
      )
    } else {
      dispatch(actionCreators.updateWorkloadSlot(index, { isActive }))
    }
  }, [dispatch, workloadSlots, validation.remainingPercentage])

  const reorderSlots = useCallback((fromIndex: number, toIndex: number) => {
    const newSlots = [...workloadSlots]
    const [movedSlot] = newSlots.splice(fromIndex, 1)
    newSlots.splice(toIndex, 0, movedSlot)

    // Update order property to reflect new positions
    const reorderedSlots = newSlots.map((slot, index) => ({
      ...slot,
      order: index + 1,
    }))

    dispatch(actionCreators.updateWorkloadSlots(reorderedSlots))
  }, [dispatch, workloadSlots])

  const applyProfile = useCallback((profile: Profile) => {
    dispatch(actionCreators.selectProfile(profile))

    dispatch(
      actionCreators.addNotification({
        id: `profile-applied-${crypto.randomUUID()}`,
        type: 'success',
        message: `Applied profile: ${profile.name}`,
        timestamp: Date.now(),
        autoClose: true,
      })
    )
  }, [dispatch])

  const getSlotById = useCallback((id: string): WorkloadSlot | undefined => {
    return workloadSlots.find(slot => slot.id === id)
  }, [workloadSlots])

  const getActiveSlots = useCallback((): WorkloadSlot[] => {
    return workloadSlots.filter(slot => slot.isActive)
  }, [workloadSlots])

  const getTotalPercentage = useCallback((): number => {
    return validation.totalPercentage
  }, [validation.totalPercentage])

  const getRemainingPercentage = useCallback((): number => {
    return validation.remainingPercentage
  }, [validation.remainingPercentage])

  const value: WorkloadContextValue = useMemo(() => ({
    // State
    workloads,
    workloadSlots,
    profiles,
    validation,

    // Actions
    updateSlot,
    updateSlots,
    resetSlots,
    setSlotWorkload,
    setSlotPercentage,
    setSlotActive,
    reorderSlots,
    applyProfile,
    getSlotById,
    getActiveSlots,
    getTotalPercentage,
    getRemainingPercentage,
  }), [
    workloads,
    workloadSlots,
    profiles,
    validation,
    updateSlot,
    updateSlots,
    resetSlots,
    setSlotWorkload,
    setSlotPercentage,
    setSlotActive,
    reorderSlots,
    applyProfile,
    getSlotById,
    getActiveSlots,
    getTotalPercentage,
    getRemainingPercentage,
  ])

  return <WorkloadContext.Provider value={value}>{children}</WorkloadContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export { WorkloadProvider, WorkloadContext }
