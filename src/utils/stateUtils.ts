// VRAM Magic: Application State Utilities
// State management helpers for React Context and localStorage persistence

import type {
  AppState,
  Model,
  WorkloadSlot,
  SimulationPeriod,
  SimulationResults,
  UserPreferences,
} from '../types'
import { ModelPrecision } from '../types'
import {
  DEFAULT_SIMULATION_CONFIG,
  DEFAULT_WORKLOAD_SLOT,
  DEFAULT_USER_PREFERENCES,
} from '../constants'

// ============================================================================
// State Action Types
// ============================================================================

export enum StateActionType {
  // Model actions
  SET_SELECTED_MODEL = 'SET_SELECTED_MODEL',
  SET_AVAILABLE_MODELS = 'SET_AVAILABLE_MODELS',
  CLEAR_SELECTED_MODEL = 'CLEAR_SELECTED_MODEL',

  // Workload actions
  UPDATE_WORKLOAD_SLOT = 'UPDATE_WORKLOAD_SLOT',
  SET_WORKLOAD_SLOTS = 'SET_WORKLOAD_SLOTS',
  RESET_WORKLOAD_SLOTS = 'RESET_WORKLOAD_SLOTS',
  VALIDATE_WORKLOAD_SLOTS = 'VALIDATE_WORKLOAD_SLOTS',

  // Simulation actions
  SET_SIMULATION_PERIOD = 'SET_SIMULATION_PERIOD',
  SET_SIMULATION_RESULT = 'SET_SIMULATION_RESULT',
  CLEAR_SIMULATION_RESULT = 'CLEAR_SIMULATION_RESULT',

  // UI actions
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SET_NOTIFICATION = 'SET_NOTIFICATION',
  CLEAR_NOTIFICATION = 'CLEAR_NOTIFICATION',

  // User preferences
  SET_USER_PREFERENCES = 'SET_USER_PREFERENCES',
  UPDATE_USER_PREFERENCE = 'UPDATE_USER_PREFERENCE',
  RESET_USER_PREFERENCES = 'RESET_USER_PREFERENCES',

  // App-wide actions
  RESET_ALL_STATE = 'RESET_ALL_STATE',
  LOAD_PERSISTED_STATE = 'LOAD_PERSISTED_STATE',
}

// ============================================================================
// State Action Interfaces
// ============================================================================

export interface SetSelectedModelAction {
  type: StateActionType.SET_SELECTED_MODEL
  payload: Model
}

export interface SetAvailableModelsAction {
  type: StateActionType.SET_AVAILABLE_MODELS
  payload: Model[]
}

export interface ClearSelectedModelAction {
  type: StateActionType.CLEAR_SELECTED_MODEL
}

export interface UpdateWorkloadSlotAction {
  type: StateActionType.UPDATE_WORKLOAD_SLOT
  payload: { index: number; slot: Partial<WorkloadSlot> }
}

export interface SetWorkloadSlotsAction {
  type: StateActionType.SET_WORKLOAD_SLOTS
  payload: WorkloadSlot[]
}

export interface ResetWorkloadSlotsAction {
  type: StateActionType.RESET_WORKLOAD_SLOTS
}

export interface ValidateWorkloadSlotsAction {
  type: StateActionType.VALIDATE_WORKLOAD_SLOTS
}

export interface SetSimulationPeriodAction {
  type: StateActionType.SET_SIMULATION_PERIOD
  payload: SimulationPeriod
}

export interface SetSimulationResultAction {
  type: StateActionType.SET_SIMULATION_RESULT
  payload: SimulationResults
}

export interface ClearSimulationResultAction {
  type: StateActionType.CLEAR_SIMULATION_RESULT
}

export interface SetLoadingAction {
  type: StateActionType.SET_LOADING
  payload: { key: string; loading: boolean }
}

export interface SetErrorAction {
  type: StateActionType.SET_ERROR
  payload: { key: string; error: string | null }
}

export interface ClearErrorAction {
  type: StateActionType.CLEAR_ERROR
  payload?: string
}

export interface SetNotificationAction {
  type: StateActionType.SET_NOTIFICATION
  payload: {
    id: string
    message: string
    type: 'success' | 'warning' | 'error' | 'info'
    timestamp: number
    autoClose: boolean
  }
}

