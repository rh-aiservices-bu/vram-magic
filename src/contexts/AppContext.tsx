import { createContext, useReducer, useEffect, ReactNode, useState, useRef } from 'react'
import { ModelPrecision, RequestPattern, TimeUnit } from '../types'
import type {
  AppState,
  AppAction,
  SimulationConfig,
  UserPreferences,
  UIState,
} from '../types/contexts'
import type { AppContextValue } from '../hooks/useAppContext'

// ============================================================================
// Default State
// ============================================================================

const defaultSimulationConfig: SimulationConfig = {
  period: {
    duration: 60,
    timeUnit: 'minutes' as TimeUnit,
    totalUsers: 100,
    maxThinkTime: 30,
    thinkTimeDistribution: 'bell_curve' as any,
    userBehaviorPattern: 'interactive_chat' as any,
    requestPattern: 'uniform' as RequestPattern,
    granularity: 60,
    durationSeconds: 3600,
    precision: 'fp16' as ModelPrecision.FP16, // ModelPrecision enum
  },
  isValid: false,
  errors: [],
}

const defaultUserPreferences: UserPreferences = {
  theme: 'auto',
  chartType: 'area',
  showTooltips: true,
  animationsEnabled: true,
  accessibilityMode: false,
}

const defaultUIState: UIState = {
  loading: false,
  error: null,
  notifications: [],
  preferences: defaultUserPreferences,
}

const initialAppState: AppState = {
  models: [],
  selectedModel: null,
  workloads: [],
  profiles: [],
  workloadSlots: Array(5)
    .fill(null)
    .map((_, index) => ({
      id: `slot-${index + 1}`,
      workload: null,
      percentage: 0,
      isActive: true,
      order: index + 1,
    })),
  simulation: defaultSimulationConfig,
  results: null,
  ui: defaultUIState,
}

// ============================================================================
// Reducer
// ============================================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Model actions
    case 'SET_MODELS':
      return { ...state, models: action.payload }

    case 'SET_SELECTED_MODEL':
      return { ...state, selectedModel: action.payload }

    case 'LOAD_MODELS_START':
      return { ...state, ui: { ...state.ui, loading: true, error: null } }

    case 'LOAD_MODELS_SUCCESS':
      return {
        ...state,
        models: action.payload,
        ui: { ...state.ui, loading: false, error: null },
      }

    case 'LOAD_MODELS_ERROR':
      return {
        ...state,
        ui: { ...state.ui, loading: false, error: action.payload },
      }

    // Workload actions
    case 'SET_WORKLOADS':
      return { ...state, workloads: action.payload }

    case 'UPDATE_WORKLOAD_SLOTS':
      return { ...state, workloadSlots: action.payload }

    case 'UPDATE_WORKLOAD_SLOT': {
      const newSlots = [...state.workloadSlots]
      const currentSlot = newSlots[action.payload.index]

      // Preserve critical fields that should not be overwritten
      const preservedId = currentSlot.id
      const preservedOrder = currentSlot.order

      newSlots[action.payload.index] = {
        ...currentSlot,
        ...action.payload.slot,
        // Ensure id and order are never overwritten
        id: preservedId,
        order: preservedOrder,
      }
      return { ...state, workloadSlots: newSlots }
    }

    case 'RESET_WORKLOAD_SLOTS':
      return {
        ...state,
        workloadSlots: Array(5)
          .fill(null)
          .map((_, index) => ({
            id: `slot-${index + 1}`,
            workload: null,
            percentage: 0,
            isActive: true,
            order: index + 1,
          })),
      }

    // Profile actions
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload }

    case 'SELECT_PROFILE': {
      const profile = action.payload
      // Convert profile workloadDistribution to workloadSlots
      const newSlots = Array(5)
        .fill(null)
        .map((_, index) => {
          const distribution = profile.workloadDistribution[index]
          if (distribution) {
            const workload = state.workloads.find(w => w.id === distribution.workloadId)
            return {
              id: `slot-${index + 1}`,
              workload: workload || null,
              percentage: distribution.percentage,
              isActive: distribution.percentage > 0,
              order: index + 1,
            }
          }
          return {
            id: `slot-${index + 1}`,
            workload: null,
            percentage: 0,
            isActive: true,
            order: index + 1,
          }
        })

      return {
        ...state,
        workloadSlots: newSlots,
        // Note: Profile doesn't include simulation config, keep existing
      }
    }

    // Simulation actions
    case 'SET_SIMULATION_CONFIG':
      return {
        ...state,
        simulation: { ...state.simulation, ...action.payload },
      }

    case 'VALIDATE_SIMULATION':
      // Only update simulation validation state, don't modify notifications here
      // Notifications should be handled separately via ADD_NOTIFICATION action
      return {
        ...state,
        simulation: {
          ...state.simulation,
          errors: action.payload,
          isValid: action.payload.length === 0,
        },
      }

    case 'SET_SIMULATION_RESULTS':
      return { ...state, results: action.payload }

    case 'CLEAR_SIMULATION_RESULTS':
      return { ...state, results: null }

    // UI actions
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, loading: action.payload } }

    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload } }

    case 'ADD_NOTIFICATION':
      // Check for duplicate notification ID
      const isDuplicate = state.ui.notifications.some(n => n.id === action.payload.id)
      if (isDuplicate) {
        return state
      }

      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: [...state.ui.notifications, action.payload],
        },
      }

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notifications: state.ui.notifications.filter(n => n.id !== action.payload),
        },
      }

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, ui: { ...state.ui, notifications: [] } }

    case 'SET_PREFERENCES':
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        ui: {
          ...state.ui,
          preferences: { ...state.ui.preferences, ...action.payload },
        },
      }

    case 'RESET_STATE':
      return initialAppState

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

