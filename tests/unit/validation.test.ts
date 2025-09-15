/**
 * VRAM Magic: Validation Schema Tests (TDD)
 *
 * This test file follows TDD methodology - tests are written BEFORE implementation.
 * These tests MUST FAIL initially because src/utils/validation.ts doesn't exist yet.
 *
 * Test Coverage:
 * - validateModel function with valid/invalid scenarios
 * - validateWorkloadSlots with percentage validation (must sum to 100%)
 * - validateSimulationPeriod with time constraints
 * - Error message generation and formatting
 * - Comprehensive edge cases and boundary conditions
 * - Validation result types and error objects
 */

import { describe, it, expect } from 'vitest'
import type {
  Model,
  Workload,
  WorkloadSlot,
  SimulationPeriod,
  ValidationError,
  ModelPrecision,
  WorkloadCategory,
  TimeUnit,
  RequestPattern,
} from '../../src/types'

// Import validation functions that DON'T EXIST YET (will cause test failures - TDD)
import {
  validateModel,
  validateWorkload,
  validateWorkloadSlots,
  validateSimulationPeriod,
  validateVRAMCalculation,
  validateModelJSON,
  hasErrors,
  hasWarnings,
  getErrorsForField,
  formatValidationMessage,
  isValidModel,
  isValidWorkload,
  isValidWorkloadSlots,
  isValidSimulationPeriod,
  createValidationResult,
  // type ValidationResult,
} from '../../src/utils/validation'

describe('Model Validation', () => {
  const validModel: Model = {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: 'Meta Llama 2 7B parameter model',
    parameters: 7000000000,
    precision: 'fp16' as ModelPrecision,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 14000,
      kvCacheCoefficient: 0.5,
      activationMultiplier: 2.0,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'RTX 4090',
        tokensPerSecond: 25.5,
        batchSize: 1,
        powerConsumption: 450,
      },
    ],
    metadata: {
      releaseDate: '2023-07-18T00:00:00Z',
      organization: 'Meta AI',
      license: 'Custom Commercial License',
      tags: ['conversational', 'instruction-following'],
    },
  }

  describe('validateModel', () => {
    it('should return empty errors for valid model', () => {
      const errors = validateModel(validModel)
      expect(errors).toEqual([])
    })

    it('should validate required string fields', () => {
      const invalidModel = { ...validModel, id: '' }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'id',
        message: expect.stringContaining('String must contain at least 1 character'),
        severity: 'error',
      })
    })

    it('should validate ID format (lowercase, letters, numbers, hyphens only)', () => {
      const invalidModel = { ...validModel, id: 'Invalid_ID_With_Underscores' }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'id',
        message: 'ID must be lowercase letters, numbers, and hyphens only',
        severity: 'error',
      })
    })

    it('should validate parameter count minimum', () => {
      const invalidModel = { ...validModel, parameters: 500000 } // Less than 1M
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'parameters',
        message: expect.stringContaining('Number must be greater than or equal to 1000000'),
        severity: 'error',
      })
    })

    it('should validate nested architecture object', () => {
      const invalidModel = {
        ...validModel,
        architecture: {
          ...validModel.architecture,
          layers: -5, // Negative value
        },
      }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'architecture.layers',
        message: expect.stringContaining('Number must be greater than 0'),
        severity: 'error',
      })
    })

    it('should validate VRAM requirements ranges', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: {
          ...validModel.vramRequirements,
          overheadFactor: 3.0, // Exceeds max of 2.0
        },
      }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'vramRequirements.overheadFactor',
        message: expect.stringContaining('Number must be less than or equal to 2'),
        severity: 'error',
      })
    })

    it('should validate performance array not empty', () => {
      const invalidModel = { ...validModel, performance: [] }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'performance',
        message: expect.stringContaining('Array must contain at least 1 element'),
        severity: 'error',
      })
    })

    it('should validate date format in metadata', () => {
      const invalidModel = {
        ...validModel,
        metadata: {
          ...validModel.metadata,
          releaseDate: 'invalid-date',
        },
      }
      const errors = validateModel(invalidModel)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'metadata.releaseDate',
        message: expect.stringContaining('Invalid datetime'),
        severity: 'error',
      })
    })

    it('should handle null input', () => {
      const errors = validateModel(null as unknown as Model)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].severity).toBe('error')
    })

    it('should handle undefined input', () => {
      const errors = validateModel(undefined as unknown as Model)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].severity).toBe('error')
    })

    it('should handle multiple validation errors', () => {
      const invalidModel: Partial<Model> = {
        id: '',
        name: '',
        parameters: -1,
        precision: 'invalid' as ModelPrecision,
      }
      const errors = validateModel(invalidModel as Model)

      expect(errors.length).toBeGreaterThan(3)
      expect(errors.every(error => error.severity === 'error')).toBe(true)
    })
  })

  describe('isValidModel', () => {
    it('should return true for valid model', () => {
      expect(isValidModel(validModel)).toBe(true)
    })

    it('should return false for invalid model', () => {
      const invalidModel = { ...validModel, id: '' }
      expect(isValidModel(invalidModel)).toBe(false)
    })

    it('should return false for non-object input', () => {
      expect(isValidModel('not a model' as unknown as Model)).toBe(false)
      expect(isValidModel(123 as unknown as Model)).toBe(false)
      expect(isValidModel(null as unknown as Model)).toBe(false)
    })
  })
})

