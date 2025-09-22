# Realistic User-Centric Workload Simulation Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan to transform VRAM Magic from a simplistic "concurrent users" model to a realistic "total users with think time" simulation that accurately represents real-world LLM workload patterns.

### Key Transformation

**Current Model**: Assumes perfect steady-state with 50 concurrent users processing continuously
**New Model**: Models 200 actual users with realistic think times, deriving peak concurrency naturally

---

## 🎯 Core Algorithm Design

### Current vs. New Approach

#### Current Algorithm (`src/services/vramCalculator.ts:665-666`)
```typescript
// FLAWED: Assumes infinite capacity and perfect distribution
const requestsPerSecond = simulationPeriod.concurrentUsers / averageRequestDuration
const totalRequests = Math.floor(requestsPerSecond * simulationPeriod.durationSeconds)
```

#### New Algorithm (Individual User Tracking)
```typescript
// REALISTIC: Track each user's journey independently
interface UserSession {
  userId: number
  nextRequestTime: number
  lastRequestEnd: number
  totalRequests: number
}

// Simulate each user's behavior over time
const userSessions = generateUserSessions(totalUsers, maxThinkTime, distribution)
const concurrencyOverTime = calculateActualConcurrency(userSessions, duration)
```

---

## 📋 Implementation Tasks

### Phase 1: Type System Updates

#### 1.1 Update Core Types (`src/types/index.ts`)

**Add New Enums:**
```typescript
export enum ThinkTimeDistribution {
  BELL_CURVE = 'bell_curve',
  EXPONENTIAL = 'exponential',
  UNIFORM = 'uniform',
  POISSON = 'poisson',
  LOGNORMAL = 'lognormal'
}

export enum UserBehaviorPattern {
  INTERACTIVE_CHAT = 'interactive_chat',
  API_SERVICE = 'api_service',
  CONTENT_CREATION = 'content_creation',
  DATA_ANALYSIS = 'data_analysis',
  CODE_ASSISTANCE = 'code_assistance',
  CUSTOMER_SUPPORT = 'customer_support',
  RESEARCH_QUERIES = 'research_queries',
  CUSTOM = 'custom'
}
```

**Replace SimulationPeriod Interface:**
```typescript
// OLD INTERFACE (REMOVE)
export interface SimulationPeriod {
  duration: number
  timeUnit: TimeUnit
  concurrentUsers: number    // <-- REMOVE THIS
  requestPattern: RequestPattern
  granularity: number
  durationSeconds: number
  precision: ModelPrecision
}

// NEW INTERFACE (REPLACE WITH)
export interface SimulationPeriod {
  duration: number
  timeUnit: TimeUnit
  totalUsers: number                    // <-- NEW: Total users in system
  maxThinkTime: number                  // <-- NEW: Maximum seconds between requests
  thinkTimeDistribution: ThinkTimeDistribution  // <-- NEW: Distribution pattern
  userBehaviorPattern: UserBehaviorPattern       // <-- NEW: Preset behavior
  requestPattern: RequestPattern
  granularity: number
  durationSeconds: number
  precision: ModelPrecision

  // Derived values (calculated, not input)
  derivedPeakConcurrency?: number       // <-- NEW: Calculated max concurrent
  derivedAverageConcurrency?: number    // <-- NEW: Calculated avg concurrent
}
```

**Add User Session Tracking:**
```typescript
export interface UserSession {
  userId: number
  nextRequestTime: number
  lastRequestEnd: number
  totalRequests: number
  currentThinkTime: number
  isProcessingRequest: boolean
}

export interface RequestEvent {
  userId: number
  requestId: string
  startTime: number
  endTime: number
  workloadId: string
  inputTokens: number
  outputTokens: number
}

export interface ConcurrencySnapshot {
  timestamp: number
  activeUsers: number
  queuedUsers: number
  processingRequests: RequestEvent[]
}
```

#### 1.2 Update Validation Schema (`src/utils/validation.ts`)

