import { describe, it, expect } from 'vitest'
import { validateModel } from '../../src/services/modelValidator'
import type { Model } from '../../specs/001-develop-vram-magic/contracts/types'
import { ModelPrecision } from '../../specs/001-develop-vram-magic/contracts/types'

describe('Model JSON Schema Validation', () => {
  // Valid sample model data based on the schema
  const validModel: Model = {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: "Meta's Llama 2 model with 7 billion parameters",
    parameters: 7000000000,
    precision: ModelPrecision.FP16,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 13500,
      kvCacheCoefficient: 1.2,
      activationMultiplier: 1.5,
      overheadFactor: 1.15,
    },
    performance: [
      {
        gpuType: 'RTX 4090',
        tokensPerSecond: 45,
        batchSize: 1,
        powerConsumption: 350,
      },
      {
        gpuType: 'A100',
        tokensPerSecond: 80,
        batchSize: 4,
        powerConsumption: 400,
      },
    ],
    metadata: {
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Llama 2 Community License',
      tags: ['chat', 'assistant', 'open-source'],
      benchmarks: [
        {
          name: 'MMLU',
          score: 45.3,
          unit: 'accuracy',
        },
      ],
    },
  }

  describe('Valid Model Validation', () => {
    it('should validate a complete valid model successfully', () => {
      const result = validateModel(validModel)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.model).toEqual(validModel)
    })

    it('should validate model with minimal required fields', () => {
      const minimalModel = {
        id: 'test-model',
        name: 'Test Model',
        description: 'A test model',
        parameters: 1000000,
        precision: ModelPrecision.FP32,
        architecture: {
          layers: 1,
          hiddenSize: 1,
          attentionHeads: 1,
          vocabularySize: 1000,
          maxSequenceLength: 512,
        },
        vramRequirements: {
          baseVRAM: 100,
          kvCacheCoefficient: 0.1,
          activationMultiplier: 1,
          overheadFactor: 1.0,
        },
        performance: [
          {
            gpuType: 'RTX 3090',
            tokensPerSecond: 10,
            batchSize: 1,
            powerConsumption: 50,
          },
        ],
        metadata: {
          releaseDate: '2023-01-01',
          organization: 'Test Org',
          license: 'MIT',
          tags: ['test'],
        },
      }

      const result = validateModel(minimalModel)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate model with optional benchmarks', () => {
      const modelWithBenchmarks = {
        ...validModel,
        metadata: {
          ...validModel.metadata,
          benchmarks: [
            { name: 'MMLU', score: 85.2, unit: 'accuracy' },
            { name: 'HellaSwag', score: 78.9, unit: 'accuracy' },
          ],
        },
      }

      const result = validateModel(modelWithBenchmarks)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Required Fields Validation', () => {
    it('should reject model missing id field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).id

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)

      const idError = result.errors.find(err => err.field === 'id')
      expect(idError).toBeDefined()
      expect(idError?.message).toContain('required')
    })

    it('should reject model missing name field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).name

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'name')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject model missing parameters field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).parameters

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'parameters')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject model missing architecture field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).architecture

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject model missing vramRequirements field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).vramRequirements

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject model missing performance field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).performance

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'performance')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject model missing metadata field', () => {
      const invalidModel = { ...validModel }
      delete (invalidModel as Partial<Model>).metadata

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'metadata')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })
  })

  describe('Architecture Field Validation', () => {
    it('should reject missing architecture.layers', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture },
      }
      delete (invalidModel.architecture as Partial<typeof validModel.architecture>).layers

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.layers')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject missing architecture.hiddenSize', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture },
      }
      delete (invalidModel.architecture as Partial<typeof validModel.architecture>).hiddenSize

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.hiddenSize')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject missing architecture.attentionHeads', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture },
      }
      delete (invalidModel.architecture as Partial<typeof validModel.architecture>).attentionHeads

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.attentionHeads')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })
  })

  describe('VRAM Requirements Validation', () => {
    it('should reject missing vramRequirements.baseVRAM', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: { ...validModel.vramRequirements },
      }
      delete (invalidModel.vramRequirements as Partial<typeof validModel.vramRequirements>).baseVRAM

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.baseVRAM')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })

    it('should reject missing vramRequirements.kvCacheCoefficient', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: { ...validModel.vramRequirements },
      }
      delete (invalidModel.vramRequirements as Partial<typeof validModel.vramRequirements>)
        .kvCacheCoefficient

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.kvCacheCoefficient')
      expect(error).toBeDefined()
      expect(error?.message).toContain('required')
    })
  })

  describe('Data Type Validation', () => {
    it('should reject non-string id', () => {
      const invalidModel = { ...validModel, id: 123 as unknown as string }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'id')
      expect(error).toBeDefined()
      expect(error?.message).toContain('string')
    })

    it('should reject non-number parameters', () => {
      const invalidModel = { ...validModel, parameters: 'not-a-number' as unknown as number }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'parameters')
      expect(error).toBeDefined()
      expect(error?.message).toContain('number')
    })

    it('should reject non-array performance', () => {
      const invalidModel = {
        ...validModel,
        performance: 'not-an-array' as unknown as typeof validModel.performance,
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'performance')
      expect(error).toBeDefined()
      expect(error?.message).toContain('array')
    })

    it('should reject non-object architecture', () => {
      const invalidModel = {
        ...validModel,
        architecture: 'not-an-object' as unknown as typeof validModel.architecture,
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture')
      expect(error).toBeDefined()
      expect(error?.message).toContain('object')
    })
  })

  describe('Constraint Validation', () => {
    it('should reject invalid id pattern', () => {
      const invalidModel = { ...validModel, id: 'Invalid_ID_123!' }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'id')
      expect(error).toBeDefined()
      expect(error?.message).toContain('pattern')
    })

    it('should reject parameters below minimum', () => {
      const invalidModel = { ...validModel, parameters: 999999 }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'parameters')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject invalid precision enum value', () => {
      const invalidModel = {
        ...validModel,
        precision: 'invalid-precision' as unknown as typeof validModel.precision,
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'precision')
      expect(error).toBeDefined()
      expect(error?.message).toContain('enum')
    })

    it('should reject architecture.layers below minimum', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture, layers: 0 },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.layers')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject architecture.vocabularySize below minimum', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture, vocabularySize: 999 },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.vocabularySize')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject architecture.maxSequenceLength below minimum', () => {
      const invalidModel = {
        ...validModel,
        architecture: { ...validModel.architecture, maxSequenceLength: 511 },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'architecture.maxSequenceLength')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject vramRequirements.baseVRAM below minimum', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: { ...validModel.vramRequirements, baseVRAM: 99 },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.baseVRAM')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject vramRequirements.kvCacheCoefficient below minimum', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: {
          ...validModel.vramRequirements,
          kvCacheCoefficient: 0.09,
        },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.kvCacheCoefficient')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })

    it('should reject vramRequirements.overheadFactor above maximum', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: {
          ...validModel.vramRequirements,
          overheadFactor: 2.1,
        },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.overheadFactor')
      expect(error).toBeDefined()
      expect(error?.message).toContain('maximum')
    })

    it('should reject vramRequirements.overheadFactor below minimum', () => {
      const invalidModel = {
        ...validModel,
        vramRequirements: {
          ...validModel.vramRequirements,
          overheadFactor: 0.9,
        },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'vramRequirements.overheadFactor')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minimum')
    })
  })

  describe('Performance Array Validation', () => {
    it('should reject empty performance array', () => {
      const invalidModel = { ...validModel, performance: [] }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'performance')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minItems')
    })

    it('should reject performance item missing required fields', () => {
      const invalidModel = {
        ...validModel,
        performance: [
          {
            gpuType: 'RTX 4090',
            // Missing tokensPerSecond, batchSize, powerConsumption
          },
        ],
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject performance with invalid constraint values', () => {
      const invalidModel = {
        ...validModel,
        performance: [
          {
            gpuType: 'RTX 4090',
            tokensPerSecond: 0, // Below minimum
            batchSize: 0, // Below minimum
            powerConsumption: 49, // Below minimum
          },
        ],
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Metadata Validation', () => {
    it('should reject invalid date format in metadata.releaseDate', () => {
      const invalidModel = {
        ...validModel,
        metadata: { ...validModel.metadata, releaseDate: 'invalid-date' },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'metadata.releaseDate')
      expect(error).toBeDefined()
      expect(error?.message).toContain('date')
    })

    it('should reject empty organization string', () => {
      const invalidModel = {
        ...validModel,
        metadata: { ...validModel.metadata, organization: '' },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'metadata.organization')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minLength')
    })

    it('should reject empty license string', () => {
      const invalidModel = {
        ...validModel,
        metadata: { ...validModel.metadata, license: '' },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field === 'metadata.license')
      expect(error).toBeDefined()
      expect(error?.message).toContain('minLength')
    })

    it('should reject tags array with empty strings', () => {
      const invalidModel = {
        ...validModel,
        metadata: { ...validModel.metadata, tags: ['valid-tag', ''] },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field.includes('metadata.tags'))
      expect(error).toBeDefined()
      expect(error?.message).toContain('minLength')
    })
  })

  describe('Edge Cases', () => {
    it('should reject null model', () => {
      const result = validateModel(null as unknown as Model)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject undefined model', () => {
      const result = validateModel(undefined as unknown as Model)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject empty object', () => {
      const result = validateModel({} as unknown as Model)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject model with additional properties', () => {
      const invalidModel = {
        ...validModel,
        unexpectedField: 'should not be here',
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.message.toLowerCase().includes('additional'))
      expect(error).toBeDefined()
    })

    it('should handle multiple validation errors', () => {
      const invalidModel: Partial<Model> = {
        id: 'Invalid_ID!', // Invalid pattern
        name: '', // Too short
        parameters: 999, // Below minimum
        precision: 'invalid' as unknown as typeof validModel.precision, // Invalid enum
        // Missing required fields
      }

      const result = validateModel(invalidModel as Model)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(3)
    })
  })

  describe('Benchmark Validation (Optional Field)', () => {
    it('should validate model without benchmarks', () => {
      const modelWithoutBenchmarks = {
        ...validModel,
        metadata: {
          ...validModel.metadata,
          benchmarks: undefined,
        },
      }

      const result = validateModel(modelWithoutBenchmarks)
      expect(result.isValid).toBe(true)
    })

    it('should reject benchmarks with missing required fields', () => {
      const invalidModel = {
        ...validModel,
        metadata: {
          ...validModel.metadata,
          benchmarks: [
            {
              name: 'MMLU',
              // Missing score and unit
            },
          ],
        },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject benchmarks with empty name', () => {
      const invalidModel = {
        ...validModel,
        metadata: {
          ...validModel.metadata,
          benchmarks: [
            {
              name: '',
              score: 85.2,
              unit: 'accuracy',
            },
          ],
        },
      }

      const result = validateModel(invalidModel)
      expect(result.isValid).toBe(false)
      const error = result.errors.find(err => err.field.includes('benchmarks'))
      expect(error).toBeDefined()
      expect(error?.message).toContain('minLength')
    })
  })
})
