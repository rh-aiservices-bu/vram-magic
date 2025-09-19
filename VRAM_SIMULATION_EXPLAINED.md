# VRAM Magic: Complete Simulation Process Explained

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Phase 1: VRAM Components Calculation](#phase-1-vram-components-calculation)
4. [Phase 2: Workload Processing](#phase-2-workload-processing)
5. [Phase 3: Time-Based Simulation](#phase-3-time-based-simulation)
6. [Phase 4: Results Generation](#phase-4-results-generation)
7. [Complete Worked Example](#complete-worked-example)
8. [Advanced Patterns](#advanced-patterns)
9. [GPU Selection Logic](#gpu-selection-logic)

## Overview

VRAM Magic is a sophisticated calculator that predicts GPU memory requirements for Large Language Model (LLM) deployments. It simulates real-world usage patterns over time, considering model architecture, workload characteristics, and temporal patterns to generate accurate VRAM estimates.

### Key Innovation

Unlike simple calculators that provide static estimates, VRAM Magic simulates actual usage patterns over time, showing how memory consumption fluctuates based on user activity, request patterns, and workload distribution.

## Core Concepts

### Memory Precision Types

```
FP32 (32-bit floating point) = 4 bytes per parameter
FP16 (16-bit floating point) = 2 bytes per parameter
INT8 (8-bit integer)         = 1 byte per parameter
INT4 (4-bit integer)         = 0.5 bytes per parameter
```

### Key Terms

- **Parameters**: The number of weights in the model (e.g., 7 billion for Llama 2 7B)
- **Sequence Length**: Total tokens processed (input + output)
- **Batch Size**: Number of requests processed simultaneously
- **KV-Cache**: Key-Value cache storing attention states during generation
- **Activations**: Intermediate computational results during inference

## Phase 1: VRAM Components Calculation

The total VRAM requirement consists of four main components:

### 1. Base Model Memory

The memory needed to load the model weights into GPU memory.

```
Formula: Base_Model = Parameters × Precision_Bytes × 1.2

Where:
- Parameters: Number of model weights (e.g., 7,000,000,000)
- Precision_Bytes: Bytes per parameter (e.g., 2 for FP16)
- 1.2: Overhead factor (20% extra for model metadata, buffers)
```

**Example Calculation:**

```
Llama 2 7B in FP16:
Base_Model = 7,000,000,000 × 2 × 1.2
         = 16,800,000,000 bytes
         = 15.65 GB
```

### 2. KV-Cache Memory

Memory for storing attention keys and values during generation.

```
Formula: KV_Cache = 2 × Layers × Hidden_Size × Sequence_Length × Batch_Size × Precision_Bytes

Where:
- 2: Factor for Keys and Values
- Layers: Number of transformer layers (e.g., 32)
- Hidden_Size: Hidden dimension size (e.g., 4096)
- Sequence_Length: Total tokens (input + output)
- Batch_Size: Concurrent requests
- Precision_Bytes: Memory precision
```

**Example Calculation:**

```
For 2048 tokens, batch size 4, FP16:
KV_Cache = 2 × 32 × 4096 × 2048 × 4 × 2
        = 4,294,967,296 bytes
        = 4.0 GB
```

### 3. Activation Memory

Memory for intermediate computation results.

```
Formula: Activations = Hidden_Size × Sequence_Length × Batch_Size × Precision_Bytes × 4

Where:
- 4: Factor for intermediate activation layers
- Other parameters same as KV-Cache
```

**Example Calculation:**

```
For same parameters as above:
Activations = 4096 × 2048 × 4 × 2 × 4
           = 268,435,456 bytes
           = 256 MB
```

### 4. System Overhead

Additional memory for system operations.

```
Formula: Overhead = (Base_Model + KV_Cache) × 0.1

- 10% of model and KV-cache memory
```

**Example Calculation:**

```
Overhead = (16,800,000,000 + 4,294,967,296) × 0.1
        = 2,109,496,730 bytes
        = 1.96 GB
```

### Total VRAM Calculation

```
Total_VRAM = Base_Model + KV_Cache + Activations + Overhead
          = 15.65 GB + 4.0 GB + 0.256 GB + 1.96 GB
          = 21.87 GB
```

## Phase 2: Workload Processing

### Workload Configuration

The system supports mixed workloads with up to 5 concurrent slots:

```javascript
WorkloadSlot = {
  workload: {
    name: "Customer Support Chat",
    inputTokens: 512,
    outputTokens: 256,
    category: "chat"
  },
  percentage: 40,  // 40% of total load
  isActive: true
}
```

### Weighted Token Calculation

For multiple workloads, the system calculates weighted averages:

```
Total_Input_Tokens = Σ(Workload_Input_Tokens × Percentage / 100)
Total_Output_Tokens = Σ(Workload_Output_Tokens × Percentage / 100)
```

**Example with 3 Workloads:**

```
Workload 1: Chat (40%) - 512 input, 256 output
Workload 2: Code (35%) - 1024 input, 512 output
Workload 3: RAG (25%) - 2048 input, 128 output

Total_Input = (512×0.4) + (1024×0.35) + (2048×0.25)
           = 204.8 + 358.4 + 512
           = 1075.2 tokens

Total_Output = (256×0.4) + (512×0.35) + (128×0.25)
            = 102.4 + 179.2 + 32
            = 313.6 tokens

Effective_Sequence_Length = 1075.2 + 313.6 = 1388.8 tokens
```

## Phase 3: Time-Based Simulation

### Request Generation

The simulation generates request timestamps based on distribution patterns:

#### Uniform Distribution

```javascript
timestamp = (i / totalRequests) × durationSeconds
```

Requests are evenly spaced throughout the period.

#### Front-Loaded Distribution

```javascript
if (i/totalRequests < 0.7) {
  // 70% of requests in first 30% of time
  timestamp = (i/0.7) × (duration × 0.3)
} else {
  // 30% of requests in remaining 70% of time
  timestamp = duration × 0.3 + ((i-0.7)/0.3) × (duration × 0.7)
}
```

#### Bell Curve Distribution

```javascript
timestamp = sin((i/totalRequests) × π) × duration
```

Creates a normal distribution centered at midpoint.

### Time Pattern Modulation

Time patterns modify the base load based on time of day:

#### Business Hours Pattern (9am-5pm peak)

```javascript
hour = (timestamp / 3600) % 24
if (hour >= 9 && hour <= 17) {
  multiplier = 1.5  // 50% increase
} else if (hour >= 22 || hour <= 6) {
  multiplier = 0.3  // 70% decrease overnight
} else {
  multiplier = 1.0  // Normal load
}
```

#### Creative Hours Pattern (Evening peak)

```javascript
if (hour >= 18 && hour <= 23) {
  multiplier = 1.8  // 80% increase evening
} else if (hour >= 9 && hour <= 17) {
  multiplier = 1.1  // 10% increase day
} else {
  multiplier = 0.4  // 60% decrease overnight
}
```

### Concurrent Users Calculation

For each timestamp, the system calculates active concurrent users:

```javascript
function calculateConcurrentUsers(timestamp, requestTimestamps, avgDuration) {
  concurrent = 0
  for (requestStart of requestTimestamps) {
    requestEnd = requestStart + avgDuration
    if (requestStart <= timestamp && timestamp < requestEnd) {
      concurrent++
    }
  }
  return concurrent
}
```

### Request Duration Estimation

```
Average_Duration = Output_Tokens × 0.01 seconds
                = Output_Tokens × 10ms
```

For 256 output tokens: 2.56 seconds average request duration

## Phase 4: Results Generation

### Sampling Strategy

The simulation samples at intervals to create ~100 data points:

```javascript
sampleInterval = Math.max(1, Math.floor(duration / 100))

for (t = 0; t <= duration; t += sampleInterval) {
  // Calculate VRAM at time t
  concurrentUsers = calculateConcurrentUsers(t, ...)
  vram = calculateWorkloadVRAM(model, tokens, concurrentUsers, precision)
  dataPoints.push({timestamp: t, vram: vram})
}
```

### Metrics Calculation

```javascript
maxVRAM = Math.max(...dataPoints.map(p => p.totalVRAM))
avgVRAM = dataPoints.reduce((sum, p) => sum + p.totalVRAM) / dataPoints.length
peakTime = dataPoints.find(p => p.totalVRAM === maxVRAM).timestamp
```

### GPU Recommendations

Based on peak VRAM requirements:

```javascript
if (maxVRAM <= 8 GB) {
  recommend: ["RTX 3060 Ti (8GB)", "RTX 4060 Ti (8GB)"]
} else if (maxVRAM <= 16 GB) {
  recommend: ["RTX 4060 Ti (16GB)", "RTX 4070 Ti (16GB)"]
} else if (maxVRAM <= 24 GB) {
  recommend: ["RTX 3090 (24GB)", "RTX 4090 (24GB)"]
} else if (maxVRAM <= 48 GB) {
  recommend: ["RTX 6000 Ada (48GB)", "A6000 (48GB)"]
} else if (maxVRAM <= 80 GB) {
  recommend: ["A100 (80GB)", "H100 (80GB)"]
} else {
  recommend: ["Multiple GPU Setup Required"]
}
```

## Complete Worked Example

### Scenario: E-commerce Customer Support

**Model:** Llama 2 7B
**Precision:** FP16
**Workloads:**

- Chat Support (60%): 512 input, 256 output tokens
- Product Search (40%): 1024 input, 128 output tokens

**Simulation:** 1 hour, up to 50 concurrent users, business hours pattern

### Step 1: Calculate Base Model Memory

```
Base = 7,000,000,000 × 2 × 1.2 = 16.8 GB
```

### Step 2: Calculate Effective Tokens

```
Input = (512 × 0.6) + (1024 × 0.4) = 307.2 + 409.6 = 716.8
Output = (256 × 0.6) + (128 × 0.4) = 153.6 + 51.2 = 204.8
Total Sequence = 716.8 + 204.8 = 921.6 ≈ 922 tokens
```

### Step 3: Calculate Request Duration

```
Duration = 204.8 × 0.01 = 2.048 seconds per request
```

### Step 4: Calculate Total Requests

```
Requests/Second = 50 users / 2.048 seconds = 24.4
Total Requests = 24.4 × 3600 seconds = 87,840 requests
```

### Step 5: Sample Calculation at Peak (2pm, 30 concurrent users)

**KV-Cache:**

```
KV = 2 × 32 × 4096 × 922 × 30 × 2
  = 14,495,907,840 bytes = 13.5 GB
```

**Activations:**

```
Act = 4096 × 922 × 30 × 2 × 4
    = 905,994,240 bytes = 864 MB
```

**Overhead:**

```
Overhead = (16.8 GB + 13.5 GB) × 0.1 = 3.03 GB
```

**Total at Peak:**

```
Total = 16.8 + 13.5 + 0.864 + 3.03 = 34.2 GB
```

### Step 6: Sample Calculation at Low (3am, 5 concurrent users)

**KV-Cache:**

```
KV = 2 × 32 × 4096 × 922 × 5 × 2 = 2.25 GB
```

**Activations:**

```
Act = 4096 × 922 × 5 × 2 × 4 = 144 MB
```

**Overhead:**

```
Overhead = (16.8 + 2.25) × 0.1 = 1.9 GB
```

**Total at Low:**

```
Total = 16.8 + 2.25 + 0.144 + 1.9 = 21.1 GB
```

### Results Summary

- **Peak VRAM:** 34.2 GB (2pm, business hours)
- **Low VRAM:** 21.1 GB (3am, overnight)
- **Average VRAM:** ~28 GB
- **Recommended GPUs:** RTX 6000 Ada (48GB), A6000 (48GB)

## Advanced Patterns

### Burst Pattern Calculation

For extreme burst scenarios with 10x multiplier:

```javascript
if (isBurst) {
  concurrent = baseUsers × 10
  // KV-Cache scales linearly
  kvCache = baseKV × 10
  // Total can spike dramatically
  totalVRAM = baseModel + (kvCache × 10) + (activations × 10) + overhead
}
```

### Viral Response Pattern

Exponential growth over time:

```javascript
growthFactor = Math.exp(timestamp / 3600)  // Exponential per hour
concurrent = Math.min(baseUsers × growthFactor, baseUsers × 10)
```

### Global Timezone Pattern

Three peaks for major regions:

```javascript
americas = sin(progress × 2π) × 0.5
europe = sin(progress × 2π + π/3) × 0.3
asia = sin(progress × 2π + 2π/3) × 0.2
totalMultiplier = 1 + Math.abs(americas + europe + asia)
```

## GPU Selection Logic

### Efficiency Calculation

```javascript
utilizationRate = (requiredVRAM / gpuVRAM) × 100

if (utilizationRate < 50) {
  efficiency = "low"  // Underutilized
} else if (utilizationRate < 80) {
  efficiency = "medium"  // Good headroom
} else if (utilizationRate < 95) {
  efficiency = "high"  // Well utilized
} else {
  efficiency = "risky"  // Too close to limit
}
```

### Multi-GPU Recommendations

When single GPU insufficient:

```javascript
if (requiredVRAM > 80) {
  numGPUs = Math.ceil(requiredVRAM / 80)
  recommend = `${numGPUs}x H100 (80GB) in parallel`

  // Account for overhead
  effectiveVRAM = numGPUs × 80 × 0.9  // 10% overhead for multi-GPU
}
```

## Key Insights

### Memory Scaling Factors

1. **Linear with Batch Size**: KV-Cache and Activations scale linearly with concurrent users
2. **Linear with Sequence Length**: All dynamic memory components scale with token count
3. **Constant Base**: Model weights remain constant regardless of load
4. **Precision Impact**: Moving from FP32→FP16 cuts memory by 50%, FP16→INT8 by another 50%

### Optimization Strategies

1. **Precision Reduction**: FP16 offers best quality/memory tradeoff
2. **Batch Size Control**: Limiting concurrent users caps memory growth
3. **Sequence Length Limits**: Capping max tokens prevents runaway memory
4. **Time-based Scaling**: Scale resources based on usage patterns
5. **Workload Prioritization**: Allocate more memory to critical workloads

### Common Pitfalls

1. **Ignoring KV-Cache**: Can be larger than model weights at high concurrency
2. **Static Estimates**: Real usage varies dramatically over time
3. **Missing Overhead**: System needs 10-20% extra memory
4. **Precision Mismatches**: Training vs inference precision differences
5. **Burst Scenarios**: Not accounting for traffic spikes

## Conclusion

VRAM Magic provides a comprehensive simulation framework that:

- Models real-world usage patterns accurately
- Accounts for all memory components
- Simulates temporal variations
- Provides actionable GPU recommendations
- Helps optimize deployment costs

The key to accurate predictions is understanding that VRAM usage is highly dynamic, driven by:

- Number of concurrent users
- Token lengths in workloads
- Time-based usage patterns
- Request distribution patterns
- Model architecture specifics

By simulating these factors over time, VRAM Magic enables informed decisions about GPU selection and capacity planning for LLM deployments.