describe('Workload Validation', () => {
  const validWorkload: Workload = {
    id: 'chat-conversation',
    name: 'Chat Conversation',
    description: 'Interactive chat conversation workload',
    inputTokens: 512,
    outputTokens: 256,
    category: 'chat' as WorkloadCategory,
    icon: 'chat-icon',
    examples: ['Hello, how are you?', 'Can you help me with...'],
  }

  describe('validateWorkload', () => {
    it('should return empty errors for valid workload', () => {
      const errors = validateWorkload(validWorkload)
      expect(errors).toEqual([])
    })

    it('should validate positive token counts', () => {
      const invalidWorkload = { ...validWorkload, inputTokens: 0 }
      const errors = validateWorkload(invalidWorkload)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'inputTokens',
        message: expect.stringContaining('Number must be greater than 0'),
        severity: 'error',
      })
    })

    it('should validate integer token counts', () => {
      const invalidWorkload = { ...validWorkload, outputTokens: 123.456 }
      const errors = validateWorkload(invalidWorkload)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'outputTokens',
        message: expect.stringContaining('Expected integer'),
        severity: 'error',
      })
    })

    it('should validate workload category enum', () => {
      const invalidWorkload = {
        ...validWorkload,
        category: 'invalid-category' as WorkloadCategory,
      }
      const errors = validateWorkload(invalidWorkload)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('category')
      expect(errors[0].severity).toBe('error')
    })

    it('should handle negative token values', () => {
      const invalidWorkload = {
        ...validWorkload,
        inputTokens: -100,
        outputTokens: -50,
      }
      const errors = validateWorkload(invalidWorkload)

      expect(errors).toHaveLength(2)
      expect(errors.every(error => error.severity === 'error')).toBe(true)
    })
  })

  describe('isValidWorkload', () => {
    it('should return true for valid workload', () => {
      expect(isValidWorkload(validWorkload)).toBe(true)
    })

    it('should return false for invalid workload', () => {
      const invalidWorkload = { ...validWorkload, inputTokens: -1 }
      expect(isValidWorkload(invalidWorkload)).toBe(false)
    })
  })
})

