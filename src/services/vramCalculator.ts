// VRAM Magic: VRAM Calculator Service
// Implements core VRAM calculation formulas and simulation algorithms

import type {
  Model,
  VRAMBreakdown,
  VRAMUsagePoint,
  WorkloadSlot,
  SimulationPeriod,
  SimulationResults,
} from '../types'
import { ModelPrecision, TimePattern, RequestDistribution } from '../types'
import { PRECISION_BYTES, VRAM_CALCULATION } from '../constants'

// ============================================================================
// Core VRAM Calculation Functions
// ============================================================================

/**
 * Calculate base model memory requirements
 * Formula: Parameters × Precision × 1.2 (overhead factor)
 * @param model - Model configuration
 * @param precision - Memory precision (FP32, FP16, INT8, INT4)
 * @returns Base memory in bytes
 */
export function calculateBaseMemory(model: Model, precision: ModelPrecision): number {
  const precisionBytes = PRECISION_BYTES[precision]
  const baseMemory = model.parameters * precisionBytes * VRAM_CALCULATION.MODEL_OVERHEAD_FACTOR
  return Math.ceil(baseMemory)
}

/**
 * Calculate KV-Cache memory requirements
 * Formula: 2 × Layers × Hidden_Size × Seq_Len × Batch × Precision
 * @param model - Model configuration
 * @param sequenceLength - Input sequence length
 * @param batchSize - Batch size
 * @param precision - Memory precision
 * @returns KV-Cache memory in bytes
 */
export function calculateKVCache(
  model: Model,
  sequenceLength: number,
  batchSize: number,
  precision: ModelPrecision
): number {
  const precisionBytes = PRECISION_BYTES[precision]
  const kvCache =
    2 *
    model.architecture.layers *
    model.architecture.hiddenSize *
    sequenceLength *
    batchSize *
    precisionBytes
  return Math.ceil(kvCache)
}

/**
 * Calculate activation memory requirements
 * Formula: Hidden_Size × Seq_Len × Batch × Precision × 4
 * @param model - Model configuration
 * @param sequenceLength - Input sequence length
 * @param batchSize - Batch size
 * @param precision - Memory precision
 * @returns Activation memory in bytes
 */
export function calculateActivations(
  model: Model,
  sequenceLength: number,
  batchSize: number,
  precision: ModelPrecision
): number {
  const precisionBytes = PRECISION_BYTES[precision]
  const activations =
    model.architecture.hiddenSize * sequenceLength * batchSize * precisionBytes * 4
  return Math.ceil(activations)
}

/**
 * Calculate total VRAM requirements with breakdown
 * @param model - Model configuration
 * @param sequenceLength - Input sequence length
 * @param batchSize - Batch size
 * @param precision - Memory precision
 * @returns Complete VRAM breakdown
 */
export function calculateTotalVRAM(
  model: Model,
  sequenceLength: number,
  batchSize: number,
  precision: ModelPrecision
): VRAMBreakdown {
  const baseModel = calculateBaseMemory(model, precision)
  const kvCache = calculateKVCache(model, sequenceLength, batchSize, precision)
  const activations = calculateActivations(model, sequenceLength, batchSize, precision)

  // Calculate system overhead (10% of model + KV cache)
  const overhead = Math.ceil((baseModel + kvCache) * 0.1)

  const total = baseModel + kvCache + activations + overhead

  return {
    baseModel,
    kvCache,
    activations,
    overhead,
    total,
    workloadBreakdown: [],
  }
}

/**
 * Calculate VRAM for a specific workload configuration
 * @param model - Model configuration
 * @param totalInputTokens - Total input tokens across all workloads
 * @param totalOutputTokens - Total output tokens across all workloads
 * @param concurrentUsers - Number of concurrent users
 * @param precision - Memory precision
 * @returns VRAM breakdown for the workload
 */
export function calculateWorkloadVRAM(
  model: Model,
  totalInputTokens: number,
  totalOutputTokens: number,
  concurrentUsers: number,
  precision: ModelPrecision
): VRAMBreakdown {
  // Calculate effective sequence length (input + output tokens)
  const sequenceLength = Math.min(
    totalInputTokens + totalOutputTokens,
    model.architecture.maxSequenceLength
  )

  // Batch size based on concurrent users (with reasonable limits)
  const batchSize = Math.min(concurrentUsers, 128) // Cap at 128 for memory efficiency

  return calculateTotalVRAM(model, sequenceLength, batchSize, precision)
}

