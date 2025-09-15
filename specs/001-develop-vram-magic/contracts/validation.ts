// VRAM Magic: Validation Schemas and Functions
// Comprehensive validation using Zod for type safety

import { z } from 'zod';
import type {
  Model,
  Workload,
  WorkloadSlot,
  SimulationPeriod,
  ValidationError,
  ModelPrecision,
  WorkloadCategory,
  TimeUnit,
  RequestPattern
} from './types';

// ============================================================================
// Zod Schemas
// ============================================================================

const ModelPrecisionSchema = z.enum(['fp32', 'fp16', 'int8', 'int4']);
const WorkloadCategorySchema = z.enum(['chat', 'rag', 'coding', 'creative', 'analysis', 'custom']);
const TimeUnitSchema = z.enum(['seconds', 'minutes', 'hours', 'days']);
const RequestPatternSchema = z.enum(['uniform', 'front_loaded', 'back_loaded', 'bell_curve']);

export const ModelArchitectureSchema = z.object({
  layers: z.number().positive().int(),
  hiddenSize: z.number().positive().int(),
  attentionHeads: z.number().positive().int(),
  vocabularySize: z.number().positive().int(),
  maxSequenceLength: z.number().positive().int()
});

export const VRAMRequirementsSchema = z.object({
  baseVRAM: z.number().positive(),
  kvCacheCoefficient: z.number().positive(),
  activationMultiplier: z.number().positive(),
  overheadFactor: z.number().min(1).max(2)
});

export const PerformanceMetricsSchema = z.object({
  gpuType: z.string().min(1),
  tokensPerSecond: z.number().positive(),
  batchSize: z.number().positive().int(),
  powerConsumption: z.number().positive()
});

export const BenchmarkScoreSchema = z.object({
  name: z.string().min(1),
  score: z.number(),
  unit: z.string().min(1)
});

export const ModelMetadataSchema = z.object({
  releaseDate: z.string().datetime(),
  organization: z.string().min(1),
  license: z.string().min(1),
  tags: z.array(z.string().min(1)),
  benchmarks: z.array(BenchmarkScoreSchema).optional()
});

export const ModelSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1),
  description: z.string(),
  parameters: z.number().min(1000000),
  precision: ModelPrecisionSchema,
  architecture: ModelArchitectureSchema,
  vramRequirements: VRAMRequirementsSchema,
  performance: z.array(PerformanceMetricsSchema).min(1),
  metadata: ModelMetadataSchema
});

export const WorkloadSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inputTokens: z.number().positive().int(),
  outputTokens: z.number().positive().int(),
  category: WorkloadCategorySchema,
  icon: z.string().optional(),
  examples: z.array(z.string())
});

export const WorkloadSlotSchema = z.object({
  id: z.string().min(1),
  workload: WorkloadSchema.nullable(),
  percentage: z.number().min(0).max(100),
  isActive: z.boolean(),
  order: z.number().min(1).max(5).int()
});

export const SimulationPeriodSchema = z.object({
  duration: z.number().min(1).max(86400),
  timeUnit: TimeUnitSchema,
  concurrentUsers: z.number().min(1).max(10000).int(),
  requestPattern: RequestPatternSchema,
  granularity: z.number().min(1).max(3600).int()
});

// ============================================================================
// Validation Functions
// ============================================================================

export function validateModel(model: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    ModelSchema.parse(model);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error'
        });
      });
    }
  }
  
  return errors;
}

export function validateWorkload(workload: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    WorkloadSchema.parse(workload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error'
        });
      });
    }
  }
  
  return errors;
}

export function validateWorkloadSlots(slots: WorkloadSlot[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validate individual slots
  slots.forEach((slot, index) => {
    try {
      WorkloadSlotSchema.parse(slot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          errors.push({
            field: `slots.${index}.${err.path.join('.')}`,
            message: err.message,
            severity: 'error'
          });
        });
      }
    }
  });
  
  // Validate slot constraints
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload);
  const totalPercentage = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0);
  
  if (activeSlots.length === 0) {
    errors.push({
      field: 'workloadSlots',
      message: 'At least one workload must be configured',
      severity: 'error'
    });
  } else if (Math.abs(totalPercentage - 100) > 0.01) { // Allow for floating point precision
    errors.push({
      field: 'workloadSlots',
      message: `Workload percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`,
      severity: 'error'
    });
  }
  
  // Check for duplicate orders
  const orders = slots.map(slot => slot.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    errors.push({
      field: 'workloadSlots',
      message: 'Workload slots must have unique order values',
      severity: 'error'
    });
  }
  
  // Check for duplicate workloads
  const workloadIds = activeSlots
    .map(slot => slot.workload?.id)
    .filter(Boolean);
  const uniqueWorkloadIds = new Set(workloadIds);
  if (workloadIds.length !== uniqueWorkloadIds.size) {
    errors.push({
      field: 'workloadSlots',
      message: 'Each workload can only be used once',
      severity: 'warning'
    });
  }
  
  return errors;
}

