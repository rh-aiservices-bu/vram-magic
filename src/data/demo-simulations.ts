// VRAM Magic: Demo Simulations
// Ready-to-run simulation configurations with expected results

import {
  SimulationConfig,
  VRAMUsagePoint,
  TimeUnit,
  RequestPattern,
  SimulationResults,
  ModelPrecision,
  ThinkTimeDistribution,
  UserBehaviorPattern,
} from '../types'

// ============================================================================
// Demo Simulation Types
// ============================================================================

// Local interface for GPU recommendations (not in main types yet)
export interface GPURecommendation {
  gpu: string
  quantity: number
  totalVRAM: number
  utilizationRate: number
  costPerHour: number
  efficiency: 'low' | 'medium' | 'high'
  pros: string[]
  cons: string[]
  bestFor: string
}

export interface DemoSimulation {
  id: string
  name: string
  description: string
  category: string
  icon: string

  // Configuration
  modelId: string
  profileId: string
  scenarioId?: string
  config: SimulationConfig

  // Pre-computed Results (for demo purposes)
  expectedResults: SimulationResults
  vramTimeSeries: VRAMUsagePoint[]

  // Metadata
  tags: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  duration: string
  notes: string[]
}

// ============================================================================
// Helper Functions for Data Generation
// ============================================================================

function generateVRAMTimeSeries(
  baseVRAM: number,
  duration: number,
  timeUnit: TimeUnit,
  pattern: RequestPattern,
  peakMultiplier: number = 1.5,
  dataPoints: number = 100
): VRAMUsagePoint[] {
  const totalMinutes =
    timeUnit === TimeUnit.HOURS
      ? duration * 60
      : timeUnit === TimeUnit.DAYS
        ? duration * 24 * 60
        : timeUnit === TimeUnit.MINUTES
          ? duration
          : duration / 60
  const intervalMinutes = totalMinutes / dataPoints

  const points: VRAMUsagePoint[] = []

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = i * intervalMinutes * 60 * 1000 // Convert to milliseconds
    const progress = i / dataPoints

    // Generate pattern-based multiplier
    let multiplier = 1.0
    switch (pattern) {
      case RequestPattern.BELL_CURVE:
        // Peak in the middle of the time period
        multiplier = 0.5 + 0.8 * Math.exp(-Math.pow((progress - 0.5) * 3, 2))
        break
      case RequestPattern.FRONT_LOADED:
        // High load at the beginning, tapering off
        multiplier = 1.2 * Math.exp(-progress * 2) + 0.3
        break
      case RequestPattern.BACK_LOADED:
        // Low load at the beginning, ramping up
        multiplier = 0.3 + 1.2 * (1 - Math.exp(-(progress * 2)))
        break
      case RequestPattern.UNIFORM:
      default:
        // Steady with minor variations
        multiplier = 0.8 + 0.4 * Math.random()
    }

    const totalVRAM = Math.round(baseVRAM * multiplier * peakMultiplier)
    const kvCacheRatio = 0.3 + 0.2 * Math.random()
    const activationRatio = 0.15 + 0.1 * Math.random()

    const baseModel = Math.round(totalVRAM * (1 - kvCacheRatio - activationRatio))
    const kvCache = Math.round(totalVRAM * kvCacheRatio)
    const activations = Math.round(totalVRAM * activationRatio)
    const overhead = Math.round(totalVRAM * 0.1)

    points.push({
      timestamp,
      totalVRAM,
      breakdown: {
        baseModel,
        kvCache,
        activations,
        overhead,
        total: totalVRAM,
        workloadBreakdown: [], // Empty for demo data
      },
      activeRequests: [], // Empty for demo data
    })
  }

  return points
}

// Note: GPU recommendations function removed as it was unused

// ============================================================================
// Demo Simulation Definitions
// ============================================================================