/**
 * Convert bytes to GB for display
 * @param bytes - Memory in bytes
 * @returns Memory in GB rounded to 2 decimal places
 */
export function bytesToGB(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 100) / 100
}

/**
 * Convert GB to bytes
 * @param gb - Memory in GB
 * @returns Memory in bytes
 */
export function gbToBytes(gb: number): number {
  return Math.ceil(gb * 1024 ** 3)
}

/**
 * Get optimal precision for a given model and VRAM constraint
 * @param model - Model configuration
 * @param maxVRAMGB - Maximum available VRAM in GB
 * @param sequenceLength - Target sequence length
 * @param batchSize - Target batch size
 * @returns Recommended precision or null if model won't fit
 */
export function getOptimalPrecision(
  model: Model,
  maxVRAMGB: number,
  sequenceLength: number = 2048,
  batchSize: number = 1
): ModelPrecision | null {
  const maxVRAMBytes = gbToBytes(maxVRAMGB)
  const precisions: ModelPrecision[] = [
    ModelPrecision.INT4,
    ModelPrecision.INT8,
    ModelPrecision.FP16,
    ModelPrecision.FP32,
  ]

  for (const precision of precisions) {
    const vramBreakdown = calculateTotalVRAM(model, sequenceLength, batchSize, precision)
    if (vramBreakdown.total <= maxVRAMBytes) {
      return precision
    }
  }

  return null // Model won't fit even with INT4
}

// ============================================================================
// Time-Based Simulation Functions
// ============================================================================

// Import RequestPattern from types instead of defining our own
import { RequestPattern } from '../types'

/**
 * Generate request timestamps based on distribution pattern
 * @param totalRequests - Total number of requests to generate
 * @param durationSeconds - Simulation duration in seconds
 * @param distribution - Request distribution pattern
 * @returns Array of timestamps when requests start
 */
export function generateRequestTimestamps(
  totalRequests: number,
  durationSeconds: number,
  distribution: RequestPattern
): number[] {
  const timestamps: number[] = []

  for (let i = 0; i < totalRequests; i++) {
    let timestamp: number

    switch (distribution) {
      case RequestPattern.UNIFORM: {
        timestamp = (i / totalRequests) * durationSeconds
        break
      }

      case RequestPattern.FRONT_LOADED: {
        // More requests in first 30% of time period
        const frontRatio = i / totalRequests
        timestamp =
          frontRatio < 0.7
            ? (frontRatio / 0.7) * (durationSeconds * 0.3)
            : durationSeconds * 0.3 + ((frontRatio - 0.7) / 0.3) * (durationSeconds * 0.7)
        break
      }

      case RequestPattern.BACK_LOADED: {
        // More requests in last 30% of time period
        const backRatio = i / totalRequests
        timestamp =
          backRatio < 0.3
            ? (backRatio / 0.3) * (durationSeconds * 0.7)
            : durationSeconds * 0.7 + ((backRatio - 0.3) / 0.7) * (durationSeconds * 0.3)
        break
      }

      case RequestPattern.BELL_CURVE: {
        // Normal distribution centered around middle
        const normalRatio = i / totalRequests
        const bellFactor = Math.sin(normalRatio * Math.PI)
        timestamp = bellFactor * durationSeconds
        break
      }

      case RequestPattern.STEADY: {
        // Steady evenly spaced requests (same as UNIFORM)
        timestamp = (i / totalRequests) * durationSeconds
        break
      }

      case RequestPattern.BURST: {
        // Requests in bursts with quiet periods
        const burstSize = Math.ceil(totalRequests / 4) // 4 bursts
        const burstIndex = Math.floor(i / burstSize)
        const indexInBurst = i % burstSize
        const burstDuration = durationSeconds * 0.1 // Each burst takes 10% of time
        const quietPeriod = durationSeconds * 0.225 // 22.5% quiet between bursts

        timestamp =
          burstIndex * (burstDuration + quietPeriod) + (indexInBurst / burstSize) * burstDuration
        break
      }

      case RequestPattern.VARIABLE: {
        // Random variable timing with some clustering
        const baseTime = (i / totalRequests) * durationSeconds
        const variance = durationSeconds * 0.1 // 10% variance
        const randomFactor = (Math.random() - 0.5) * 2 // -1 to 1
        timestamp = Math.max(0, baseTime + randomFactor * variance)
        break
      }

      default: {
        timestamp = (i / totalRequests) * durationSeconds
        break
      }
    }

    timestamps.push(Math.floor(timestamp))
  }

  return timestamps.sort((a, b) => a - b)
}

