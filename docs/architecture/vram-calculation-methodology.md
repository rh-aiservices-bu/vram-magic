# VRAM Magic: Calculation Methodology Architecture

## Overview

VRAM Magic employs a sophisticated three-phase calculation methodology to accurately estimate GPU memory requirements for Large Language Model (LLM) deployments. This document provides a comprehensive explanation of how the system transforms user inputs into realistic VRAM usage patterns over time.

The calculation pipeline consists of three main phases:

1. **Model Selection Phase** - Configure LLM architectural parameters and precision settings
2. **Workload Pattern Creation Phase** - Define and combine workload types with percentage distributions
3. **Usage Over Time Simulation Phase** - Generate realistic user behavior patterns and calculate time-based VRAM usage

This approach replaces traditional simplistic "concurrent users" models with realistic user behavior simulation that accounts for think times, request patterns, and natural concurrency emergence.

---

## Phase 1: Model Selection

### Purpose
The model selection phase establishes the foundation for all VRAM calculations by defining the LLM's architectural parameters and memory precision requirements.

### Key Components

#### 1.1 Model Architecture Parameters
The system captures essential architectural details that directly impact memory consumption:

```typescript
interface ModelArchitecture {
  layers: number                    // Number of transformer layers
  hiddenSize: number               // Hidden dimension size
  attentionHeads: number           // Number of attention heads
  kvHeads?: number                 // KV heads for Grouped Query Attention (GQA)
  headDim?: number                 // Dimension per attention head
  vocabularySize: number           // Size of the vocabulary
  maxSequenceLength: number        // Maximum supported sequence length
}
```

#### 1.2 Memory Precision Settings
Users can select from different numerical precisions that significantly affect memory usage:

- **FP32** (32-bit floating point): 4 bytes per parameter - Highest accuracy, maximum memory
- **FP16** (16-bit floating point): 2 bytes per parameter - Good balance of accuracy and efficiency
- **INT8** (8-bit integer): 1 byte per parameter - Quantized, reduced accuracy
- **INT4** (4-bit integer): 0.5 bytes per parameter - Highly quantized, minimal memory

#### 1.3 vLLM Optimizations
Advanced configurations for production deployment optimizations:

```typescript
interface VLLMOptimizations {
  blockSize: number                // KV-cache block size (typically 16 tokens)
  memoryPoolOverhead: number       // Pre-allocation overhead (typically 15%)
  continuousBatching: boolean      // Enables continuous batching optimization
  pagedAttention: boolean          // Uses PagedAttention for efficient memory management
}
```

### Calculation Impact
Model parameters directly feed into the base memory calculation:

```
Base Model Memory = Parameters × Precision Bytes × 1.2 (overhead factor)
```

**Example**: Llama 2 7B with FP16 precision:
- Parameters: 7,000,000,000
- Precision: 2 bytes (FP16)
- Base Memory = 7B × 2 × 1.2 = 16.8 GB

---

## Phase 2: Workload Pattern Creation

### Purpose
The workload pattern creation phase defines what types of tasks the LLM will perform and combines them into a realistic usage distribution.

### 2.1 Workload Types
The system provides predefined workload categories optimized for different use cases:

#### Chat Workloads
- **Simple Chat**: 150 input + 100 output tokens (basic Q&A)
- **Detailed Chat**: 300 input + 500 output tokens (complex explanations)
- **Customer Support**: 250 input + 200 output tokens (contextual responses)

#### RAG (Retrieval Augmented Generation) Workloads
- **Document Q&A**: 2000 input + 400 output tokens (large context searches)
- **Knowledge Base**: 1500 input + 300 output tokens (structured queries)
- **Research Assistant**: 3000 input + 800 output tokens (complex synthesis)

#### Coding Workloads
- **Code Generation**: 400 input + 600 output tokens (function creation)
- **Code Review**: 1200 input + 300 output tokens (analysis and feedback)
- **Debug Assistance**: 800 input + 400 output tokens (error investigation)

