import { useMemo, useCallback } from 'react'
import { WorkloadSlot, Workload } from '../types'
import { ValidationError } from '../types/contexts'
import { useWorkloadContext } from './useWorkloadContext'
import { validateWorkloadSlots, hasErrors } from '../utils/validation'
import { WORKLOAD_SLOT_CONSTRAINTS } from '../constants'

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  totalPercentage: number
  remainingPercentage: number
  hasActiveSlots: boolean
  hasOverallocation: boolean
  hasUnderallocation: boolean
}

interface SlotValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  canActivate: boolean
  suggestedPercentage?: number
}

interface UseWorkloadValidationReturn {
  // Overall validation state
  validation: ValidationResult

  // Validation functions
  validateSlots: (slots: WorkloadSlot[]) => ValidationResult
  validateSlot: (
    slot: WorkloadSlot,
    index: number,
    allSlots: WorkloadSlot[]
  ) => SlotValidationResult
  validatePercentageChange: (
    index: number,
    newPercentage: number,
    allSlots: WorkloadSlot[]
  ) => ValidationResult
  validateWorkloadAssignment: (
    index: number,
    workload: Workload | null,
    allSlots: WorkloadSlot[]
  ) => SlotValidationResult

  // Utility functions
  canSetPercentage: (index: number, percentage: number) => boolean
  canActivateSlot: (index: number) => boolean
  getOptimalPercentage: (index: number, targetTotal?: number) => number
  suggestBalancedDistribution: (activeSlotCount: number) => number[]
  fixOverallocation: (slots: WorkloadSlot[]) => WorkloadSlot[]

