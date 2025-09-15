import type {
  Model,
  Workload,
  WorkloadSlot,
  Profile,
  VRAMUsagePoint,
  SimulationPeriod,
} from './index'

// ============================================================================
// App Context Types
// ============================================================================

export interface SimulationConfig {
  period: SimulationPeriod
  isValid: boolean
  errors: ValidationError[]
}

export interface SimulationResults {
  maxVRAM: number
  averageVRAM: number
  usagePoints: VRAMUsagePoint[]
  recommendations: string[]
  warnings: string[]
  calculatedAt: number
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: number
  autoClose?: boolean
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  chartType: 'area' | 'bar'
  showTooltips: boolean
  animationsEnabled: boolean
  accessibilityMode: boolean
}

export interface UIState {
  loading: boolean
  error: string | null
  notifications: Notification[]
  preferences: UserPreferences
}

export interface AppState {
  models: Model[]
  selectedModel: Model | null
  workloads: Workload[]
  profiles: Profile[]
  workloadSlots: WorkloadSlot[]
  simulation: SimulationConfig
  results: SimulationResults | null
  ui: UIState
}

export type AppAction =
  // Model actions
  | { type: 'SET_MODELS'; payload: Model[] }
  | { type: 'SET_SELECTED_MODEL'; payload: Model | null }
  | { type: 'LOAD_MODELS_START' }
  | { type: 'LOAD_MODELS_SUCCESS'; payload: Model[] }
  | { type: 'LOAD_MODELS_ERROR'; payload: string }

  // Workload actions
  | { type: 'SET_WORKLOADS'; payload: Workload[] }
  | { type: 'UPDATE_WORKLOAD_SLOTS'; payload: WorkloadSlot[] }
  | { type: 'UPDATE_WORKLOAD_SLOT'; payload: { index: number; slot: Partial<WorkloadSlot> } }
  | { type: 'RESET_WORKLOAD_SLOTS' }

  // Profile actions
  | { type: 'SET_PROFILES'; payload: Profile[] }
  | { type: 'SELECT_PROFILE'; payload: Profile }

  // Simulation actions
  | { type: 'SET_SIMULATION_CONFIG'; payload: Partial<SimulationConfig> }
  | { type: 'VALIDATE_SIMULATION'; payload: ValidationError[] }
  | { type: 'SET_SIMULATION_RESULTS'; payload: SimulationResults | null }
  | { type: 'CLEAR_SIMULATION_RESULTS' }

  // UI actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'RESET_STATE' }

// ============================================================================
// Model Context Types
// ============================================================================

export interface ModelContextValue {
  // State
  models: Model[]
  selectedModel: Model | null
  isLoading: boolean
  error: string | null

  // Actions
  loadModels: () => Promise<void>
  selectModel: (model: Model | null) => void
  refreshModels: () => Promise<void>
  getModelById: (id: string) => Model | undefined
  searchModels: (query: string) => Model[]
  clearError: () => void
  clearSelection: () => void
}

// ============================================================================
// Workload Context Types
// ============================================================================

export interface WorkloadValidationResult {
  isValid: boolean
  errors: ValidationError[]
  totalPercentage: number
  remainingPercentage: number
  hasActiveSlots: boolean
}

export interface WorkloadContextValue {
  // State
  workloads: Workload[]
  workloadSlots: WorkloadSlot[]
  profiles: Profile[]
  validation: WorkloadValidationResult

  // Actions
  updateSlot: (index: number, updates: Partial<WorkloadSlot>) => void
  updateSlots: (slots: WorkloadSlot[]) => void
  resetSlots: () => void
  setSlotWorkload: (index: number, workload: Workload | null) => void
  setSlotPercentage: (index: number, percentage: number) => void
  setSlotActive: (index: number, isActive: boolean) => void
  reorderSlots: (fromIndex: number, toIndex: number) => void
  applyProfile: (profile: Profile) => void
  getSlotById: (id: string) => WorkloadSlot | undefined
  getActiveSlots: () => WorkloadSlot[]
  getTotalPercentage: () => number
  getRemainingPercentage: () => number
}

// ============================================================================
// Simulation Context Types
// ============================================================================

export interface SimulationExecutionOptions {
  force?: boolean // Force recalculation even if results exist
  clearPrevious?: boolean // Clear previous results before calculation
}

export interface SimulationContextValue {
  // State
  config: SimulationConfig
  results: SimulationResults | null
  isCalculating: boolean
  canExecute: boolean

  // Actions
  updateConfig: (updates: Partial<SimulationConfig>) => void
  updatePeriod: (period: Partial<SimulationPeriod>) => void
  executeSimulation: (
    model: Model,
    workloadSlots: WorkloadSlot[],
    options?: SimulationExecutionOptions
  ) => Promise<void>
  clearResults: () => void
  validateConfig: () => void
  exportResults: (format: 'json' | 'csv') => string | null
  getMaxVRAM: () => number | null
  getAverageVRAM: () => number | null
  hasResults: () => boolean
  isResultsStale: (model: Model, workloadSlots: WorkloadSlot[]) => boolean
}

// ============================================================================
// UI Context Types
// ============================================================================

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  primaryColor: string
  secondaryColor: string
}

export interface UIContextValue {
  // State
  isLoading: boolean
  error: string | null
  notifications: Notification[]
  preferences: UserPreferences

  // Theme
  theme: ThemeConfig
  isDarkMode: boolean

  // Actions
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  setChartType: (chartType: 'area' | 'bar') => void
  toggleTooltips: () => void
  toggleAnimations: () => void
  toggleAccessibilityMode: () => void
  showSuccess: (message: string, autoClose?: boolean) => void
  showError: (message: string, autoClose?: boolean) => void
  showWarning: (message: string, autoClose?: boolean) => void
  showInfo: (message: string, autoClose?: boolean) => void
}