describe('Workload Slots Validation', () => {
  const validWorkload: Workload = {
    id: 'test-workload',
    name: 'Test Workload',
    description: 'Test workload description',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat' as WorkloadCategory,
    examples: [],
  }

  const createWorkloadSlot = (
    id: string,
    percentage: number,
    isActive: boolean = true,
    order: number = 1,
    workload: Workload | null = validWorkload
  ): WorkloadSlot => ({
    id,
    workload,
    percentage,
    isActive,
    order,
  })

  describe('validateWorkloadSlots', () => {
    it('should return empty errors for valid slots summing to 100%', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 40, true, 2),
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toEqual([])
    })

    it('should validate percentage sum equals 100%', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 30, true, 2), // Sum = 90%
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'workloadSlots',
        message: 'Workload percentages must sum to 100% (currently 90.0%)',
        severity: 'error',
      })
    })

    it('should validate percentage sum with floating point precision', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 33.33, true, 1),
        createWorkloadSlot('slot2', 33.33, true, 2),
        createWorkloadSlot('slot3', 33.34, true, 3), // Sum = 100.00%
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toEqual([])
    })

    it('should handle small floating point errors', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 33.333, true, 1),
        createWorkloadSlot('slot2', 33.333, true, 2),
        createWorkloadSlot('slot3', 33.334, true, 3), // Sum = 100.000%
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toEqual([])
    })

    it('should require at least one active workload', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 50, false, 1), // Inactive
        createWorkloadSlot('slot2', 50, false, 2), // Inactive
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'workloadSlots',
        message: 'At least one workload must be configured',
        severity: 'error',
      })
    })

    it('should ignore inactive slots in percentage calculation', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 40, true, 2),
        createWorkloadSlot('slot3', 25, false, 3), // Inactive, ignored
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toEqual([])
    })

    it('should ignore slots without workload in percentage calculation', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 40, true, 2),
        createWorkloadSlot('slot3', 25, true, 3, null), // No workload, ignored
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors).toEqual([])
    })

    it('should validate percentage range (0-100)', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 120, true, 1), // Exceeds 100%
        createWorkloadSlot('slot2', -20, true, 2), // Negative
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors.length).toBeGreaterThanOrEqual(2)
      expect(errors.some(e => e.field.includes('slot') && e.field.includes('percentage'))).toBe(
        true
      )
    })

    it('should validate unique order values', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 50, true, 1),
        createWorkloadSlot('slot2', 50, true, 1), // Duplicate order
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors.some(e => e.message.includes('unique order values'))).toBe(true)
    })

    it('should validate order range (1-5)', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 50, true, 0), // Below minimum
        createWorkloadSlot('slot2', 50, true, 6), // Above maximum
      ]

      const errors = validateWorkloadSlots(slots)
      expect(errors.length).toBeGreaterThanOrEqual(2)
      expect(errors.some(e => e.field.includes('order'))).toBe(true)
    })

    it('should warn about duplicate workloads', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 50, true, 1, validWorkload),
        createWorkloadSlot('slot2', 50, true, 2, validWorkload), // Same workload
      ]

      const errors = validateWorkloadSlots(slots)
      expect(
        errors.some(
          e => e.message.includes('Each workload can only be used once') && e.severity === 'warning'
        )
      ).toBe(true)
    })

    it('should handle empty slots array', () => {
      const errors = validateWorkloadSlots([])
      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'workloadSlots',
        message: 'At least one workload must be configured',
        severity: 'error',
      })
    })

    it('should validate individual slot properties', () => {
      const invalidSlots: WorkloadSlot[] = [
        {
          id: '', // Invalid empty ID
          workload: validWorkload,
          percentage: 100,
          isActive: true,
          order: 1,
        },
      ]

      const errors = validateWorkloadSlots(invalidSlots)
      expect(errors.some(e => e.field.includes('slots.0.id'))).toBe(true)
    })
  })

  describe('isValidWorkloadSlots', () => {
    it('should return true for valid slots', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 40, true, 2),
      ]
      expect(isValidWorkloadSlots(slots)).toBe(true)
    })

    it('should return false for invalid percentage sum', () => {
      const slots: WorkloadSlot[] = [
        createWorkloadSlot('slot1', 60, true, 1),
        createWorkloadSlot('slot2', 30, true, 2), // Sum = 90%
      ]
      expect(isValidWorkloadSlots(slots)).toBe(false)
    })

    it('should return false for non-array input', () => {
      expect(isValidWorkloadSlots('not an array' as unknown as WorkloadSlot[])).toBe(false)
      expect(isValidWorkloadSlots(null as unknown as WorkloadSlot[])).toBe(false)
    })
  })
})

