import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
// Import actual components and services
import { vramCalculator } from '../../src/services/vramCalculator'
import { simulationService } from '../../src/services/simulationService'

// Import types for calculations
import type { Model, Workload, SimulationConfig, SimulationResults } from '../../src/types'

// Mock performance API for testing
const mockPerformance = {
  now: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
})

// Mock services for calculation testing
vi.mock('../../src/services/modelService', () => ({
  modelService: {
    loadModels: vi.fn(),
    getModelById: vi.fn(),
  },
}))

// Precision constants from the actual implementation
const PRECISION_BYTES = {
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5,
} as const

// Test models with known calculation values
const testModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: 'Test model for calculation accuracy',
    parameters: 7000000000,
    precision: 'fp16',
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 14336, // MB
      kvCacheCoefficient: 0.125,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'A100',
        tokensPerSecond: 45,
        batchSize: 1,
        powerConsumption: 300,
      },
    ],
    metadata: {
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Custom',
      tags: ['llama', '7b'],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'OpenAI GPT-3.5 model',
    parameters: 175000000000,
    precision: 'fp32',
    architecture: {
      layers: 96,
      hiddenSize: 12288,
      attentionHeads: 96,
      vocabularySize: 50257,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 700000, // Large model in MB
      kvCacheCoefficient: 0.156,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'A100',
        tokensPerSecond: 32,
        batchSize: 1,
        powerConsumption: 400,
      },
    ],
    metadata: {
      releaseDate: '2023-03-01',
      organization: 'OpenAI',
      license: 'Proprietary',
      tags: ['gpt', '175b'],
    },
  },
]

const testWorkloads: Workload[] = [
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    description: 'Simple chat workload',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat',
    requestPattern: 'steady',
    complexityScore: 1,
  },
  {
    id: 'complex-rag',
    name: 'Complex RAG',
    description: 'Complex RAG workload with large context',
    inputTokens: 8000,
    outputTokens: 2000,
    category: 'rag',
    requestPattern: 'burst',
    complexityScore: 5,
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Code generation with medium complexity',
    inputTokens: 1024,
    outputTokens: 1024,
    category: 'coding',
    requestPattern: 'variable',
    complexityScore: 3,
  },
]

// Known calculation benchmarks for validation (kept for future precision testing)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const knownCalculations = {
  'llama-2-7b': {
    baseVRAM: {
      expected: 16800, // 7B * 2 bytes (fp16) * 1.2 = 16,800 MB
      tolerance: 50,
    },
    kvCache: {
      sequenceLength: 2048,
      batchSize: 1,
      expected: 1073.741824, // 2 * 32 * 4096 * 2048 * 1 * 2 bytes / (1024^2) = 1073.741824 MB
      tolerance: 1,
    },
    activations: {
      sequenceLength: 2048,
      batchSize: 1,
      expected: 67.108864, // 4096 * 2048 * 1 * 2 * 4 / (1024^2) = 67.108864 MB
      tolerance: 1,
    },
  },
}

