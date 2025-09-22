// VRAM Magic: Think Time Generator Service
// Generates realistic think times using statistical distributions

import { ThinkTimeDistribution } from '../types'

/**
 * Generate think time based on distribution pattern
 * @param maxThinkTime Maximum think time in seconds
 * @param distribution Distribution pattern to use
 * @returns Think time in seconds
 */
export function generateThinkTime(
  maxThinkTime: number,
  distribution: ThinkTimeDistribution
): number {
  if (maxThinkTime <= 0) return 0

  switch (distribution) {
    case ThinkTimeDistribution.BELL_CURVE: {
      // Normal distribution using Box-Muller transform
      const u1 = Math.random() || 0.01
      const u2 = Math.random()
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

      // Scale to 0-maxThinkTime range (mean at 50%, stddev covers 99.7% within range)
      const mean = maxThinkTime / 2
      const stdDev = maxThinkTime / 6
      const thinkTime = mean + z0 * stdDev

      return Math.max(0, Math.min(maxThinkTime, thinkTime))
    }

    case ThinkTimeDistribution.EXPONENTIAL: {
      // Exponential distribution (many short delays, few long ones)
      const lambda = 3 / maxThinkTime // Rate parameter
      const uniform = Math.random()
      const thinkTime = -Math.log(1 - uniform) / lambda

      return Math.min(maxThinkTime, thinkTime)
    }

    case ThinkTimeDistribution.UNIFORM: {
      // Uniform distribution (equal probability for all values)
      return Math.random() * maxThinkTime
    }

    case ThinkTimeDistribution.POISSON: {
      // Modified Poisson for discrete-like behavior
      const lambda = maxThinkTime / 4
      let L = Math.exp(-lambda)
      let k = 0
      let p = 1

      do {
        k++
        p *= Math.random()
      } while (p > L)

      const thinkTime = (k - 1) * (maxThinkTime / 10)
      return Math.min(maxThinkTime, thinkTime)
    }

    case ThinkTimeDistribution.LOGNORMAL: {
      // Log-normal distribution (realistic for human behavior)
      const u1 = Math.random() || 0.01
      const u2 = Math.random()
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

      // Parameters for log-normal to fit 0-maxThinkTime range
      const mu = Math.log(maxThinkTime / 3) // Median at 1/3 of max
      const sigma = 0.8 // Shape parameter
      const thinkTime = Math.exp(mu + sigma * z0)

      return Math.min(maxThinkTime, Math.max(0, thinkTime))
    }

    default:
      return Math.random() * maxThinkTime
  }
}

/**
 * Generate array of think times for multiple users
 */
export function generateThinkTimes(
  count: number,
  maxThinkTime: number,
  distribution: ThinkTimeDistribution
): number[] {
  return Array.from({ length: count }, () => generateThinkTime(maxThinkTime, distribution))
}

/**
 * Estimate peak concurrency for preview
 */
export function estimatePeakConcurrency(
  totalUsers: number,
  maxThinkTime: number,
  requestDuration: number,
  distribution: ThinkTimeDistribution
): number {
  // Generate sample think times
  const sampleSize = Math.min(1000, totalUsers)
  const thinkTimes = generateThinkTimes(sampleSize, maxThinkTime, distribution)
  const avgThinkTime = thinkTimes.reduce((sum, t) => sum + t, 0) / sampleSize

  // Estimate steady-state concurrency using queuing theory
  const interArrivalTime = avgThinkTime + requestDuration
  const utilization = requestDuration / interArrivalTime
  const estimatedConcurrency = Math.min(totalUsers, totalUsers * utilization)

  // Account for initial burst (all users start together)
  const burstConcurrency = Math.min(totalUsers, totalUsers * 0.8) // 80% might start quickly

  return Math.max(estimatedConcurrency, burstConcurrency)
}