export interface ClearNotificationAction {
  type: StateActionType.CLEAR_NOTIFICATION
}

export interface SetUserPreferencesAction {
  type: StateActionType.SET_USER_PREFERENCES
  payload: UserPreferences
}

export interface UpdateUserPreferenceAction {
  type: StateActionType.UPDATE_USER_PREFERENCE
  payload: { key: keyof UserPreferences; value: UserPreferences[keyof UserPreferences] }
}

export interface ResetUserPreferencesAction {
  type: StateActionType.RESET_USER_PREFERENCES
}

export interface ResetAllStateAction {
  type: StateActionType.RESET_ALL_STATE
}

export interface LoadPersistedStateAction {
  type: StateActionType.LOAD_PERSISTED_STATE
  payload: Partial<AppState>
}

export type StateAction =
  | SetSelectedModelAction
  | SetAvailableModelsAction
  | ClearSelectedModelAction
  | UpdateWorkloadSlotAction
  | SetWorkloadSlotsAction
  | ResetWorkloadSlotsAction
  | ValidateWorkloadSlotsAction
  | SetSimulationPeriodAction
  | SetSimulationResultAction
  | ClearSimulationResultAction
  | SetLoadingAction
  | SetErrorAction
  | ClearErrorAction
  | SetNotificationAction
  | ClearNotificationAction
  | SetUserPreferencesAction
  | UpdateUserPreferenceAction
  | ResetUserPreferencesAction
  | ResetAllStateAction
  | LoadPersistedStateAction

// ============================================================================
// Action Creators
// ============================================================================

export const actionCreators = {
  // Model actions
  setSelectedModel: (model: Model): SetSelectedModelAction => ({
    type: StateActionType.SET_SELECTED_MODEL,
    payload: model,
  }),

  setAvailableModels: (models: Model[]): SetAvailableModelsAction => ({
    type: StateActionType.SET_AVAILABLE_MODELS,
    payload: models,
  }),

  clearSelectedModel: (): ClearSelectedModelAction => ({
    type: StateActionType.CLEAR_SELECTED_MODEL,
  }),

  // Workload actions
  updateWorkloadSlot: (index: number, slot: Partial<WorkloadSlot>): UpdateWorkloadSlotAction => ({
    type: StateActionType.UPDATE_WORKLOAD_SLOT,
    payload: { index, slot },
  }),

  setWorkloadSlots: (slots: WorkloadSlot[]): SetWorkloadSlotsAction => ({
    type: StateActionType.SET_WORKLOAD_SLOTS,
    payload: slots,
  }),

  resetWorkloadSlots: (): ResetWorkloadSlotsAction => ({
    type: StateActionType.RESET_WORKLOAD_SLOTS,
  }),

  validateWorkloadSlots: (): ValidateWorkloadSlotsAction => ({
    type: StateActionType.VALIDATE_WORKLOAD_SLOTS,
  }),

  // Simulation actions
  setSimulationPeriod: (period: SimulationPeriod): SetSimulationPeriodAction => ({
    type: StateActionType.SET_SIMULATION_PERIOD,
    payload: period,
  }),

  setSimulationResult: (result: SimulationResults): SetSimulationResultAction => ({
    type: StateActionType.SET_SIMULATION_RESULT,
    payload: result,
  }),

  clearSimulationResult: (): ClearSimulationResultAction => ({
    type: StateActionType.CLEAR_SIMULATION_RESULT,
  }),

  // UI actions
  setLoading: (key: string, loading: boolean): SetLoadingAction => ({
    type: StateActionType.SET_LOADING,
    payload: { key, loading },
  }),

  setError: (key: string, error: string | null): SetErrorAction => ({
    type: StateActionType.SET_ERROR,
    payload: { key, error },
  }),

  clearError: (key?: string): ClearErrorAction => ({
    type: StateActionType.CLEAR_ERROR,
    payload: key,
  }),

  setNotification: (
    message: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'info'
  ): SetNotificationAction => ({
    type: StateActionType.SET_NOTIFICATION,
    payload: {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now(),
      autoClose: true,
    },
  }),

  clearNotification: (): ClearNotificationAction => ({
    type: StateActionType.CLEAR_NOTIFICATION,
  }),

  // User preference actions
  setUserPreferences: (preferences: UserPreferences): SetUserPreferencesAction => ({
    type: StateActionType.SET_USER_PREFERENCES,
    payload: preferences,
  }),

  updateUserPreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): UpdateUserPreferenceAction => ({
    type: StateActionType.UPDATE_USER_PREFERENCE,
    payload: { key, value },
  }),

  resetUserPreferences: (): ResetUserPreferencesAction => ({
    type: StateActionType.RESET_USER_PREFERENCES,
  }),

  // App-wide actions
  resetAllState: (): ResetAllStateAction => ({
    type: StateActionType.RESET_ALL_STATE,
  }),

  loadPersistedState: (state: Partial<AppState>): LoadPersistedStateAction => ({
    type: StateActionType.LOAD_PERSISTED_STATE,
    payload: state,
  }),
}

