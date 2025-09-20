// VRAM Magic: TypeScript Interface Definitions
// Adapted from specs/contracts/types.ts for application use

// ============================================================================
// Core Entity Types
// ============================================================================

export enum ModelPrecision {
  FP32 = 'fp32',
  FP16 = 'fp16',
  INT8 = 'int8',
  INT4 = 'int4',
}

export interface ModelArchitecture {
  layers: number
  hiddenSize: number
  attentionHeads: number
  kvHeads?: number  // NEW: Number of KV heads (different from attention heads for GQA)
  headDim?: number  // NEW: Dimension per attention head
  useGQA?: boolean  // NEW: Flag indicating if model uses Grouped Query Attention
  vocabularySize: number
  maxSequenceLength: number
}

export interface VLLMOptimizations {
  blockSize: number           // KV-cache block size in tokens (typically 16)
  memoryPoolOverhead: number  // Pre-allocation overhead (typically 0.15)
  continuousBatching: boolean // Supports continuous batching
  pagedAttention: boolean     // Uses PagedAttention
  cudaGraphSupported: boolean // CUDA graph optimization support
  flashAttentionCompatible: boolean // Flash Attention compatibility
}

export interface VRAMRequirements {
  baseVRAM: number
  kvCacheCoefficient: number
  activationMultiplier: number
  overheadFactor: number
}

export interface PerformanceMetrics {
  gpuType: string
  baseTokensPerSecond?: number      // NEW: Rename from tokensPerSecond
  tokensPerSecond?: number          // Keep for backward compatibility
  workloadMultipliers?: {            // NEW: Workload-specific performance
    chat?: number
    code?: number
    rag?: number
    summarization?: number
    translation?: number
  }
  batchScaling?: {                   // NEW: Batch size performance scaling
    [key: string]: number            // e.g., "1": 0.4, "4": 0.85, "8": 1.0
  }
  batchSize: number
  powerConsumption: number
}

export interface BenchmarkScore {
  name: string
  score: number
  unit: string
}

export interface ModelMetadata {
  releaseDate: string
  organization: string
  license: string
  tags: string[]
  benchmarks?: BenchmarkScore[]
}

export interface Model {
  id: string
  name: string
  description: string
  parameters: number
  precision: ModelPrecision
  architecture: ModelArchitecture
  vramRequirements: VRAMRequirements
  vllmOptimizations?: VLLMOptimizations  // NEW
  performance: PerformanceMetrics[]
  metadata: ModelMetadata
}

// ============================================================================
// Workload Types
// ============================================================================

export enum WorkloadCategory {
  CHAT = 'chat',
  RAG = 'rag',
  CODING = 'coding',
  CREATIVE = 'creative',
  ANALYSIS = 'analysis',
  CUSTOM = 'custom',
}

export interface Workload {
  id: string
  name: string
  description: string
  inputTokens: number
  outputTokens: number
  category: WorkloadCategory
  icon?: string
  examples: string[]
}

export interface WorkloadSlot {
  id: string
  workload: Workload | null
  percentage: number
  isActive: boolean
  order: number
}

export interface WorkloadDistribution {
  workloadId: string
  percentage: number
}

export interface Profile {
  id: string
  name: string
  description: string
  workloadDistribution: WorkloadDistribution[]
  isBuiltIn: boolean
  tags: string[]
}

// ============================================================================
// Simulation Types
// ============================================================================

export enum TimeUnit {
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
}

export enum RequestPattern {
  UNIFORM = 'uniform',
  FRONT_LOADED = 'front_loaded',
  BACK_LOADED = 'back_loaded',
  BELL_CURVE = 'bell_curve',
  STEADY = 'steady',
  BURST = 'burst',
  VARIABLE = 'variable',
}

export enum TimePattern {
  STEADY = 'steady',
  BUSINESS_HOURS = 'business_hours',
  ALWAYS_ON = 'always_on',
  BURSTY = 'bursty',
  EXTENDED_HOURS = 'extended_hours',
  CREATIVE_HOURS = 'creative_hours',
  TRADING_HOURS = 'trading_hours',
  PEAK_SHOPPING = 'peak_shopping',
  VIRAL_RESPONSE = 'viral_response',
  PROJECT_BASED = 'project_based',
  RESEARCH_CYCLES = 'research_cycles',
  RESEARCH_HOURS = 'research_hours',
}