/**
 * Apply time pattern multiplier to request load
 * @param timestamp - Current timestamp in seconds
 * @param baseMultiplier - Base load multiplier
 * @param pattern - Time pattern to apply
 * @returns Modified multiplier based on time pattern
 */
export function applyTimePattern(
  timestamp: number,
  baseMultiplier: number,
  pattern: TimePattern
): number {
  switch (pattern) {
    case TimePattern.STEADY:
    case TimePattern.ALWAYS_ON:
      return baseMultiplier

    case TimePattern.BUSINESS_HOURS: {
      // 9am-5pm peak, low overnight
      const hour = (timestamp / 3600) % 24
      if (hour >= 9 && hour <= 17) {
        return baseMultiplier * 1.5
      } else if (hour >= 22 || hour <= 6) {
        return baseMultiplier * 0.3
      }
      return baseMultiplier
    }

    case TimePattern.EXTENDED_HOURS: {
      // 7am-9pm extended hours, very low overnight
      const hour = (timestamp / 3600) % 24
      if (hour >= 7 && hour <= 21) {
        return baseMultiplier * 1.2
      } else {
        return baseMultiplier * 0.2
      }
    }

    case TimePattern.CREATIVE_HOURS: {
      // Peak in evening hours, moderate during day
      const hour = (timestamp / 3600) % 24
      if (hour >= 18 && hour <= 23) {
        return baseMultiplier * 1.8
      } else if (hour >= 9 && hour <= 17) {
        return baseMultiplier * 1.1
      } else {
        return baseMultiplier * 0.4
      }
    }

    case TimePattern.TRADING_HOURS: {
      // Market hours pattern (9:30am-4pm EST)
      const hour = (timestamp / 3600) % 24
      if (hour >= 9.5 && hour <= 16) {
        return baseMultiplier * 2.0
      } else if (hour >= 6 && hour <= 9.5) {
        return baseMultiplier * 1.3 // Pre-market
      } else if (hour >= 16 && hour <= 20) {
        return baseMultiplier * 0.8 // After-market
      } else {
        return baseMultiplier * 0.1
      }
    }

    case TimePattern.PEAK_SHOPPING: {
      // E-commerce peak patterns
      const hour = (timestamp / 3600) % 24
      if (hour >= 19 && hour <= 22) {
        return baseMultiplier * 2.2 // Evening shopping peak
      } else if (hour >= 12 && hour <= 14) {
        return baseMultiplier * 1.4 // Lunch shopping
      } else if (hour >= 10 && hour <= 18) {
        return baseMultiplier * 1.1 // Day shopping
      } else {
        return baseMultiplier * 0.3
      }
    }

    case TimePattern.RESEARCH_HOURS: {
      // Research/academic pattern
      const hour = (timestamp / 3600) % 24
      if (hour >= 14 && hour <= 18) {
        return baseMultiplier * 1.6 // Afternoon research peak
      } else if (hour >= 9 && hour <= 12) {
        return baseMultiplier * 1.3 // Morning research
      } else if (hour >= 20 && hour <= 23) {
        return baseMultiplier * 1.1 // Evening research
      } else {
        return baseMultiplier * 0.2
      }
    }

    case TimePattern.BURSTY: {
      // Random bursts with quiet periods
      const cyclePeriod = 3600 // 1 hour cycles
      const cycleTime = timestamp % cyclePeriod
      const burstStart = Math.random() * cyclePeriod
      const burstDuration = 300 // 5 minute bursts

      if (cycleTime >= burstStart && cycleTime <= burstStart + burstDuration) {
        return baseMultiplier * 3.0
      } else {
        return baseMultiplier * 0.2
      }
    }

    case TimePattern.VIRAL_RESPONSE: {
      // Exponential growth pattern
      const growthFactor = Math.exp(timestamp / 3600) // Exponential over hours
      return Math.min(baseMultiplier * growthFactor, baseMultiplier * 10) // Cap at 10x
    }

    case TimePattern.PROJECT_BASED: {
      // Cyclical project patterns
      const projectCycle = 7 * 24 * 3600 // Weekly cycles
      const weekTime = (timestamp % projectCycle) / projectCycle

      if (weekTime < 0.6) {
        // Weekdays
        return baseMultiplier * 1.4
      } else {
        // Weekends
        return baseMultiplier * 0.3
      }
    }

    case TimePattern.RESEARCH_CYCLES: {
      // Research deadline cycles (monthly)
      const monthCycle = 30 * 24 * 3600 // 30-day cycles
      const monthProgress = (timestamp % monthCycle) / monthCycle

      if (monthProgress > 0.8) {
        // Last 20% of month (deadline crunch)
        return baseMultiplier * 2.5
      } else if (monthProgress < 0.2) {
        // First 20% of month (planning)
        return baseMultiplier * 0.7
      } else {
        // Middle of month (steady work)
        return baseMultiplier * 1.2
      }
    }

    default:
      return baseMultiplier
  }
}