  // Real-time validation helpers
  getPercentageError: (index: number, percentage: number) => string | null
  getSlotWarnings: (index: number) => string[]
  getRemainingPercentageForSlot: (index: number, excludeCurrent?: boolean) => number
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWorkloadValidation(): UseWorkloadValidationReturn {
  const { workloadSlots } = useWorkloadContext()

  // Overall validation state (use context validation but enhance with additional checks)
  const validation = useMemo((): ValidationResult => {
    const baseValidationErrors = validateWorkloadSlots(workloadSlots)
    const totalPercentage = workloadSlots.reduce(
      (sum: number, slot: WorkloadSlot) => sum + slot.percentage,
      0
    )
    const remainingPercentage = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE - totalPercentage
    const hasActiveSlots = workloadSlots.some((slot: WorkloadSlot) => slot.isActive)
    const hasOverallocation = totalPercentage > WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE
    const hasUnderallocation =
      hasActiveSlots && totalPercentage < WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE

    // Generate warnings for suboptimal configurations
    const warnings: ValidationError[] = []

    if (hasUnderallocation && remainingPercentage > 5) {
      warnings.push({
        field: 'totalPercentage',
        message: `${remainingPercentage}% of capacity unused - consider increasing workload percentages`,
        severity: 'warning',
      })
    }

    if (hasActiveSlots) {
      const activeSlots = workloadSlots.filter((slot: WorkloadSlot) => slot.isActive)
      const lowPercentageSlots = activeSlots.filter((slot: WorkloadSlot) => slot.percentage < 5)

      if (lowPercentageSlots.length > 0) {
        warnings.push({
          field: 'slotPercentages',
          message: `${lowPercentageSlots.length} slot(s) have very low percentages (<5%)`,
          severity: 'warning',
        })
      }
    }

    // Check for duplicate workloads
    const workloadIds = workloadSlots
      .filter((slot: WorkloadSlot) => slot.workload)
      .map((slot: WorkloadSlot) => slot.workload!.id)
    const duplicateIds = workloadIds.filter(
      (id: string, index: number) => workloadIds.indexOf(id) !== index
    )

    if (duplicateIds.length > 0) {
      warnings.push({
        field: 'workloadDuplicates',
        message: 'Duplicate workloads detected - consider using different workload types',
        severity: 'warning',
      })
    }

    return {
      isValid: !hasErrors(baseValidationErrors) && !hasOverallocation,
      errors: baseValidationErrors,
      warnings,
      totalPercentage,
      remainingPercentage,
      hasActiveSlots,
      hasOverallocation,
      hasUnderallocation,
    }
  }, [workloadSlots])

  // Validate all slots
  const validateSlots = useCallback((slots: WorkloadSlot[]): ValidationResult => {
    const errors = validateWorkloadSlots(slots)
    const totalPercentage = slots.reduce((sum, slot) => sum + slot.percentage, 0)
    const remainingPercentage = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE - totalPercentage
    const hasActiveSlots = slots.some(slot => slot.isActive)

    return {
      isValid: !hasErrors(errors),
      errors,
      warnings: [],
      totalPercentage,
      remainingPercentage,
      hasActiveSlots,
      hasOverallocation: totalPercentage > WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE,
      hasUnderallocation:
        hasActiveSlots && totalPercentage < WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE,
    }
  }, [])

  // Validate individual slot
  const validateSlot = useCallback(
    (slot: WorkloadSlot, index: number, allSlots: WorkloadSlot[]): SlotValidationResult => {
      const errors: ValidationError[] = []
      const warnings: ValidationError[] = []

      // Check if slot is active but missing workload
      if (slot.isActive && !slot.workload) {
        errors.push({
          field: `slot-${index}-workload`,
          message: 'Active slot must have a workload selected',
          severity: 'error',
        })
      }

      // Check if slot has workload but zero percentage
      if (slot.workload && slot.percentage === 0) {
        warnings.push({
          field: `slot-${index}-percentage`,
          message: 'Slot has workload but 0% allocation',
          severity: 'warning',
        })
      }

      // Check if slot has percentage but no workload
      if (slot.percentage > 0 && !slot.workload) {
        errors.push({
          field: `slot-${index}-workload`,
          message: 'Cannot allocate percentage without selecting a workload',
          severity: 'error',
        })
      }

      // Check for very low percentages
      if (slot.isActive && slot.percentage > 0 && slot.percentage < 5) {
        warnings.push({
          field: `slot-${index}-percentage`,
          message: 'Very low percentage allocation may not be realistic',
          severity: 'warning',
        })
      }

      // Check for duplicate workloads
      const duplicateSlots = allSlots.filter(
        (s, i) => i !== index && s.workload && slot.workload && s.workload.id === slot.workload.id
      )

      if (duplicateSlots.length > 0) {
        warnings.push({
          field: `slot-${index}-workload`,
          message: 'This workload is already used in another slot',
          severity: 'warning',
        })
      }

      const canActivate = slot.workload !== null && slot.percentage >= 0
      const suggestedPercentage = slot.workload ? getOptimalPercentage(index, 100) : undefined

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        canActivate,
        suggestedPercentage,
      }
    },
    []
  )

  // Validate percentage change
  const validatePercentageChange = useCallback(
    (index: number, newPercentage: number, allSlots: WorkloadSlot[]): ValidationResult => {
      const updatedSlots = allSlots.map((slot, i) =>
        i === index ? { ...slot, percentage: newPercentage } : slot
      )

      return validateSlots(updatedSlots)
    },
    [validateSlots]
  )

  // Validate workload assignment
  const validateWorkloadAssignment = useCallback(
    (index: number, workload: Workload | null, allSlots: WorkloadSlot[]): SlotValidationResult => {
      const updatedSlot = { ...allSlots[index], workload }
      return validateSlot(updatedSlot, index, allSlots)
    },
    [validateSlot]
  )

  // Check if percentage can be set
  const canSetPercentage = useCallback(
    (index: number, percentage: number): boolean => {
      const otherSlotsTotal = workloadSlots
        .filter((_: WorkloadSlot, i: number) => i !== index)
        .reduce((sum: number, slot: WorkloadSlot) => sum + slot.percentage, 0)

      return otherSlotsTotal + percentage <= WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE
    },
    [workloadSlots]
  )