export enum RequestDistribution {
  NORMAL = 'normal',
  BURSTY = 'bursty',
  POISSON = 'poisson',
  CREATIVE_BURST = 'creative_burst',
  GLOBAL_ZONES = 'global_zones',
  HIGH_FREQUENCY = 'high_frequency',
  EXTREME_BURST = 'extreme_burst',
  CONTENT_SURGE = 'content_surge',
  DOCUMENT_HEAVY = 'document_heavy',
  RESEARCH_PATTERN = 'research_pattern',
  COMPLEX_MIXED = 'complex_mixed',
  INTELLIGENCE_PATTERN = 'intelligence_pattern',
  LEGAL_PATTERN = 'legal_pattern',
}

export interface GPURecommendation {
  gpu: string
  quantity: number
  totalVRAM: number
  utilizationRate: number
  costPerHour: number
  efficiency: 'low' | 'medium' | 'high'
  pros: string[]
  cons: string[]
  bestFor: string
}

export interface SimulationPeriod {
  duration: number
  timeUnit: TimeUnit
  concurrentUsers: number
  requestPattern: RequestPattern
  granularity: number
  durationSeconds: number
  precision: ModelPrecision
}

export interface ActiveRequest {
  id?: string
  requestId?: string
  workloadId: string
  startTime: number
  estimatedEndTime?: number
  inputTokens?: number
  expectedOutputTokens?: number
  vramConsumption?: number
  vramUsage?: number
}

export interface WorkloadVRAM {
  workloadId: string
  workloadName?: string
  vramUsage: number
  requestCount: number
  percentage?: number
  color: string
}

export interface VRAMBreakdown {
  baseModel: number
  kvCache: number
  activations: number
  overhead: number
  total: number
  workloadBreakdown: WorkloadVRAM[]
}

export interface VRAMUsagePoint {
  timestamp: number
  totalVRAM: number
  breakdown: VRAMBreakdown
  activeRequests: ActiveRequest[]
}

// ============================================================================
// Application State Types
// ============================================================================

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

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
  availableModels: Model[]
  selectedModel: Model | null
  workloads: Workload[]
  profiles: Profile[]
  workloadSlots: WorkloadSlot[]
  simulation: SimulationConfig
  simulationPeriod: SimulationPeriod
  results: SimulationResults | null
  simulationResult: SimulationResults | null
  ui: UIState
  loading: boolean
  errors: ValidationError[]
  notification: Notification | null
  userPreferences: UserPreferences
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface ModelSelectorProps {
  models: Model[]
  selectedModel: Model | null
  onModelSelect: (model: Model) => void
  disabled?: boolean
  error?: string
}

export interface WorkloadConfiguratorProps {
  workloads: Workload[]
  workloadSlots: WorkloadSlot[]
  onSlotsChange: (slots: WorkloadSlot[]) => void
  onProfileSelect: (profile: Profile) => void
  profiles: Profile[]
  disabled?: boolean
  errors: ValidationError[]
}

export interface PercentageSliderProps {
  value: number
  onChange: (value: number) => void
  remaining: number
  label: string
  disabled?: boolean
  error?: string
}

export interface SimulationControlsProps {
  config: SimulationConfig
  onChange: (config: SimulationConfig) => void
  onCalculate: () => void
  isCalculating: boolean
  disabled?: boolean
}

export interface VRAMChartProps {
  data: VRAMUsagePoint[]
  maxVRAM: number
  chartType: 'area' | 'bar'
  showTooltips: boolean
  height?: number
  onPointClick?: (point: VRAMUsagePoint) => void
}

export interface ResultsSummaryProps {
  results: SimulationResults | null
  model: Model | null
  onExport?: (format: 'json' | 'csv' | 'png') => void
  loading?: boolean
}

// ============================================================================
// Service Interface Types
// ============================================================================

export interface VRAMCalculator {
  calculateBaseMemory(model: Model): number
  calculateKVCache(model: Model, sequenceLength: number, batchSize: number): number
  calculateActivations(model: Model, sequenceLength: number, batchSize: number): number
  calculateOverhead(baseMemory: number, additionalMemory: number): number
  simulateUsageOverTime(
    model: Model,
    workloadSlots: WorkloadSlot[],
    period: SimulationPeriod
  ): VRAMUsagePoint[]
}

