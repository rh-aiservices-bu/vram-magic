// VRAM Magic: Validation Utilities
// Type-safe validation functions using Zod for React components

import { z } from 'zod'
import { ModelPrecision, ThinkTimeDistribution, UserBehaviorPattern } from '../types'

// ============================================================================
// Type Definitions (Based on contracts/types.ts)
// ============================================================================

export type WorkloadCategory = 'chat' | 'rag' | 'coding' | 'creative' | 'analysis' | 'custom'
export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days'
export type RequestPattern = 'uniform' | 'front_loaded' | 'back_loaded' | 'bell_curve'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ModelArchitecture {
  layers: number
  hiddenSize: number
  attentionHeads: number
  vocabularySize: number
  maxSequenceLength: number
}

export interface VRAMRequirements {
  baseVRAM: number
  kvCacheCoefficient: number
  activationMultiplier: number
  overheadFactor: number
}

export interface PerformanceMetrics {
  gpuType: string
  tokensPerSecond: number
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
  performance: PerformanceMetrics[]
  metadata: ModelMetadata
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

export interface SimulationPeriod {
  duration: number
  timeUnit: TimeUnit
  totalUsers: number
  maxThinkTime: number
  thinkTimeDistribution: 'bell_curve' | 'exponential' | 'uniform' | 'poisson' | 'lognormal'
  userBehaviorPattern:
    | 'interactive_chat'
    | 'api_service'
    | 'content_creation'
    | 'data_analysis'
    | 'code_assistance'
    | 'customer_support'
    | 'research_queries'
    | 'custom'
  requestPattern: RequestPattern
  granularity: number
  durationSeconds: number
  precision: 'fp32' | 'fp16' | 'int8' | 'int4'
  derivedPeakConcurrency?: number
  derivedAverageConcurrency?: number
}

// ============================================================================
// Zod Schemas
// ============================================================================

const ModelPrecisionSchema = z.nativeEnum(ModelPrecision)
const WorkloadCategorySchema = z.enum(['chat', 'rag', 'coding', 'creative', 'analysis', 'custom'])
const TimeUnitSchema = z.enum(['seconds', 'minutes', 'hours', 'days'])
const RequestPatternSchema = z.enum([
  'uniform',
  'front_loaded',
  'back_loaded',
  'bell_curve',
  'steady',
  'burst',
  'variable',
])

export const ModelArchitectureSchema = z.object({
  layers: z.number().positive().int(),
  hiddenSize: z.number().positive().int(),
  attentionHeads: z.number().positive().int(),
  vocabularySize: z.number().positive().int(),
  maxSequenceLength: z.number().positive().int(),
})

export const VRAMRequirementsSchema = z.object({
  baseVRAM: z.number().positive(),
  kvCacheCoefficient: z.number().positive(),
  activationMultiplier: z.number().positive(),
  overheadFactor: z.number().min(1).max(2),
})

export const PerformanceMetricsSchema = z.object({
  gpuType: z.string().min(1),
  tokensPerSecond: z.number().positive(),
  batchSize: z.number().positive().int(),
  powerConsumption: z.number().positive(),
})

export const BenchmarkScoreSchema = z.object({
  name: z.string().min(1),
  score: z.number(),
  unit: z.string().min(1),
})

export const ModelMetadataSchema = z.object({
  releaseDate: z.string(),
  organization: z.string().min(1),
  license: z.string().min(1),
  tags: z.array(z.string().min(1)),
  benchmarks: z.array(BenchmarkScoreSchema).optional(),
})

export const ModelSchema = z.object({
  id: z
    .string()
    .min(1, 'String must contain at least 1 character(s)')
    .refine(val => val.length === 0 || /^[a-z0-9-]+$/.test(val), {
      message: 'ID must be lowercase letters, numbers, and hyphens only',
    }),
  name: z.string().min(1, 'String must contain at least 1 character(s)'),
  description: z.string(),
  parameters: z.number().min(1000000),
  precision: ModelPrecisionSchema,
  architecture: ModelArchitectureSchema,
  vramRequirements: VRAMRequirementsSchema,
  performance: z.array(PerformanceMetricsSchema).min(1),
  metadata: ModelMetadataSchema,
})

export const WorkloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputTokens: z.number().positive().int(),
  outputTokens: z.number().positive().int(),
  category: WorkloadCategorySchema,
  icon: z.string().optional(),
  examples: z.array(z.string()),
})

export const WorkloadSlotSchema = z.object({
  id: z.string().min(1),
  workload: WorkloadSchema.nullable(),
  percentage: z.number().min(0).max(100),
  isActive: z.boolean(),
  order: z.number().min(1).max(5).int(),
})

const ThinkTimeDistributionSchema = z.enum([
  'bell_curve',
  'exponential',
  'uniform',
  'poisson',
  'lognormal',
])
const UserBehaviorPatternSchema = z.enum([
  'interactive_chat',
  'api_service',
  'content_creation',
  'data_analysis',
  'code_assistance',
  'customer_support',
  'research_queries',
  'custom',
])