#### Creative Workloads
- **Creative Writing**: 200 input + 800 output tokens (story/content generation)
- **Content Editing**: 1000 input + 500 output tokens (revision and improvement)

#### Analysis Workloads
- **Data Analysis**: 1500 input + 600 output tokens (insight generation)
- **Report Generation**: 2000 input + 1000 output tokens (comprehensive reporting)

### 2.2 Workload Slot Configuration
Users configure up to 5 workload slots with percentage distributions:

```typescript
interface WorkloadSlot {
  id: string
  workload: Workload | null      // Selected workload type
  percentage: number             // Percentage of total requests (0-100)
  isActive: boolean              // Whether this slot contributes to calculations
  order: number                  // Display order in UI
}
```

**Constraint**: Total percentages across active slots must equal 100%

### 2.3 Weighted Token Calculation
The system calculates effective token counts by combining workloads based on their percentages:

```typescript
const totalInputTokens = activeSlots.reduce(
  (sum, slot) => sum + (slot.workload.inputTokens * slot.percentage) / 100,
  0
)
const totalOutputTokens = activeSlots.reduce(
  (sum, slot) => sum + (slot.workload.outputTokens * slot.percentage) / 100,
  0
)
```

**Example Configuration**:
- Slot 1: Simple Chat (60%) = 150×0.6 + 100×0.6 = 90 + 60 tokens
- Slot 2: Document Q&A (40%) = 2000×0.4 + 400×0.4 = 800 + 160 tokens
- **Total**: 890 input + 220 output tokens (weighted average)

---

## Phase 3: Usage Over Time Simulation

### Purpose
The usage over time simulation phase generates realistic user behavior patterns that determine actual VRAM consumption throughout the simulation period.

### 3.1 Realistic User Behavior Model

#### Traditional vs. New Approach
- **OLD**: Fixed concurrent users processing continuously
- **NEW**: Total user population with realistic think times and natural concurrency emergence

#### User Behavior Patterns
The system provides preset patterns for different use cases:

| Pattern | Max Think Time | Distribution | Description |
|---------|---------------|--------------|-------------|
| Interactive Chat | 45s | Log-Normal | Human conversations with natural pauses |
| API Service | 0.1s | Exponential | Automated requests with minimal delays |
| Content Creation | 120s | Bell Curve | Creative workflows with contemplation periods |
| Data Analysis | 30s | Uniform | Analytical queries with consistent pacing |
| Code Assistance | 60s | Exponential | Development workflows with coding pauses |
| Customer Support | 20s | Bell Curve | Support interactions with moderate timing |
| Research Queries | 90s | Log-Normal | Research workflows with variable exploration |

### 3.2 Think Time Generation
The system uses statistical distributions to generate realistic think times:

#### Bell Curve (Normal Distribution)
```typescript
// Box-Muller transform for normal distribution
const u1 = Math.random() || 0.01
const u2 = Math.random()
const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

const mean = maxThinkTime / 2
const stdDev = maxThinkTime / 6
const thinkTime = mean + z0 * stdDev
```

#### Exponential Distribution
```typescript
// Many short delays, few long ones (API-like behavior)
const lambda = 3 / maxThinkTime
const uniform = Math.random()
const thinkTime = -Math.log(1 - uniform) / lambda
```

#### Log-Normal Distribution
```typescript
// Realistic human behavior with occasional long pauses
const mu = Math.log(maxThinkTime / 3)  // Median at 1/3 of max
const sigma = 0.8                      // Shape parameter
const thinkTime = Math.exp(mu + sigma * z0)
```

### 3.3 User Session Management
Individual user sessions are tracked throughout the simulation:

```typescript
interface UserSession {
  userId: number
  nextRequestTime: number          // When user will submit next request
  lastRequestEnd: number           // When last request completed
  totalRequests: number            // Total requests submitted
  currentThinkTime: number         // Current think time duration
  isProcessingRequest: boolean     // Whether user has active request
}
```