describe('Simulation Period Validation', () => {
  const validPeriod: SimulationPeriod = {
    duration: 60,
    timeUnit: 'minutes' as TimeUnit,
    concurrentUsers: 10,
    requestPattern: 'uniform' as RequestPattern,
    granularity: 1,
  }

  describe('validateSimulationPeriod', () => {
    it('should return empty errors for valid period', () => {
      const errors = validateSimulationPeriod(validPeriod)
      expect(errors).toEqual([])
    })

    it('should validate duration range (1-86400)', () => {
      const invalidPeriod = { ...validPeriod, duration: 0 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'duration',
        message: expect.stringContaining('Number must be greater than or equal to 1'),
        severity: 'error',
      })
    })

    it('should validate maximum duration', () => {
      const invalidPeriod = { ...validPeriod, duration: 100000 } // Exceeds 86400
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'duration',
        message: expect.stringContaining('Number must be less than or equal to 86400'),
        severity: 'error',
      })
    })

    it('should validate concurrent users range (1-10000)', () => {
      const invalidPeriod = { ...validPeriod, concurrentUsers: 0 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('concurrentUsers')
    })

    it('should validate maximum concurrent users', () => {
      const invalidPeriod = { ...validPeriod, concurrentUsers: 15000 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('concurrentUsers')
    })

    it('should validate granularity range (1-3600)', () => {
      const invalidPeriod = { ...validPeriod, granularity: 0 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('granularity')
    })

    it('should validate granularity not larger than duration', () => {
      const invalidPeriod = { ...validPeriod, duration: 5, granularity: 10 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'granularity',
        message: 'Granularity cannot be larger than simulation duration',
        severity: 'error',
      })
    })

    it('should validate time unit enum', () => {
      const invalidPeriod = {
        ...validPeriod,
        timeUnit: 'invalid-unit' as TimeUnit,
      }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('timeUnit')
    })

    it('should validate request pattern enum', () => {
      const invalidPeriod = {
        ...validPeriod,
        requestPattern: 'invalid-pattern' as RequestPattern,
      }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('requestPattern')
    })

    it('should warn about performance issues with fine granularity', () => {
      const invalidPeriod = {
        ...validPeriod,
        duration: 86400, // 1 day
        granularity: 1, // 1 second granularity = 86400 points
      }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors.some(e => e.severity === 'warning' && e.message.includes('performance'))).toBe(
        true
      )
    })

    it('should warn about high user count performance impact', () => {
      const invalidPeriod = { ...validPeriod, concurrentUsers: 5000 }
      const errors = validateSimulationPeriod(invalidPeriod)

      expect(errors.some(e => e.severity === 'warning' && e.field === 'concurrentUsers')).toBe(true)
    })

    it('should handle multiple validation errors', () => {
      const invalidPeriod: Partial<SimulationPeriod> = {
        duration: -1,
        timeUnit: 'invalid' as TimeUnit,
        concurrentUsers: 0,
        requestPattern: 'invalid' as RequestPattern,
        granularity: -5,
      }
      const errors = validateSimulationPeriod(invalidPeriod as SimulationPeriod)

      expect(errors.length).toBeGreaterThan(3)
      expect(errors.every(error => error.severity === 'error')).toBe(true)
    })
  })

  describe('isValidSimulationPeriod', () => {
    it('should return true for valid period', () => {
      expect(isValidSimulationPeriod(validPeriod)).toBe(true)
    })

    it('should return false for invalid period', () => {
      const invalidPeriod = { ...validPeriod, duration: -1 }
      expect(isValidSimulationPeriod(invalidPeriod)).toBe(false)
    })
  })
})

