// VRAM Magic: Application Constants
// This file contains all application constants, default values, and configuration

import {
  ModelPrecision,
  TimeUnit,
  RequestPattern,
  WorkloadCategory,
  ThinkTimeDistribution,
  UserBehaviorPattern,
} from '../types'

// Now using proper enum imports from ../types

// ============================================================================
// Core Constraints
// ============================================================================

export const WORKLOAD_SLOT_CONSTRAINTS = {
  MAX_SLOTS: 5,
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  TOTAL_PERCENTAGE: 100,
} as const

export const SIMULATION_CONSTRAINTS = {
  MIN_DURATION: 1,
  MAX_DURATION: 86400, // 24 hours in seconds
  MIN_USERS: 1,
  MAX_USERS: 10000,
  MIN_GRANULARITY: 1,
  MAX_GRANULARITY: 3600, // 1 hour in seconds
} as const

// ============================================================================
// Model Precision Byte Mapping
// ============================================================================

export const PRECISION_BYTES = {
  [ModelPrecision.FP32]: 4,
  [ModelPrecision.FP16]: 2,
  [ModelPrecision.INT8]: 1,
  [ModelPrecision.INT4]: 0.5,
} as const

// ============================================================================
// VRAM Calculation Constants
// ============================================================================

export const VRAM_CALCULATION = {
  MODEL_OVERHEAD_FACTOR: 1.2,
  ACTIVATION_LAYERS_FACTOR: 4,
  KV_CACHE_LAYERS_FACTOR: 2,
  TOTAL_OVERHEAD_FACTOR: 0.1,
  DEFAULT_BATCH_SIZE: 1,
  DEFAULT_SEQUENCE_LENGTH: 2048,
} as const

// ============================================================================
// Professional Color Schemes
// ============================================================================

// Material UI compatible color palette
export const COLORS = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#fff',
  },
  secondary: {
    main: '#dc004e',
    light: '#ff5983',
    dark: '#9a0036',
    contrastText: '#fff',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#fff',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#fff',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#fff',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#fff',
  },
} as const

// Workload category color mapping
export const WORKLOAD_COLORS = {
  [WorkloadCategory.CHAT]: '#1976d2', // Blue
  [WorkloadCategory.RAG]: '#388e3c', // Green
  [WorkloadCategory.CODING]: '#f57c00', // Orange
  [WorkloadCategory.CREATIVE]: '#7b1fa2', // Purple
  [WorkloadCategory.ANALYSIS]: '#d32f2f', // Red
  [WorkloadCategory.CUSTOM]: '#616161', // Grey
} as const

// Chart color palette for VRAM visualization
export const CHART_COLORS = {
  baseModel: '#1976d2', // Primary blue
  kvCache: '#388e3c', // Green
  activations: '#f57c00', // Orange
  overhead: '#9e9e9e', // Grey
  workload1: '#1976d2', // Blue
  workload2: '#388e3c', // Green
  workload3: '#f57c00', // Orange
  workload4: '#7b1fa2', // Purple
  workload5: '#d32f2f', // Red
} as const

// ============================================================================
// Default Form Values
// ============================================================================

export const DEFAULT_SIMULATION_CONFIG = {
  duration: 3600, // 1 hour
  timeUnit: TimeUnit.SECONDS,
  totalUsers: 100, // NEW: was concurrentUsers: 10
  maxThinkTime: 30, // NEW: 30 seconds default
  thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE, // NEW: Most natural
  userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT, // NEW: Common use case
  requestPattern: RequestPattern.UNIFORM,
  granularity: 60, // 1 minute
  precision: ModelPrecision.FP16,
  durationSeconds: 3600,
  // Derived values (will be calculated)
  derivedPeakConcurrency: undefined,
  derivedAverageConcurrency: undefined,
} as const

export const DEFAULT_WORKLOAD_SLOT = {
  id: '',
  workload: null,
  percentage: 0,
  isActive: false,
} as const

export const DEFAULT_USER_PREFERENCES = {
  theme: 'auto' as const,
  chartType: 'area' as const,
  showTooltips: true,
  animationsEnabled: true,
  accessibilityMode: false,
} as const

// ============================================================================
// UI Constants
// ============================================================================

export const UI_CONSTANTS = {
  DRAWER_WIDTH: 280,
  HEADER_HEIGHT: 64,
  SIDEBAR_COLLAPSED_WIDTH: 64,
  NOTIFICATION_DURATION: 6000,
  CHART_MIN_HEIGHT: 300,
  CHART_MAX_HEIGHT: 600,
  ANIMATION_DURATION: 300,
} as const

export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION_RULES = {
  MODEL_NAME_MIN_LENGTH: 2,
  MODEL_NAME_MAX_LENGTH: 100,
  WORKLOAD_NAME_MIN_LENGTH: 2,
  WORKLOAD_NAME_MAX_LENGTH: 50,
  MIN_PARAMETERS: 1000000, // 1M parameters minimum
  MAX_PARAMETERS: 1000000000000, // 1T parameters maximum
  MIN_TOKENS: 1,
  MAX_TOKENS: 100000,
  PERCENTAGE_PRECISION: 1, // 1 decimal place
} as const

