// ============================================================================
// Action Creators and Utilities for AppContext
// ============================================================================

import { Model, Workload, Profile, WorkloadSlot } from '../types'

// Import types from AppContext for use in action creators
import type {
  SimulationConfig,
  SimulationResults,
  ValidationError,
  Notification,
  UserPreferences,
  AppState,
} from '../types/contexts'

// Re-export types for other modules
export type {
  SimulationConfig,
  SimulationResults,
  ValidationError,
  Notification,
  UserPreferences,
  AppState,
} from '../types/contexts'

// ============================================================================
// Action Creators (for convenience)
// ============================================================================

export const actionCreators = {
  // Model actions
  setModels: (models: Model[]) => ({ type: 'SET_MODELS', payload: models }) as const,
  selectModel: (model: Model | null) => ({ type: 'SET_SELECTED_MODEL', payload: model }) as const,
  loadModelsStart: () => ({ type: 'LOAD_MODELS_START' }) as const,
  loadModelsSuccess: (models: Model[]) =>
    ({ type: 'LOAD_MODELS_SUCCESS', payload: models }) as const,
  loadModelsError: (error: string) => ({ type: 'LOAD_MODELS_ERROR', payload: error }) as const,

  // Workload actions
  setWorkloads: (workloads: Workload[]) => ({ type: 'SET_WORKLOADS', payload: workloads }) as const,
  updateWorkloadSlots: (slots: WorkloadSlot[]) =>
    ({ type: 'UPDATE_WORKLOAD_SLOTS', payload: slots }) as const,
  updateWorkloadSlot: (index: number, slot: Partial<WorkloadSlot>) =>
    ({
      type: 'UPDATE_WORKLOAD_SLOT',
      payload: { index, slot },
    }) as const,
  resetWorkloadSlots: () => ({ type: 'RESET_WORKLOAD_SLOTS' }) as const,

  // Profile actions
  setProfiles: (profiles: Profile[]) => ({ type: 'SET_PROFILES', payload: profiles }) as const,
  selectProfile: (profile: Profile) => ({ type: 'SELECT_PROFILE', payload: profile }) as const,

  // Simulation actions
  setSimulationConfig: (config: Partial<SimulationConfig>) =>
    ({ type: 'SET_SIMULATION_CONFIG', payload: config }) as const,
  setSimulationResults: (results: SimulationResults | null) =>
    ({ type: 'SET_SIMULATION_RESULTS', payload: results }) as const,
  validateSimulation: (errors: ValidationError[]) =>
    ({ type: 'VALIDATE_SIMULATION', payload: errors }) as const,
  clearSimulationResults: () => ({ type: 'CLEAR_SIMULATION_RESULTS' }) as const,

  // UI actions
  setLoading: (loading: boolean) => ({ type: 'SET_LOADING', payload: loading }) as const,
  setError: (error: string | null) => ({ type: 'SET_ERROR', payload: error }) as const,
  addNotification: (notification: Notification) =>
    ({ type: 'ADD_NOTIFICATION', payload: notification }) as const,
  removeNotification: (id: string) => ({ type: 'REMOVE_NOTIFICATION', payload: id }) as const,
  clearNotifications: () => ({ type: 'CLEAR_NOTIFICATIONS' }) as const,
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    ({ type: 'UPDATE_PREFERENCES', payload: preferences }) as const,

  // State management actions
  hydrateState: (state: Partial<AppState>) => ({ type: 'HYDRATE_STATE', payload: state }) as const,
  resetState: () => ({ type: 'RESET_STATE' }) as const,
}