**Add New Validation Rules:**
```typescript
// Add to validateSimulationPeriod function
export function validateSimulationPeriod(period: SimulationPeriod): ValidationError[] {
  const errors: ValidationError[] = []

  // Existing validations...

  // NEW VALIDATIONS
  if (period.totalUsers < 1 || period.totalUsers > 10000) {
    errors.push({
      field: 'totalUsers',
      type: 'error',
      message: 'Total users must be between 1 and 10,000'
    })
  }

  if (period.maxThinkTime < 0 || period.maxThinkTime > 3600) {
    errors.push({
      field: 'maxThinkTime',
      type: 'error',
      message: 'Maximum think time must be between 0 and 3600 seconds'
    })
  }

  if (!Object.values(ThinkTimeDistribution).includes(period.thinkTimeDistribution)) {
    errors.push({
      field: 'thinkTimeDistribution',
      type: 'error',
      message: 'Invalid think time distribution'
    })
  }

  // Capacity warning
  const estimatedPeakConcurrency = estimatePeakConcurrency(period)
  if (estimatedPeakConcurrency > 500) {
    errors.push({
      field: 'totalUsers',
      type: 'warning',
      message: `Estimated peak concurrency of ${estimatedPeakConcurrency} may require significant GPU resources`
    })
  }

  return errors
}
```

#### 1.3 Add Constants (`src/constants/index.ts`)

**User Behavior Presets:**
```typescript
export const USER_BEHAVIOR_PRESETS = {
  [UserBehaviorPattern.INTERACTIVE_CHAT]: {
    maxThinkTime: 45,
    distribution: ThinkTimeDistribution.LOGNORMAL,
    description: 'Human chat interactions with natural pauses',
    examples: ['Customer support', 'Personal assistant', 'Interactive tutoring']
  },
  [UserBehaviorPattern.API_SERVICE]: {
    maxThinkTime: 0.1,
    distribution: ThinkTimeDistribution.EXPONENTIAL,
    description: 'Automated API calls with minimal delays',
    examples: ['Microservices', 'Batch processing', 'Real-time analysis']
  },
  [UserBehaviorPattern.CONTENT_CREATION]: {
    maxThinkTime: 120,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    description: 'Creative workflows with longer contemplation periods',
    examples: ['Writing assistance', 'Code generation', 'Creative brainstorming']
  },
  [UserBehaviorPattern.DATA_ANALYSIS]: {
    maxThinkTime: 30,
    distribution: ThinkTimeDistribution.UNIFORM,
    description: 'Analytical queries with consistent pacing',
    examples: ['Business intelligence', 'Research analysis', 'Report generation']
  },
  [UserBehaviorPattern.CODE_ASSISTANCE]: {
    maxThinkTime: 60,
    distribution: ThinkTimeDistribution.EXPONENTIAL,
    description: 'Development workflows with coding pauses',
    examples: ['IDE integration', 'Code review', 'Debug assistance']
  },
  [UserBehaviorPattern.CUSTOMER_SUPPORT]: {
    maxThinkTime: 20,
    distribution: ThinkTimeDistribution.BELL_CURVE,
    description: 'Support interactions with moderate think times',
    examples: ['Help desk', 'Technical support', 'FAQ systems']
  },
  [UserBehaviorPattern.RESEARCH_QUERIES]: {
    maxThinkTime: 90,
    distribution: ThinkTimeDistribution.LOGNORMAL,
    description: 'Research workflows with variable exploration patterns',
    examples: ['Academic research', 'Literature review', 'Knowledge discovery']
  }
} as const

export const THINK_TIME_CONSTRAINTS = {
  MIN_THINK_TIME: 0,
  MAX_THINK_TIME: 3600, // 1 hour
  DEFAULT_THINK_TIME: 30,
  USER_POPULATION_LIMITS: {
    MIN_USERS: 1,
    MAX_USERS: 10000,
    DEFAULT_USERS: 100
  }
} as const
```

---

### Phase 2: Calculation Engine Rewrite

#### 2.1 Think Time Distribution Functions (`src/services/thinkTimeGenerator.ts`)

**Create New Service File:**
```typescript
// NEW FILE: src/services/thinkTimeGenerator.ts
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
  return Array.from({ length: count }, () =>
    generateThinkTime(maxThinkTime, distribution)
  )
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
```

#### 2.2 User Session Management (`src/services/userSessionManager.ts`)