describe('Performance and Calculation Accuracy Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset performance mocks
    mockPerformance.now.mockReturnValue(0)
    mockPerformance.getEntriesByType.mockReturnValue([])

    // Setup service mocks
    const { modelService } = await import('../../src/services/modelService')
    modelService.loadModels.mockResolvedValue(testModels)
    modelService.getModelById.mockImplementation(
      async (id: string) => testModels.find(model => model.id === id) || null
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('VRAM Calculation Accuracy', () => {
    it('should calculate base VRAM requirements accurately for different model sizes', async () => {
      // Test Llama 2 7B (fp16)
      const llama7b = testModels[0]
      const expectedBaseVRAM =
        llama7b.parameters *
        PRECISION_BYTES[llama7b.precision] *
        llama7b.vramRequirements.overheadFactor

      const actualBaseVRAM = vramCalculator.calculateBaseMemory(llama7b)

      expect(actualBaseVRAM).toBeCloseTo(
        expectedBaseVRAM / (1024 * 1024), // Convert to MB
        1 // 1 decimal place tolerance
      )

      // Test GPT-3.5 (fp32) - larger model
      const gpt35 = testModels[1]
      const expectedLargeBaseVRAM =
        gpt35.parameters * PRECISION_BYTES[gpt35.precision] * gpt35.vramRequirements.overheadFactor

      const actualLargeBaseVRAM = vramCalculator.calculateBaseMemory(gpt35)

      expect(actualLargeBaseVRAM).toBeCloseTo(
        expectedLargeBaseVRAM / (1024 * 1024), // Convert to MB
        1
      )

      // Verify precision scaling works correctly
      const fp16Size = llama7b.parameters * PRECISION_BYTES.fp16
      const fp32Size = llama7b.parameters * PRECISION_BYTES.fp32

      expect(fp32Size).toBe(fp16Size * 2) // fp32 should be exactly 2x fp16
    })

    it('should calculate KV cache memory accurately for different sequence lengths', async () => {
      const llama7b = testModels[0]

      // Test different sequence lengths
      const testCases = [
        { sequenceLength: 512, batchSize: 1 },
        { sequenceLength: 2048, batchSize: 1 },
        { sequenceLength: 4096, batchSize: 1 },
        { sequenceLength: 2048, batchSize: 4 },
      ]

      testCases.forEach(({ sequenceLength, batchSize }) => {
        const kvCacheMemory = vramCalculator.calculateKVCache(llama7b, sequenceLength, batchSize)

        // Expected calculation: 2 * layers * hiddenSize * sequenceLength * batchSize * precision
        const expected =
          (2 *
            llama7b.architecture.layers *
            llama7b.architecture.hiddenSize *
            sequenceLength *
            batchSize *
            PRECISION_BYTES[llama7b.precision]) /
          (1024 * 1024) // Convert to MB

        expect(kvCacheMemory).toBeCloseTo(expected, 2)
      })
    })

    it('should calculate activation memory with correct scaling factors', async () => {
      const llama7b = testModels[0]

      // Test activation memory calculation
      const sequenceLength = 2048
      const batchSize = 1

      const activationMemory = vramCalculator.calculateActivations(
        llama7b,
        sequenceLength,
        batchSize
      )

      // Expected: hiddenSize * sequenceLength * batchSize * precision * activationMultiplier
      const expected =
        (llama7b.architecture.hiddenSize *
          sequenceLength *
          batchSize *
          PRECISION_BYTES[llama7b.precision] *
          llama7b.vramRequirements.activationMultiplier) /
        (1024 * 1024)

      expect(activationMemory).toBeCloseTo(expected, 2)
    })

    it('should calculate overhead and total VRAM correctly', async () => {
      const llama7b = testModels[0]
      const sequenceLength = 2048
      const batchSize = 1

      const baseMemory = vramCalculator.calculateBaseMemory(llama7b)
      const kvCache = vramCalculator.calculateKVCache(llama7b, sequenceLength, batchSize)
      const activations = vramCalculator.calculateActivations(llama7b, sequenceLength, batchSize)
      const overhead = vramCalculator.calculateOverhead(baseMemory, kvCache + activations)

      const totalVRAM = vramCalculator.calculateTotalVRAM(llama7b, sequenceLength, batchSize)

      // Verify individual components sum to total
      const calculatedTotal = baseMemory + kvCache + activations + overhead

      expect(totalVRAM).toBeCloseTo(calculatedTotal, 1)

      // Verify overhead is calculated correctly (10% of base + additional memory)
      const expectedOverhead = (baseMemory + kvCache + activations) * 0.1
      expect(overhead).toBeCloseTo(expectedOverhead, 1)
    })

    it('should handle edge cases in calculations without errors', async () => {
      const llama7b = testModels[0]

      // Test zero sequence length
      expect(() => {
        vramCalculator.calculateKVCache(llama7b, 0, 1)
      }).not.toThrow()

      // Test maximum sequence length
      const maxSeqLength = llama7b.architecture.maxSequenceLength
      expect(() => {
        vramCalculator.calculateKVCache(llama7b, maxSeqLength, 1)
      }).not.toThrow()

      // Test large batch size
      expect(() => {
        vramCalculator.calculateActivations(llama7b, 2048, 1000)
      }).not.toThrow()

      // Test very small model parameters (should not cause division by zero)
      const tinyModel = {
        ...llama7b,
        parameters: 1,
        architecture: {
          ...llama7b.architecture,
          layers: 1,
          hiddenSize: 1,
        },
      }

      expect(() => {
        vramCalculator.calculateTotalVRAM(tinyModel, 1, 1)
      }).not.toThrow()
    })
  })

  describe('Time-Based Simulation Accuracy', () => {
    it('should generate accurate time-series data points', async () => {
      const simulationConfig: SimulationConfig = {
        timePeriodMinutes: 60,
        concurrentUsers: 100,
        requestDistribution: 'uniform',
        samplingIntervalSeconds: 300, // 5-minute intervals
      }

      const workloadConfig = {
        model: testModels[0],
        workloadSlots: [
          { workload: testWorkloads[0], percentage: 60, isActive: true },
          { workload: testWorkloads[1], percentage: 40, isActive: true },
        ],
        config: simulationConfig,
      }

      const results = await simulationService.runSimulation(workloadConfig)

      // Verify correct number of data points
      const expectedPoints =
        (simulationConfig.timePeriodMinutes * 60) / simulationConfig.samplingIntervalSeconds + 1
      expect(results.usagePoints).toHaveLength(expectedPoints)

      // Verify timestamps are correct
      results.usagePoints.forEach((point, index) => {
        const expectedTimestamp = index * simulationConfig.samplingIntervalSeconds * 1000
        expect(point.timestamp).toBe(expectedTimestamp)
      })

      // Verify VRAM values are within reasonable bounds
      results.usagePoints.forEach(point => {
        expect(point.totalVRAM).toBeGreaterThan(0)
        expect(point.totalVRAM).toBeLessThan(1000000) // Less than 1TB (reasonable upper bound)

        // Verify breakdown components sum to total
        const { baseModel, kvCache, activations, overhead } = point.breakdown
        const calculatedTotal = baseModel + kvCache + activations + overhead

        expect(point.totalVRAM).toBeCloseTo(calculatedTotal, 1)
      })
    })

    it('should accurately model different request distribution patterns', async () => {
      const baseConfig: SimulationConfig = {
        timePeriodMinutes: 30,
        concurrentUsers: 50,
        requestDistribution: 'uniform',
        samplingIntervalSeconds: 60,
      }

      const workloadConfig = {
        model: testModels[0],
        workloadSlots: [{ workload: testWorkloads[0], percentage: 100, isActive: true }],
        config: baseConfig,
      }

      // Test uniform distribution
      const uniformResults = await simulationService.runSimulation({
        ...workloadConfig,
        config: { ...baseConfig, requestDistribution: 'uniform' },
      })

      // Test bell curve distribution
      const bellCurveResults = await simulationService.runSimulation({
        ...workloadConfig,
        config: { ...baseConfig, requestDistribution: 'bell-curve' },
      })

      // Test front-loaded distribution
      const frontLoadedResults = await simulationService.runSimulation({
        ...workloadConfig,
        config: { ...baseConfig, requestDistribution: 'front-loaded' },
      })

      // Verify different patterns produce different peak characteristics
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const uniformPeakTime = uniformResults.usagePoints.reduce((peak, point) =>
        point.totalVRAM > peak.totalVRAM ? point : peak
      ).timestamp

      const bellCurvePeakTime = bellCurveResults.usagePoints.reduce((peak, point) =>
        point.totalVRAM > peak.totalVRAM ? point : peak
      ).timestamp

      const frontLoadedPeakTime = frontLoadedResults.usagePoints.reduce((peak, point) =>
        point.totalVRAM > peak.totalVRAM ? point : peak
      ).timestamp

      // Bell curve should peak in the middle
      const simulationDuration = baseConfig.timePeriodMinutes * 60 * 1000
      expect(bellCurvePeakTime).toBeGreaterThan(simulationDuration * 0.3)
      expect(bellCurvePeakTime).toBeLessThan(simulationDuration * 0.7)

      // Front-loaded should peak early
      expect(frontLoadedPeakTime).toBeLessThan(simulationDuration * 0.3)
    })

    it('should handle concurrent user scaling correctly', async () => {
      const workloadConfig = {
        model: testModels[0],
        workloadSlots: [{ workload: testWorkloads[0], percentage: 100, isActive: true }],
      }

      // Test different concurrent user counts
      const userCounts = [10, 50, 100, 500]
      const results: SimulationResults[] = []

      for (const userCount of userCounts) {
        const config: SimulationConfig = {
          timePeriodMinutes: 10,
          concurrentUsers: userCount,
          requestDistribution: 'uniform',
          samplingIntervalSeconds: 60,
        }

        const result = await simulationService.runSimulation({
          ...workloadConfig,
          config,
        })
        results.push(result)
      }

      // Verify VRAM usage scales appropriately with user count
      for (let i = 1; i < results.length; i++) {
        const currentMaxVRAM = results[i].summary.maxVRAM
        const previousMaxVRAM = results[i - 1].summary.maxVRAM

        // Each step roughly doubles users, so VRAM should increase significantly
        expect(currentMaxVRAM).toBeGreaterThan(previousMaxVRAM)

        // But shouldn't be perfectly linear due to batching and caching effects
        const userRatio = userCounts[i] / userCounts[i - 1]
        const vramRatio = currentMaxVRAM / previousMaxVRAM

        // VRAM ratio should be between 1x and user ratio (due to efficiency gains)
        expect(vramRatio).toBeGreaterThan(1)
        expect(vramRatio).toBeLessThanOrEqual(userRatio)
      }
    })

    it('should correctly calculate GPU recommendations based on peak usage', async () => {
      const workloadConfig = {
        model: testModels[0],
        workloadSlots: [{ workload: testWorkloads[1], percentage: 100, isActive: true }], // Complex RAG workload
        config: {
          timePeriodMinutes: 60,
          concurrentUsers: 200,
          requestDistribution: 'bell-curve',
          samplingIntervalSeconds: 60,
        },
      }

      const results = await simulationService.runSimulation(workloadConfig)
      const recommendations = simulationService.calculateGPURecommendations(results.summary.maxVRAM)

      // Verify recommendations are sorted by suitability
      for (let i = 1; i < recommendations.length; i++) {
        if (recommendations[i].isRecommended && recommendations[i - 1].isRecommended) {
          expect(recommendations[i].utilizationPercentage).toBeGreaterThanOrEqual(
            recommendations[i - 1].utilizationPercentage
          )
        }
      }

      // Verify utilization calculations are correct
      recommendations.forEach(gpu => {
        const expectedUtilization = (results.summary.maxVRAM / gpu.vramCapacity) * 100
        expect(gpu.utilizationPercentage).toBeCloseTo(expectedUtilization, 1)

        // Verify recommendation logic
        if (gpu.utilizationPercentage < 80) {
          expect(gpu.isRecommended).toBe(true)
        } else if (gpu.utilizationPercentage > 95) {
          expect(gpu.isRecommended).toBe(false)
          expect(gpu.notes).toContain('Insufficient')
        }
      })
    })
  })

  describe('Performance Benchmarks', () => {
    it('should complete VRAM calculations within performance budget', async () => {
      const startTime = performance.now()
      mockPerformance.now.mockReturnValueOnce(startTime)

      const llama7b = testModels[0]
      const iterations = 1000

      // Benchmark basic calculations
      for (let i = 0; i < iterations; i++) {
        vramCalculator.calculateTotalVRAM(llama7b, 2048, 1)
      }

      const endTime = performance.now()
      mockPerformance.now.mockReturnValueOnce(endTime)

      const totalTime = endTime - startTime
      const avgTimePerCalculation = totalTime / iterations

      // Should average less than 1ms per calculation
      expect(avgTimePerCalculation).toBeLessThan(1)

      // Total time for 1000 calculations should be under 100ms
      expect(totalTime).toBeLessThan(100)
    })

    it('should handle large simulations efficiently', async () => {
      const startTime = performance.now()

      const largeSimulationConfig = {
        model: testModels[1], // Large GPT model
        workloadSlots: [
          { workload: testWorkloads[0], percentage: 30, isActive: true },
          { workload: testWorkloads[1], percentage: 40, isActive: true },
          { workload: testWorkloads[2], percentage: 30, isActive: true },
        ],
        config: {
          timePeriodMinutes: 240, // 4 hours
          concurrentUsers: 1000,
          requestDistribution: 'bell-curve',
          samplingIntervalSeconds: 60, // 240 data points
        } as SimulationConfig,
      }

      const results = await simulationService.runSimulation(largeSimulationConfig)

      const endTime = performance.now()
      const simulationTime = endTime - startTime

      // Large simulation should complete within reasonable time (< 5 seconds)
      expect(simulationTime).toBeLessThan(5000)

      // Should generate expected number of data points
      expect(results.usagePoints).toHaveLength(241) // 4 hours * 60 minutes + 1

      // Memory usage should stay reasonable
      expect(results.summary.maxVRAM).toBeGreaterThan(0)
      expect(results.summary.maxVRAM).toBeLessThan(2000000) // Less than 2TB
    })

    it('should scale performance linearly with simulation complexity', async () => {
      const baseConfig = {
        model: testModels[0],
        workloadSlots: [{ workload: testWorkloads[0], percentage: 100, isActive: true }],
      }

      const complexityLevels = [
        { timePeriodMinutes: 10, concurrentUsers: 10, label: 'simple' },
        { timePeriodMinutes: 30, concurrentUsers: 50, label: 'medium' },
        { timePeriodMinutes: 60, concurrentUsers: 100, label: 'complex' },
      ]

      const timings: Array<{ label: string; time: number }> = []

      for (const level of complexityLevels) {
        const config: SimulationConfig = {
          ...level,
          requestDistribution: 'uniform',
          samplingIntervalSeconds: 60,
        }

        const startTime = performance.now()
        await simulationService.runSimulation({ ...baseConfig, config })
        const endTime = performance.now()

        timings.push({
          label: level.label,
          time: endTime - startTime,
        })
      }

      // Verify scaling is reasonable (not exponential)
      const simpleTime = timings[0].time
      const mediumTime = timings[1].time
      const complexTime = timings[2].time

      // Medium should not be more than 5x simple
      expect(mediumTime).toBeLessThan(simpleTime * 5)

      // Complex should not be more than 10x simple
      expect(complexTime).toBeLessThan(simpleTime * 10)
    })

    it('should handle memory efficiently during long simulations', async () => {
      // Monitor memory usage patterns
      const initialMemory = process.memoryUsage()

      const longSimulationConfig = {
        model: testModels[0],
        workloadSlots: [
          { workload: testWorkloads[0], percentage: 50, isActive: true },
          { workload: testWorkloads[1], percentage: 50, isActive: true },
        ],
        config: {
          timePeriodMinutes: 120,
          concurrentUsers: 500,
          requestDistribution: 'uniform',
          samplingIntervalSeconds: 30, // High resolution = more data points
        } as SimulationConfig,
      }

      const results = await simulationService.runSimulation(longSimulationConfig)

      const finalMemory = process.memoryUsage()
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory growth should be reasonable (< 100MB for simulation)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024)

      // Should handle large dataset efficiently
      expect(results.usagePoints).toHaveLength(241) // 120 * 2 + 1

      // Garbage collection should work (force GC if available)
      if (global.gc) {
        global.gc()
        const afterGCMemory = process.memoryUsage()
        expect(afterGCMemory.heapUsed).toBeLessThan(finalMemory.heapUsed)
      }
    })
  })

  describe('Numerical Stability and Precision', () => {
    it('should maintain precision with floating-point arithmetic', async () => {
      const llama7b = testModels[0]

      // Test calculations with values that might cause precision issues
      const precisionTests = [
        { sequenceLength: 1, batchSize: 1 },
        { sequenceLength: 1337, batchSize: 7 }, // Odd numbers
        { sequenceLength: 4096, batchSize: 1024 }, // Large values
      ]

      precisionTests.forEach(({ sequenceLength, batchSize }) => {
        const kvCache1 = vramCalculator.calculateKVCache(llama7b, sequenceLength, batchSize)
        const kvCache2 = vramCalculator.calculateKVCache(llama7b, sequenceLength, batchSize)

        // Results should be exactly identical (no floating point drift)
        expect(kvCache1).toBe(kvCache2)

        // Results should not be NaN or Infinity
        expect(Number.isFinite(kvCache1)).toBe(true)
        expect(Number.isNaN(kvCache1)).toBe(false)
      })
    })

    it('should handle extremely large and small values gracefully', async () => {
      // Test with extremely large model
      const giantModel: Model = {
        ...testModels[0],
        parameters: 1000000000000, // 1 trillion parameters
        architecture: {
          ...testModels[0].architecture,
          layers: 1000,
          hiddenSize: 100000,
        },
      }

      const largeResult = vramCalculator.calculateTotalVRAM(giantModel, 1024, 1)

      // Should produce large but finite result
      expect(Number.isFinite(largeResult)).toBe(true)
      expect(largeResult).toBeGreaterThan(0)

      // Test with tiny model
      const tinyModel: Model = {
        ...testModels[0],
        parameters: 1000, // 1k parameters
        architecture: {
          ...testModels[0].architecture,
          layers: 1,
          hiddenSize: 10,
        },
      }

      const tinyResult = vramCalculator.calculateTotalVRAM(tinyModel, 10, 1)

      // Should produce small but positive result
      expect(Number.isFinite(tinyResult)).toBe(true)
      expect(tinyResult).toBeGreaterThan(0)
      expect(tinyResult).toBeLessThan(1) // Less than 1MB
    })

    it('should round results to appropriate precision for display', async () => {
      const llama7b = testModels[0]

      const totalVRAM = vramCalculator.calculateTotalVRAM(llama7b, 2048, 1)

      // Result should be rounded to reasonable number of decimal places
      const decimalPlaces = (totalVRAM.toString().split('.')[1] || '').length
      expect(decimalPlaces).toBeLessThanOrEqual(3) // At most 3 decimal places

      // Should not show floating point artifacts
      expect(totalVRAM.toString()).not.toMatch(/\d{10,}/) // No 10+ digit sequences
    })

    it('should produce consistent results across multiple runs', async () => {
      const simulationConfig = {
        model: testModels[0],
        workloadSlots: [{ workload: testWorkloads[0], percentage: 100, isActive: true }],
        config: {
          timePeriodMinutes: 30,
          concurrentUsers: 100,
          requestDistribution: 'uniform',
          samplingIntervalSeconds: 60,
        } as SimulationConfig,
      }

      // Run same simulation multiple times
      const results: SimulationResults[] = []
      for (let i = 0; i < 5; i++) {
        const result = await simulationService.runSimulation(simulationConfig)
        results.push(result)
      }

      // All runs should produce identical results
      const firstResult = results[0]
      results.slice(1).forEach(result => {
        expect(result.summary.maxVRAM).toBeCloseTo(firstResult.summary.maxVRAM, 2)
        expect(result.summary.averageVRAM).toBeCloseTo(firstResult.summary.averageVRAM, 2)
        expect(result.usagePoints).toHaveLength(firstResult.usagePoints.length)

        // Compare each data point
        result.usagePoints.forEach((point, index) => {
          const firstPoint = firstResult.usagePoints[index]
          expect(point.totalVRAM).toBeCloseTo(firstPoint.totalVRAM, 2)
          expect(point.timestamp).toBe(firstPoint.timestamp)
        })
      })
    })
  })
})