// ============================================================================
// Initial State Factory
// ============================================================================

/**
 * Create initial application state
 * @returns Initial app state
 */
export function createInitialState(): AppState {
  const simulationPeriod = {
    ...DEFAULT_SIMULATION_CONFIG,
    durationSeconds: DEFAULT_SIMULATION_CONFIG.duration,
    precision: ModelPrecision.FP16,
  }

  return {
    models: [],
    availableModels: [],
    selectedModel: null,
    workloads: [],
    profiles: [],
    workloadSlots: Array(5)
      .fill(null)
      .map((_, index) => ({
        ...DEFAULT_WORKLOAD_SLOT,
        id: `slot-${index + 1}`,
        order: index + 1,
      })),
    simulation: {
      period: simulationPeriod,
      isValid: false,
      errors: [],
    },
    simulationPeriod,
    results: null,
    simulationResult: null,
    ui: {
      loading: false,
      error: null,
      notifications: [],
      preferences: { ...DEFAULT_USER_PREFERENCES },
    },
    loading: false,
    errors: [],
    notification: null,
    userPreferences: { ...DEFAULT_USER_PREFERENCES },
  }
}

// ============================================================================
// State Reducer
// ============================================================================

/**
 * Main state reducer for the application
 * @param state - Current state
 * @param action - Action to apply
 * @returns New state
 */
export function stateReducer(state: AppState, action: StateAction): AppState {
  switch (action.type) {
    case StateActionType.SET_SELECTED_MODEL:
      return {
        ...state,
        selectedModel: action.payload,
      }

    case StateActionType.SET_AVAILABLE_MODELS:
      return {
        ...state,
        availableModels: action.payload,
      }

    case StateActionType.CLEAR_SELECTED_MODEL:
      return {
        ...state,
        selectedModel: null,
        simulationResult: null, // Clear results when model changes
      }

    case StateActionType.UPDATE_WORKLOAD_SLOT: {
      const newSlots = [...state.workloadSlots]
      newSlots[action.payload.index] = {
        ...newSlots[action.payload.index],
        ...action.payload.slot,
      }
      return {
        ...state,
        workloadSlots: newSlots,
        simulationResult: null, // Clear results when workloads change
      }
    }

    case StateActionType.SET_WORKLOAD_SLOTS:
      return {
        ...state,
        workloadSlots: action.payload,
        simulationResult: null,
      }

    case StateActionType.RESET_WORKLOAD_SLOTS:
      return {
        ...state,
        workloadSlots: Array(5)
          .fill(null)
          .map((_, index) => ({
            ...DEFAULT_WORKLOAD_SLOT,
            id: `slot-${index + 1}`,
            order: index + 1,
          })),
        simulationResult: null,
      }

    case StateActionType.SET_SIMULATION_PERIOD:
      return {
        ...state,
        simulationPeriod: action.payload,
        simulationResult: null, // Clear results when simulation parameters change
      }

    case StateActionType.SET_SIMULATION_RESULT:
      return {
        ...state,
        simulationResult: action.payload,
      }

    case StateActionType.CLEAR_SIMULATION_RESULT:
      return {
        ...state,
        simulationResult: null,
      }

    case StateActionType.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading,
      }

    case StateActionType.SET_ERROR:
      return {
        ...state,
        errors: [
          ...state.errors,
          {
            field: action.payload.key,
            message: action.payload.error || 'Unknown error',
            severity: 'error' as const,
          },
        ],
      }

    case StateActionType.CLEAR_ERROR:
      if (action.payload) {
        return {
          ...state,
          errors: state.errors.filter(error => error.field !== action.payload),
        }
      }
      return {
        ...state,
        errors: [],
      }

    case StateActionType.SET_NOTIFICATION:
      return {
        ...state,
        notification: action.payload,
      }

    case StateActionType.CLEAR_NOTIFICATION:
      return {
        ...state,
        notification: null,
      }

    case StateActionType.SET_USER_PREFERENCES:
      return {
        ...state,
        userPreferences: action.payload,
      }

    case StateActionType.UPDATE_USER_PREFERENCE: {
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          [action.payload.key]: action.payload.value,
        },
      }
    }

    case StateActionType.RESET_USER_PREFERENCES:
      return {
        ...state,
        userPreferences: { ...DEFAULT_USER_PREFERENCES },
      }

    case StateActionType.RESET_ALL_STATE:
      return createInitialState()

    case StateActionType.LOAD_PERSISTED_STATE:
      return {
        ...state,
        ...action.payload,
      }

    default:
      return state
  }
}