#### Session Lifecycle
1. **Initialization**: Each user gets random initial delay based on think time distribution
2. **Request Submission**: Users submit requests when ready (nextRequestTime ≤ currentTime)
3. **Processing**: Requests are processed for calculated duration
4. **Completion**: New think time is generated, next request time is scheduled
5. **Repeat**: Cycle continues throughout simulation period

### 3.4 Concurrency Calculation
Real concurrency emerges naturally from user behavior:

```typescript
// At each timestamp:
// 1. Complete finished requests
sessionManager.completeFinishedRequests(timestamp)

// 2. Start new requests for ready users
const readyUsers = sessionManager.getUsersReadyToStart(timestamp)
for (const userId of readyUsers) {
  sessionManager.startRequest(userId, timestamp, workloadTokens)
}

// 3. Calculate current concurrency
const currentConcurrency = sessionManager.getCurrentConcurrency(timestamp)
```

### 3.5 Time Pattern Modulation
Request patterns can be modified by time-of-day and distribution patterns:

#### Business Hours Pattern
```typescript
const hour = (timestamp / 3600) % 24
if (hour >= 9 && hour <= 17) {
  return baseMultiplier * 1.5      // Peak during business hours
} else if (hour >= 22 || hour <= 6) {
  return baseMultiplier * 0.3      // Low overnight
}
```

#### Request Distribution Patterns
- **Normal**: Steady baseline load
- **Bursty**: Random bursts with quiet periods
- **Bell Curve**: Peak activity in simulation middle
- **Front/Back Loaded**: Higher activity at beginning/end

---

## Core VRAM Calculation Formulas

### Base Model Memory
```
Base Memory = Parameters × Precision Bytes × 1.2 (overhead)
```

### KV-Cache Memory (with GQA Support)
```
KV Cache = 2 × Layers × KV_Heads × Head_Dim × Sequence_Length × Batch_Size × Precision
```

**Key Enhancement**: Uses `kvHeads` for Grouped Query Attention models, not `attentionHeads`

### Activation Memory (Inference Optimized)
```
Activations = Hidden_Size × Sequence_Length × Batch_Size × Precision × 1.5
```

**Note**: Uses 1.5x multiplier for inference (not 4x for training)

### Total VRAM Calculation
```
Total VRAM = Base Model + KV Cache + Activations + System Overhead
System Overhead = (Base Model + KV Cache) × 0.1
```

### Sequence Length Calculation
```
Sequence Length = min(Input Tokens + Output Tokens, Model Max Sequence Length)
Batch Size = min(Current Concurrency, 128)  // Capped for efficiency
```

---

## Request Duration Modeling

### Duration Calculation
Request duration is estimated based on output token count:

```typescript
const averageRequestDuration = Math.max(1, Math.floor(totalOutputTokens * 0.01))
```

This provides a simple approximation where longer responses take more time to generate.

### Concurrency Impact
Higher concurrency leads to:
- Increased KV-cache memory (scales with batch size)
- Increased activation memory (scales with batch size)
- Higher total VRAM requirements

---

## Simulation Output

### VRAM Usage Points
The simulation generates time-series data points:

```typescript
interface VRAMUsagePoint {
  timestamp: number                // Time in seconds
  totalVRAM: number               // Total VRAM usage in bytes
  breakdown: VRAMBreakdown        // Component breakdown
  activeRequests: RequestInfo[]   // Currently processing requests
}
```

### Derived Metrics
The simulation calculates key statistics:

- **Peak Concurrency**: Maximum simultaneous users at any point
- **Average Concurrency**: Mean concurrent users over simulation
- **Peak VRAM**: Maximum memory usage reached
- **Average VRAM**: Mean memory usage over time
- **Concurrency Efficiency**: Peak concurrency / Total users ratio