/**
 * Apply request distribution pattern to modify base load
 * @param timestamp - Current timestamp in seconds
 * @param baseLoad - Base request load
 * @param pattern - Request distribution pattern
 * @param totalDuration - Total simulation duration
 * @returns Modified load based on distribution pattern
 */
export function applyRequestDistribution(
  timestamp: number,
  baseLoad: number,
  pattern: RequestDistribution,
  totalDuration: number
): number {
  const progress = timestamp / totalDuration // 0 to 1

  switch (pattern) {
    case RequestDistribution.NORMAL:
      return baseLoad

    case RequestDistribution.BURSTY: {
      // Random bursts throughout period
      const burstFactor = Math.sin(timestamp * 0.1) > 0.7 ? 3.0 : 0.5
      return baseLoad * burstFactor
    }

    case RequestDistribution.POISSON: {
      // Poisson distribution approximation
      const lambda = 2 // Average rate
      const poissonFactor =
        (Math.exp(-lambda) * Math.pow(lambda, Math.floor(timestamp % 10))) /
        Math.max(1, Math.floor(timestamp % 10))
      return baseLoad * (1 + poissonFactor)
    }

    case RequestDistribution.CREATIVE_BURST: {
      // Creative workflows with inspiration bursts
      const burstChance = Math.sin(progress * Math.PI * 4) > 0.8 ? 4.0 : 0.8
      return baseLoad * burstChance
    }

    case RequestDistribution.GLOBAL_ZONES: {
      // Global timezone distribution (3 peaks for major regions)
      const zoneFactor =
        Math.sin(progress * 2 * Math.PI) * 0.5 + // Americas
        Math.sin(progress * 2 * Math.PI + Math.PI / 3) * 0.3 + // Europe/Africa
        Math.sin(progress * 2 * Math.PI + (2 * Math.PI) / 3) * 0.2 // Asia/Pacific
      return baseLoad * (1 + Math.abs(zoneFactor))
    }

    case RequestDistribution.HIGH_FREQUENCY: {
      // High frequency trading/analysis pattern
      const hftFactor = Math.cos(timestamp * 0.5) > 0.5 ? 2.5 : 0.3
      return baseLoad * hftFactor
    }

    case RequestDistribution.EXTREME_BURST: {
      // Extreme bursts with very quiet periods
      const burstProbability = 0.1 // 10% chance of burst
      const randomValue = (Math.sin(timestamp * 0.3) + 1) / 2 // 0 to 1
      return randomValue < burstProbability ? baseLoad * 10 : baseLoad * 0.1
    }

    case RequestDistribution.CONTENT_SURGE: {
      // Content creation surges (viral content patterns)
      const surgeFactor =
        Math.pow(progress, 2) * 3 + // Growing interest
        Math.sin(progress * Math.PI * 8) * 1.5 // Viral spikes
      return baseLoad * Math.max(0.2, surgeFactor)
    }

    case RequestDistribution.DOCUMENT_HEAVY: {
      // Document processing with batch uploads
      const cycleProgress = (timestamp % 1800) / 1800
      const batchFactor = cycleProgress < 0.3 ? 3.0 : 0.5 // Heavy processing, then quiet
      return baseLoad * batchFactor
    }

    case RequestDistribution.RESEARCH_PATTERN: {
      // Research query patterns (morning analysis, afternoon iteration)
      const hour = (timestamp / 3600) % 24
      if (hour >= 9 && hour <= 11) {
        return baseLoad * 2.0 // Morning research spike
      } else if (hour >= 14 && hour <= 17) {
        return baseLoad * 1.5 // Afternoon analysis
      } else if (hour >= 20 && hour <= 22) {
        return baseLoad * 1.2 // Evening review
      } else {
        return baseLoad * 0.4
      }
    }

    case RequestDistribution.COMPLEX_MIXED: {
      // Complex mixed pattern combining multiple factors
      const timeFactor = Math.sin(progress * 2 * Math.PI) * 0.5 + 1
      const burstFactor = Math.random() > 0.8 ? 2.0 : 1.0
      const cycleFactor = Math.cos(timestamp * 0.1) * 0.3 + 1
      return baseLoad * timeFactor * burstFactor * cycleFactor
    }

    case RequestDistribution.INTELLIGENCE_PATTERN: {
      // AI/ML inference patterns with batch processing
      const batchInterval = 600 // 10-minute batch cycles
      const batchPhase = (timestamp % batchInterval) / batchInterval
      if (batchPhase < 0.2) {
        return baseLoad * 4.0 // Heavy batch processing
      } else if (batchPhase < 0.4) {
        return baseLoad * 2.0 // Processing results
      } else {
        return baseLoad * 0.5 // Quiet preparation
      }
    }

    case RequestDistribution.LEGAL_PATTERN: {
      // Legal document analysis patterns
      const businessDay = Math.floor(timestamp / (24 * 3600)) % 7
      const hour = (timestamp / 3600) % 24

      if (businessDay >= 5) return baseLoad * 0.2 // Weekend

      if (hour >= 9 && hour <= 18) {
        return baseLoad * 1.8 // Business hours
      } else if (hour >= 19 && hour <= 23) {
        return baseLoad * 1.2 // Evening preparation
      } else {
        return baseLoad * 0.1
      }
    }

    default:
      return baseLoad
  }
}