export const DEMO_SIMULATIONS: DemoSimulation[] = [
  // Quick Demo Simulations (5-15 minutes)
  {
    id: 'quick-chat-demo',
    name: 'Quick Chat Demo',
    description: 'Simple 5-minute chat simulation to understand basic VRAM patterns',
    category: 'Quick Demo',
    icon: '⚡',
    modelId: 'llama-2-7b',
    profileId: 'general-purpose-light',
    config: {
      period: {
        duration: 5,
        timeUnit: TimeUnit.MINUTES,
        totalUsers: 9,
        maxThinkTime: 60,
        thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
        userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 30, // 30 seconds for short demo
        durationSeconds: 300, // 5 minutes * 60
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 16500,
      averageVRAM: 13200,
      usagePoints: [], // Will be populated later
      recommendations: ['RTX 4090 recommended for this workload'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['demo', 'quick', 'beginner', 'chat'],
    complexity: 'simple',
    duration: '5 minutes',
    notes: [
      'Perfect for understanding basic VRAM usage patterns',
      'Shows how concurrent users affect memory requirements',
      'Demonstrates the relationship between model size and VRAM',
    ],
  },

  {
    id: 'coding-sprint-demo',
    name: 'Coding Sprint Demo',
    description: '15-minute intensive coding session with multiple developers',
    category: 'Quick Demo',
    icon: '💻',
    modelId: 'codegen-16b',
    profileId: 'coding-assistant-basic',
    config: {
      period: {
        duration: 15,
        timeUnit: TimeUnit.MINUTES,
        totalUsers: 24,
        maxThinkTime: 30,
        thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
        userBehaviorPattern: UserBehaviorPattern.CODE_ASSISTANCE,
        requestPattern: RequestPattern.FRONT_LOADED,
        granularity: 60, // 1 minute
        durationSeconds: 900, // 15 minutes * 60
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 45000,
      averageVRAM: 28000,
      usagePoints: [],
      recommendations: ['A100 recommended for this workload'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['demo', 'coding', 'development', 'burst'],
    complexity: 'moderate',
    duration: '15 minutes',
    notes: [
      'Simulates intensive coding session with multiple developers',
      'Shows impact of bursty request patterns on VRAM usage',
      'Demonstrates need for higher-capacity GPUs for development teams',
    ],
  },

  // Hourly Simulations
  {
    id: 'business-hours-support',
    name: 'Business Hours Customer Support',
    description: '8-hour customer support simulation with realistic traffic patterns',
    category: 'Business Hours',
    icon: '🎧',
    modelId: 'claude-3-haiku',
    profileId: 'customer-support-basic',
    config: {
      period: {
        duration: 8,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 36,
        maxThinkTime: 90,
        thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
        userBehaviorPattern: UserBehaviorPattern.CUSTOMER_SUPPORT,
        requestPattern: RequestPattern.BELL_CURVE,
        granularity: 300, // 5 minutes
        durationSeconds: 28800, // 8 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 28000,
      averageVRAM: 18500,
      usagePoints: [],
      recommendations: ['RTX 4090 suitable for this workload'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['customer-support', 'business-hours', 'realistic', 'production'],
    complexity: 'moderate',
    duration: '8 hours',
    notes: [
      'Realistic customer support traffic with morning and afternoon peaks',
      'Shows typical VRAM patterns for service businesses',
      'Includes lunch-time dip and end-of-day surge',
    ],
  },

  {
    id: 'content-production-day',
    name: 'Content Production Day',
    description: '10-hour content creation simulation for marketing agency',
    category: 'Business Hours',
    icon: '📝',
    modelId: 'gpt-3.5-turbo',
    profileId: 'content-creator-enterprise',
    config: {
      period: {
        duration: 10,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 54,
        maxThinkTime: 45,
        thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
        userBehaviorPattern: UserBehaviorPattern.CONTENT_CREATION,
        requestPattern: RequestPattern.FRONT_LOADED,
        granularity: 300,
        durationSeconds: 36000, // 10 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 52000,
      averageVRAM: 34000,
      usagePoints: [],
      recommendations: ['A100 recommended for content production'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['content-creation', 'marketing', 'agency', 'creative'],
    complexity: 'complex',
    duration: '10 hours',
    notes: [
      'Models creative workflows with inspiration bursts',
      'Higher memory usage due to longer-form content generation',
      'Shows impact of creative collaboration on resource requirements',
    ],
  },

  // Daily Simulations
  {
    id: 'enterprise-research-day',
    name: 'Enterprise Research Day',
    description: '24-hour global research platform simulation',
    category: 'Enterprise',
    icon: '🔬',
    modelId: 'claude-3-opus',
    profileId: 'research-academic',
    config: {
      period: {
        duration: 24,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 135,
        maxThinkTime: 120,
        thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
        userBehaviorPattern: UserBehaviorPattern.RESEARCH_QUERIES,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 600, // 10 minutes
        durationSeconds: 86400, // 24 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 145000,
      averageVRAM: 95000,
      usagePoints: [],
      recommendations: ['H100 x4 required for enterprise research'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['enterprise', 'research', 'global', '24x7'],
    complexity: 'complex',
    duration: '24 hours',
    notes: [
      'Global research platform serving multiple time zones',
      'High-capacity model for complex research tasks',
      'Demonstrates enterprise-level resource requirements',
    ],
  },

  {
    id: 'trading-floor-simulation',
    name: 'Trading Floor Simulation',
    description: '16-hour financial trading platform with market hours focus',
    category: 'Financial',
    icon: '💹',
    modelId: 'gpt-4',
    profileId: 'financial-analyst',
    config: {
      period: {
        duration: 16,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 225,
        maxThinkTime: 15,
        thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
        userBehaviorPattern: UserBehaviorPattern.API_SERVICE,
        requestPattern: RequestPattern.BELL_CURVE,
        granularity: 300,
        durationSeconds: 57600, // 16 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 220000,
      averageVRAM: 125000,
      usagePoints: [],
      recommendations: ['H100 x6 required for trading platform'],
      warnings: ['Extreme resource requirements'],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['trading', 'financial', 'high-frequency', 'low-latency'],
    complexity: 'complex',
    duration: '16 hours',
    notes: [
      'Extreme volatility during market open and close',
      'Ultra-low latency requirements for trading decisions',
      'Massive resource spikes during market events',
    ],
  },

  // Stress Test Simulations
  {
    id: 'black-friday-ecommerce',
    name: 'Black Friday E-commerce Support',
    description: 'Peak traffic simulation for e-commerce customer support',
    category: 'Stress Test',
    icon: '🛒',
    modelId: 'claude-3-haiku',
    profileId: 'customer-support-enterprise',
    config: {
      period: {
        duration: 12,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 450,
        maxThinkTime: 180,
        thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
        userBehaviorPattern: UserBehaviorPattern.DATA_ANALYSIS,
        requestPattern: RequestPattern.FRONT_LOADED,
        granularity: 300,
        durationSeconds: 43200, // 12 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 185000,
      averageVRAM: 95000,
      usagePoints: [],
      recommendations: ['H100 x5 required for peak traffic'],
      warnings: ['Stress test conditions'],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['stress-test', 'peak-load', 'ecommerce', 'black-friday'],
    complexity: 'complex',
    duration: '12 hours',
    notes: [
      'Simulates extreme traffic spikes during major sales events',
      'Tests system behavior under maximum load conditions',
      'Critical for capacity planning and auto-scaling strategies',
    ],
  },

  {
    id: 'viral-content-surge',
    name: 'Viral Content Creation Surge',
    description: 'Content team response to viral trend requiring immediate content production',
    category: 'Stress Test',
    icon: '📈',
    modelId: 'gpt-4',
    profileId: 'content-creator-enterprise',
    config: {
      period: {
        duration: 6,
        timeUnit: TimeUnit.HOURS,
        totalUsers: 105,
        maxThinkTime: 240,
        thinkTimeDistribution: ThinkTimeDistribution.UNIFORM,
        userBehaviorPattern: UserBehaviorPattern.RESEARCH_QUERIES,
        requestPattern: RequestPattern.FRONT_LOADED,
        granularity: 300,
        durationSeconds: 21600, // 6 hours * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 195000,
      averageVRAM: 115000,
      usagePoints: [],
      recommendations: ['H100 x5 for viral content response'],
      warnings: ['High burst load'],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['stress-test', 'viral', 'content-surge', 'emergency'],
    complexity: 'complex',
    duration: '6 hours',
    notes: [
      'Extreme content creation load during viral trend response',
      'Shows impact of urgent, high-quality content demands',
      'Tests system capability under creative pressure',
    ],
  },

  // Specialized Scenarios
  {
    id: 'legal-discovery-project',
    name: 'Legal Discovery Project',
    description: 'Large-scale legal document review and analysis project',
    category: 'Legal',
    icon: '⚖️',
    modelId: 'claude-3-sonnet',
    profileId: 'legal-assistant',
    config: {
      period: {
        duration: 30,
        timeUnit: TimeUnit.DAYS,
        totalUsers: 75,
        maxThinkTime: 300,
        thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
        userBehaviorPattern: UserBehaviorPattern.RESEARCH_QUERIES,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 3600, // 1 hour for long duration
        durationSeconds: 2592000, // 30 days * 24 * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 125000,
      averageVRAM: 75000,
      usagePoints: [],
      recommendations: ['A100 x3 for legal document analysis'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['legal', 'long-term', 'document-analysis', 'discovery'],
    complexity: 'complex',
    duration: '30 days',
    notes: [
      'Extended legal document review project',
      'Consistent high-quality analysis requirements',
      'Shows sustained high-memory usage patterns',
    ],
  },

  {
    id: 'medical-research-trial',
    name: 'Medical Research Clinical Trial',
    description: 'AI-assisted analysis for large-scale clinical trial data',
    category: 'Healthcare',
    icon: '🏥',
    modelId: 'claude-3-opus',
    profileId: 'medical-research',
    config: {
      period: {
        duration: 90,
        timeUnit: TimeUnit.DAYS,
        totalUsers: 60,
        maxThinkTime: 600,
        thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
        userBehaviorPattern: UserBehaviorPattern.RESEARCH_QUERIES,
        requestPattern: RequestPattern.UNIFORM,
        granularity: 3600, // 1 hour
        durationSeconds: 7776000, // 90 days * 24 * 3600
        precision: ModelPrecision.FP16,
      },
      isValid: true,
      errors: [],
    },
    expectedResults: {
      maxVRAM: 155000,
      averageVRAM: 95000,
      usagePoints: [],
      recommendations: ['H100 x3 for medical research'],
      warnings: [],
      calculatedAt: Date.now(),
    },
    vramTimeSeries: [],
    tags: ['medical', 'clinical-trial', 'long-term', 'research'],
    complexity: 'complex',
    duration: '90 days',
    notes: [
      'Extended medical research project over 3 months',
      'High accuracy requirements for medical analysis',
      'Cyclical patterns based on research phases',
    ],
  },
]

// Generate time series data for all simulations
DEMO_SIMULATIONS.forEach(simulation => {
  const baseVRAM = simulation.expectedResults.averageVRAM
  const duration = simulation.config.period.duration
  const timeUnit = simulation.config.period.timeUnit
  const pattern = simulation.config.period.requestPattern
  const peakMultiplier = 1.5 // Default value

  simulation.vramTimeSeries = generateVRAMTimeSeries(
    baseVRAM,
    duration,
    timeUnit,
    pattern, // Pattern is already properly typed
    peakMultiplier,
    Math.min(200, duration * 10) // More data points for longer simulations
  )
})

// ============================================================================
// Simulation Categories
// ============================================================================

export const SIMULATION_CATEGORIES = {
  'Quick Demo': {
    label: 'Quick Demos',
    description: 'Short simulations (5-15 minutes) for rapid testing and demonstrations',
    color: '#4CAF50',
    icon: '⚡',
    duration: '5-15 minutes',
  },
  'Business Hours': {
    label: 'Business Hours',
    description: 'Standard business day simulations (8-12 hours) with realistic patterns',
    color: '#2196F3',
    icon: '🏢',
    duration: '8-12 hours',
  },
  Enterprise: {
    label: 'Enterprise Scale',
    description: '24/7 enterprise simulations with global operations',
    color: '#9C27B0',
    icon: '🌐',
    duration: '24+ hours',
  },
  Financial: {
    label: 'Financial Services',
    description: 'Trading and financial analysis simulations with market patterns',
    color: '#FF9800',
    icon: '💹',
    duration: '16-24 hours',
  },
  'Stress Test': {
    label: 'Stress Tests',
    description: 'Peak load and extreme usage scenarios for capacity planning',
    color: '#F44336',
    icon: '⚠️',
    duration: '6-12 hours',
  },
  Legal: {
    label: 'Legal Services',
    description: 'Legal document analysis and research project simulations',
    color: '#795548',
    icon: '⚖️',
    duration: '1-30 days',
  },
  Healthcare: {
    label: 'Healthcare',
    description: 'Medical research and healthcare analysis simulations',
    color: '#009688',
    icon: '🏥',
    duration: '1-90 days',
  },
} as const

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get simulations by category
 */
export function getSimulationsByCategory(category: string): DemoSimulation[] {
  return DEMO_SIMULATIONS.filter(sim => sim.category === category)
}

/**
 * Get simulations by complexity
 */
export function getSimulationsByComplexity(
  complexity: 'simple' | 'moderate' | 'complex'
): DemoSimulation[] {
  return DEMO_SIMULATIONS.filter(sim => sim.complexity === complexity)
}

/**
 * Get simulation by ID
 */
export function getSimulationById(id: string): DemoSimulation | undefined {
  return DEMO_SIMULATIONS.find(sim => sim.id === id)
}

/**
 * Search simulations
 */
export function searchSimulations(query: string): DemoSimulation[] {
  const lowercaseQuery = query.toLowerCase()
  return DEMO_SIMULATIONS.filter(
    sim =>
      sim.name.toLowerCase().includes(lowercaseQuery) ||
      sim.description.toLowerCase().includes(lowercaseQuery) ||
      sim.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  )
}

/**
 * Get simulations by duration range
 */
export function getSimulationsByDuration(minHours: number, maxHours: number): DemoSimulation[] {
  return DEMO_SIMULATIONS.filter(sim => {
    const timeUnit = sim.config.period.timeUnit
    const duration = sim.config.period.duration
    const hours =
      timeUnit === TimeUnit.HOURS
        ? duration
        : timeUnit === TimeUnit.DAYS
          ? duration * 24
          : timeUnit === TimeUnit.MINUTES
            ? duration / 60
            : duration / 3600
    return hours >= minHours && hours <= maxHours
  })
}

/**
 * Get simulations by VRAM requirement range
 */
export function getSimulationsByVRAM(minVRAM: number, maxVRAM: number): DemoSimulation[] {
  return DEMO_SIMULATIONS.filter(
    sim => sim.expectedResults.maxVRAM >= minVRAM && sim.expectedResults.maxVRAM <= maxVRAM
  )
}

/**
 * Get recommended simulations for learning
 */
export function getRecommendedSimulations(
  userLevel: 'beginner' | 'intermediate' | 'advanced'
): DemoSimulation[] {
  const complexityMap = {
    beginner: ['simple'],
    intermediate: ['simple', 'moderate'],
    advanced: ['simple', 'moderate', 'complex'],
  }

  return DEMO_SIMULATIONS.filter(sim => complexityMap[userLevel].includes(sim.complexity)).sort(
    (a, b) => {
      const complexityOrder = { simple: 0, moderate: 1, complex: 2 }
      return complexityOrder[a.complexity] - complexityOrder[b.complexity]
    }
  )
}

// ============================================================================
// Export Defaults
// ============================================================================

export default DEMO_SIMULATIONS