### GPU Recommendations
Based on peak VRAM requirements, the system suggests appropriate GPUs:

| VRAM Range | Recommended GPUs |
|------------|-----------------|
| ≤ 4GB | GTX 1650, RTX 3050 |
| ≤ 8GB | RTX 3060 Ti, RTX 4060 Ti |
| ≤ 12GB | RTX 3060 12GB, RTX 4060 Ti 16GB |
| ≤ 16GB | RTX 4060 Ti 16GB, RTX 4070 |
| ≤ 24GB | RTX 3090, RTX 4090, RTX 6000 Ada |
| ≤ 48GB | RTX 6000 Ada, A6000 |
| ≤ 80GB | A100, H100 |
| > 80GB | Multiple GPU Setup Required |

---

## Example Calculation Walkthrough

### Scenario Setup
- **Model**: Llama 2 7B (FP16 precision)
- **Workloads**: 70% Simple Chat + 30% Document Q&A
- **Users**: 100 total users, Interactive Chat pattern (45s max think time)
- **Duration**: 1 hour simulation

### Step 1: Model Memory
```
Base Memory = 7B parameters × 2 bytes × 1.2 = 16.8 GB
```

### Step 2: Workload Calculation
```
Input Tokens = (150 × 0.7) + (2000 × 0.3) = 105 + 600 = 705 tokens
Output Tokens = (100 × 0.7) + (400 × 0.3) = 70 + 120 = 190 tokens
Total Sequence = 705 + 190 = 895 tokens
Request Duration = 190 × 0.01 = 1.9 seconds
```

### Step 3: User Behavior Simulation
```
Think Time Distribution: Log-Normal (realistic human behavior)
Average Think Time: ~15 seconds (varies by distribution)
Estimated Peak Concurrency: ~12 users (from queuing theory)
```

### Step 4: VRAM at Peak Concurrency
```
KV Cache = 2 × 32 layers × 32 heads × 128 head_dim × 895 seq × 12 batch × 2 bytes
         = 2 × 32 × 32 × 128 × 895 × 12 × 2 = 3.5 GB

Activations = 4096 hidden × 895 seq × 12 batch × 2 bytes × 1.5
            = 4096 × 895 × 12 × 2 × 1.5 = 132 MB

Overhead = (16.8 + 3.5) × 0.1 = 2.0 GB

Total Peak VRAM = 16.8 + 3.5 + 0.13 + 2.0 = 22.4 GB
```

### Step 5: GPU Recommendation
**Recommended**: RTX 3090 (24GB) or RTX 4090 (24GB)

---

## Implementation Details

### Key Service Files
- `src/services/vramCalculator.ts` - Core calculation engine
- `src/services/userSessionManager.ts` - User behavior simulation
- `src/services/thinkTimeGenerator.ts` - Statistical think time generation

### Configuration Types
- `SimulationPeriod` - Time period and user behavior settings
- `WorkloadSlot` - Workload configuration with percentages
- `UserSession` - Individual user state tracking
- `VRAMUsagePoint` - Time-series output data

### Validation
The system validates all inputs:
- User count: 1-10,000 users
- Think time: 0-3,600 seconds
- Workload percentages: Must sum to 100%
- Duration: Reasonable time periods

---

## Benefits of This Approach

### Realistic Modeling
- Models actual user behavior with think times
- Accounts for natural concurrency patterns
- Provides accurate peak and average load estimates

### Flexible Configuration
- Multiple user behavior presets
- Customizable think time distributions
- Comprehensive workload library

### Production Ready
- Incorporates vLLM optimizations
- Supports modern GPU architectures
- Provides actionable GPU recommendations

### Accurate Calculations
- Uses correct formulas for GQA models
- Optimized for inference workloads
- Accounts for system overhead

This methodology provides VRAM Magic users with accurate, realistic estimates for LLM deployment planning based on actual usage patterns rather than theoretical peak loads.