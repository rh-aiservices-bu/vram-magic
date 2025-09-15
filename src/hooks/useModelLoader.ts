import { useCallback, useEffect, useRef } from 'react'
import { Model } from '../types'
import { useModelContext } from './useModelContext'
import { useUIContext } from './useUIContext'

// ============================================================================
// Types
// ============================================================================

interface ModelCache {
  models: Model[]
  loadedAt: number
  expires: number
}

interface ModelFilterOptions {
  search?: string
  parameterRange?: { min?: number; max?: number }
  architectures?: string[]
  precisions?: string[]
  organizations?: string[]
}

interface UseModelLoaderReturn {
  // State
  models: Model[]
  selectedModel: Model | null
  isLoading: boolean
  error: string | null
  isLoaded: boolean
  lastLoadedAt: number | null

  // Loading functions
  loadModels: (force?: boolean) => Promise<void>
  reloadModels: () => Promise<void>
  loadModelById: (id: string) => Promise<Model | null>

  // Model management
  selectModel: (model: Model | null) => void
  getModel: (id: string) => Model | undefined
  searchModels: (query: string) => Model[]
  filterModels: (options: ModelFilterOptions) => Model[]

  // Cache management
  isCacheExpired: () => boolean
  clearCache: () => void
  refreshCache: () => Promise<void>

  // Statistics
  getModelStats: () => {
    totalModels: number
    organizations: string[]
    architectures: string[]
    parameterRanges: { min: number; max: number }
    precisions: string[]
  }

