// VRAM Magic: Think Time Generator Unit Tests
// Tests for realistic think time generation using statistical distributions

import {
  generateThinkTime,
  generateThinkTimes,
  estimatePeakConcurrency,
} from '../../src/services/thinkTimeGenerator'
import { ThinkTimeDistribution } from '../../src/types'

describe('Think Time Generator', () => {
  describe('generateThinkTime', () => {
    test('bell curve distribution produces values within range', () => {
      const maxThinkTime = 60
      const samples = Array.from({ length: 1000 }, () =>
        generateThinkTime(maxThinkTime, ThinkTimeDistribution.BELL_CURVE)
      )

      samples.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(0)
        expect(time).toBeLessThanOrEqual(maxThinkTime)
      })

      // Check distribution properties
      const mean = samples.reduce((sum, t) => sum + t, 0) / samples.length
      expect(mean).toBeCloseTo(maxThinkTime / 2, 0) // Mean around middle
    })

    test('exponential distribution favors shorter times', () => {
      const maxThinkTime = 60
      const samples = Array.from({ length: 1000 }, () =>
        generateThinkTime(maxThinkTime, ThinkTimeDistribution.EXPONENTIAL)
      )

      const shortTimes = samples.filter(t => t < maxThinkTime / 3).length
      const longTimes = samples.filter(t => t > (2 * maxThinkTime) / 3).length

      expect(shortTimes).toBeGreaterThan(longTimes) // More short than long
    })

    test('uniform distribution spreads evenly', () => {
      const maxThinkTime = 60
      const samples = Array.from({ length: 1000 }, () =>
        generateThinkTime(maxThinkTime, ThinkTimeDistribution.UNIFORM)
      )

      // Divide into 3 equal buckets
      const bucket1 = samples.filter(t => t < maxThinkTime / 3).length
      const bucket2 = samples.filter(
        t => t >= maxThinkTime / 3 && t < (2 * maxThinkTime) / 3
      ).length
      const bucket3 = samples.filter(t => t >= (2 * maxThinkTime) / 3).length

      // Should be roughly equal (within 20% tolerance)
      const tolerance = samples.length * 0.2
      expect(Math.abs(bucket1 - bucket2)).toBeLessThan(tolerance)
      expect(Math.abs(bucket2 - bucket3)).toBeLessThan(tolerance)
    })

    test('lognormal distribution produces realistic human behavior', () => {
      const maxThinkTime = 60
      const samples = Array.from({ length: 1000 }, () =>
        generateThinkTime(maxThinkTime, ThinkTimeDistribution.LOGNORMAL)
      )

      samples.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(0)
        expect(time).toBeLessThanOrEqual(maxThinkTime)
      })

      // Should have many short times and few long ones (human-like)
      const veryShortTimes = samples.filter(t => t < maxThinkTime / 6).length
      const veryLongTimes = samples.filter(t => t > (5 * maxThinkTime) / 6).length
      expect(veryShortTimes).toBeGreaterThan(veryLongTimes)
    })

    test('zero max think time returns zero', () => {
      const result = generateThinkTime(0, ThinkTimeDistribution.BELL_CURVE)
      expect(result).toBe(0)
    })

    test('negative max think time returns zero', () => {
      const result = generateThinkTime(-10, ThinkTimeDistribution.BELL_CURVE)
      expect(result).toBe(0)
    })

    test('all distributions handle edge cases correctly', () => {
      const distributions = Object.values(ThinkTimeDistribution)
      const maxThinkTime = 30

      distributions.forEach(distribution => {
        const result = generateThinkTime(maxThinkTime, distribution)
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThanOrEqual(maxThinkTime)
        expect(typeof result).toBe('number')
        expect(Number.isFinite(result)).toBe(true)
      })
    })
  })

  describe('generateThinkTimes', () => {
    test('generates correct number of think times', () => {
      const count = 50
      const maxThinkTime = 30
      const result = generateThinkTimes(count, maxThinkTime, ThinkTimeDistribution.BELL_CURVE)

      expect(result).toHaveLength(count)
      result.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(0)
        expect(time).toBeLessThanOrEqual(maxThinkTime)
      })
    })

    test('handles zero count correctly', () => {
      const result = generateThinkTimes(0, 30, ThinkTimeDistribution.BELL_CURVE)
      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    test('generates different values for multiple calls', () => {
      const result1 = generateThinkTimes(10, 30, ThinkTimeDistribution.UNIFORM)
      const result2 = generateThinkTimes(10, 30, ThinkTimeDistribution.UNIFORM)

      // Should not be identical (very low probability)
      expect(result1).not.toEqual(result2)
    })
  })

  describe('estimatePeakConcurrency', () => {
    test('estimates reasonable concurrency for interactive chat', () => {
      const peak = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)
      expect(peak).toBeGreaterThan(5) // Some users concurrent
      expect(peak).toBeLessThan(100) // Not all users
      expect(Number.isInteger(peak)).toBe(false) // Should be a calculated value
    })

    test('API service with short think time has higher concurrency', () => {
      const apiPeak = estimatePeakConcurrency(100, 0.1, 2, ThinkTimeDistribution.EXPONENTIAL)
      const chatPeak = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)

      expect(apiPeak).toBeGreaterThan(chatPeak)
    })

    test('longer request duration increases concurrency', () => {
      const shortDuration = estimatePeakConcurrency(100, 30, 1, ThinkTimeDistribution.BELL_CURVE)
      const longDuration = estimatePeakConcurrency(100, 30, 10, ThinkTimeDistribution.BELL_CURVE)

      expect(longDuration).toBeGreaterThan(shortDuration)
    })

    test('more users can lead to higher peak concurrency', () => {
      const fewer = estimatePeakConcurrency(50, 30, 2, ThinkTimeDistribution.BELL_CURVE)
      const more = estimatePeakConcurrency(200, 30, 2, ThinkTimeDistribution.BELL_CURVE)

      expect(more).toBeGreaterThan(fewer)
    })

    test('peak concurrency never exceeds total users', () => {
      const totalUsers = 50
      const peak = estimatePeakConcurrency(totalUsers, 1, 60, ThinkTimeDistribution.EXPONENTIAL)

      expect(peak).toBeLessThanOrEqual(totalUsers)
    })

    test('handles edge cases correctly', () => {
      // Zero users
      expect(estimatePeakConcurrency(0, 30, 2, ThinkTimeDistribution.BELL_CURVE)).toBe(0)

      // Zero think time (API-like)
      const zeroThink = estimatePeakConcurrency(100, 0, 2, ThinkTimeDistribution.EXPONENTIAL)
      expect(zeroThink).toBeGreaterThan(0)
      expect(zeroThink).toBeLessThanOrEqual(100)

      // Very long think time
      const longThink = estimatePeakConcurrency(100, 3600, 2, ThinkTimeDistribution.BELL_CURVE)
      expect(longThink).toBeGreaterThan(0)
      expect(longThink).toBeLessThan(10) // Should be very low
    })

    test('returns consistent results for same inputs', () => {
      const result1 = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)
      const result2 = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)

      // Should be approximately the same (using sampling)
      expect(Math.abs(result1 - result2)).toBeLessThan(5) // Within 5 users
    })
  })

  describe('Distribution Characteristics', () => {
    test('each distribution has distinct characteristics', () => {
      const maxThinkTime = 60
      const sampleSize = 1000

      const bellCurve = generateThinkTimes(
        sampleSize,
        maxThinkTime,
        ThinkTimeDistribution.BELL_CURVE
      )
      const exponential = generateThinkTimes(
        sampleSize,
        maxThinkTime,
        ThinkTimeDistribution.EXPONENTIAL
      )
      const uniform = generateThinkTimes(sampleSize, maxThinkTime, ThinkTimeDistribution.UNIFORM)

      const bellMean = bellCurve.reduce((sum, t) => sum + t, 0) / sampleSize
      const expMean = exponential.reduce((sum, t) => sum + t, 0) / sampleSize
      const uniformMean = uniform.reduce((sum, t) => sum + t, 0) / sampleSize

      // Bell curve should have mean around middle
      expect(bellMean).toBeCloseTo(maxThinkTime / 2, 0)

      // Exponential should have lower mean (more short times)
      expect(expMean).toBeLessThan(bellMean)

      // Uniform should have mean exactly at middle
      expect(uniformMean).toBeCloseTo(maxThinkTime / 2, 0)
    })
  })
})
