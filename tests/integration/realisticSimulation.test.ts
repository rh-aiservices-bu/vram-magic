// VRAM Magic: Realistic Simulation Integration Tests
// Tests for end-to-end realistic user behavior simulation

import { simulateUsageOverTime, generateSimulationResult } from '../../src/services/vramCalculator'
import { UserSessionManager } from '../../src/services/userSessionManager'
import { DEFAULT_WORKLOADS } from '../../src/data/workloads'
import {
  ThinkTimeDistribution,
  UserBehaviorPattern,
  ModelPrecision,
  TimeUnit,
  RequestPattern,
  type Model,
  type WorkloadSlot,
  type SimulationPeriod,
} from '../../src/types'

describe('Realistic Simulation Integration', () => {
  const mockModel: Model = {
    id: 'test-model',
    name: 'Test Model 7B',
    description: 'Test model for simulation',
    parameters: 7000000000,
    precision: ModelPrecision.FP16,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      kvHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 14000000000, // 14GB base
      kvCacheCoefficient: 0.1,
      activationMultiplier: 1.5,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'RTX 4090',
        tokensPerSecond: 50,
        batchSize: 1,
        powerConsumption: 450,
      },
    ],
    metadata: {
      releaseDate: '2023-01-01',
      organization: 'Test Org',
      license: 'MIT',
      tags: ['test'],
    },
  }

  const createWorkloadSlots = (workloadIndex: number = 0): WorkloadSlot[] => [
    {
      id: 'slot1',
      workload: DEFAULT_WORKLOADS[workloadIndex], // Simple chat
      percentage: 100,
      isActive: true,
      order: 0,
    },
  ]

  const createSimulationPeriod = (overrides: Partial<SimulationPeriod> = {}): SimulationPeriod => ({
    duration: 1,
    timeUnit: TimeUnit.HOURS,
    totalUsers: 50,
    maxThinkTime: 30,
    thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
    userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
    requestPattern: RequestPattern.UNIFORM,
    granularity: 60,
    durationSeconds: 3600,
    precision: ModelPrecision.FP16,
    ...overrides,
  })

  describe('Complete Simulation Workflow', () => {
    test('simulation produces realistic concurrency patterns', () => {
      const workloadSlots = createWorkloadSlots()
      const simulationPeriod = createSimulationPeriod()

      const result = simulateUsageOverTime(mockModel, workloadSlots, simulationPeriod)

      // Verify derived concurrency values are set
      expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(0)
      expect(simulationPeriod.derivedAverageConcurrency).toBeGreaterThan(0)
      expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(
        simulationPeriod.derivedAverageConcurrency
      )

      // Verify realistic concurrency bounds
      expect(simulationPeriod.derivedPeakConcurrency).toBeLessThan(simulationPeriod.totalUsers)

      // Verify we have VRAM usage points
      expect(result.length).toBeGreaterThan(0)

      // Verify VRAM values are reasonable
      result.forEach(point => {
        expect(point.totalVRAM).toBeGreaterThan(0)
        expect(point.timestamp).toBeGreaterThanOrEqual(0)
        expect(point.breakdown).toBeDefined()
      })
    })

    test('simulation handles different user behavior patterns correctly', () => {
      const workloadSlots = createWorkloadSlots()

      const interactiveChatConfig = createSimulationPeriod({
        totalUsers: 100,
        maxThinkTime: 45,
        thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
        userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
      })

      const apiServiceConfig = createSimulationPeriod({
        totalUsers: 100,
        maxThinkTime: 0.1,
        thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
        userBehaviorPattern: UserBehaviorPattern.API_SERVICE,
      })

      // Run simulations
      const chatResult = simulateUsageOverTime(mockModel, workloadSlots, interactiveChatConfig)
      const apiResult = simulateUsageOverTime(mockModel, workloadSlots, apiServiceConfig)

      // API service should have higher peak concurrency due to minimal think time
      expect(apiServiceConfig.derivedPeakConcurrency).toBeGreaterThan(
        interactiveChatConfig.derivedPeakConcurrency!
      )

      // Both should produce valid results
      expect(chatResult.length).toBeGreaterThan(0)
      expect(apiResult.length).toBeGreaterThan(0)

      // API service should generally have higher VRAM usage
      const maxChatVRAM = Math.max(...chatResult.map(p => p.totalVRAM))
      const maxApiVRAM = Math.max(...apiResult.map(p => p.totalVRAM))
      expect(maxApiVRAM).toBeGreaterThanOrEqual(maxChatVRAM)
    })

    test('generateSimulationResult produces complete results with realistic data', () => {
      const workloadSlots = createWorkloadSlots()
      const simulationPeriod = createSimulationPeriod({
        totalUsers: 75,
        maxThinkTime: 20,
        userBehaviorPattern: UserBehaviorPattern.CUSTOMER_SUPPORT,
      })

      const result = generateSimulationResult(mockModel, workloadSlots, simulationPeriod)

      // Verify complete result structure
      expect(result.maxVRAM).toBeGreaterThan(0)
      expect(result.averageVRAM).toBeGreaterThan(0)
      expect(result.maxVRAM).toBeGreaterThanOrEqual(result.averageVRAM)
      expect(result.usagePoints.length).toBeGreaterThan(0)
      expect(result.calculatedAt).toBeDefined()

      // Verify recommendations exist
      expect(Array.isArray(result.recommendations)).toBe(true)

      // Verify simulation period has derived values
      expect(result.simulationPeriod?.derivedPeakConcurrency).toBeGreaterThan(0)
      expect(result.simulationPeriod?.derivedAverageConcurrency).toBeGreaterThan(0)
    })
  })

  describe('User Session Manager Integration', () => {
    test('user session manager integrates correctly with simulation', () => {
      const sessionManager = new UserSessionManager(20, 15, ThinkTimeDistribution.UNIFORM, 3)

      // Simulate a time period
      const timePoints = [0, 5, 10, 15, 20, 25, 30]
      let maxConcurrency = 0
      let totalConcurrency = 0

      timePoints.forEach(t => {
        // Complete finished requests
        sessionManager.completeFinishedRequests(t)

        // Start new requests
        const readyUsers = sessionManager.getUsersReadyToStart(t)
        readyUsers.forEach(userId => {
          sessionManager.startRequest(userId, t, { input: 100, output: 50 })
        })

        // Track concurrency
        const concurrency = sessionManager.getCurrentConcurrency(t)
        maxConcurrency = Math.max(maxConcurrency, concurrency)
        totalConcurrency += concurrency
      })

      // Verify realistic behavior
      expect(maxConcurrency).toBeGreaterThan(0)
      expect(maxConcurrency).toBeLessThanOrEqual(20) // Cannot exceed total users

      const avgConcurrency = totalConcurrency / timePoints.length
      expect(avgConcurrency).toBeGreaterThan(0)
      expect(avgConcurrency).toBeLessThanOrEqual(maxConcurrency)
    })

    test('session manager handles high-frequency API workloads', () => {
      const sessionManager = new UserSessionManager(
        100,
        0.1, // Very short think time
        ThinkTimeDistribution.EXPONENTIAL,
        1
      )

      // Fast-paced simulation
      let activeRequests = 0
      for (let t = 0; t <= 10; t += 0.5) {
        sessionManager.completeFinishedRequests(t)

        const readyUsers = sessionManager.getUsersReadyToStart(t)
        readyUsers.forEach(userId => {
          sessionManager.startRequest(userId, t, { input: 50, output: 25 })
        })

        activeRequests = Math.max(activeRequests, sessionManager.getCurrentConcurrency(t))
      }

      // Should achieve high concurrency with minimal think time
      expect(activeRequests).toBeGreaterThan(50) // Should be quite high
      expect(activeRequests).toBeLessThanOrEqual(100)
    })
  })

  describe('Workload Scaling', () => {
    test('simulation scales appropriately with different workload sizes', () => {
      const smallWorkload = createWorkloadSlots(0) // Typically smaller token counts
      const largeWorkload = createWorkloadSlots(1) // Typically larger token counts

      const simulationPeriod = createSimulationPeriod({ totalUsers: 50 })

      const smallResult = simulateUsageOverTime(mockModel, smallWorkload, { ...simulationPeriod })
      const largeResult = simulateUsageOverTime(mockModel, largeWorkload, { ...simulationPeriod })

      // Larger workloads should generally use more VRAM (if they have more tokens)
      const maxSmallVRAM = Math.max(...smallResult.map(p => p.totalVRAM))
      const maxLargeVRAM = Math.max(...largeResult.map(p => p.totalVRAM))

      // Both should produce valid results
      expect(smallResult.length).toBeGreaterThan(0)
      expect(largeResult.length).toBeGreaterThan(0)

      // VRAM should be positive for both
      expect(maxSmallVRAM).toBeGreaterThan(0)
      expect(maxLargeVRAM).toBeGreaterThan(0)
    })

    test('multiple workload slots combine correctly', () => {
      const multipleWorkloads: WorkloadSlot[] = [
        {
          id: 'slot1',
          workload: DEFAULT_WORKLOADS[0],
          percentage: 60,
          isActive: true,
          order: 0,
        },
        {
          id: 'slot2',
          workload: DEFAULT_WORKLOADS[1],
          percentage: 40,
          isActive: true,
          order: 1,
        },
      ]

      const simulationPeriod = createSimulationPeriod()
      const result = simulateUsageOverTime(mockModel, multipleWorkloads, simulationPeriod)

      // Should handle multiple workloads correctly
      expect(result.length).toBeGreaterThan(0)
      expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(0)

      // VRAM breakdown should be reasonable
      result.forEach(point => {
        expect(point.breakdown.total).toBeGreaterThan(0)
        expect(point.breakdown.baseModel).toBeGreaterThan(0)
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    test('handles large user populations efficiently', () => {
      const start = Date.now()

      const workloadSlots = createWorkloadSlots()
      const simulationPeriod = createSimulationPeriod({
        totalUsers: 500,
        maxThinkTime: 30,
        durationSeconds: 1800, // 30 minutes
      })

      const result = simulateUsageOverTime(mockModel, workloadSlots, simulationPeriod)

      const duration = Date.now() - start

      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000)

      // Should produce valid results
      expect(result.length).toBeGreaterThan(0)
      expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(0)
      expect(simulationPeriod.derivedPeakConcurrency).toBeLessThan(500)
    })

    test('handles edge case configurations', () => {
      const workloadSlots = createWorkloadSlots()

      // Single user
      const singleUserConfig = createSimulationPeriod({ totalUsers: 1 })
      const singleResult = simulateUsageOverTime(mockModel, workloadSlots, singleUserConfig)
      expect(singleResult.length).toBeGreaterThan(0)
      expect(singleUserConfig.derivedPeakConcurrency).toBeLessThanOrEqual(1)

      // Zero think time (continuous requests)
      const zeroThinkConfig = createSimulationPeriod({
        totalUsers: 10,
        maxThinkTime: 0,
        userBehaviorPattern: UserBehaviorPattern.API_SERVICE,
      })
      const zeroResult = simulateUsageOverTime(mockModel, workloadSlots, zeroThinkConfig)
      expect(zeroResult.length).toBeGreaterThan(0)
      expect(zeroThinkConfig.derivedPeakConcurrency).toBeGreaterThan(5) // Should be high

      // Very long think time (sparse requests)
      const longThinkConfig = createSimulationPeriod({
        totalUsers: 100,
        maxThinkTime: 1800, // 30 minutes
        userBehaviorPattern: UserBehaviorPattern.CONTENT_CREATION,
      })
      const longResult = simulateUsageOverTime(mockModel, workloadSlots, longThinkConfig)
      expect(longResult.length).toBeGreaterThan(0)
      expect(longThinkConfig.derivedPeakConcurrency).toBeLessThan(20) // Should be low
    })

    test('produces consistent results for same configuration', () => {
      const workloadSlots = createWorkloadSlots()
      const simulationPeriod1 = createSimulationPeriod()
      const simulationPeriod2 = createSimulationPeriod()

      const result1 = simulateUsageOverTime(mockModel, workloadSlots, simulationPeriod1)
      const result2 = simulateUsageOverTime(mockModel, workloadSlots, simulationPeriod2)

      // Results should be similar but not identical (due to randomness in think times)
      expect(result1.length).toBe(result2.length)

      // Peak concurrency should be within reasonable range
      const diff = Math.abs(
        simulationPeriod1.derivedPeakConcurrency! - simulationPeriod2.derivedPeakConcurrency!
      )
      expect(diff).toBeLessThan(simulationPeriod1.totalUsers * 0.3) // Within 30% variance
    })
  })

  describe('Backward Compatibility', () => {
    test('handles configurations without derived values gracefully', () => {
      const workloadSlots = createWorkloadSlots()
      const simulationPeriod = createSimulationPeriod()

      // Remove derived values to simulate old config
      delete simulationPeriod.derivedPeakConcurrency
      delete simulationPeriod.derivedAverageConcurrency

      const result = simulateUsageOverTime(mockModel, workloadSlots, simulationPeriod)

      // Should still work and set derived values
      expect(result.length).toBeGreaterThan(0)
      expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(0)
      expect(simulationPeriod.derivedAverageConcurrency).toBeGreaterThan(0)
    })
  })
})