// ============================================================================
// Performance Constants
// ============================================================================

export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  SIMULATION_BATCH_SIZE: 1000,
  CHART_DATA_LIMIT: 10000,
  MEMORY_WARNING_THRESHOLD: 0.8, // 80% memory usage
  MEMORY_CRITICAL_THRESHOLD: 0.95, // 95% memory usage
} as const

// ============================================================================
// User Behavior and Think Time Constants
// ============================================================================

export const USER_BEHAVIOR_PRESETS = {
  [UserBehaviorPattern.INTERACTIVE_CHAT]: {
    maxThinkTime: 45,
    distribution: ThinkTimeDistribution.LOGNORMAL,
    description: 'Human chat interactions with natural pauses',
    examples: ['Customer support', 'Personal assistant', 'Interactive tutoring'],
  },
  [UserBehaviorPattern.API_SERVICE]: {
    maxThinkTime: 0.1,
    distribution: ThinkTimeDistribution.EXPONENTIAL,
    description: 'Automated API calls with minimal delays',
    examples: ['Microservices', 'Batch processing', 'Real-time analysis'],
  },
  [UserBehaviorPattern.CONTENT_CREATION]: {
    maxThinkTime: 120,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    description: 'Creative workflows with longer contemplation periods',
    examples: ['Writing assistance', 'Code generation', 'Creative brainstorming'],
  },
  [UserBehaviorPattern.DATA_ANALYSIS]: {
    maxThinkTime: 30,
    distribution: ThinkTimeDistribution.UNIFORM,
    description: 'Analytical queries with consistent pacing',
    examples: ['Business intelligence', 'Research analysis', 'Report generation'],
  },
  [UserBehaviorPattern.CODE_ASSISTANCE]: {
    maxThinkTime: 60,
    distribution: ThinkTimeDistribution.EXPONENTIAL,
    description: 'Development workflows with coding pauses',
    examples: ['IDE integration', 'Code review', 'Debug assistance'],
  },
  [UserBehaviorPattern.CUSTOMER_SUPPORT]: {
    maxThinkTime: 20,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    description: 'Support interactions with moderate think times',
    examples: ['Help desk', 'Technical support', 'FAQ systems'],
  },
  [UserBehaviorPattern.RESEARCH_QUERIES]: {
    maxThinkTime: 90,
    distribution: ThinkTimeDistribution.LOGNORMAL,
    description: 'Research workflows with variable exploration patterns',
    examples: ['Academic research', 'Literature review', 'Knowledge discovery'],
  },
  [UserBehaviorPattern.CUSTOM]: {
    maxThinkTime: 30,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    description: 'Custom configuration - set your own think time and distribution',
    examples: ['Custom use case', 'Special requirements', 'Manual configuration'],
  },
} as const

export const THINK_TIME_CONSTRAINTS = {
  MIN_THINK_TIME: 0,
  MAX_THINK_TIME: 3600, // 1 hour
  DEFAULT_THINK_TIME: 30,
  USER_POPULATION_LIMITS: {
    MIN_USERS: 1,
    MAX_USERS: 10000,
    DEFAULT_USERS: 100,
  },
} as const

// ============================================================================
// GPU Recommendations
// ============================================================================

export const GPU_TIERS = [
  {
    name: 'Consumer',
    gpus: [
      { name: 'RTX 4090', vram: 24, price: 1600 },
      { name: 'RTX 4080', vram: 16, price: 1200 },
      { name: 'RTX 4070 Ti', vram: 12, price: 800 },
    ],
  },
  {
    name: 'Professional',
    gpus: [
      { name: 'RTX A6000', vram: 48, price: 4500 },
      { name: 'RTX A5000', vram: 24, price: 2500 },
      { name: 'RTX A4000', vram: 16, price: 1500 },
    ],
  },
  {
    name: 'Data Center',
    gpus: [
      { name: 'H100', vram: 80, price: 30000 },
      { name: 'A100', vram: 80, price: 15000 },
      { name: 'V100', vram: 32, price: 8000 },
    ],
  },
] as const

// ============================================================================
// Export All Constants
// ============================================================================

export const CONSTANTS = {
  WORKLOAD_SLOT_CONSTRAINTS,
  SIMULATION_CONSTRAINTS,
  PRECISION_BYTES,
  VRAM_CALCULATION,
  COLORS,
  WORKLOAD_COLORS,
  CHART_COLORS,
  DEFAULT_SIMULATION_CONFIG,
  DEFAULT_WORKLOAD_SLOT,
  DEFAULT_USER_PREFERENCES,
  UI_CONSTANTS,
  BREAKPOINTS,
  VALIDATION_RULES,
  PERFORMANCE,
  USER_BEHAVIOR_PRESETS,
  THINK_TIME_CONSTRAINTS,
  GPU_TIERS,
} as const

export default CONSTANTS