/**
 * Calculate concurrent users at a given timestamp
 * @param timestamp - Current timestamp in seconds
 * @param requestTimestamps - Array of request start times
 * @param averageRequestDuration - Average duration of each request in seconds
 * @returns Number of concurrent users at timestamp
 */
export function calculateConcurrentUsers(
  timestamp: number,
  requestTimestamps: number[],
  averageRequestDuration: number
): number {
  let concurrent = 0

  for (const requestStart of requestTimestamps) {
    const requestEnd = requestStart + averageRequestDuration
    if (requestStart <= timestamp && timestamp < requestEnd) {
      concurrent++
    }
  }

  return concurrent
}

/**
 * Simulate VRAM usage over time
 * @param model - Model configuration
 * @param workloadSlots - Configured workload slots
 * @param simulationPeriod - Simulation time period and parameters
 * @returns Array of VRAM usage points over time
 */
export function simulateUsageOverTime(
  model: Model,
  workloadSlots: WorkloadSlot[],
  simulationPeriod: SimulationPeriod
): VRAMUsagePoint[] {
  const activeSlots = workloadSlots.filter(slot => slot.isActive && slot.workload)
  if (activeSlots.length === 0) {
    return []
  }

  // Calculate total requests and average duration
  const totalInputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload!.inputTokens * slot.percentage) / 100,
    0
  )
  const totalOutputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload!.outputTokens * slot.percentage) / 100,
    0
  )

  // Estimate average request duration (simplified: ~10ms per output token)
  const averageRequestDuration = Math.max(1, Math.floor(totalOutputTokens * 0.01))

  // Calculate total requests over simulation period
  const requestsPerSecond = simulationPeriod.concurrentUsers / averageRequestDuration
  const totalRequests = Math.floor(requestsPerSecond * simulationPeriod.durationSeconds)

  // Generate request timestamps
  const requestTimestamps = generateRequestTimestamps(
    totalRequests,
    simulationPeriod.durationSeconds,
    simulationPeriod.requestPattern
  )

  const usagePoints: VRAMUsagePoint[] = []
  const sampleInterval = Math.max(1, Math.floor(simulationPeriod.durationSeconds / 100)) // 100 data points max

  for (let t = 0; t <= simulationPeriod.durationSeconds; t += sampleInterval) {
    let concurrentUsers = calculateConcurrentUsers(t, requestTimestamps, averageRequestDuration)

    // Apply time pattern modulation (default to BUSINESS_HOURS pattern for demonstration)
    const timePattern = TimePattern.BUSINESS_HOURS
    const timeMultiplier = applyTimePattern(t, 1.0, timePattern)
    concurrentUsers = Math.floor(concurrentUsers * timeMultiplier)

    // Apply request distribution pattern (default to NORMAL for now)
    const requestDistribution = RequestDistribution.NORMAL
    const distributionMultiplier = applyRequestDistribution(
      t,
      1.0,
      requestDistribution,
      simulationPeriod.durationSeconds
    )
    concurrentUsers = Math.max(0, Math.floor(concurrentUsers * distributionMultiplier))

    if (concurrentUsers > 0) {
      const vramBreakdown = calculateWorkloadVRAM(
        model,
        totalInputTokens,
        totalOutputTokens,
        concurrentUsers,
        simulationPeriod.precision || ModelPrecision.FP16
      )

      usagePoints.push({
        timestamp: t,
        totalVRAM: vramBreakdown.total,
        breakdown: vramBreakdown,
        activeRequests: [],
      })
    } else {
      // Baseline VRAM usage (just the model loaded in memory)
      const baselineVRAM = calculateBaseMemory(
        model,
        simulationPeriod.precision || ModelPrecision.FP16
      )
      usagePoints.push({
        timestamp: t,
        totalVRAM: baselineVRAM,
        breakdown: {
          baseModel: baselineVRAM,
          kvCache: 0,
          activations: 0,
          overhead: 0,
          total: baselineVRAM,
          workloadBreakdown: [],
        },
        activeRequests: [],
      })
    }
  }

  return usagePoints
}

