// VRAM Magic: User Session Manager Unit Tests
// Tests for individual user session tracking and management

import { UserSessionManager } from '../../src/services/userSessionManager'
import { ThinkTimeDistribution } from '../../src/types'

describe('UserSessionManager', () => {
  const defaultConfig = {
    totalUsers: 10,
    maxThinkTime: 30,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    requestDuration: 2,
  }

  describe('Initialization', () => {
    test('initializes correct number of user sessions', () => {
      const manager = new UserSessionManager(
        defaultConfig.totalUsers,
        defaultConfig.maxThinkTime,
        defaultConfig.distribution,
        defaultConfig.requestDuration
      )

      const stats = manager.getStatistics(0)
      expect(stats.totalUsers).toBe(defaultConfig.totalUsers)
      expect(stats.activeRequests).toBe(0)
      expect(stats.totalRequestsProcessed).toBe(0)
    })

    test('sets initial think times for all users', () => {
      const manager = new UserSessionManager(5, 10, ThinkTimeDistribution.UNIFORM, 1)

      // At time 0, some users should be ready (with think time 0)
      // Others should be waiting (with positive think time)
      const readyAtZero = manager.getUsersReadyToStart(0)
      const readyAtTen = manager.getUsersReadyToStart(10)

      expect(readyAtZero.length).toBeGreaterThanOrEqual(0)
      expect(readyAtTen.length).toBeGreaterThanOrEqual(readyAtZero.length)
    })
  })

  describe('Request Lifecycle', () => {
    test('can start requests for ready users', () => {
      const manager = new UserSessionManager(5, 0, ThinkTimeDistribution.UNIFORM, 2) // Zero think time

      const readyUsers = manager.getUsersReadyToStart(0)
      expect(readyUsers.length).toBe(5) // All users ready immediately

      const request = manager.startRequest(readyUsers[0], 0, { input: 100, output: 50 })
      expect(request).toMatchObject({
        userId: readyUsers[0],
        startTime: 0,
        endTime: 2,
        inputTokens: 100,
        outputTokens: 50,
      })
      expect(typeof request.requestId).toBe('string')
    })

    test('tracks active requests correctly', () => {
      const manager = new UserSessionManager(3, 0, ThinkTimeDistribution.UNIFORM, 2)

      // Start requests for all users
      const readyUsers = manager.getUsersReadyToStart(0)
      readyUsers.forEach(userId => {
        manager.startRequest(userId, 0, { input: 100, output: 50 })
      })

      // Check active requests at different times
      expect(manager.getCurrentConcurrency(0)).toBe(3)
      expect(manager.getCurrentConcurrency(1)).toBe(3) // Still processing
      expect(manager.getCurrentConcurrency(2)).toBe(0) // All finished
    })

    test('completes finished requests and frees users', () => {
      const manager = new UserSessionManager(2, 0, ThinkTimeDistribution.UNIFORM, 2)

      const readyUsers = manager.getUsersReadyToStart(0)
      manager.startRequest(readyUsers[0], 0, { input: 100, output: 50 })
      manager.startRequest(readyUsers[1], 1, { input: 100, output: 50 })

      // Complete requests at time 3
      const completed = manager.completeFinishedRequests(3)
      expect(completed).toHaveLength(2)

      // Users should be available for new requests (after think time)
      const stats = manager.getStatistics(3)
      expect(stats.activeRequests).toBe(0)
      expect(stats.totalRequestsProcessed).toBe(2)
    })

    test('handles overlapping requests correctly', () => {
      const manager = new UserSessionManager(5, 0, ThinkTimeDistribution.UNIFORM, 3)

      // Start requests at different times
      manager.startRequest(0, 0, { input: 100, output: 50 }) // Ends at 3
      manager.startRequest(1, 1, { input: 100, output: 50 }) // Ends at 4
      manager.startRequest(2, 2, { input: 100, output: 50 }) // Ends at 5

      // Check concurrency at different times
      expect(manager.getCurrentConcurrency(0)).toBe(1)
      expect(manager.getCurrentConcurrency(1)).toBe(2)
      expect(manager.getCurrentConcurrency(2)).toBe(3)
      expect(manager.getCurrentConcurrency(3)).toBe(2) // First request completed
      expect(manager.getCurrentConcurrency(4)).toBe(1) // Second request completed
      expect(manager.getCurrentConcurrency(5)).toBe(0) // All completed
    })
  })

  describe('Think Time Management', () => {
    test('users wait for think time before next request', () => {
      const manager = new UserSessionManager(1, 10, ThinkTimeDistribution.UNIFORM, 1)

      // Complete first request
      manager.startRequest(0, 0, { input: 100, output: 50 })
      manager.completeFinishedRequests(1)

      // User should not be immediately ready
      const readyImmediately = manager.getUsersReadyToStart(1)
      expect(readyImmediately).toHaveLength(0)

      // User should be ready after think time
      const readyLater = manager.getUsersReadyToStart(15) // Well after max think time
      expect(readyLater).toHaveLength(1)
    })

    test('different distributions affect user availability', () => {
      // Zero think time - all users always ready
      const managerZero = new UserSessionManager(5, 0, ThinkTimeDistribution.UNIFORM, 1)
      expect(managerZero.getUsersReadyToStart(0)).toHaveLength(5)

      // Large think time - fewer users ready initially
      const managerLarge = new UserSessionManager(5, 100, ThinkTimeDistribution.EXPONENTIAL, 1)
      const readyLarge = managerLarge.getUsersReadyToStart(0)
      expect(readyLarge.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Queue Management', () => {
    test('tracks queue length correctly', () => {
      const manager = new UserSessionManager(3, 5, ThinkTimeDistribution.UNIFORM, 2)

      // Initially some users might be queued
      const initialQueue = manager.getQueueLength(0)
      expect(initialQueue).toBeGreaterThanOrEqual(0)
      expect(initialQueue).toBeLessThanOrEqual(3)

      // After sufficient time, all users should be ready
      const laterQueue = manager.getQueueLength(10)
      expect(laterQueue).toBe(3) // All users should be ready by now
    })

    test('queue reduces as requests are started', () => {
      const manager = new UserSessionManager(3, 0, ThinkTimeDistribution.UNIFORM, 2)

      let queueLength = manager.getQueueLength(0)
      expect(queueLength).toBe(3)

      // Start one request
      manager.startRequest(0, 0, { input: 100, output: 50 })
      queueLength = manager.getQueueLength(0)
      expect(queueLength).toBe(2)

      // Start another request
      manager.startRequest(1, 0, { input: 100, output: 50 })
      queueLength = manager.getQueueLength(0)
      expect(queueLength).toBe(1)
    })
  })

  describe('Statistics and Reporting', () => {
    test('provides accurate statistics', () => {
      const manager = new UserSessionManager(5, 0, ThinkTimeDistribution.UNIFORM, 2)

      // Start some requests
      manager.startRequest(0, 0, { input: 100, output: 50 })
      manager.startRequest(1, 0, { input: 100, output: 50 })

      const stats = manager.getStatistics(1)
      expect(stats.totalUsers).toBe(5)
      expect(stats.activeRequests).toBe(2)
      expect(stats.queuedUsers).toBe(3)
      expect(stats.totalRequestsProcessed).toBe(2)
      expect(stats.averageRequestsPerUser).toBe(0.4) // 2 requests / 5 users
    })

    test('statistics update correctly over time', () => {
      const manager = new UserSessionManager(2, 0, ThinkTimeDistribution.UNIFORM, 1)

      // Initial stats
      let stats = manager.getStatistics(0)
      expect(stats.totalRequestsProcessed).toBe(0)

      // Start and complete requests
      manager.startRequest(0, 0, { input: 100, output: 50 })
      manager.startRequest(1, 0, { input: 100, output: 50 })
      manager.completeFinishedRequests(1)

      stats = manager.getStatistics(1)
      expect(stats.totalRequestsProcessed).toBe(2)
      expect(stats.averageRequestsPerUser).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    test('handles single user correctly', () => {
      const manager = new UserSessionManager(1, 10, ThinkTimeDistribution.BELL_CURVE, 2)

      const stats = manager.getStatistics(0)
      expect(stats.totalUsers).toBe(1)

      const ready = manager.getUsersReadyToStart(15) // After think time
      expect(ready.length).toBeLessThanOrEqual(1)
    })

    test('handles zero think time correctly', () => {
      const manager = new UserSessionManager(3, 0, ThinkTimeDistribution.UNIFORM, 1)

      // All users should be ready immediately
      const ready = manager.getUsersReadyToStart(0)
      expect(ready).toHaveLength(3)

      // After completing requests, users should be ready again immediately
      ready.forEach(userId => {
        manager.startRequest(userId, 0, { input: 100, output: 50 })
      })
      manager.completeFinishedRequests(1)

      const readyAgain = manager.getUsersReadyToStart(1)
      expect(readyAgain).toHaveLength(3)
    })

    test('handles large think times correctly', () => {
      const manager = new UserSessionManager(5, 1000, ThinkTimeDistribution.EXPONENTIAL, 1)

      // Most users should not be ready immediately
      const ready = manager.getUsersReadyToStart(0)
      expect(ready.length).toBeLessThan(5)

      // Eventually more users should become ready
      const readyLater = manager.getUsersReadyToStart(2000)
      expect(readyLater.length).toBeGreaterThanOrEqual(ready.length)
    })

    test('maintains consistent request IDs', () => {
      const manager = new UserSessionManager(2, 0, ThinkTimeDistribution.UNIFORM, 1)

      const request1 = manager.startRequest(0, 0, { input: 100, output: 50 })
      const request2 = manager.startRequest(1, 0, { input: 100, output: 50 })

      expect(request1.requestId).not.toBe(request2.requestId)
      expect(request1.requestId).toContain('req_0_')
      expect(request2.requestId).toContain('req_1_')
    })
  })

  describe('Performance Characteristics', () => {
    test('handles larger user populations efficiently', () => {
      const start = Date.now()
      const manager = new UserSessionManager(1000, 30, ThinkTimeDistribution.BELL_CURVE, 2)

      // Basic operations should complete quickly
      manager.getUsersReadyToStart(0)
      manager.getStatistics(0)
      manager.getQueueLength(0)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(100) // Should complete in under 100ms
    })

    test('efficiently processes many requests', () => {
      const manager = new UserSessionManager(100, 0, ThinkTimeDistribution.UNIFORM, 1)

      const start = Date.now()

      // Start many requests
      const readyUsers = manager.getUsersReadyToStart(0)
      readyUsers.forEach(userId => {
        manager.startRequest(userId, 0, { input: 100, output: 50 })
      })

      // Complete them
      manager.completeFinishedRequests(1)

      const duration = Date.now() - start
      expect(duration).toBeLessThan(50) // Should be efficient
    })
  })
})