**Create New Service File:**
```typescript
// NEW FILE: src/services/userSessionManager.ts
import { UserSession, RequestEvent, ThinkTimeDistribution } from '../types'
import { generateThinkTime } from './thinkTimeGenerator'

export class UserSessionManager {
  private sessions: Map<number, UserSession> = new Map()
  private activeRequests: Map<string, RequestEvent> = new Map()
  private requestCounter = 0

  constructor(
    private totalUsers: number,
    private maxThinkTime: number,
    private distribution: ThinkTimeDistribution,
    private requestDuration: number
  ) {
    this.initializeSessions()
  }

  private initializeSessions(): void {
    for (let userId = 0; userId < this.totalUsers; userId++) {
      // Use think time for initial delay (as specified)
      const initialDelay = generateThinkTime(this.maxThinkTime, this.distribution)

      this.sessions.set(userId, {
        userId,
        nextRequestTime: initialDelay,
        lastRequestEnd: 0,
        totalRequests: 0,
        currentThinkTime: initialDelay,
        isProcessingRequest: false
      })
    }
  }

  /**
   * Get all users ready to start requests at given timestamp
   */
  getUsersReadyToStart(timestamp: number): number[] {
    const readyUsers: number[] = []

    for (const [userId, session] of this.sessions) {
      if (!session.isProcessingRequest && session.nextRequestTime <= timestamp) {
        readyUsers.push(userId)
      }
    }

    return readyUsers
  }

  /**
   * Start request for a user
   */
  startRequest(userId: number, timestamp: number, workloadTokens: {input: number, output: number}): RequestEvent {
    const session = this.sessions.get(userId)!
    const requestId = `req_${userId}_${++this.requestCounter}`

    const request: RequestEvent = {
      userId,
      requestId,
      startTime: timestamp,
      endTime: timestamp + this.requestDuration,
      workloadId: 'default', // Will be set by caller
      inputTokens: workloadTokens.input,
      outputTokens: workloadTokens.output
    }

    // Update session state
    session.isProcessingRequest = true
    session.totalRequests++

    // Store active request
    this.activeRequests.set(requestId, request)

    return request
  }

  /**
   * Complete requests that have finished
   */
  completeFinishedRequests(timestamp: number): RequestEvent[] {
    const completedRequests: RequestEvent[] = []

    for (const [requestId, request] of this.activeRequests) {
      if (request.endTime <= timestamp) {
        // Mark user as available for next request
        const session = this.sessions.get(request.userId)!
        session.isProcessingRequest = false
        session.lastRequestEnd = timestamp

        // Generate next think time
        const nextThinkTime = generateThinkTime(this.maxThinkTime, this.distribution)
        session.nextRequestTime = timestamp + nextThinkTime
        session.currentThinkTime = nextThinkTime

        completedRequests.push(request)
        this.activeRequests.delete(requestId)
      }
    }

    return completedRequests
  }

  /**
   * Get currently active requests
   */
  getActiveRequests(timestamp: number): RequestEvent[] {
    return Array.from(this.activeRequests.values()).filter(
      request => request.startTime <= timestamp && request.endTime > timestamp
    )
  }

  /**
   * Get current concurrency level
   */
  getCurrentConcurrency(timestamp: number): number {
    return this.getActiveRequests(timestamp).length
  }

  /**
   * Get queue length (users waiting to start)
   */
  getQueueLength(timestamp: number): number {
    return this.getUsersReadyToStart(timestamp).length
  }

  /**
   * Get session statistics
   */
  getStatistics(currentTime: number) {
    const totalRequests = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.totalRequests, 0)

    return {
      totalUsers: this.totalUsers,
      activeRequests: this.activeRequests.size,
      queuedUsers: this.getQueueLength(currentTime),
      totalRequestsProcessed: totalRequests,
      averageRequestsPerUser: totalRequests / this.totalUsers
    }
  }
}
```

#### 2.3 Rewrite Core Simulation (`src/services/vramCalculator.ts`)

