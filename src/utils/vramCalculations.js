/**
 * VRAM Calculations for vLLM with PagedAttention and GQA Support
 *
 * This module implements accurate VRAM calculations specifically for vLLM deployments,
 * accounting for:
 * - Grouped Query Attention (GQA) with reduced KV heads
 * - PagedAttention block-based allocation (16-token blocks)
 * - Inference-specific activation memory (1.5x instead of 4x)
 * - vLLM memory pool pre-allocation
 */

import { ModelPrecision } from '../types';
import { PRECISION_BYTES } from '../constants';

// Fallback for PRECISION_BYTES in case import fails
const FALLBACK_PRECISION_BYTES = {
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5
};

/**
 * Calculate KV-cache memory for vLLM with PagedAttention
 * Accounts for GQA and block-based allocation
 *
 * @param {Object} model - Model configuration
 * @param {number} sequenceLength - Total sequence length (input + output)
 * @param {number} batchSize - Number of concurrent requests
 * @param {number} precisionBytes - Bytes per parameter (2 for FP16, 1 for INT8)
 * @returns {Object} KV-cache memory details
 */
export function calculateKVCacheVLLM(model, sequenceLength, batchSize, precisionBytes) {
  // Extract architecture details
  const arch = model.architecture;
  const vllm = model.vllmOptimizations || {
    blockSize: 16,
    memoryPoolOverhead: 0.15
  };

  // CRITICAL: Use kvHeads if available (for GQA), otherwise fall back to attentionHeads
  const numKVHeads = arch.kvHeads || arch.attentionHeads;

  // Calculate head dimension
  const headDim = arch.headDim || Math.floor(arch.hiddenSize / arch.attentionHeads);

  // vLLM allocates memory in blocks of 16 tokens
  const tokensPerRequest = sequenceLength;
  const blocksPerRequest = Math.ceil(tokensPerRequest / vllm.blockSize);
  const effectiveTokens = blocksPerRequest * vllm.blockSize; // Round up to block size

  // Core KV-cache calculation with GQA support
  const kvCacheBytes =
    2 *                    // Keys and Values
    arch.layers *          // Number of transformer layers
    numKVHeads *          // KV heads (NOT attention heads for GQA models!)
    headDim *             // Dimension per head
    effectiveTokens *     // Tokens (rounded to block size)
    batchSize *           // Concurrent requests
    precisionBytes;       // Bytes per parameter

  // Add vLLM memory pool overhead
  const poolOverhead = kvCacheBytes * vllm.memoryPoolOverhead;
  const totalWithOverhead = kvCacheBytes + poolOverhead;

  // Return detailed breakdown for debugging
  return {
    bytes: totalWithOverhead,
    breakdown: {
      rawKVCache: kvCacheBytes,
      poolOverhead: poolOverhead,
      blocksUsed: blocksPerRequest * batchSize,
      effectiveTokens: effectiveTokens,
      actualTokens: tokensPerRequest,
      isGQA: numKVHeads < arch.attentionHeads,
      gqaCompressionRatio: arch.attentionHeads / numKVHeads,
      kvHeads: numKVHeads,
      attentionHeads: arch.attentionHeads
    }
  };
}

/**
 * Calculate activation memory for vLLM inference
 * Uses realistic 1.5x multiplier instead of training-based 4x
 *
 * @param {Object} model - Model configuration
 * @param {number} sequenceLength - Total sequence length
 * @param {number} batchSize - Number of concurrent requests
 * @param {number} precisionBytes - Bytes per parameter
 * @returns {Object} Activation memory details
 */
export function calculateActivationsVLLM(model, sequenceLength, batchSize, precisionBytes) {
  const arch = model.architecture;

  // vLLM reuses activation memory efficiently during inference
  // The multiplier is much lower than training (1.5x vs 4x)
  const activationMultiplier = model.vramRequirements?.activationMultiplier || 1.5;

  const activationBytes =
    arch.hiddenSize *
    sequenceLength *
    batchSize *
    precisionBytes *
    activationMultiplier;  // 1.5x for inference, not 4x for training!

  return {
    bytes: activationBytes,
    breakdown: {
      perLayer: activationBytes / arch.layers,
      multiplierUsed: activationMultiplier,
      inferenceOptimized: true
    }
  };
}

/**
 * Main VRAM calculation function for vLLM deployments
 * Combines all memory components with vLLM-specific optimizations
 *
 * @param {Object} model - Model configuration
 * @param {Object} workload - Workload configuration with input/output tokens
 * @param {number} concurrentUsers - Number of concurrent users
 * @param {string} precision - Precision mode (fp16, int8, etc.)
 * @returns {Object} Complete VRAM breakdown
 */
