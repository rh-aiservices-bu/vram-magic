// VRAM Magic: Configuration Migration Utilities
// Handles backward compatibility for legacy simulation configurations

import type { SimulationPeriod } from '../types'
import { ThinkTimeDistribution, UserBehaviorPattern } from '../types'

/**
 * Migrate old concurrentUsers config to new totalUsers format
 */
export function migrateSimulationConfig(config: any): SimulationPeriod {
  // Handle old format with concurrentUsers
  if ('concurrentUsers' in config && !('totalUsers' in config)) {
    console.warn('Migrating deprecated concurrentUsers to totalUsers format')

    return {
      ...config,
      // Convert concurrent users to total users (estimate 3x multiplier)
      totalUsers: Math.max(config.concurrentUsers * 3, 10),
      maxThinkTime: 30, // Default think time
      thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
      userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
      // Remove old field
      concurrentUsers: undefined,
    }
  }

  // Ensure all required fields exist
  return {
    duration: config.duration || 1,
    timeUnit: config.timeUnit || 'hours',
    totalUsers: config.totalUsers || 100,
    maxThinkTime: config.maxThinkTime ?? 30,
    thinkTimeDistribution: config.thinkTimeDistribution || ThinkTimeDistribution.BELL_CURVE,
    userBehaviorPattern: config.userBehaviorPattern || UserBehaviorPattern.INTERACTIVE_CHAT,
    requestPattern: config.requestPattern || 'uniform',
    granularity: config.granularity || 60,
    durationSeconds: config.durationSeconds || 3600,
    precision: config.precision || 'fp16',
  }
}

/**
 * Check if a simulation config needs migration
 */
export function needsMigration(config: any): boolean {
  return 'concurrentUsers' in config && !('totalUsers' in config)
}

/**
 * Get migration warning message
 */
export function getMigrationWarning(config: any): string | null {
  if (needsMigration(config)) {
    return `This configuration uses the deprecated "concurrent users" format. It will be automatically converted to the new "total users with think time" format. Peak concurrency will be derived from realistic user behavior instead of being fixed.`
  }
  return null
}