**Replace simulateUsageOverTime Function:**
```typescript
// REPLACE EXISTING FUNCTION (line 641-734) with this implementation
/**
 * Simulate VRAM usage over time using realistic user behavior
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

  // Calculate weighted average tokens across workloads
  const totalInputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload!.inputTokens * slot.percentage) / 100,
    0
  )
  const totalOutputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload!.outputTokens * slot.percentage) / 100,
    0
  )

  // Calculate request duration (same as before)
  const averageRequestDuration = Math.max(1, Math.floor(totalOutputTokens * 0.01))

  // NEW: Initialize user session manager with realistic behavior
  const sessionManager = new UserSessionManager(
    simulationPeriod.totalUsers,
    simulationPeriod.maxThinkTime,
    simulationPeriod.thinkTimeDistribution,
    averageRequestDuration
  )

  const usagePoints: VRAMUsagePoint[] = []
  const sampleInterval = Math.max(1, Math.floor(simulationPeriod.durationSeconds / 100))

  // Track peak concurrency for derived values
  let peakConcurrency = 0
  let totalConcurrency = 0
  let sampleCount = 0

  for (let t = 0; t <= simulationPeriod.durationSeconds; t += sampleInterval) {
    // Complete any finished requests
    const completedRequests = sessionManager.completeFinishedRequests(t)

    // Start new requests for ready users
    const readyUsers = sessionManager.getUsersReadyToStart(t)
    for (const userId of readyUsers) {
      sessionManager.startRequest(userId, t, {
        input: totalInputTokens,
        output: totalOutputTokens
      })
    }

    // Get current concurrency
    let currentConcurrency = sessionManager.getCurrentConcurrency(t)

    // Apply time pattern modulation (existing logic)
    const timePattern = TimePattern.BUSINESS_HOURS // TODO: Make configurable
    const timeMultiplier = applyTimePattern(t, 1.0, timePattern)
    currentConcurrency = Math.floor(currentConcurrency * timeMultiplier)

    // Apply request distribution pattern (existing logic)
    const requestDistribution = RequestDistribution.NORMAL // TODO: Make configurable
    const distributionMultiplier = applyRequestDistribution(
      t,
      1.0,
      requestDistribution,
      simulationPeriod.durationSeconds
    )
    currentConcurrency = Math.max(0, Math.floor(currentConcurrency * distributionMultiplier))

    // Track statistics
    peakConcurrency = Math.max(peakConcurrency, currentConcurrency)
    totalConcurrency += currentConcurrency
    sampleCount++

    if (currentConcurrency > 0) {
      // Calculate VRAM for current concurrency
      const vramBreakdown = calculateWorkloadVRAM(
        model,
        totalInputTokens,
        totalOutputTokens,
        currentConcurrency,
        simulationPeriod.precision || ModelPrecision.FP16
      )

      usagePoints.push({
        timestamp: t,
        totalVRAM: vramBreakdown.total,
        breakdown: vramBreakdown,
        activeRequests: sessionManager.getActiveRequests(t).map(req => ({
          id: req.requestId,
          workloadId: req.workloadId,
          startTime: req.startTime,
          estimatedEndTime: req.endTime,
          inputTokens: req.inputTokens,
          expectedOutputTokens: req.outputTokens,
          vramUsage: vramBreakdown.total / currentConcurrency // Approximate per-request
        }))
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

  // Update derived values in simulation period (for UI display)
  simulationPeriod.derivedPeakConcurrency = peakConcurrency
  simulationPeriod.derivedAverageConcurrency = Math.round(totalConcurrency / sampleCount)

  return usagePoints
}
```

**Add Import Statements:**
```typescript
// Add to top of src/services/vramCalculator.ts
import { UserSessionManager } from './userSessionManager'
import { generateThinkTime, estimatePeakConcurrency } from './thinkTimeGenerator'
```

---

### Phase 3: UI Component Updates

#### 3.1 Update SimulationControls Component (`src/components/SimulationControls/index.tsx`)

**Replace State Variables (lines 94-98):**
```typescript
// REMOVE THESE LINES:
const [concurrentUsers, setConcurrentUsers] = useState(config.period.concurrentUsers)

// REPLACE WITH:
const [totalUsers, setTotalUsers] = useState(config.period.totalUsers)
const [maxThinkTime, setMaxThinkTime] = useState(config.period.maxThinkTime)
const [thinkTimeDistribution, setThinkTimeDistribution] = useState<ThinkTimeDistribution>(
  config.period.thinkTimeDistribution
)
const [userBehaviorPattern, setUserBehaviorPattern] = useState<UserBehaviorPattern>(
  config.period.userBehaviorPattern
)
```

