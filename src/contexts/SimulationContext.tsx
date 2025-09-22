import { createContext, ReactNode, useMemo, useCallback, useState } from 'react'
import { SimulationPeriod, VRAMUsagePoint, Model, WorkloadSlot } from '../types'
import type {
  SimulationConfig,
  SimulationResults,
  SimulationContextValue,
  SimulationExecutionOptions,
} from '../types/contexts'
import { useAppContext } from '../hooks/useAppContext'
import { actionCreators } from './appActions'
import { simulateUsageOverTime } from '../services/vramCalculator'
import { validateSimulationPeriod } from '../utils/validation'

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface SimulationProviderProps {
  children: ReactNode
}

function SimulationProvider({ children }: SimulationProviderProps) {
  const { state, dispatch } = useAppContext()
  const { simulation, results, selectedModel, workloadSlots, ui } = state

  // Local validation state to prevent circular dependencies
  const [isValidLocal, setIsValidLocal] = useState(true)

  // Calculate derived state
  const canExecute = useMemo(() => {
    return (
      selectedModel !== null &&
      workloadSlots.some(slot => slot.isActive) &&
      isValidLocal &&
      !ui.loading
    )
  }, [selectedModel, workloadSlots, isValidLocal, ui.loading])

  const isCalculating = useMemo(() => {
    return ui.loading
  }, [ui.loading])

  // Validation function - defined first to avoid hoisting issues
  const validateConfig = useCallback(() => {
    const errors = validateSimulationPeriod(simulation.period)
    // Don't dispatch to AppContext to prevent circular validation
    setIsValidLocal(errors.length === 0)
    return errors.length === 0
  }, [simulation.period])

  // Action implementations - memoized to prevent recreation on every render
  const updateConfig = useCallback(
    (updates: Partial<SimulationConfig>) => {
      dispatch(actionCreators.setSimulationConfig(updates))
      // Update local validation state if isValid is provided
      if (typeof updates.isValid === 'boolean') {
        setIsValidLocal(updates.isValid)
      }
    },
    [dispatch]
  )

  const updatePeriod = useCallback(
    (period: Partial<SimulationPeriod>) => {
      const updatedPeriod = {
        ...simulation.period,
        ...period,
      }

      dispatch(
        actionCreators.setSimulationConfig({
          ...simulation,
          period: updatedPeriod,
        })
      )
      // Validation is now handled by the component itself, not here
    },
    [dispatch, simulation]
  )

  const executeSimulation = useCallback(
    async (
      model: Model,
      workloadSlots: WorkloadSlot[],
      options: SimulationExecutionOptions = {}
    ) => {
      const { force = false, clearPrevious = false } = options

      // Check if we can execute
      if (!canExecute && !force) {
        dispatch(
          actionCreators.addNotification({
            id: `simulation-cannot-execute-${crypto.randomUUID()}`,
            type: 'warning',
            message: 'Cannot execute simulation: missing required data or configuration',
            timestamp: Date.now(),
            autoClose: true,
          })
        )
        return
      }

      try {
        dispatch(actionCreators.setLoading(true))

        if (clearPrevious) {
          dispatch(actionCreators.clearSimulationResults())
        }

        // Get active slots only
        const activeSlots = workloadSlots.filter(slot => slot.isActive)

        if (activeSlots.length === 0) {
          throw new Error('No active workload slots found')
        }

        // Execute the simulation
        const usagePoints = await simulateUsageOverTime(model, activeSlots, simulation.period)

        if (usagePoints.length === 0) {
          throw new Error('Simulation produced no data points')
        }

        // Calculate derived metrics
        const vramValues = usagePoints.map(point => point.totalVRAM)
        const maxVRAM = Math.max(...vramValues)
        const averageVRAM = vramValues.reduce((sum, value) => sum + value, 0) / vramValues.length

        // Generate recommendations based on VRAM usage
        const recommendations = generateRecommendations(maxVRAM, averageVRAM)
        const warnings = generateWarnings(maxVRAM, usagePoints)

        const simulationResults: SimulationResults = {
          maxVRAM,
          averageVRAM,
          usagePoints,
          recommendations,
          warnings,
          calculatedAt: Date.now(),
        }

        dispatch(actionCreators.setSimulationResults(simulationResults))

        dispatch(
          actionCreators.addNotification({
            id: `simulation-success-${crypto.randomUUID()}`,
            type: 'success',
            message: `Simulation completed. Max VRAM: ${(maxVRAM / 1024).toFixed(2)} GB`,
            timestamp: Date.now(),
            autoClose: true,
          })
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Simulation failed'

        dispatch(actionCreators.setError(errorMessage))
        dispatch(
          actionCreators.addNotification({
            id: `simulation-error-${crypto.randomUUID()}`,
            type: 'error',
            message: errorMessage,
            timestamp: Date.now(),
            autoClose: false,
          })
        )
      } finally {
        dispatch(actionCreators.setLoading(false))
      }
    },
    [canExecute, dispatch, simulation.period]
  )

  const clearResults = useCallback(() => {
    dispatch(actionCreators.clearSimulationResults())
  }, [dispatch])

  const exportResults = useCallback(
    (format: 'json' | 'csv'): string | null => {
      if (!results) return null

      let data: string
      let mimeType: string
      let filename: string

      if (format === 'json') {
        data = JSON.stringify(results, null, 2)
        mimeType = 'application/json'
        filename = `vram-analysis-${Date.now()}.json`
      } else if (format === 'csv') {
        const headers = [
          'Timestamp',
          'Total VRAM (MB)',
          'Base Model (MB)',
          'KV Cache (MB)',
          'Activations (MB)',
        ]
        const rows = results.usagePoints.map(point => [
          new Date(point.timestamp).toISOString(),
          point.totalVRAM.toString(),
          point.breakdown.baseModel.toString(),
          point.breakdown.kvCache.toString(),
          point.breakdown.activations.toString(),
        ])

        data = [headers, ...rows].map(row => row.join(',')).join('\n')
        mimeType = 'text/csv'
        filename = `vram-analysis-${Date.now()}.csv`
      } else {
        return null
      }

      // Create and trigger download
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return data
    },
    [results]
  )

  const getMaxVRAM = useCallback((): number | null => {
    return results?.maxVRAM ?? null
  }, [results])

  const getAverageVRAM = useCallback((): number | null => {
    return results?.averageVRAM ?? null
  }, [results])

  const hasResults = useCallback((): boolean => {
    return results !== null
  }, [results])

  const isResultsStale = useCallback(
    (model: Model, _slots: WorkloadSlot[]): boolean => {
      if (!results) return true

      // Check if model changed
      if (!selectedModel || selectedModel.id !== model.id) return true

      // For simplicity, we'll consider results stale if calculated more than 5 minutes ago
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return results.calculatedAt < fiveMinutesAgo
    },
    [results, selectedModel]
  )

  const value: SimulationContextValue = useMemo(
    () => ({
      // State
      config: simulation,
      results,
      isCalculating,
      canExecute,

      // Actions
      updateConfig,
      updatePeriod,
      executeSimulation,
      clearResults,
      validateConfig,
      exportResults,
      getMaxVRAM,
      getAverageVRAM,
      hasResults,
      isResultsStale,
    }),
    [
      simulation,
      results,
      isCalculating,
      canExecute,
      updateConfig,
      updatePeriod,
      executeSimulation,
      clearResults,
      validateConfig,
      exportResults,
      getMaxVRAM,
      getAverageVRAM,
      hasResults,
      isResultsStale,
    ]
  )

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

export { SimulationProvider, SimulationContext }

// ============================================================================
// Helper Functions
// ============================================================================

function generateRecommendations(maxVRAM: number, averageVRAM: number): string[] {
  const recommendations: string[] = []
  const maxGB = maxVRAM / 1024
  const avgGB = averageVRAM / 1024

  // GPU recommendations based on VRAM requirements
  if (maxGB <= 4) {
    recommendations.push('RTX 3070 (8GB) - Adequate for this workload')
  } else if (maxGB <= 8) {
    recommendations.push('RTX 3070 (8GB) or RTX 4060 Ti (16GB) recommended')
  } else if (maxGB <= 12) {
    recommendations.push('RTX 3080 (12GB) or RTX 4070 Ti Super (16GB) recommended')
  } else if (maxGB <= 16) {
    recommendations.push('RTX 4060 Ti (16GB) or RTX 4080 (16GB) recommended')
  } else if (maxGB <= 24) {
    recommendations.push('RTX 3090 (24GB) or RTX 4090 (24GB) recommended')
  } else if (maxGB <= 48) {
    recommendations.push('Professional GPU required: A6000 (48GB) or A100 (40GB/80GB)')
  } else {
    recommendations.push('Enterprise GPU required: A100 (80GB) or H100 (80GB)')
  }

  // Efficiency recommendations
  const efficiency = avgGB / maxGB
  if (efficiency < 0.6) {
    recommendations.push('Consider optimizing workload distribution for better VRAM utilization')
  }

  // Scaling recommendations
  if (maxGB > 16) {
    recommendations.push('Consider model quantization (INT8/INT4) to reduce VRAM requirements')
  }

  return recommendations
}

function generateWarnings(maxVRAM: number, usagePoints: VRAMUsagePoint[]): string[] {
  const warnings: string[] = []
  const maxGB = maxVRAM / 1024

  // Memory pressure warnings
  if (maxGB > 20) {
    warnings.push('High VRAM usage detected - monitor for memory pressure')
  }

  // Spiky usage pattern warnings
  const vramValues = usagePoints.map(point => point.totalVRAM)
  const variance = calculateVariance(vramValues)
  const mean = vramValues.reduce((sum, val) => sum + val, 0) / vramValues.length
  const coefficientOfVariation = Math.sqrt(variance) / mean

  if (coefficientOfVariation > 0.3) {
    warnings.push('Highly variable VRAM usage detected - consider workload balancing')
  }

  return warnings
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
}