interface AppProviderProps {
  children: ReactNode
}

export default function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialAppState)
  const [isHydrating, setIsHydrating] = useState(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Load state from localStorage on mount
  useEffect(() => {
    const loadState = async () => {
      setIsHydrating(true)
      try {
        const savedState = localStorage.getItem('vram-magic-app-state')
        if (savedState) {
          const parsedState = JSON.parse(savedState)
          // Restore only serializable state, skip functions and complex objects
          if (parsedState.ui?.preferences) {
            dispatch({ type: 'SET_PREFERENCES', payload: parsedState.ui.preferences })
          }
          if (parsedState.selectedModel) {
            dispatch({ type: 'SET_SELECTED_MODEL', payload: parsedState.selectedModel })
          }
          if (parsedState.workloadSlots) {
            // Migrate workload slots to ensure they have valid and unique order values (1-5)
            const migratedSlots = parsedState.workloadSlots.map((slot: any, index: number) => ({
              ...slot,
              // Always assign unique order values based on array index to avoid duplicates
              order: index + 1,
              // Ensure id is set
              id: slot.id || `slot-${index + 1}`,
            }))
            dispatch({ type: 'UPDATE_WORKLOAD_SLOTS', payload: migratedSlots })
          }
          if (parsedState.simulation) {
            dispatch({ type: 'SET_SIMULATION_CONFIG', payload: parsedState.simulation })
          }
        }
      } catch (error) {
        console.error('Failed to load state from localStorage:', error)
      } finally {
        setIsHydrating(false)
      }
    }

    loadState()
  }, [])

  // Save state to localStorage with debouncing (only when not hydrating)
  useEffect(() => {
    if (!isHydrating) {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce saves to prevent excessive localStorage writes
      saveTimeoutRef.current = setTimeout(() => {
        try {
          const stateToSave = {
            selectedModel: state.selectedModel,
            workloadSlots: state.workloadSlots,
            simulation: state.simulation,
            ui: {
              preferences: state.ui.preferences,
            },
          }
          localStorage.setItem('vram-magic-app-state', JSON.stringify(stateToSave))
        } catch (error) {
          console.warn('Failed to save app state to localStorage:', error)
        }
      }, 2000) // Debounce for 2000ms to reduce localStorage pressure

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }
  }, [
    state.selectedModel,
    state.workloadSlots,
    state.simulation,
    state.ui.preferences,
    isHydrating,
  ])

  const contextValue: AppContextValue = {
    state,
    dispatch,
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

export { AppProvider }