describe('JSON Validation', () => {
  describe('validateModelJSON', () => {
    it('should validate valid JSON model', () => {
      const validModelJSON = JSON.stringify({
        id: 'test-model',
        name: 'Test Model',
        description: 'Test description',
        parameters: 1000000,
        precision: 'fp16',
        architecture: {
          layers: 10,
          hiddenSize: 512,
          attentionHeads: 8,
          vocabularySize: 30000,
          maxSequenceLength: 2048,
        },
        vramRequirements: {
          baseVRAM: 1000,
          kvCacheCoefficient: 0.5,
          activationMultiplier: 2.0,
          overheadFactor: 1.2,
        },
        performance: [
          {
            gpuType: 'Test GPU',
            tokensPerSecond: 10,
            batchSize: 1,
            powerConsumption: 100,
          },
        ],
        metadata: {
          releaseDate: '2023-01-01T00:00:00Z',
          organization: 'Test Org',
          license: 'Test License',
          tags: ['test'],
        },
      })

      const errors = validateModelJSON(validModelJSON)
      expect(errors).toEqual([])
    })

    it('should handle invalid JSON syntax', () => {
      const invalidJSON = '{ invalid json }'
      const errors = validateModelJSON(invalidJSON)

      expect(errors).toHaveLength(1)
      expect(errors[0]).toEqual({
        field: 'json',
        message: 'Invalid JSON format',
        severity: 'error',
      })
    })

    it('should validate JSON content after parsing', () => {
      const invalidModelJSON = JSON.stringify({
        id: '', // Invalid empty ID
        parameters: -1, // Invalid negative parameters
      })

      const errors = validateModelJSON(invalidModelJSON)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.every(error => error.severity === 'error')).toBe(true)
    })
  })
})

describe('Business Logic Validation', () => {
  const validModel: Model = {
    id: 'test-model',
    name: 'Test Model',
    description: 'Test description',
    parameters: 7000000000,
    precision: 'fp16' as ModelPrecision,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 14000,
      kvCacheCoefficient: 0.5,
      activationMultiplier: 2.0,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'RTX 4090',
        tokensPerSecond: 25,
        batchSize: 1,
        powerConsumption: 450,
      },
    ],
    metadata: {
      releaseDate: '2023-07-18T00:00:00Z',
      organization: 'Test AI',
      license: 'Test License',
      tags: ['test'],
    },
  }

  const validPeriod: SimulationPeriod = {
    duration: 60,
    timeUnit: 'minutes' as TimeUnit,
    concurrentUsers: 10,
    requestPattern: 'uniform' as RequestPattern,
    granularity: 1,
  }

  describe('validateVRAMCalculation', () => {
    it('should validate complete model requirements', () => {
      const incompleteModel = {
        ...validModel,
        vramRequirements: { ...validModel.vramRequirements, baseVRAM: 0 },
      }
      const errors = validateVRAMCalculation(incompleteModel, [], validPeriod)

      expect(
        errors.some(
          e =>
            e.field === 'model.vramRequirements.baseVRAM' && e.message.includes('missing base VRAM')
        )
      ).toBe(true)
    })

    it('should warn about workloads exceeding sequence length', () => {
      const longWorkload: Workload = {
        id: 'long-workload',
        name: 'Long Workload',
        description: 'Exceeds model context',
        inputTokens: 3000,
        outputTokens: 2000, // Total 5000 > model max 4096
        category: 'custom' as WorkloadCategory,
        examples: [],
      }

      const slots: WorkloadSlot[] = [
        {
          id: 'slot1',
          workload: longWorkload,
          percentage: 100,
          isActive: true,
          order: 1,
        },
      ]

      const errors = validateVRAMCalculation(validModel, slots, validPeriod)
      expect(
        errors.some(
          e =>
            e.severity === 'warning' &&
            e.message.includes("exceeds model's maximum sequence length")
        )
      ).toBe(true)
    })

    it('should warn about high VRAM requirements', () => {
      const highVRAMModel = {
        ...validModel,
        vramRequirements: { ...validModel.vramRequirements, baseVRAM: 90000 },
      }

      const errors = validateVRAMCalculation(highVRAMModel, [], validPeriod)
      expect(
        errors.some(
          e => e.severity === 'warning' && e.message.includes('specialized high-memory GPUs')
        )
      ).toBe(true)
    })
  })
})