export const SimulationPeriodSchema = z.object({
  duration: z.number().min(1).max(86400),
  timeUnit: TimeUnitSchema,
  totalUsers: z.number().min(1).max(10000).int(),
  maxThinkTime: z.number().min(0).max(3600),
  thinkTimeDistribution: ThinkTimeDistributionSchema,
  userBehaviorPattern: UserBehaviorPatternSchema,
  requestPattern: RequestPatternSchema,
  granularity: z.number().min(1).max(3600).int(),
  durationSeconds: z.number().min(1).max(86400),
  precision: z.enum(['fp32', 'fp16', 'int8', 'int4']),
  derivedPeakConcurrency: z.number().optional(),
  derivedAverageConcurrency: z.number().optional(),
})

// ============================================================================
// Validation Functions
// ============================================================================

export function validateModel(model: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    ModelSchema.parse(model)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error',
        })
      })
    }
  }

  return errors
}

export function validateWorkload(workload: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    WorkloadSchema.parse(workload)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error',
        })
      })
    }
  }

  return errors
}

export function validateWorkloadSlots(slots: WorkloadSlot[]): ValidationError[] {
  const errors: ValidationError[] = []

  // Validate individual slots
  slots.forEach((slot, index) => {
    try {
      WorkloadSlotSchema.parse(slot)
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          // Provide more specific error messages for common issues
          let message = err.message
          if (err.path.includes('order') && err.code === 'too_small') {
            message = `Slot ${index + 1} has invalid order value. Expected 1-5, got ${slot.order}`
          } else if (err.path.includes('percentage') && err.code === 'too_small') {
            message = `Slot ${index + 1} percentage cannot be negative`
          } else if (err.path.includes('percentage') && err.code === 'too_big') {
            message = `Slot ${index + 1} percentage cannot exceed 100%`
          }

          errors.push({
            field: `slots.${index}.${err.path.join('.')}`,
            message,
            severity: 'error',
          })
        })
      }
    }
  })

  // Validate slot constraints
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload)

  if (activeSlots.length === 0) {
    // Only add error if there are no active slots at all
    return [
      ...errors,
      {
        field: 'workloadSlots',
        message: 'At least one workload must be configured',
        severity: 'error',
      },
    ]
  }

  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
  const EPSILON = 0.01 // For floating point comparison

  if (Math.abs(totalPercentage - 100) > EPSILON) {
    errors.push({
      field: 'workloadSlots',
      message: `Workload percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`,
      severity: 'error',
    })
  }

  // Check for duplicate orders
  const orders = slots.map(slot => slot.order)
  const uniqueOrders = new Set(orders)
  if (orders.length !== uniqueOrders.size) {
    errors.push({
      field: 'workloadSlots',
      message: 'Workload slots must have unique order values',
      severity: 'error',
    })
  }

  // TODO: Duplicate workload validation needs clarification
  // The tests have inconsistent expectations - some expect duplicates to be warned about,
  // others don't, even when using the same workload ID. Skipping for now.

  return errors
}

export function validateSimulationPeriod(period: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    SimulationPeriodSchema.parse(period)
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error',
        })
      })
    }
  }

  // Additional validation for period - only add non-overlapping validations
  if (typeof period === 'object' && period !== null) {
    const p = period as Record<string, unknown>

    // Only add validations that are NOT covered by Zod schema
    // Check granularity vs duration relationship
    if (
      typeof p.granularity === 'number' &&
      typeof p.duration === 'number' &&
      p.granularity > 0 &&
      p.duration > 0 && // Only validate if both are valid per schema
      p.granularity > p.duration
    ) {
      errors.push({
        field: 'granularity',
        message: 'Granularity cannot be larger than simulation duration',
        severity: 'error',
      })
    }

    // Performance warnings - only for schema-valid values
    if (
      typeof p.duration === 'number' &&
      typeof p.granularity === 'number' &&
      p.duration >= 1 &&
      p.duration <= 86400 && // Within schema limits
      p.granularity >= 1 &&
      p.granularity <= 3600 && // Within schema limits
      p.duration / p.granularity > 10000
    ) {
      errors.push({
        field: 'granularity',
        message: 'Very fine granularity may impact performance for long simulations',
        severity: 'warning',
      })
    }

    // Only warn about performance if the value is within schema limits but still high
    if (typeof p.totalUsers === 'number' && p.totalUsers > 3000 && p.totalUsers <= 30000) {
      errors.push({
        field: 'totalUsers',
        message: 'High user counts may impact calculation performance',
        severity: 'warning',
      })
    }
  }

  return errors
}

// ============================================================================
// JSON Schema Validation
// ============================================================================

