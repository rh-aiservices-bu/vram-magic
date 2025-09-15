import { useCallback, useMemo, useEffect, useRef } from 'react'
import { SimulationPeriod, VRAMUsagePoint, RequestPattern } from '../types'
import { SimulationResults, ValidationError } from '../types/contexts'
import { useSimulationContext } from './useSimulationContext'
import { useModelContext } from './useModelContext'
import { useWorkloadContext } from './useWorkloadContext'
import { useUIContext } from './useUIContext'

// ============================================================================
// Types
// ============================================================================

interface SimulationState {
  canExecute: boolean
  isExecuting: boolean
  hasResults: boolean
  isStale: boolean
}

interface SimulationMetrics {
  maxVRAM: number
  averageVRAM: number
  peakTime: number
  utilizationEfficiency: number
  memoryPressureScore: number
}

interface UseSimulationReturn {
  // Current state
  state: SimulationState
  config: {
    period: SimulationPeriod
    isValid: boolean
    errors: ValidationError[]
  }
  results: SimulationResults | null
  metrics: SimulationMetrics | null

  // Execution functions
  runSimulation: (options?: { force?: boolean }) => Promise<void>
  runQuickSimulation: (duration?: number) => Promise<void>
  cancelSimulation: () => void

  // Configuration management
  updatePeriod: (updates: Partial<SimulationPeriod>) => void
  setPeriodDuration: (duration: number, unit?: 'seconds' | 'minutes' | 'hours') => void
  setConcurrentUsers: (users: number) => void
  setRequestPattern: (pattern: RequestPattern) => void
  validateConfiguration: () => ValidationError[]

  // Results management
  clearResults: () => void
  exportResults: (format: 'json' | 'csv' | 'png') => Promise<string | Blob | null>
  downloadResults: (format: 'json' | 'csv', filename?: string) => void

  // Analysis functions
  analyzeResults: () => SimulationMetrics | null
  findPeakUsage: () => VRAMUsagePoint | null
  getUsageAtTime: (timestamp: number) => VRAMUsagePoint | null
  getAverageUsageInRange: (startTime: number, endTime: number) => number

  // Comparison and optimization
  suggestOptimizations: () => string[]
  compareWithGPU: (gpuVRAM: number) => {
    fits: boolean
    utilization: number
    recommendation: string
  }

