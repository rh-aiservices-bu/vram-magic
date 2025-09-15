import { useCallback, useMemo } from 'react'
import { Model, WorkloadSlot, VRAMUsagePoint, SimulationPeriod, ModelPrecision } from '../types'
import {
  calculateBaseMemory,
  calculateKVCache,
  calculateActivations,
  simulateUsageOverTime,
} from '../services/vramCalculator'
import { useModelContext } from './useModelContext'
import { useWorkloadContext } from './useWorkloadContext'
import { useSimulationContext } from './useSimulationContext'
import { useUIContext } from './useUIContext'

// ============================================================================
// Types
// ============================================================================

interface VRAMCalculationResult {
  baseVRAM: number
  kvCacheVRAM: number
  activationsVRAM: number
  totalVRAM: number
}

interface VRAMCalculationOptions {
  sequenceLength?: number
  batchSize?: number
  precision?: ModelPrecision
}

interface UseVRAMCalculationReturn {
  // Current calculation state
  result: VRAMCalculationResult | null
  simulationResults: VRAMUsagePoint[] | null
  isCalculating: boolean
  error: string | null
  canCalculate: boolean

  // Calculation functions
  calculateVRAM: (
    model?: Model,
    workloadSlots?: WorkloadSlot[],
    options?: VRAMCalculationOptions
  ) => Promise<VRAMCalculationResult>

  simulateUsage: (
    model?: Model,
    workloadSlots?: WorkloadSlot[],
    period?: SimulationPeriod
  ) => Promise<VRAMUsagePoint[]>

  // Quick calculations
  calculateBaseVRAM: (model: Model, options?: VRAMCalculationOptions) => number
  calculateKVCacheVRAM: (model: Model, sequenceLength: number, batchSize?: number) => number
  calculateActivationsVRAM: (model: Model, sequenceLength: number, batchSize?: number) => number

  // Utility functions
  formatVRAM: (bytes: number, unit?: 'MB' | 'GB') => string
  compareModels: (
    model1: Model,
    model2: Model,
    workloadSlots: WorkloadSlot[]
  ) => {
    model1VRAM: number
    model2VRAM: number
    difference: number
    percentageDifference: number
  }