**Add New Input Fields (insert after line ~200):**
```tsx
{/* Replace Concurrent Users field with Total Users */}
<Grid item xs={12} md={4}>
  <TextField
    fullWidth
    label="Total Users in System"
    type="number"
    value={totalUsers}
    onChange={(e) => setTotalUsers(Math.max(1, parseInt(e.target.value) || 1))}
    disabled={disabled}
    error={hasErrors(getErrorsForField(validationErrors, 'totalUsers'))}
    helperText={
      hasErrors(getErrorsForField(validationErrors, 'totalUsers'))
        ? formatValidationMessage(getErrorsForField(validationErrors, 'totalUsers')[0])
        : 'Total number of users that will interact with the system'
    }
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <PeopleIcon color="primary" />
        </InputAdornment>
      ),
      endAdornment: (
        <InputAdornment position="end">
          <Tooltip title="Total users who may submit requests during simulation period">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </InputAdornment>
      ),
    }}
    inputProps={{
      min: 1,
      max: 10000,
      step: 1,
    }}
  />
</Grid>

{/* Add User Behavior Pattern Preset */}
<Grid item xs={12} md={4}>
  <FormControl fullWidth disabled={disabled}>
    <InputLabel>User Behavior Pattern</InputLabel>
    <Select
      value={userBehaviorPattern}
      label="User Behavior Pattern"
      onChange={(e: SelectChangeEvent) => {
        const pattern = e.target.value as UserBehaviorPattern
        setUserBehaviorPattern(pattern)

        // Auto-fill think time and distribution from preset
        const preset = USER_BEHAVIOR_PRESETS[pattern]
        if (preset) {
          setMaxThinkTime(preset.maxThinkTime)
          setThinkTimeDistribution(preset.distribution)
        }
      }}
      startAdornment={
        <InputAdornment position="start">
          <TrendingUpIcon color="primary" />
        </InputAdornment>
      }
    >
      {Object.entries(USER_BEHAVIOR_PRESETS).map(([key, preset]) => (
        <MenuItem key={key} value={key}>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {preset.description}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
    <FormHelperText>
      Choose a preset that matches your use case, or select "Custom" to configure manually
    </FormHelperText>
  </FormControl>
</Grid>

{/* Add Maximum Think Time */}
<Grid item xs={12} md={4}>
  <TextField
    fullWidth
    label="Maximum Think Time"
    type="number"
    value={maxThinkTime}
    onChange={(e) => setMaxThinkTime(Math.max(0, parseFloat(e.target.value) || 0))}
    disabled={disabled || userBehaviorPattern !== UserBehaviorPattern.CUSTOM}
    error={hasErrors(getErrorsForField(validationErrors, 'maxThinkTime'))}
    helperText={
      hasErrors(getErrorsForField(validationErrors, 'maxThinkTime'))
        ? formatValidationMessage(getErrorsForField(validationErrors, 'maxThinkTime')[0])
        : userBehaviorPattern !== UserBehaviorPattern.CUSTOM
        ? `Auto-set by behavior pattern: ${maxThinkTime}s`
        : 'Maximum seconds between user requests (0 = continuous requests)'
    }
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <ScheduleIcon color="primary" />
        </InputAdornment>
      ),
      endAdornment: (
        <InputAdornment position="end">
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="caption" color="text.secondary">
              seconds
            </Typography>
            <Tooltip title="Time users spend thinking/working between requests. Higher values = lower concurrency.">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </InputAdornment>
      ),
    }}
    inputProps={{
      min: 0,
      max: 3600,
      step: 1,
    }}
  />
</Grid>

{/* Add Think Time Distribution */}
<Grid item xs={12} md={4}>
  <FormControl fullWidth disabled={disabled || userBehaviorPattern !== UserBehaviorPattern.CUSTOM}>
    <InputLabel>Think Time Distribution</InputLabel>
    <Select
      value={thinkTimeDistribution}
      label="Think Time Distribution"
      onChange={(e: SelectChangeEvent) =>
        setThinkTimeDistribution(e.target.value as ThinkTimeDistribution)
      }
    >
      <MenuItem value={ThinkTimeDistribution.BELL_CURVE}>
        <Box>
          <Typography variant="body2">Bell Curve</Typography>
          <Typography variant="caption" color="text.secondary">
            Most natural - average think times with some variation
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem value={ThinkTimeDistribution.EXPONENTIAL}>
        <Box>
          <Typography variant="body2">Exponential</Typography>
          <Typography variant="caption" color="text.secondary">
            Many quick requests, few long delays (API-like)
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem value={ThinkTimeDistribution.UNIFORM}>
        <Box>
          <Typography variant="body2">Uniform</Typography>
          <Typography variant="caption" color="text.secondary">
            Consistent pacing - equal probability for all think times
          </Typography>
        </Box>
      </MenuItem>
      <MenuItem value={ThinkTimeDistribution.LOGNORMAL}>
        <Box>
          <Typography variant="body2">Log-Normal</Typography>
          <Typography variant="caption" color="text.secondary">
            Human-like behavior with occasional long pauses
          </Typography>
        </Box>
      </MenuItem>
    </Select>
    <FormHelperText>
      {userBehaviorPattern !== UserBehaviorPattern.CUSTOM
        ? `Auto-set by behavior pattern: ${thinkTimeDistribution.replace('_', ' ')}`
        : 'Statistical pattern for think time generation'
      }
    </FormHelperText>
  </FormControl>
</Grid>
```

