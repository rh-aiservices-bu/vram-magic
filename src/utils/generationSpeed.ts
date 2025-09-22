/**
 * Generation Speed Calculator for vLLM
 *
 * Implements realistic token generation speed based on:
 * - GPU type and architecture
 * - Batch size effects (non-linear scaling)
 * - Workload type (chat, code, RAG, etc.)
 * - Precision (FP16, INT8, INT4)
 * - Prefill vs generation phases
 */

import { Model, Workload, PerformanceMetrics } from '../types';

interface SpeedBreakdown {
  base: number;
  workloadMultiplier: number;
  batchEfficiency: number;
  precisionMultiplier: number;
  final: number;
}

interface GenerationSpeedResult {
  tokensPerSecond: number;
  breakdown: SpeedBreakdown;
}

interface DurationBreakdown {
  prefillTime: number;
  generationTime: number;
  timeToFirstToken: number;
  tokensPerSecond: number;
  prefillTokensPerSecond: number;
}

interface RequestDurationResult {
  totalSeconds: number;
  breakdown: DurationBreakdown;
}

interface ThroughputResult {
  requestsPerSecond: number;
  avgDurationSeconds: number;
  tokensPerSecond: number;
  utilizationPercent: number;
}

/**
 * Calculate realistic generation speed based on model, GPU, and workload
 */
export function getGenerationSpeed(
  model: Model,
  gpuType: string,
  workloadType: string,
  batchSize: number,
  precision: string = 'fp16'
): GenerationSpeedResult {
  // Find GPU performance data for this model
  const gpuPerf = model.performance.find((p: PerformanceMetrics) => p.gpuType === gpuType);

  if (!gpuPerf) {
    console.warn(`No performance data for ${model.name} on ${gpuType}, using defaults`);
    return {
      tokensPerSecond: 50, // Conservative default
      breakdown: {
        base: 50,
        workloadMultiplier: 1.0,
        batchEfficiency: 1.0,
        precisionMultiplier: 1.0,
        final: 50
      }
    };
  }

  // Get base speed (prefer new field name, fall back to old)
  const baseSpeed = gpuPerf.baseTokensPerSecond || gpuPerf.tokensPerSecond || 50;

  // Apply workload-specific multiplier
  const workloadMultipliers = gpuPerf.workloadMultipliers || {
    chat: 1.0,
    code: 0.85,
    rag: 0.70,
    summarization: 0.80,
    translation: 0.90,
    creative: 0.75,
    analysis: 0.80
  };
  const workloadMultiplier = workloadMultipliers[workloadType as keyof typeof workloadMultipliers] || 1.0;

  // Calculate batch size efficiency (non-linear scaling)
  let batchEfficiency = 1.0;
  if (gpuPerf.batchScaling) {
    // Find the two closest batch sizes and interpolate
    const batchSizes = Object.keys(gpuPerf.batchScaling)
      .map(Number)
      .sort((a, b) => a - b);

    if (batchSize <= batchSizes[0]) {
      // Below minimum, use minimum efficiency
      batchEfficiency = gpuPerf.batchScaling[batchSizes[0].toString()];
    } else if (batchSize >= batchSizes[batchSizes.length - 1]) {
      // Above maximum, use maximum efficiency
      batchEfficiency = gpuPerf.batchScaling[batchSizes[batchSizes.length - 1].toString()];
    } else {
      // Interpolate between two closest values
      for (let i = 0; i < batchSizes.length - 1; i++) {
        if (batchSize >= batchSizes[i] && batchSize <= batchSizes[i + 1]) {
          const lower = batchSizes[i];
          const upper = batchSizes[i + 1];
          const ratio = (batchSize - lower) / (upper - lower);
          const lowerEff = gpuPerf.batchScaling[lower.toString()];
          const upperEff = gpuPerf.batchScaling[upper.toString()];
          batchEfficiency = lowerEff + (upperEff - lowerEff) * ratio;
          break;
        }
      }
    }
  } else {
    // Default batch scaling if not specified
    if (batchSize <= 1) batchEfficiency = 0.4;
    else if (batchSize <= 4) batchEfficiency = 0.85;
    else if (batchSize <= 8) batchEfficiency = 1.0;
    else if (batchSize <= 16) batchEfficiency = 1.15;
    else batchEfficiency = 1.25;
  }

  // Precision adjustment
  const precisionMultipliers: Record<string, number> = {
    'fp32': 0.7,   // Slowest
    'fp16': 1.0,   // Baseline
    'int8': 1.4,   // Faster with quantization
    'int4': 1.8    // Fastest but may have quality impact
  };
  const precisionMultiplier = precisionMultipliers[precision] || 1.0;

  // Calculate final speed
  const finalSpeed = baseSpeed * workloadMultiplier * batchEfficiency * precisionMultiplier;

  return {
    tokensPerSecond: Math.round(finalSpeed),
    breakdown: {
      base: baseSpeed,
      workloadMultiplier,
      batchEfficiency,
      precisionMultiplier,
      final: Math.round(finalSpeed)
    }
  };
}