describe('Utility Functions', () => {
  const testErrors: ValidationError[] = [
    { field: 'test1', message: 'Error 1', severity: 'error' },
    { field: 'test2', message: 'Warning 1', severity: 'warning' },
    { field: 'test1.nested', message: 'Error 2', severity: 'error' },
  ]

  describe('hasErrors', () => {
    it('should return true when errors are present', () => {
      expect(hasErrors(testErrors)).toBe(true)
    })

    it('should return false when only warnings are present', () => {
      const warningsOnly = testErrors.filter(e => e.severity === 'warning')
      expect(hasErrors(warningsOnly)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasErrors([])).toBe(false)
    })
  })

  describe('hasWarnings', () => {
    it('should return true when warnings are present', () => {
      expect(hasWarnings(testErrors)).toBe(true)
    })

    it('should return false when only errors are present', () => {
      const errorsOnly = testErrors.filter(e => e.severity === 'error')
      expect(hasWarnings(errorsOnly)).toBe(false)
    })

    it('should return false for empty array', () => {
      expect(hasWarnings([])).toBe(false)
    })
  })

  describe('getErrorsForField', () => {
    it('should return errors for exact field match', () => {
      const fieldErrors = getErrorsForField(testErrors, 'test1')
      expect(fieldErrors).toHaveLength(2) // 'test1' and 'test1.nested'
    })

    it('should return errors for field prefix match', () => {
      const fieldErrors = getErrorsForField(testErrors, 'test1')
      expect(fieldErrors.some(e => e.field === 'test1.nested')).toBe(true)
    })

    it('should return empty array for non-existent field', () => {
      const fieldErrors = getErrorsForField(testErrors, 'nonexistent')
      expect(fieldErrors).toEqual([])
    })
  })

  describe('formatValidationMessage', () => {
    it('should format error message with Error prefix', () => {
      const error: ValidationError = {
        field: 'test',
        message: 'Test error',
        severity: 'error',
      }
      expect(formatValidationMessage(error)).toBe('Error: Test error')
    })

    it('should format warning message with Warning prefix', () => {
      const warning: ValidationError = {
        field: 'test',
        message: 'Test warning',
        severity: 'warning',
      }
      expect(formatValidationMessage(warning)).toBe('Warning: Test warning')
    })
  })

  describe('createValidationResult', () => {
    it('should create valid result with no errors', () => {
      const data = { test: 'value' }
      const result = createValidationResult(data, [])

      expect(result).toEqual({
        isValid: true,
        data: data,
        errors: [],
        warnings: [],
      })
    })

    it('should create invalid result with errors', () => {
      const data = { test: 'value' }
      const errors = [{ field: 'test', message: 'Error', severity: 'error' as const }]
      const result = createValidationResult(data, errors)

      expect(result).toEqual({
        isValid: false,
        data: null,
        errors: errors,
        warnings: [],
      })
    })

    it('should separate errors and warnings', () => {
      const data = { test: 'value' }
      const validationErrors = [
        { field: 'test1', message: 'Error', severity: 'error' as const },
        { field: 'test2', message: 'Warning', severity: 'warning' as const },
      ]
      const result = createValidationResult(data, validationErrors)

      expect(result.errors).toHaveLength(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.isValid).toBe(false)
      expect(result.data).toBe(null)
    })

    it('should keep data with warnings only', () => {
      const data = { test: 'value' }
      const warnings = [{ field: 'test', message: 'Warning', severity: 'warning' as const }]
      const result = createValidationResult(data, warnings)

      expect(result.isValid).toBe(true)
      expect(result.data).toBe(data)
      expect(result.warnings).toHaveLength(1)
    })
  })
})