  // Auto-simulation management
  enableAutoRefresh: (interval?: number) => void
  disableAutoRefresh: () => void
  isAutoRefreshEnabled: boolean
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_QUICK_SIMULATION_DURATION = 300 // 5 minutes in seconds
const AUTO_REFRESH_INTERVAL = 30000 // 30 seconds
const SIMULATION_TIMEOUT = 60000 // 60 seconds

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSimulation(): UseSimulationReturn {
  const {
    config,
    results,
    isCalculating,
    canExecute: contextCanExecute,
    executeSimulation,
    updatePeriod,
    clearResults: contextClearResults,
    exportResults: contextExportResults,
    validateConfig,
    isResultsStale,
  } = useSimulationContext()

  const { selectedModel } = useModelContext()
  const { workloadSlots, validation } = useWorkloadContext()
  const { showError, showSuccess, showWarning, showInfo } = useUIContext()

  // Refs for managing auto-refresh and cancellation
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simulationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(false)

  // Derived state
  const state = useMemo(
    (): SimulationState => ({
      canExecute: contextCanExecute && selectedModel !== null && validation.hasActiveSlots,
      isExecuting: isCalculating,
      hasResults: results !== null,
      isStale: selectedModel && workloadSlots ? isResultsStale(selectedModel, workloadSlots) : true,
    }),
    [
      contextCanExecute,
      selectedModel,
      validation.hasActiveSlots,
      isCalculating,
      results,
      isResultsStale,
      workloadSlots,
    ]
  )

  // Calculate derived metrics from results
  const metrics = useMemo((): SimulationMetrics | null => {
    if (!results || !results.usagePoints.length) return null

    const usagePoints = results.usagePoints
    const vramValues = usagePoints.map(point => point.totalVRAM)

    // Find peak usage and time
    const peakPoint = usagePoints.reduce((peak, point) =>
      point.totalVRAM > peak.totalVRAM ? point : peak
    )

    // Calculate utilization efficiency (average/peak ratio)
    const utilizationEfficiency = results.averageVRAM / results.maxVRAM

    // Calculate memory pressure score (variance-based)
    const variance =
      vramValues.reduce((acc, value) => {
        const diff = value - results.averageVRAM
        return acc + diff * diff
      }, 0) / vramValues.length

    const memoryPressureScore = Math.sqrt(variance) / results.averageVRAM

    return {
      maxVRAM: results.maxVRAM,
      averageVRAM: results.averageVRAM,
      peakTime: peakPoint.timestamp,
      utilizationEfficiency,
      memoryPressureScore,
    }
  }, [results])

  // Run full simulation
  const runSimulation = useCallback(
    async (options: { force?: boolean } = {}): Promise<void> => {
      const { force = false } = options

      if (!state.canExecute && !force) {
        showWarning('Cannot run simulation: check model selection and workload configuration')
        return
      }

      if (state.isExecuting) {
        showInfo('Simulation already in progress')
        return
      }

      try {
        cancelledRef.current = false

        // Set timeout for cancellation
        simulationTimeoutRef.current = setTimeout(() => {
          if (!cancelledRef.current) {
            cancelledRef.current = true
            showError('Simulation timed out after 60 seconds')
          }
        }, SIMULATION_TIMEOUT)

        await executeSimulation(selectedModel!, workloadSlots, { force, clearPrevious: force })

        if (!cancelledRef.current) {
          showSuccess('Simulation completed successfully')
        }
      } catch (error) {
        if (!cancelledRef.current) {
          const errorMessage = error instanceof Error ? error.message : 'Simulation failed'
          showError(`Simulation failed: ${errorMessage}`)
        }
      } finally {
        if (simulationTimeoutRef.current) {
          clearTimeout(simulationTimeoutRef.current)
          simulationTimeoutRef.current = null
        }
      }
    },
    [
      state.canExecute,
      state.isExecuting,
      selectedModel,
      workloadSlots,
      executeSimulation,
      showWarning,
      showInfo,
      showError,
      showSuccess,
    ]
  )

  // Run quick simulation with reduced duration
  const runQuickSimulation = useCallback(
    async (duration: number = DEFAULT_QUICK_SIMULATION_DURATION): Promise<void> => {
      if (!state.canExecute) {
        showWarning('Cannot run quick simulation: check model selection and workload configuration')
        return
      }

      // Save current configuration
      const originalPeriod = config.period

      try {
        // Set quick simulation parameters
        updatePeriod({
          duration,
          concurrentUsers: Math.min(originalPeriod.concurrentUsers, 5),
          requestPattern: RequestPattern.UNIFORM,
        })

        showInfo(`Running quick simulation (${duration} seconds)...`)
        await runSimulation({ force: true })
      } finally {
        // Restore original configuration
        updatePeriod(originalPeriod)
      }
    },
    [state.canExecute, config.period, updatePeriod, runSimulation, showWarning, showInfo]
  )

  // Cancel simulation
  const cancelSimulation = useCallback(() => {
    cancelledRef.current = true
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current)
      simulationTimeoutRef.current = null
    }
    showInfo('Simulation cancelled')
  }, [showInfo])

  // Configuration management functions
  const setPeriodDuration = useCallback(
    (duration: number, unit: 'seconds' | 'minutes' | 'hours' = 'seconds') => {
      let durationInSeconds = duration
      if (unit === 'minutes') durationInSeconds *= 60
      if (unit === 'hours') durationInSeconds *= 3600

      updatePeriod({ duration: durationInSeconds, durationSeconds: durationInSeconds })
    },
    [updatePeriod]
  )

  const setConcurrentUsers = useCallback(
    (users: number) => {
      updatePeriod({ concurrentUsers: Math.max(1, Math.floor(users)) })
    },
    [updatePeriod]
  )

  const setRequestPattern = useCallback(
    (pattern: RequestPattern) => {
      updatePeriod({ requestPattern: pattern })
    },
    [updatePeriod]
  )

  const validateConfiguration = useCallback((): ValidationError[] => {
    validateConfig()
    return config.errors
  }, [validateConfig, config.errors])

  // Results management
  const clearResults = useCallback(() => {
    contextClearResults()
    showInfo('Simulation results cleared')
  }, [contextClearResults, showInfo])

  const exportResults = useCallback(
    async (format: 'json' | 'csv' | 'png'): Promise<string | Blob | null> => {
      if (!results) {
        showError('No results to export')
        return null
      }

      if (format === 'png') {
        // For PNG export, we'd need to render the chart to canvas
        // This would require access to the chart component
        showError('PNG export not yet implemented')
        return null
      }

      return contextExportResults(format)
    },
    [results, contextExportResults, showError]
  )

  const downloadResults = useCallback(
    (format: 'json' | 'csv', filename?: string) => {
      if (!results) {
        showError('No results to download')
        return
      }

      const data = contextExportResults(format)
      if (!data) {
        showError('Failed to export results')
        return
      }

      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `vram-simulation-${Date.now()}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showSuccess(`Results downloaded as ${format.toUpperCase()}`)
    },
    [results, contextExportResults, showError, showSuccess]
  )

  // Analysis functions
  const analyzeResults = useCallback((): SimulationMetrics | null => {
    return metrics
  }, [metrics])

  const findPeakUsage = useCallback((): VRAMUsagePoint | null => {
    if (!results || !results.usagePoints.length) return null

    return results.usagePoints.reduce((peak: VRAMUsagePoint, point: VRAMUsagePoint) =>
      point.totalVRAM > peak.totalVRAM ? point : peak
    )
  }, [results])

  const getUsageAtTime = useCallback(
    (timestamp: number): VRAMUsagePoint | null => {
      if (!results || !results.usagePoints.length) return null

      // Find closest timestamp
      return results.usagePoints.reduce((closest: VRAMUsagePoint, point: VRAMUsagePoint) =>
        Math.abs(point.timestamp - timestamp) < Math.abs(closest.timestamp - timestamp)
          ? point
          : closest
      )
    },
    [results]
  )

  const getAverageUsageInRange = useCallback(
    (startTime: number, endTime: number): number => {
      if (!results || !results.usagePoints.length) return 0

      const pointsInRange = results.usagePoints.filter(
        (point: VRAMUsagePoint) => point.timestamp >= startTime && point.timestamp <= endTime
      )

      if (pointsInRange.length === 0) return 0

      return (
        pointsInRange.reduce((sum: number, point: VRAMUsagePoint) => sum + point.totalVRAM, 0) /
        pointsInRange.length
      )
    },
    [results]
  )

  // Optimization suggestions
  const suggestOptimizations = useCallback((): string[] => {
    if (!results || !metrics) return []

    const suggestions: string[] = []

    // Low utilization efficiency
    if (metrics.utilizationEfficiency < 0.6) {
      suggestions.push('Consider rebalancing workload distribution for better VRAM utilization')
    }

    // High memory pressure
    if (metrics.memoryPressureScore > 0.3) {
      suggestions.push(
        'High variability in VRAM usage detected - consider smoothing workload patterns'
      )
    }

    // High peak VRAM
    if (metrics.maxVRAM > 20 * 1024) {
      // 20 GB
      suggestions.push('Consider model quantization (INT8/INT4) to reduce VRAM requirements')
    }

    // Many concurrent users with high VRAM
    if (config.period.concurrentUsers > 20 && metrics.maxVRAM > 16 * 1024) {
      suggestions.push('Consider request queuing or load balancing to reduce peak VRAM usage')
    }

    return suggestions
  }, [results, metrics, config.period.concurrentUsers])

  // GPU comparison
  const compareWithGPU = useCallback(
    (
      gpuVRAM: number
    ): {
      fits: boolean
      utilization: number
      recommendation: string
    } => {
      if (!metrics) {
        return {
          fits: false,
          utilization: 0,
          recommendation: 'Run simulation first to compare with GPU',
        }
      }

      const gpuVRAMBytes = gpuVRAM * 1024 // Convert GB to MB
      const fits = metrics.maxVRAM <= gpuVRAMBytes
      const utilization = metrics.maxVRAM / gpuVRAMBytes

      let recommendation: string
      if (!fits) {
        recommendation = `GPU VRAM insufficient. Need at least ${(metrics.maxVRAM / 1024).toFixed(1)} GB`
      } else if (utilization > 0.9) {
        recommendation = 'GPU VRAM at near maximum - monitor for memory pressure'
      } else if (utilization > 0.7) {
        recommendation = 'GPU VRAM usage is optimal'
      } else {
        recommendation = 'GPU is oversized for this workload - could use smaller GPU'
      }

      return { fits, utilization, recommendation }
    },
    [metrics]
  )

  // Auto-refresh management
  const enableAutoRefresh = useCallback(
    (interval: number = AUTO_REFRESH_INTERVAL) => {
      disableAutoRefresh() // Clear any existing interval

      autoRefreshIntervalRef.current = setInterval(() => {
        if (state.canExecute && state.isStale && !state.isExecuting) {
          runSimulation()
        }
      }, interval)
    },
    [state.canExecute, state.isStale, state.isExecuting, runSimulation]
  )

  const disableAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }
  }, [])

  const isAutoRefreshEnabled = autoRefreshIntervalRef.current !== null

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disableAutoRefresh()
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current)
      }
    }
  }, [disableAutoRefresh])

  return {
    // Current state
    state,
    config,
    results,
    metrics,

    // Execution functions
    runSimulation,
    runQuickSimulation,
    cancelSimulation,

    // Configuration management
    updatePeriod,
    setPeriodDuration,
    setConcurrentUsers,
    setRequestPattern,
    validateConfiguration,

    // Results management
    clearResults,
    exportResults,
    downloadResults,

    // Analysis functions
    analyzeResults,
    findPeakUsage,
    getUsageAtTime,
    getAverageUsageInRange,

    // Comparison and optimization
    suggestOptimizations,
    compareWithGPU,

    // Auto-simulation management
    enableAutoRefresh,
    disableAutoRefresh,
    isAutoRefreshEnabled,
  }
}