/**
 * Generate complete simulation result
 * @param model - Model configuration
 * @param workloadSlots - Configured workload slots
 * @param simulationPeriod - Simulation parameters
 * @returns Complete simulation result with metrics
 */
export function generateSimulationResult(
  model: Model,
  workloadSlots: WorkloadSlot[],
  simulationPeriod: SimulationPeriod
): SimulationResults {
  const usagePoints = simulateUsageOverTime(model, workloadSlots, simulationPeriod)

  if (usagePoints.length === 0) {
    throw new Error('No active workload slots found for simulation')
  }

  // Calculate metrics
  const maxVRAM = Math.max(...usagePoints.map(point => point.totalVRAM))
  const avgVRAM = usagePoints.reduce((sum, point) => sum + point.totalVRAM, 0) / usagePoints.length
  // Peak timestamp calculation removed as not used in current implementation

  // Determine GPU recommendations based on peak VRAM
  const maxVRAMGB = bytesToGB(maxVRAM)
  const gpuRecommendations = getGPURecommendations(maxVRAMGB)

  return {
    maxVRAM,
    averageVRAM: Math.floor(avgVRAM),
    usagePoints,
    recommendations: gpuRecommendations,
    warnings: maxVRAMGB > 80 ? ['Extremely high VRAM usage detected'] : [],
    calculatedAt: Date.now(),
  }
}

/**
 * Get GPU recommendations based on VRAM requirements
 * @param requiredVRAMGB - Required VRAM in GB
 * @returns Array of suitable GPU recommendations
 */
export function getGPURecommendations(requiredVRAMGB: number): string[] {
  const recommendations: string[] = []

  // GPU tier recommendations based on VRAM capacity
  if (requiredVRAMGB <= 4) {
    recommendations.push('GTX 1650 (4GB)', 'RTX 3050 (8GB)')
  } else if (requiredVRAMGB <= 8) {
    recommendations.push('RTX 3060 Ti (8GB)', 'RTX 4060 Ti (8GB)')
  } else if (requiredVRAMGB <= 12) {
    recommendations.push('RTX 3060 (12GB)', 'RTX 4060 Ti (16GB)')
  } else if (requiredVRAMGB <= 16) {
    recommendations.push('RTX 4060 Ti (16GB)', 'RTX 4070 (12GB)')
  } else if (requiredVRAMGB <= 24) {
    recommendations.push('RTX 3090 (24GB)', 'RTX 4090 (24GB)', 'RTX 6000 Ada (48GB)')
  } else if (requiredVRAMGB <= 48) {
    recommendations.push('RTX 6000 Ada (48GB)', 'A6000 (48GB)')
  } else if (requiredVRAMGB <= 80) {
    recommendations.push('A100 (80GB)', 'H100 (80GB)')
  } else {
    recommendations.push('H100 (80GB)', 'Multiple GPU Setup Required')
  }

  return recommendations
}