export function calculateTotalVRAMvLLM(model, workload, concurrentUsers, precision = 'fp16') {
  const precisionBytes = (PRECISION_BYTES && PRECISION_BYTES[precision]) || FALLBACK_PRECISION_BYTES[precision] || 2;

  // 1. Base model memory (weights)
  const baseModelBytes = model.parameters * precisionBytes *
    (model.vramRequirements?.overheadFactor || 1.2);

  // 2. Calculate effective sequence length
  const sequenceLength = Math.min(
    workload.inputTokens + workload.outputTokens,
    model.architecture.maxSequenceLength
  );

  // 3. KV-cache with vLLM optimizations and GQA support
  const kvCache = calculateKVCacheVLLM(
    model,
    sequenceLength,
    concurrentUsers,
    precisionBytes
  );

  // 4. Activation memory with inference optimizations
  const activations = calculateActivationsVLLM(
    model,
    sequenceLength,
    concurrentUsers,
    precisionBytes
  );

  // 5. System overhead (vLLM-specific, typically 10%)
  const systemOverhead = (baseModelBytes + kvCache.bytes) * 0.1;

  // 6. Total calculation
  const totalBytes = baseModelBytes + kvCache.bytes + activations.bytes + systemOverhead;

  return {
    totalGB: totalBytes / (1024 ** 3),
    totalBytes: totalBytes,
    breakdown: {
      baseModelGB: baseModelBytes / (1024 ** 3),
      kvCacheGB: kvCache.bytes / (1024 ** 3),
      activationsGB: activations.bytes / (1024 ** 3),
      overheadGB: systemOverhead / (1024 ** 3)
    },
    details: {
      kvCache: kvCache.breakdown,
      activations: activations.breakdown
    },
    metadata: {
      isGQA: kvCache.breakdown.isGQA,
      gqaCompressionRatio: kvCache.breakdown.gqaCompressionRatio,
      blocksUsed: kvCache.breakdown.blocksUsed,
      effectiveTokens: kvCache.breakdown.effectiveTokens,
      actualTokens: kvCache.breakdown.actualTokens,
      precision: precision,
      concurrentUsers: concurrentUsers,
      sequenceLength: sequenceLength
    }
  };
}

/**
 * Compare old vs new calculation methods to show improvements
 * Useful for validation and demonstrating the impact of fixes
 *
 * @param {Object} model - Model configuration
 * @param {Object} workload - Workload configuration
 * @param {number} concurrentUsers - Number of concurrent users
 * @param {string} precision - Precision mode
 * @returns {Object} Comparison results
 */
export function compareCalculationMethods(model, workload, concurrentUsers, precision = 'fp16') {
  const precisionBytes = (PRECISION_BYTES && PRECISION_BYTES[precision]) || FALLBACK_PRECISION_BYTES[precision] || 2;
  const sequenceLength = Math.min(
    workload.inputTokens + workload.outputTokens,
    model.architecture.maxSequenceLength
  );

  // Old calculation (incorrect for GQA)
  const oldKVCache =
    2 *
    model.architecture.layers *
    model.architecture.hiddenSize *  // Uses full hidden size!
    sequenceLength *
    concurrentUsers *
    precisionBytes;

  const oldActivations =
    model.architecture.hiddenSize *
    sequenceLength *
    concurrentUsers *
    precisionBytes *
    4;  // Training multiplier!

  // New calculation (correct for GQA)
  const newCalculation = calculateTotalVRAMvLLM(model, workload, concurrentUsers, precision);

  const oldTotalGB = (oldKVCache + oldActivations) / (1024 ** 3);
  const improvement = ((oldTotalGB - newCalculation.totalGB) / oldTotalGB) * 100;

  return {
    oldMethod: {
      kvCacheGB: oldKVCache / (1024 ** 3),
      activationsGB: oldActivations / (1024 ** 3),
      totalGB: oldTotalGB
    },
    newMethod: {
      kvCacheGB: newCalculation.breakdown.kvCacheGB,
      activationsGB: newCalculation.breakdown.activationsGB,
      totalGB: newCalculation.totalGB
    },
    improvement: {
      percentReduction: improvement,
      gbSaved: oldTotalGB - newCalculation.totalGB,
      accuracyGain: model.architecture.useGQA ? 'High (GQA corrected)' : 'Moderate'
    }
  };
}

export default {
  calculateKVCacheVLLM,
  calculateActivationsVLLM,
  calculateTotalVRAMvLLM,
  compareCalculationMethods
};