/**
 * Calculate request processing duration with vLLM's prefill/generation phases
 */
export function calculateRequestDuration(
  model: Model,
  gpuType: string,
  workload: Workload,
  batchSize: number,
  precision: string = 'fp16'
): RequestDurationResult {
  const speed = getGenerationSpeed(
    model,
    gpuType,
    workload.category || 'chat',
    batchSize,
    precision
  );

  // Prefill phase: Process all input tokens at once (much faster)
  // vLLM can process input tokens approximately 10x faster than generation
  const prefillSpeedMultiplier = 10;
  const prefillSpeed = speed.tokensPerSecond * prefillSpeedMultiplier;
  const prefillTime = workload.inputTokens / prefillSpeed;

  // Generation phase: Generate output tokens one by one
  const generationTime = workload.outputTokens / speed.tokensPerSecond;

  // Total duration
  const totalDuration = prefillTime + generationTime;

  // Time to first token (TTFT) - essentially the prefill time
  const timeToFirstToken = prefillTime;

  return {
    totalSeconds: totalDuration,
    breakdown: {
      prefillTime,
      generationTime,
      timeToFirstToken,
      tokensPerSecond: speed.tokensPerSecond,
      prefillTokensPerSecond: prefillSpeed
    }
  };
}

/**
 * Estimate throughput for continuous batching in vLLM
 */
export function estimateThroughput(
  model: Model,
  gpuType: string,
  workloadMix: Record<string, number>,
  targetBatchSize: number,
  precision: string = 'fp16'
): ThroughputResult {
  let totalRequestsPerSecond = 0;
  let weightedDuration = 0;
  let totalWeight = 0;

  // Calculate weighted average across workload mix
  for (const [workloadType, weight] of Object.entries(workloadMix)) {
    if (weight > 0) {
      getGenerationSpeed(model, gpuType, workloadType, targetBatchSize, precision);

      // Estimate average request duration for this workload type
      const avgInputTokens = workloadType === 'rag' ? 2000 : 500;
      const avgOutputTokens = workloadType === 'coding' ? 500 : 200;

      const duration = calculateRequestDuration(
        model,
        gpuType,
        {
          id: workloadType,
          name: workloadType,
          description: `Generated ${workloadType} workload`,
          inputTokens: avgInputTokens,
          outputTokens: avgOutputTokens,
          category: workloadType as any,
          examples: []
        },
        targetBatchSize,
        precision
      );

      weightedDuration += duration.totalSeconds * weight;
      totalWeight += weight;

      // Calculate requests per second for this workload type
      const requestsPerSecond = targetBatchSize / duration.totalSeconds;
      totalRequestsPerSecond += requestsPerSecond * weight;
    }
  }

  const avgDuration = weightedDuration / totalWeight;
  const avgRequestsPerSecond = totalRequestsPerSecond / totalWeight;

  return {
    requestsPerSecond: avgRequestsPerSecond,
    avgDurationSeconds: avgDuration,
    tokensPerSecond: avgRequestsPerSecond * 200, // Assuming average 200 output tokens
    utilizationPercent: Math.min(100, (targetBatchSize / 16) * 100) // 16 is optimal batch
  };
}

export default {
  getGenerationSpeed,
  calculateRequestDuration,
  estimateThroughput
};