  // State management
  clearCalculation: () => void
  refreshCalculation: () => Promise<void>
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVRAMCalculation(): UseVRAMCalculationReturn {
  const { selectedModel } = useModelContext()
  const { workloadSlots, validation } = useWorkloadContext()
  const { results, isCalculating, executeSimulation, clearResults } = useSimulationContext()
  const { showError, showSuccess } = useUIContext()

  // Current calculation result (derived from simulation results)
  const result = useMemo((): VRAMCalculationResult | null => {
    if (!results || !results.usagePoints.length) return null

    // Use the peak values from simulation
    const peakPoint = results.usagePoints.reduce((peak: VRAMUsagePoint, point: VRAMUsagePoint) =>
      point.totalVRAM > peak.totalVRAM ? point : peak
    )

    return {
      baseVRAM: peakPoint.breakdown.baseModel,
      kvCacheVRAM: peakPoint.breakdown.kvCache,
      activationsVRAM: peakPoint.breakdown.activations,
      totalVRAM: peakPoint.totalVRAM,
    }
  }, [results])

  // Check if we can calculate
  const canCalculate = useMemo(() => {
    return selectedModel !== null && validation.hasActiveSlots && validation.isValid
  }, [selectedModel, validation])

  // Main calculation function
  const calculateVRAM = useCallback(
    async (
      model = selectedModel,
      slots = workloadSlots,
      options: VRAMCalculationOptions = {}
    ): Promise<VRAMCalculationResult> => {
      if (!model) {
        throw new Error('No model provided for VRAM calculation')
      }

      const activeSlots = slots.filter((slot: WorkloadSlot) => slot.isActive)
      if (activeSlots.length === 0) {
        throw new Error('No active workload slots found')
      }

      try {
        // Calculate individual components
        const baseVRAM = calculateBaseMemory(model, options.precision || model.precision)

        // For KV cache and activations, we need to consider the workload requirements
        let maxKvCacheVRAM = 0
        let maxActivationsVRAM = 0

        for (const slot of activeSlots) {
          if (!slot.workload) continue

          const sequenceLength =
            options.sequenceLength || slot.workload.inputTokens + slot.workload.outputTokens
          const batchSize = options.batchSize || 1

          const kvCache = calculateKVCache(
            model,
            sequenceLength,
            batchSize,
            options.precision || model.precision
          )

          const activations = calculateActivations(
            model,
            sequenceLength,
            batchSize,
            options.precision || model.precision
          )

          maxKvCacheVRAM = Math.max(maxKvCacheVRAM, kvCache)
          maxActivationsVRAM = Math.max(maxActivationsVRAM, activations)
        }

        const totalVRAM = baseVRAM + maxKvCacheVRAM + maxActivationsVRAM

        return {
          baseVRAM,
          kvCacheVRAM: maxKvCacheVRAM,
          activationsVRAM: maxActivationsVRAM,
          totalVRAM,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'VRAM calculation failed'
        showError(errorMessage)
        throw error
      }
    },
    [selectedModel, workloadSlots, showError]
  )

  // Simulation function
  const simulateUsage = useCallback(
    async (
      model = selectedModel,
      slots = workloadSlots,
      period?: SimulationPeriod
    ): Promise<VRAMUsagePoint[]> => {
      if (!model || !slots.some(slot => slot.isActive)) {
        throw new Error('Invalid model or workload configuration for simulation')
      }

      if (period) {
        // If period is provided, use it directly with vramCalculator
        const activeSlots = slots.filter((slot: WorkloadSlot) => slot.isActive)
        return await simulateUsageOverTime(model, activeSlots, period)
      } else {
        // Use the simulation context to execute with current config
        await executeSimulation(model, slots)
        if (!results?.usagePoints) {
          throw new Error('Simulation did not produce results')
        }
        return results.usagePoints
      }
    },
    [selectedModel, workloadSlots, executeSimulation, results]
  )

  // Quick calculation functions
  const calculateBaseVRAM = useCallback(
    (model: Model, options: VRAMCalculationOptions = {}): number => {
      return calculateBaseMemory(model, options.precision || model.precision)
    },
    []
  )

  const calculateKVCacheVRAM = useCallback(
    (model: Model, sequenceLength: number, batchSize: number = 1): number => {
      return calculateKVCache(model, sequenceLength, batchSize, model.precision)
    },
    []
  )

  const calculateActivationsVRAM = useCallback(
    (model: Model, sequenceLength: number, batchSize: number = 1): number => {
      return calculateActivations(model, sequenceLength, batchSize, model.precision)
    },
    []
  )

  // Utility functions
  const formatVRAM = useCallback((bytes: number, unit: 'MB' | 'GB' = 'MB'): string => {
    if (unit === 'GB') {
      return `${(bytes / 1024).toFixed(2)} GB`
    }
    return `${bytes.toFixed(0)} MB`
  }, [])

  const compareModels = useMemo(
    () => (model1: Model, model2: Model, slots: WorkloadSlot[]) => {
      try {
        // Calculate VRAM for both models with the same workload configuration
        const activeSlots = slots.filter((slot: WorkloadSlot) => slot.isActive)

        if (activeSlots.length === 0) {
          throw new Error('No active workload slots for comparison')
        }

        // Calculate peak VRAM for both models
        let model1VRAM = calculateBaseMemory(model1, model1.precision)
        let model2VRAM = calculateBaseMemory(model2, model2.precision)

        for (const slot of activeSlots) {
          if (!slot.workload) continue

          const sequenceLength = slot.workload.inputTokens + slot.workload.outputTokens
          const batchSize = 1

          const kvCache1 = calculateKVCache(model1, sequenceLength, batchSize, model1.precision)
          const activations1 = calculateActivations(
            model1,
            sequenceLength,
            batchSize,
            model1.precision
          )

          const kvCache2 = calculateKVCache(model2, sequenceLength, batchSize, model2.precision)
          const activations2 = calculateActivations(
            model2,
            sequenceLength,
            batchSize,
            model2.precision
          )

          model1VRAM += Math.max(model1VRAM, kvCache1 + activations1)
          model2VRAM += Math.max(model2VRAM, kvCache2 + activations2)
        }

        const difference = model2VRAM - model1VRAM
        const percentageDifference = model1VRAM > 0 ? (difference / model1VRAM) * 100 : 0

        return {
          model1VRAM,
          model2VRAM,
          difference,
          percentageDifference,
        }
      } catch (error) {
        showError('Failed to compare models')
        throw error
      }
    },
    [showError]
  )

  // State management functions
  const clearCalculation = useCallback(() => {
    clearResults()
  }, [clearResults])

  const refreshCalculation = useCallback(async () => {
    if (!canCalculate) {
      showError('Cannot refresh calculation: invalid configuration')
      return
    }

    try {
      await executeSimulation(selectedModel!, workloadSlots, { force: true })
      showSuccess('VRAM calculation refreshed')
    } catch {
      showError('Failed to refresh calculation')
    }
  }, [canCalculate, executeSimulation, selectedModel, workloadSlots, showError, showSuccess])

  return {
    // Current calculation state
    result,
    simulationResults: results?.usagePoints || null,
    isCalculating,
    error: null, // Error is handled by UI context
    canCalculate,

    // Calculation functions
    calculateVRAM,
    simulateUsage,

    // Quick calculations
    calculateBaseVRAM,
    calculateKVCacheVRAM,
    calculateActivationsVRAM,

    // Utility functions
    formatVRAM,
    compareModels,

    // State management
    clearCalculation,
    refreshCalculation,
  }
}