// ============================================================================
// State Persistence Utilities
// ============================================================================

const STORAGE_KEY = 'vram-magic-state'

/**
 * Persist state to localStorage
 * @param state - State to persist
 */
export function persistState(state: AppState): void {
  try {
    const persistableState = {
      userPreferences: state.userPreferences,
      workloadSlots: state.workloadSlots,
      simulationPeriod: state.simulationPeriod,
      // Don't persist: selectedModel, availableModels, simulationResult, loading, errors, notification
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState))
  } catch (error) {
    console.warn('Failed to persist state to localStorage:', error)
  }
}

/**
 * Load state from localStorage
 * @returns Persisted state or null if not found
 */
export function loadPersistedState(): Partial<AppState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load persisted state from localStorage:', error)
  }
  return null
}

/**
 * Clear persisted state from localStorage
 */
export function clearPersistedState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear persisted state from localStorage:', error)
  }
}

// ============================================================================
// State Selectors
// ============================================================================

/**
 * Check if the current configuration is ready for simulation
 * @param state - Application state
 * @returns True if ready for simulation
 */
export function isReadyForSimulation(state: AppState): boolean {
  if (!state.selectedModel) {
    return false
  }

  const activeSlots = state.workloadSlots.filter(slot => slot.isActive && slot.workload)
  if (activeSlots.length === 0) {
    return false
  }

  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
  if (totalPercentage !== 100) {
    return false
  }

  return true
}

/**
 * Get total percentage of active workload slots
 * @param workloadSlots - Workload slots
 * @returns Total percentage
 */
export function getTotalWorkloadPercentage(workloadSlots: WorkloadSlot[]): number {
  return workloadSlots
    .filter(slot => slot.isActive && slot.workload)
    .reduce((sum, slot) => sum + slot.percentage, 0)
}

/**
 * Get validation errors for current state
 * @param state - Application state
 * @returns Array of validation error messages
 */
export function getValidationErrors(state: AppState): string[] {
  const errors: string[] = []

  if (!state.selectedModel) {
    errors.push('Please select a model')
  }

  const activeSlots = state.workloadSlots.filter(slot => slot.isActive && slot.workload)
  if (activeSlots.length === 0) {
    errors.push('Please configure at least one workload')
  }

  const totalPercentage = getTotalWorkloadPercentage(state.workloadSlots)
  if (totalPercentage !== 100 && activeSlots.length > 0) {
    errors.push(`Workload percentages must total 100% (currently ${totalPercentage}%)`)
  }

  if (state.simulationPeriod.concurrentUsers <= 0) {
    errors.push('Concurrent users must be greater than 0')
  }

  if (state.simulationPeriod.durationSeconds <= 0) {
    errors.push('Simulation duration must be greater than 0')
  }

  return errors
}

/**
 * Check if any async operations are currently loading
 * @param state - Application state
 * @returns True if any loading operation is active
 */
export function isLoading(state: AppState): boolean {
  return state.loading
}

/**
 * Check if there are any errors in the current state
 * @param state - Application state
 * @returns True if there are errors
 */
export function hasErrors(state: AppState): boolean {
  return state.errors.length > 0
}

/**
 * Get all current error messages
 * @param state - Application state
 * @returns Array of error messages
 */
export function getAllErrors(state: AppState): string[] {
  return state.errors.map(error => error.message)
}