**Add Derived Concurrency Display (insert after form fields):**
```tsx
{/* Show Derived Concurrency Estimates */}
<Grid item xs={12}>
  <Alert
    severity="info"
    icon={<TrendingUpIcon />}
    sx={{ mt: 2 }}
  >
    <Typography variant="subtitle2" gutterBottom>
      Estimated Concurrency Levels
    </Typography>
    <Box display="flex" gap={3} flexWrap="wrap">
      <Box>
        <Typography variant="caption" color="text.secondary">
          Peak Concurrent Requests:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          ~{estimatePeakConcurrency(
            totalUsers,
            maxThinkTime,
            averageRequestDuration,
            thinkTimeDistribution
          )} users
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Total User Population:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          {totalUsers} users
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Think Time Range:
        </Typography>
        <Typography variant="body2" fontWeight="medium">
          0 - {maxThinkTime}s
        </Typography>
      </Box>
    </Box>
    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
      💡 Peak concurrency is derived from actual user behavior simulation, not a fixed input.
    </Typography>
  </Alert>
</Grid>
```

#### 3.2 Update Configuration Handler

**Update onChange Handler (around line 150):**
```typescript
// UPDATE the handleConfigChange function
const handleConfigChange = useCallback(() => {
  const newConfig: SimulationConfig = {
    ...config,
    period: {
      ...config.period,
      duration: convertToSeconds(duration, timeUnit),
      timeUnit,
      totalUsers,                    // CHANGED: was concurrentUsers
      maxThinkTime,                  // NEW
      thinkTimeDistribution,         // NEW
      userBehaviorPattern,           // NEW
      requestPattern,
      granularity,
      durationSeconds: convertToSeconds(duration, timeUnit),
    },
  }

  onChange(newConfig)
}, [
  config,
  duration,
  timeUnit,
  totalUsers,           // CHANGED: was concurrentUsers
  maxThinkTime,         // NEW
  thinkTimeDistribution, // NEW
  userBehaviorPattern,  // NEW
  requestPattern,
  granularity,
  onChange
])
```

---

### Phase 4: Results Display Updates

#### 4.1 Update ResultsSummary Component (`src/components/ResultsSummary/index.tsx`)

**Add Concurrency Statistics Display:**
```tsx
// ADD after existing metrics display (around line 100)
{/* Add Concurrency Analysis Section */}
<Grid item xs={12}>
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" gutterBottom>
      Concurrency Analysis
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={6} md={3}>
        <Box textAlign="center">
          <Typography variant="h4" color="primary.main" fontWeight="bold">
            {results.simulationPeriod?.derivedPeakConcurrency || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Peak Concurrent Requests
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box textAlign="center">
          <Typography variant="h4" color="secondary.main" fontWeight="bold">
            {results.simulationPeriod?.derivedAverageConcurrency || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Average Concurrent Requests
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box textAlign="center">
          <Typography variant="h4" color="info.main" fontWeight="bold">
            {results.simulationPeriod?.totalUsers || 'N/A'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total Users in System
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={6} md={3}>
        <Box textAlign="center">
          <Typography variant="h4" color="warning.main" fontWeight="bold">
            {results.simulationPeriod?.maxThinkTime || 'N/A'}s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Maximum Think Time
          </Typography>
        </Box>
      </Grid>
    </Grid>

    <Alert severity="success" sx={{ mt: 2 }}>
      <Typography variant="body2">
        <strong>Concurrency Efficiency:</strong> {' '}
        {results.simulationPeriod?.derivedPeakConcurrency && results.simulationPeriod?.totalUsers
          ? `${Math.round(results.simulationPeriod.derivedPeakConcurrency / results.simulationPeriod.totalUsers * 100)}%`
          : 'N/A'
        } of users active simultaneously at peak
      </Typography>
    </Alert>
  </Paper>
</Grid>
```

---

### Phase 5: Default Values and Migration

#### 5.1 Update Default Configuration (`src/constants/index.ts`)

**Add New Defaults:**
```typescript
export const DEFAULT_SIMULATION_CONFIG = {
  period: {
    duration: 1,
    timeUnit: TimeUnit.HOURS,
    totalUsers: 100,                                    // NEW: was concurrentUsers: 50
    maxThinkTime: 30,                                   // NEW: 30 seconds default
    thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE, // NEW: Most natural
    userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT, // NEW: Common use case
    requestPattern: RequestPattern.UNIFORM,
    granularity: 60,
    precision: ModelPrecision.FP16,
    durationSeconds: 3600,
    // Derived values (will be calculated)
    derivedPeakConcurrency: undefined,
    derivedAverageConcurrency: undefined,
  },
} as const
```

#### 5.2 Migration Strategy

**Add Backward Compatibility (`src/utils/configMigration.ts`):**
```typescript
// NEW FILE: src/utils/configMigration.ts
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
```

---

### Phase 6: Testing Requirements

#### 6.1 Unit Tests (`tests/unit/thinkTimeGenerator.test.ts`)