  // Check if slot can be activated
  const canActivateSlot = useCallback(
    (index: number): boolean => {
      const slot = workloadSlots[index]
      return slot.workload !== null
    },
    [workloadSlots]
  )

  // Get optimal percentage for a slot
  const getOptimalPercentage = useCallback(
    (index: number, targetTotal: number = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE): number => {
      const otherSlotsTotal = workloadSlots
        .filter((_: WorkloadSlot, i: number) => i !== index)
        .reduce((sum: number, slot: WorkloadSlot) => sum + slot.percentage, 0)

      const remaining = targetTotal - otherSlotsTotal
      return Math.max(0, Math.min(remaining, targetTotal))
    },
    [workloadSlots]
  )

  // Suggest balanced distribution
  const suggestBalancedDistribution = useCallback((activeSlotCount: number): number[] => {
    if (activeSlotCount === 0) return []

    const basePercentage = Math.floor(WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE / activeSlotCount)
    const remainder = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE % activeSlotCount

    const distribution = new Array(activeSlotCount).fill(basePercentage)

    // Distribute remainder
    for (let i = 0; i < remainder; i++) {
      distribution[i]++
    }

    return distribution
  }, [])

  // Fix overallocation by proportionally reducing percentages
  const fixOverallocation = useCallback((slots: WorkloadSlot[]): WorkloadSlot[] => {
    const totalPercentage = slots.reduce((sum, slot) => sum + slot.percentage, 0)

    if (totalPercentage <= WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE) {
      return slots // No overallocation
    }

    const scaleFactor = WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE / totalPercentage

    return slots.map(slot => ({
      ...slot,
      percentage: Math.floor(slot.percentage * scaleFactor),
    }))
  }, [])

  // Get percentage error for real-time validation
  const getPercentageError = useCallback(
    (index: number, percentage: number): string | null => {
      if (percentage < 0) return 'Percentage cannot be negative'
      if (percentage > WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE)
        return 'Percentage cannot exceed 100%'

      if (!canSetPercentage(index, percentage)) {
        const remaining = getRemainingPercentageForSlot(index, true)
        return `Maximum available: ${remaining}%`
      }

      return null
    },
    [canSetPercentage]
  )

  // Get slot warnings
  const getSlotWarnings = useCallback(
    (index: number): string[] => {
      const slot = workloadSlots[index]
      const warnings: string[] = []

      if (slot.percentage > 0 && !slot.workload) {
        warnings.push('Select a workload for this allocation')
      }

      if (slot.workload && slot.percentage === 0) {
        warnings.push('Workload selected but no allocation')
      }

      if (slot.isActive && slot.percentage < 5) {
        warnings.push('Very low allocation percentage')
      }

      return warnings
    },
    [workloadSlots]
  )

  // Get remaining percentage for a specific slot
  const getRemainingPercentageForSlot = useCallback(
    (index: number, excludeCurrent: boolean = false): number => {
      const otherSlotsTotal = workloadSlots
        .filter((_: WorkloadSlot, i: number) => i !== index)
        .reduce((sum: number, slot: WorkloadSlot) => sum + slot.percentage, 0)

      const currentSlotPercentage = excludeCurrent ? 0 : workloadSlots[index].percentage
      const totalUsed = otherSlotsTotal + currentSlotPercentage

      return Math.max(0, WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE - totalUsed)
    },
    [workloadSlots]
  )

  return {
    // Overall validation state
    validation,

    // Validation functions
    validateSlots,
    validateSlot,
    validatePercentageChange,
    validateWorkloadAssignment,

    // Utility functions
    canSetPercentage,
    canActivateSlot,
    getOptimalPercentage,
    suggestBalancedDistribution,
    fixOverallocation,

    // Real-time validation helpers
    getPercentageError,
    getSlotWarnings,
    getRemainingPercentageForSlot,
  }
}
