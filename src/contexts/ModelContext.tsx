import { createContext, ReactNode, useMemo, useCallback, useRef } from 'react'
import { Model } from '../types'
import { useAppContext } from '../hooks/useAppContext'
import { actionCreators } from './appActions'
import { modelService } from '../services/modelService'
import type { ModelContextValue } from '../types/contexts'

const ModelContext = createContext<ModelContextValue | undefined>(undefined)

// ============================================================================
// Provider Component
// ============================================================================

interface ModelProviderProps {
  children: ReactNode
}

function ModelProvider({ children }: ModelProviderProps) {
  const { state, dispatch } = useAppContext()
  const { models, selectedModel, ui } = state

  // Guard to prevent duplicate loadModels calls
  const isLoadingRef = useRef(false)

  // Action implementations - memoized to prevent recreation on every render
  const selectModel = useCallback((model: Model | null) => {
    dispatch(actionCreators.selectModel(model))

    // Add notification for model selection
    if (model) {
      dispatch(
        actionCreators.addNotification({
          id: `model-selected-${crypto.randomUUID()}`,
          type: 'success',
          message: `Selected model: ${model.name}`,
          timestamp: Date.now(),
          autoClose: true,
        })
      )
    }
  }, [dispatch])

  const loadModels = useCallback(async () => {
    // Guard against duplicate calls
    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true

    try {
      dispatch(actionCreators.loadModelsStart())
      const loadedModels = await modelService.getAllModels()
      dispatch(actionCreators.loadModelsSuccess(loadedModels))

      dispatch(
        actionCreators.addNotification({
          id: `models-loaded-${crypto.randomUUID()}`,
          type: 'success',
          message: `Loaded ${loadedModels.length} models`,
          timestamp: Date.now(),
          autoClose: true,
        })
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load models'
      dispatch(actionCreators.loadModelsError(errorMessage))

      dispatch(
        actionCreators.addNotification({
          id: `models-error-${crypto.randomUUID()}`,
          type: 'error',
          message: errorMessage,
          timestamp: Date.now(),
          autoClose: false,
        })
      )
    } finally {
      isLoadingRef.current = false
    }
  }, [dispatch])

  const getModelById = useCallback((id: string): Model | undefined => {
    return models.find(model => model.id === id)
  }, [models])

  const clearSelection = useCallback(() => {
    dispatch(actionCreators.selectModel(null))
  }, [dispatch])

  const refreshModels = useCallback(async () => {
    await loadModels()
  }, [loadModels])

  const searchModels = useCallback((query: string): Model[] => {
    if (!query.trim()) return models
    return models.filter(
      model =>
        model.name.toLowerCase().includes(query.toLowerCase()) ||
        model.description?.toLowerCase().includes(query.toLowerCase())
    )
  }, [models])

  const clearError = useCallback(() => {
    dispatch(actionCreators.setError(null))
  }, [dispatch])

  const value: ModelContextValue = useMemo(() => ({
    // State
    models,
    selectedModel,
    isLoading: ui.loading,
    error: ui.error,

    // Actions
    selectModel,
    loadModels,
    getModelById,
    clearSelection,
    refreshModels,
    searchModels,
    clearError,
  }), [
    models,
    selectedModel,
    ui.loading,
    ui.error,
    selectModel,
    loadModels,
    getModelById,
    clearSelection,
    refreshModels,
    searchModels,
    clearError,
  ])

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

export { ModelProvider, ModelContext }