**Create Test File:**
```typescript
// NEW FILE: tests/unit/thinkTimeGenerator.test.ts
import { generateThinkTime, generateThinkTimes, estimatePeakConcurrency } from '../../src/services/thinkTimeGenerator'
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

    test('zero max think time returns zero', () => {
      const result = generateThinkTime(0, ThinkTimeDistribution.BELL_CURVE)
      expect(result).toBe(0)
    })
  })

  describe('estimatePeakConcurrency', () => {
    test('estimates reasonable concurrency for interactive chat', () => {
      const peak = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)
      expect(peak).toBeGreaterThan(5) // Some users concurrent
      expect(peak).toBeLessThan(100) // Not all users
    })

    test('API service with short think time has higher concurrency', () => {
      const apiPeak = estimatePeakConcurrency(100, 0.1, 2, ThinkTimeDistribution.EXPONENTIAL)
      const chatPeak = estimatePeakConcurrency(100, 30, 2, ThinkTimeDistribution.BELL_CURVE)

      expect(apiPeak).toBeGreaterThan(chatPeak)
    })
  })
})
```

#### 6.2 Integration Tests (`tests/integration/realisticSimulation.test.ts`)

**Create Test File:**
```typescript
// NEW FILE: tests/integration/realisticSimulation.test.ts
import { simulateUsageOverTime, generateSimulationResult } from '../../src/services/vramCalculator'
import { UserSessionManager } from '../../src/services/userSessionManager'
import { DEFAULT_WORKLOADS } from '../../src/data/workloads'
import { ThinkTimeDistribution, UserBehaviorPattern, ModelPrecision, TimeUnit, RequestPattern } from '../../src/types'

describe('Realistic Simulation Integration', () => {
  const mockModel = {
    id: 'test-model',
    name: 'Test Model 7B',
    parameters: 7000000000,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      kvHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    // ... rest of model config
  }

  const workloadSlots = [
    {
      id: 'slot1',
      workload: DEFAULT_WORKLOADS[0], // Simple chat
      percentage: 100,
      isActive: true,
      order: 0
    }
  ]

  test('simulation produces realistic concurrency patterns', async () => {
    const simulationPeriod = {
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
    }

    const result = generateSimulationResult(mockModel, workloadSlots, simulationPeriod)

    // Verify derived concurrency values are set
    expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(0)
    expect(simulationPeriod.derivedAverageConcurrency).toBeGreaterThan(0)
    expect(simulationPeriod.derivedPeakConcurrency).toBeGreaterThan(simulationPeriod.derivedAverageConcurrency)

    // Verify realistic concurrency bounds
    expect(simulationPeriod.derivedPeakConcurrency).toBeLessThan(simulationPeriod.totalUsers)

    // Verify VRAM calculations scale with concurrency
    const maxVRAM = result.maxVRAM
    const minVRAM = Math.min(...result.usagePoints.map(p => p.totalVRAM))
    expect(maxVRAM).toBeGreaterThan(minVRAM) // Should have variation
  })

  test('API service pattern has higher concurrency than interactive chat', async () => {
    const chatConfig = {
      totalUsers: 100,
      maxThinkTime: 45,
      thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
      userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
    }

    const apiConfig = {
      totalUsers: 100,
      maxThinkTime: 0.1,
      thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
      userBehaviorPattern: UserBehaviorPattern.API_SERVICE,
    }

    // Run simulations
    const chatResult = generateSimulationResult(mockModel, workloadSlots, {
      ...simulationPeriod,
      ...chatConfig
    })

    const apiResult = generateSimulationResult(mockModel, workloadSlots, {
      ...simulationPeriod,
      ...apiConfig
    })

    // API service should have higher peak concurrency
    expect(apiResult.maxVRAM).toBeGreaterThan(chatResult.maxVRAM)
  })
})
```

---

### Phase 7: Documentation Updates

#### 7.1 Update Technical Documentation

**Add Section to VRAM_Technical_Deep_Dive.md:**
```markdown
## 🔄 Realistic User Behavior Simulation (New Implementation)

### Overview
The updated simulation engine models individual user journeys with realistic think times, replacing the previous "concurrent users" approach with actual user population tracking.

### Key Improvements
1. **Individual User Tracking**: Each user has their own session state
2. **Realistic Think Times**: Configurable delays between requests using statistical distributions
3. **Natural Concurrency**: Peak concurrency emerges from user behavior, not fixed inputs
4. **Workload-Specific Patterns**: Presets for different use cases (chat, API, content creation, etc.)

### User Behavior Patterns
- **Interactive Chat**: 30-45s think times with log-normal distribution
- **API Service**: 0.1s think times with exponential distribution
- **Content Creation**: 60-120s think times with bell curve distribution
- **Data Analysis**: 30s think times with uniform distribution

### Algorithm Flow
1. Initialize user sessions with random initial delays
2. For each timestamp:
   - Complete finished requests
   - Start new requests for ready users
   - Apply time/distribution patterns
   - Calculate VRAM for current concurrency
3. Track peak and average concurrency statistics
```