export interface ModelService {
  loadModels(): Promise<Model[]>
  getModelById(id: string): Promise<Model | null>
  validateModel(model: Partial<Model>): ValidationError[]
}

export interface WorkloadService {
  getDefaultWorkloads(): Workload[]
  createCustomWorkload(workload: Omit<Workload, 'id'>): Workload
  validateWorkload(workload: Partial<Workload>): ValidationError[]
}

export interface ProfileService {
  getBuiltInProfiles(): Profile[]
  createProfile(profile: Omit<Profile, 'id' | 'isBuiltIn'>): Profile
  validateProfile(profile: Partial<Profile>): ValidationError[]
}

// ============================================================================
// Constants
// ============================================================================

export const WORKLOAD_SLOT_CONSTRAINTS = {
  MAX_SLOTS: 5,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  TOTAL_PERCENTAGE: 100,
} as const

export const SIMULATION_CONSTRAINTS = {
  MIN_DURATION: 1,
  MAX_DURATION: 86400,
  MIN_USERS: 1,
  MAX_USERS: 10000,
  MIN_GRANULARITY: 1,
  MAX_GRANULARITY: 3600,
} as const

export const PRECISION_BYTES = {
  [ModelPrecision.FP32]: 4,
  [ModelPrecision.FP16]: 2,
  [ModelPrecision.INT8]: 1,
  [ModelPrecision.INT4]: 0.5,
} as const

// ============================================================================
// Type Guards
// ============================================================================

export function isModel(obj: unknown): obj is Model {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    'name' in obj &&
    typeof (obj as Record<string, unknown>).name === 'string'
  )
}

export function isWorkload(obj: unknown): obj is Workload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as Record<string, unknown>).id === 'string' &&
    'inputTokens' in obj &&
    typeof (obj as Record<string, unknown>).inputTokens === 'number'
  )
}

export function isValidWorkloadSlots(slots: WorkloadSlot[]): boolean {
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload)
  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
  return totalPercentage === 100 && activeSlots.length > 0
}

export function isVRAMUsagePoint(obj: unknown): obj is VRAMUsagePoint {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'timestamp' in obj &&
    typeof (obj as Record<string, unknown>).timestamp === 'number' &&
    'totalVRAM' in obj &&
    typeof (obj as Record<string, unknown>).totalVRAM === 'number' &&
    'breakdown' in obj &&
    typeof (obj as Record<string, unknown>).breakdown === 'object' &&
    'activeRequests' in obj &&
    Array.isArray((obj as Record<string, unknown>).activeRequests)
  )
}

export function isValidationError(obj: unknown): obj is ValidationError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'field' in obj &&
    typeof (obj as Record<string, unknown>).field === 'string' &&
    'message' in obj &&
    typeof (obj as Record<string, unknown>).message === 'string' &&
    'severity' in obj &&
    ((obj as Record<string, unknown>).severity === 'error' ||
      (obj as Record<string, unknown>).severity === 'warning')
  )
}

// ============================================================================
// Utility Types
// ============================================================================

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>

export type ChartDataPoint = {
  timestamp: number
  [workloadId: string]: number
}

export type ExportFormat = 'json' | 'csv' | 'png'
export type ThemeMode = 'light' | 'dark' | 'auto'
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

// Enhanced utility types for type safety
export type ModelId = string
export type WorkloadId = string
export type ProfileId = string
export type NotificationId = string

export type WorkloadSlotId = string
export type Timestamp = number
export type Percentage = number
export type VRAMAmount = number

// Union types for better type checking
export type ModelProperty = keyof Model
export type WorkloadProperty = keyof Workload
export type SimulationProperty = keyof SimulationPeriod

// Conditional types for component props
export type ConditionalProps<T, K extends keyof T> = T[K] extends undefined
  ? Partial<Pick<T, K>>
  : Required<Pick<T, K>>

// Helper types for form handling
export type FormState<T> = {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isValid: boolean
  isSubmitting: boolean
}

// Event handler types
export type ChangeHandler<T> = (value: T) => void
export type SubmitHandler<T> = (values: T) => void | Promise<void>
export type ErrorHandler = (error: Error) => void

// ============================================================================
// Notes
// ============================================================================

// This file serves as the main barrel export for all types in the application.
// All interfaces, enums, constants, and utility types are exported directly above.
// Import from this file using: import { Model, Workload, ... } from '@/types'