  // Model comparison
  compareModels: (
    model1: Model,
    model2: Model
  ) => {
    parameterDifference: number
    vramDifference: number
    architectureSame: boolean
    precisionSame: boolean
  }
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

// ============================================================================
// Hook Implementation
// ============================================================================

export function useModelLoader(): UseModelLoaderReturn {
  const {
    models,
    selectedModel,
    isLoading,
    error,
    selectModel: contextSelectModel,
    loadModels: contextLoadModels,
    getModelById: contextGetModelById,
    refreshModels,
  } = useModelContext()

  const { showError, showSuccess, showWarning } = useUIContext()

  // Cache reference
  const cacheRef = useRef<ModelCache | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived state
  const isLoaded = models.length > 0
  const lastLoadedAt = cacheRef.current?.loadedAt || null

  // Initialize cache from context models
  useEffect(() => {
    if (models.length > 0 && !cacheRef.current) {
      cacheRef.current = {
        models,
        loadedAt: Date.now(),
        expires: Date.now() + CACHE_DURATION,
      }
    }
  }, [models])

  // Check if cache is expired
  const isCacheExpired = useCallback((): boolean => {
    if (!cacheRef.current) return true
    return Date.now() > cacheRef.current.expires
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current = null
  }, [])

  // Load models with caching and retry logic
  const loadModels = useCallback(
    async (force: boolean = false): Promise<void> => {
      // Check cache first unless forced
      if (!force && cacheRef.current && !isCacheExpired()) {
        return
      }

      let attempts = 0
      const attemptLoad = async (): Promise<void> => {
        try {
          attempts++
          await contextLoadModels()

          // Update cache
          cacheRef.current = {
            models,
            loadedAt: Date.now(),
            expires: Date.now() + CACHE_DURATION,
          }

          if (attempts > 1) {
            showSuccess(`Models loaded successfully after ${attempts} attempts`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load models'

          if (attempts < RETRY_ATTEMPTS) {
            showWarning(`Loading attempt ${attempts} failed, retrying in ${RETRY_DELAY / 1000}s...`)

            retryTimeoutRef.current = setTimeout(() => {
              attemptLoad()
            }, RETRY_DELAY * attempts) // Exponential backoff
          } else {
            showError(`Failed to load models after ${RETRY_ATTEMPTS} attempts: ${errorMessage}`)
            throw error
          }
        }
      }

      await attemptLoad()
    },
    [contextLoadModels, models, isCacheExpired, showError, showSuccess, showWarning]
  )

  // Reload models (force refresh)
  const reloadModels = useCallback(async (): Promise<void> => {
    clearCache()
    await loadModels(true)
  }, [loadModels, clearCache])

  // Load specific model by ID
  const loadModelById = useCallback(
    async (id: string): Promise<Model | null> => {
      try {
        // First try to get from context/cache
        const cachedModel = contextGetModelById(id)
        if (cachedModel) return cachedModel

        // If not found, ensure models are loaded
        if (!isLoaded) {
          await loadModels()
        }

        // Try again after loading
        const model = contextGetModelById(id)
        if (!model) {
          throw new Error(`Model with ID "${id}" not found`)
        }

        return model
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to load model ${id}`
        showError(errorMessage)
        return null
      }
    },
    [contextGetModelById, isLoaded, loadModels, showError]
  )

  // Model selection
  const selectModel = useCallback(
    (model: Model | null) => {
      contextSelectModel(model)
    },
    [contextSelectModel]
  )

  // Get model by ID
  const getModel = useCallback(
    (id: string): Model | undefined => {
      return models.find(model => model.id === id)
    },
    [models]
  )

  // Search models
  const searchModels = useCallback(
    (query: string): Model[] => {
      if (!query.trim()) return models

      const searchTerm = query.toLowerCase()
      return models.filter(
        model =>
          model.name.toLowerCase().includes(searchTerm) ||
          model.description.toLowerCase().includes(searchTerm) ||
          model.metadata.organization.toLowerCase().includes(searchTerm) ||
          model.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    },
    [models]
  )

  // Filter models
  const filterModels = useCallback(
    (options: ModelFilterOptions): Model[] => {
      let filteredModels = [...models]

      // Text search
      if (options.search) {
        filteredModels = searchModels(options.search)
      }

      // Parameter range filter
      if (options.parameterRange) {
        const { min, max } = options.parameterRange
        filteredModels = filteredModels.filter(model => {
          if (min !== undefined && model.parameters < min) return false
          if (max !== undefined && model.parameters > max) return false
          return true
        })
      }

      // Architecture filter
      if (options.architectures && options.architectures.length > 0) {
        filteredModels = filteredModels.filter(model =>
          options.architectures!.some(arch => model.name.toLowerCase().includes(arch.toLowerCase()))
        )
      }

      // Precision filter
      if (options.precisions && options.precisions.length > 0) {
        filteredModels = filteredModels.filter(model =>
          options.precisions!.includes(model.precision)
        )
      }

      // Organization filter
      if (options.organizations && options.organizations.length > 0) {
        filteredModels = filteredModels.filter(model =>
          options.organizations!.includes(model.metadata.organization)
        )
      }

      return filteredModels
    },
    [models, searchModels]
  )

  // Refresh cache
  const refreshCache = useCallback(async (): Promise<void> => {
    await refreshModels()
    cacheRef.current = {
      models,
      loadedAt: Date.now(),
      expires: Date.now() + CACHE_DURATION,
    }
  }, [refreshModels, models])

  // Get model statistics
  const getModelStats = useCallback(() => {
    const organizations = [...new Set(models.map(model => model.metadata.organization))]
    const architectures = [
      ...new Set(
        models.map(model => {
          // Extract architecture type from model name or metadata
          const name = model.name.toLowerCase()
          if (name.includes('llama')) return 'llama'
          if (name.includes('gpt')) return 'gpt'
          if (name.includes('claude')) return 'claude'
          if (name.includes('bert')) return 'bert'
          if (name.includes('t5')) return 't5'
          return 'other'
        })
      ),
    ]

    const parameterCounts = models.map(model => model.parameters)
    const parameterRanges = {
      min: Math.min(...parameterCounts),
      max: Math.max(...parameterCounts),
    }

    const precisions = [...new Set(models.map(model => model.precision))]

    return {
      totalModels: models.length,
      organizations,
      architectures,
      parameterRanges,
      precisions,
    }
  }, [models])

  // Compare models
  const compareModels = useCallback((model1: Model, model2: Model) => {
    const parameterDifference = model2.parameters - model1.parameters
    const vramDifference = model2.vramRequirements.baseVRAM - model1.vramRequirements.baseVRAM
    const architectureSame =
      model1.architecture.layers === model2.architecture.layers &&
      model1.architecture.hiddenSize === model2.architecture.hiddenSize
    const precisionSame = model1.precision === model2.precision

    return {
      parameterDifference,
      vramDifference,
      architectureSame,
      precisionSame,
    }
  }, [])

  // Auto-load models on mount if not loaded
  useEffect(() => {
    if (!isLoaded && !isLoading && !error) {
      loadModels()
    }
  }, [isLoaded, isLoading, error, loadModels])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    models,
    selectedModel,
    isLoading,
    error,
    isLoaded,
    lastLoadedAt,

    // Loading functions
    loadModels,
    reloadModels,
    loadModelById,

    // Model management
    selectModel,
    getModel,
    searchModels,
    filterModels,

    // Cache management
    isCacheExpired,
    clearCache,
    refreshCache,

    // Statistics
    getModelStats,

    // Model comparison
    compareModels,
  }
}