#### 7.2 Update User Guide

**Add User Guide Section:**
```markdown
## Configuring Realistic User Behavior

### Total Users in System
Enter the total number of users who will interact with your system during the simulation period. This is different from concurrent users - most users will not be active simultaneously.

**Example**: 200 customer support agents using an AI assistant

### User Behavior Patterns
Choose a preset that matches your use case:

- **Interactive Chat**: Human conversations with natural pauses (30-45s think time)
- **API Service**: Automated requests with minimal delays (0.1s think time)
- **Content Creation**: Creative workflows with longer contemplation (60-120s think time)
- **Customer Support**: Support interactions with moderate pacing (20s think time)

### Think Time Distribution
Controls how think times are distributed:

- **Bell Curve**: Most natural - average think times with variation
- **Exponential**: Many quick requests, occasional long delays
- **Log-Normal**: Human-like with occasional very long pauses
- **Uniform**: Consistent pacing across all users

### Understanding Results
The system will show:
- **Peak Concurrent Requests**: Maximum simultaneous users at any point
- **Average Concurrent Requests**: Typical concurrent load
- **Concurrency Efficiency**: Percentage of users active simultaneously

Peak concurrency is typically 5-30% of total users, depending on think times.
```

---

## 🚀 Implementation Checklist

### Phase 1: Type System ✅
- [ ] Add ThinkTimeDistribution enum
- [ ] Add UserBehaviorPattern enum
- [ ] Update SimulationPeriod interface
- [ ] Add UserSession and RequestEvent interfaces
- [ ] Update validation schemas
- [ ] Add behavior pattern presets

### Phase 2: Calculation Engine ✅
- [ ] Create thinkTimeGenerator.ts service
- [ ] Create userSessionManager.ts service
- [ ] Rewrite simulateUsageOverTime function
- [ ] Add import statements
- [ ] Update derived value calculations

### Phase 3: UI Components ✅
- [ ] Update SimulationControls component
- [ ] Replace concurrentUsers with totalUsers
- [ ] Add maxThinkTime input field
- [ ] Add behavior pattern selector
- [ ] Add distribution selector
- [ ] Add derived concurrency display
- [ ] Update configuration handlers

### Phase 4: Results Display ✅
- [ ] Update ResultsSummary component
- [ ] Add concurrency analysis section
- [ ] Show peak/average concurrency
- [ ] Add efficiency metrics

### Phase 5: Migration & Compatibility ✅
- [ ] Add backward compatibility
- [ ] Create config migration utility
- [ ] Update default values
- [ ] Handle deprecated fields

### Phase 6: Testing ✅
- [ ] Create unit tests for think time generation
- [ ] Create integration tests for simulation
- [ ] Test behavior pattern presets
- [ ] Validate concurrency calculations

### Phase 7: Documentation ✅
- [ ] Update technical deep dive document
- [ ] Add user guide sections
- [ ] Document migration path
- [ ] Add troubleshooting guide

---

## 🎯 Success Criteria

### Functional Requirements
✅ **Accurate Modeling**: Peak concurrency derived from realistic user behavior
✅ **Configurable**: Multiple behavior patterns and distributions
✅ **Backward Compatible**: Existing configurations migrate automatically
✅ **Performance**: Simulations complete in <2 seconds for typical workloads
✅ **Intuitive**: Clear UI with helpful presets and explanations

### Technical Requirements
✅ **Type Safety**: Full TypeScript coverage with strict mode
✅ **Testable**: Comprehensive unit and integration test coverage
✅ **Maintainable**: Clean separation between UI, business logic, and calculation engine
✅ **Extensible**: Easy to add new behavior patterns and distributions

### User Experience
✅ **Progressive Disclosure**: Simple defaults with advanced options available
✅ **Helpful Guidance**: Tooltips, examples, and preset explanations
✅ **Visual Feedback**: Real-time derived concurrency estimates
✅ **Clear Results**: Easy-to-understand concurrency analysis

---

This implementation plan provides a complete roadmap for transforming VRAM Magic into a realistic user behavior simulation engine that accurately models real-world LLM workload patterns.