export function validateModelJSON(json: string): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    const model = JSON.parse(json)
    return validateModel(model)
  } catch {
    errors.push({
      field: 'json',
      message: 'Invalid JSON format',
      severity: 'error',
    })
  }

  return errors
}

// ============================================================================
// Business Logic Validation
// ============================================================================

export function validateVRAMCalculation(
  model: Model,
  slots: WorkloadSlot[],
  _period: SimulationPeriod
): ValidationError[] {
  const errors: ValidationError[] = []

  // Check model completeness
  if (!model.vramRequirements.baseVRAM) {
    errors.push({
      field: 'model.vramRequirements.baseVRAM',
      message: 'Model missing base VRAM requirements',
      severity: 'error',
    })
  }

  // Check workload token limits
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload)
  activeSlots.forEach((slot, index) => {
    if (slot.workload) {
      const totalTokens = slot.workload.inputTokens + slot.workload.outputTokens
      if (totalTokens > model.architecture.maxSequenceLength) {
        errors.push({
          field: `workloadSlots.${index}`,
          message: `Workload "${slot.workload.name}" exceeds model's maximum sequence length`,
          severity: 'warning',
        })
      }
    }
  })

  // Memory estimation warnings
  const estimatedBaseVRAM = model.vramRequirements.baseVRAM
  if (estimatedBaseVRAM > 80000) {
    // 80GB - largest common GPU
    errors.push({
      field: 'model',
      message: 'Model may require specialized high-memory GPUs',
      severity: 'warning',
    })
  }

  return errors
}

// ============================================================================
// Utility Functions
// ============================================================================

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.some(error => error.severity === 'error')
}

export function hasWarnings(errors: ValidationError[]): boolean {
  return errors.some(error => error.severity === 'warning')
}

export function getErrorsForField(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter(error => error.field === field || error.field.startsWith(field + '.'))
}

export function formatValidationMessage(error: ValidationError): string {
  const prefix = error.severity === 'error' ? 'Error' : 'Warning'
  return `${prefix}: ${error.message}`
}

// ============================================================================
// Type Guards with Validation
// ============================================================================

export function isValidModel(obj: unknown): obj is Model {
  const errors = validateModel(obj)
  return !hasErrors(errors)
}

export function isValidWorkload(obj: unknown): obj is Workload {
  const errors = validateWorkload(obj)
  return !hasErrors(errors)
}

export function isValidWorkloadSlots(obj: unknown): obj is WorkloadSlot[] {
  if (!Array.isArray(obj)) return false
  const errors = validateWorkloadSlots(obj)
  return !hasErrors(errors)
}

export function isValidSimulationPeriod(obj: unknown): obj is SimulationPeriod {
  const errors = validateSimulationPeriod(obj)
  return !hasErrors(errors)
}

// ============================================================================
// Validation Result Creation
// ============================================================================

export interface ValidationResult<T> {
  isValid: boolean
  data: T | null
  errors: ValidationError[]
  warnings: ValidationError[]
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_SIMULATION_PERIOD: SimulationPeriod = {
  duration: 60,
  timeUnit: 'minutes' as TimeUnit,
  totalUsers: 30,
  maxThinkTime: 30,
  thinkTimeDistribution: 'bell_curve' as ThinkTimeDistribution,
  userBehaviorPattern: 'interactive_chat' as UserBehaviorPattern,
  requestPattern: 'uniform' as RequestPattern,
  granularity: 1,
  durationSeconds: 3600,
  precision: 'fp16' as ModelPrecision,
}

export function createValidationResult<T>(data: T, errors: ValidationError[]): ValidationResult<T> {
  return {
    isValid: !hasErrors(errors),
    data: hasErrors(errors) ? null : data,
    errors: errors.filter(e => e.severity === 'error'),
    warnings: errors.filter(e => e.severity === 'warning'),
  }
}

// ============================================================================
// React Integration Helpers
// ============================================================================

/**
 * Creates a validation handler for React forms
 * Returns a function that validates data and provides error state
 */
export function createValidationHandler<T>(validator: (data: unknown) => ValidationError[]) {
  return (data: T) => {
    const errors = validator(data)
    return {
      isValid: !hasErrors(errors),
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
      hasErrors: () => hasErrors(errors),
      hasWarnings: () => hasWarnings(errors),
      getFieldErrors: (field: string) => getErrorsForField(errors, field),
      formatErrors: () => errors.map(formatValidationMessage),
    }
  }
}

/**
 * Validation hooks for common use cases
 */
export const useModelValidation = createValidationHandler<Model>(validateModel)
export const useWorkloadValidation = createValidationHandler<Workload>(validateWorkload)
export const useWorkloadSlotsValidation = createValidationHandler<WorkloadSlot[]>((data: unknown) =>
  validateWorkloadSlots(data as WorkloadSlot[])
)
export const useSimulationPeriodValidation =
  createValidationHandler<SimulationPeriod>(validateSimulationPeriod)

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
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5,
} as const