export function validateSimulationPeriod(period: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    SimulationPeriodSchema.parse(period);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        errors.push({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error'
        });
      });
    }
  }
  
  // Additional validation for period
  if (typeof period === 'object' && period !== null) {
    const p = period as any;
    
    // Check granularity vs duration
    if (p.granularity && p.duration && p.granularity > p.duration) {
      errors.push({
        field: 'granularity',
        message: 'Granularity cannot be larger than simulation duration',
        severity: 'error'
      });
    }
    
    // Performance warnings
    if (p.duration && p.granularity && (p.duration / p.granularity) > 10000) {
      errors.push({
        field: 'granularity',
        message: 'Very fine granularity may impact performance for long simulations',
        severity: 'warning'
      });
    }
    
    if (p.concurrentUsers && p.concurrentUsers > 1000) {
      errors.push({
        field: 'concurrentUsers',
        message: 'High user counts may impact calculation performance',
        severity: 'warning'
      });
    }
  }
  
  return errors;
}

// ============================================================================
// JSON Schema Validation
// ============================================================================

export function validateModelJSON(json: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  try {
    const model = JSON.parse(json);
    return validateModel(model);
  } catch (error) {
    errors.push({
      field: 'json',
      message: 'Invalid JSON format',
      severity: 'error'
    });
  }
  
  return errors;
}

// ============================================================================
// Business Logic Validation
// ============================================================================

export function validateVRAMCalculation(
  model: Model,
  slots: WorkloadSlot[],
  period: SimulationPeriod
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check model completeness
  if (!model.vramRequirements.baseVRAM) {
    errors.push({
      field: 'model.vramRequirements.baseVRAM',
      message: 'Model missing base VRAM requirements',
      severity: 'error'
    });
  }
  
  // Check workload token limits
  const activeSlots = slots.filter(slot => slot.isActive && slot.workload);
  activeSlots.forEach((slot, index) => {
    if (slot.workload) {
      const totalTokens = slot.workload.inputTokens + slot.workload.outputTokens;
      if (totalTokens > model.architecture.maxSequenceLength) {
        errors.push({
          field: `workloadSlots.${index}`,
          message: `Workload "${slot.workload.name}" exceeds model's maximum sequence length`,
          severity: 'warning'
        });
      }
    }
  });
  
  // Memory estimation warnings
  const estimatedBaseVRAM = model.vramRequirements.baseVRAM;
  if (estimatedBaseVRAM > 80000) { // 80GB - largest common GPU
    errors.push({
      field: 'model',
      message: 'Model may require specialized high-memory GPUs',
      severity: 'warning'
    });
  }
  
  return errors;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function hasErrors(errors: ValidationError[]): boolean {
  return errors.some(error => error.severity === 'error');
}

export function hasWarnings(errors: ValidationError[]): boolean {
  return errors.some(error => error.severity === 'warning');
}

export function getErrorsForField(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter(error => error.field === field || error.field.startsWith(field + '.'));
}

export function formatValidationMessage(error: ValidationError): string {
  const prefix = error.severity === 'error' ? 'Error' : 'Warning';
  return `${prefix}: ${error.message}`;
}

// ============================================================================
// Type Guards with Validation
// ============================================================================

export function isValidModel(obj: unknown): obj is Model {
  const errors = validateModel(obj);
  return !hasErrors(errors);
}

export function isValidWorkload(obj: unknown): obj is Workload {
  const errors = validateWorkload(obj);
  return !hasErrors(errors);
}

export function isValidWorkloadSlots(slots: unknown): slots is WorkloadSlot[] {
  if (!Array.isArray(slots)) return false;
  const errors = validateWorkloadSlots(slots);
  return !hasErrors(errors);
}

export function isValidSimulationPeriod(obj: unknown): obj is SimulationPeriod {
  const errors = validateSimulationPeriod(obj);
  return !hasErrors(errors);
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_SIMULATION_PERIOD: SimulationPeriod = {
  duration: 60,
  timeUnit: 'minutes' as TimeUnit,
  concurrentUsers: 10,
  requestPattern: 'uniform' as RequestPattern,
  granularity: 1
};

export const DEFAULT_WORKLOAD_SLOT: Omit<WorkloadSlot, 'id'> = {
  workload: null,
  percentage: 0,
  isActive: false,
  order: 1
};

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function createValidationResult<T>(
  data: T | null,
  errors: ValidationError[]
): ValidationResult<T> {
  return {
    isValid: !hasErrors(errors),
    data: hasErrors(errors) ? null : data,
    errors: errors.filter(e => e.severity === 'error'),
    warnings: errors.filter(e => e.severity === 'warning')
  };
}