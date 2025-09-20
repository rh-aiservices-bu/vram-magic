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

import { ModelPrecision } from '../types';

/**
 * Calculate realistic generation speed based on model, GPU, and workload
 *
 * @param {Object} model - Model configuration
 * @param {string} gpuType - Type of GPU (e.g., 'A100', 'RTX 4090')
 * @param {string} workloadType - Type of workload (chat, code, rag, etc.)
 * @param {number} batchSize - Current batch size
 * @param {string} precision - Precision mode
 * @returns {Object} Generation speed details
 */
export function getGenerationSpeed(model, gpuType, workloadType, batchSize, precision = 'fp16') {
  // Find GPU performance data for this model
  const gpuPerf = model.performance.find(p => p.gpuType === gpuType);

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
  const workloadMultiplier = workloadMultipliers[workloadType] || 1.0;

  // Calculate batch size efficiency (non-linear scaling)
  let batchEfficiency = 1.0;
  if (gpuPerf.batchScaling) {
    // Find the two closest batch sizes and interpolate
    const batchSizes = Object.keys(gpuPerf.batchScaling)
      .map(Number)
      .sort((a, b) => a - b);

    if (batchSize <= batchSizes[0]) {
      // Below minimum, use minimum efficiency
      batchEfficiency = gpuPerf.batchScaling[batchSizes[0]];
    } else if (batchSize >= batchSizes[batchSizes.length - 1]) {
      // Above maximum, use maximum efficiency
      batchEfficiency = gpuPerf.batchScaling[batchSizes[batchSizes.length - 1]];
    } else {
      // Interpolate between two closest values
      for (let i = 0; i < batchSizes.length - 1; i++) {
        if (batchSize >= batchSizes[i] && batchSize <= batchSizes[i + 1]) {
          const lower = batchSizes[i];
          const upper = batchSizes[i + 1];
          const ratio = (batchSize - lower) / (upper - lower);
          const lowerEff = gpuPerf.batchScaling[lower];
          const upperEff = gpuPerf.batchScaling[upper];
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
  const precisionMultipliers = {
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
 *
 * @param {Object} model - Model configuration
 * @param {string} gpuType - GPU type
 * @param {Object} workload - Workload with input/output tokens
 * @param {number} batchSize - Current batch size
 * @param {string} precision - Precision mode
 * @returns {Object} Duration breakdown
 */
export function calculateRequestDuration(model, gpuType, workload, batchSize, precision = 'fp16') {
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
 *
 * @param {Object} model - Model configuration
 * @param {string} gpuType - GPU type
 * @param {Object} workloadMix - Mix of different workload types
 * @param {number} targetBatchSize - Target batch size
 * @param {string} precision - Precision mode
 * @returns {Object} Throughput metrics
 */
export function estimateThroughput(model, gpuType, workloadMix, targetBatchSize, precision = 'fp16') {
  let totalRequestsPerSecond = 0;
  let weightedDuration = 0;
  let totalWeight = 0;

  // Calculate weighted average across workload mix
  for (const [workloadType, weight] of Object.entries(workloadMix)) {
    if (weight > 0) {
      const speed = getGenerationSpeed(model, gpuType, workloadType, targetBatchSize, precision);

      // Estimate average request duration for this workload type
      const avgInputTokens = workloadType === 'rag' ? 2000 : 500;
      const avgOutputTokens = workloadType === 'code' ? 500 : 200;

      const duration = calculateRequestDuration(
        model,
        gpuType,
        { inputTokens: avgInputTokens, outputTokens: avgOutputTokens, category: workloadType },
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