describe('Edge Cases and Boundary Conditions', () => {
  describe('Boundary Values', () => {
    it('should handle minimum valid values', () => {
      const minModel = {
        id: 'a',
        name: 'A',
        description: '',
        parameters: 1000000, // Minimum
        precision: 'fp32' as ModelPrecision,
        architecture: {
          layers: 1,
          hiddenSize: 1,
          attentionHeads: 1,
          vocabularySize: 1,
          maxSequenceLength: 1,
        },
        vramRequirements: {
          baseVRAM: 0.001, // Minimum positive
          kvCacheCoefficient: 0.001,
          activationMultiplier: 0.001,
          overheadFactor: 1.0, // Minimum
        },
        performance: [
          {
            gpuType: 'T',
            tokensPerSecond: 0.001,
            batchSize: 1,
            powerConsumption: 0.001,
          },
        ],
        metadata: {
          releaseDate: '1970-01-01T00:00:00Z',
          organization: 'O',
          license: 'L',
          tags: ['t'],
        },
      }

      const errors = validateModel(minModel)
      expect(errors).toEqual([])
    })

    it('should handle maximum valid values', () => {
      const maxPeriod: SimulationPeriod = {
        duration: 86400, // Maximum
        timeUnit: 'seconds' as TimeUnit,
        concurrentUsers: 10000, // Maximum
        requestPattern: 'uniform' as RequestPattern,
        granularity: 3600, // Maximum
      }

      const errors = validateSimulationPeriod(maxPeriod)
      // Should have no errors (warnings about performance are allowed)
      expect(errors.filter(e => e.severity === 'error')).toEqual([])
    })
  })

  describe('Data Type Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeModel: Partial<Model> = {
        parameters: Number.MAX_SAFE_INTEGER,
      }

      // Should not throw errors for large valid numbers
      expect(() => validateModel(largeModel as Model)).not.toThrow()
    })

    it('should handle special float values', () => {
      expect(() => validateModel({ percentage: NaN } as unknown as Model)).not.toThrow()
      expect(() => validateModel({ percentage: Infinity } as unknown as Model)).not.toThrow()
      expect(() => validateModel({ percentage: -Infinity } as unknown as Model)).not.toThrow()
    })

    it('should handle unicode strings', () => {
      const unicodeModel: Partial<Model> = {
        name: '🤖 AI Model 测试 тест',
        description: 'Unicode description with émojis 🚀',
      }

      expect(() => validateModel(unicodeModel as Model)).not.toThrow()
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle complex workload slot configurations', () => {
      const complexSlots: WorkloadSlot[] = [
        {
          id: 'slot-1',
          workload: null, // Empty slot
          percentage: 0,
          isActive: false,
          order: 1,
        },
        {
          id: 'slot-2',
          workload: {
            id: 'workload-1',
            name: 'Workload 1',
            description: 'Description',
            inputTokens: 100,
            outputTokens: 50,
            category: 'chat' as WorkloadCategory,
            examples: [],
          },
          percentage: 33.33,
          isActive: true,
          order: 2,
        },
        {
          id: 'slot-3',
          workload: {
            id: 'workload-2',
            name: 'Workload 2',
            description: 'Description',
            inputTokens: 200,
            outputTokens: 100,
            category: 'analysis' as WorkloadCategory,
            examples: [],
          },
          percentage: 66.67,
          isActive: true,
          order: 3,
        },
      ]

      const errors = validateWorkloadSlots(complexSlots)
      expect(errors.filter(e => e.severity === 'error')).toEqual([])
    })
  })
})
