/**
 * vLLM-Specific Simulation Module
 *
 * Implements accurate simulation of vLLM's continuous batching behavior,
 * including dynamic request joining/leaving and memory usage patterns
 */

import { calculateTotalVRAMvLLM } from './vramCalculations';
import { calculateRequestDuration } from './generationSpeed';
import { PRECISION_BYTES } from '../constants';

/**
 * Generate proper bell curve (normal) distribution using Box-Muller transform
 *
 * @param {number} numRequests - Number of requests to generate
 * @param {number} durationSeconds - Total duration in seconds
 * @returns {Array<number>} Array of timestamps following normal distribution
 */
export function generateBellCurveDistribution(numRequests, durationSeconds) {
  const timestamps = [];
  const mean = durationSeconds / 2;
  const stdDev = durationSeconds / 6; // 99.7% within duration

  for (let i = 0; i < numRequests; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random() || 0.001; // Avoid log(0)
    const u2 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Convert to timestamp
    let timestamp = mean + z0 * stdDev;

    // Clamp to duration bounds
    timestamp = Math.max(0, Math.min(durationSeconds - 0.001, timestamp));

    timestamps.push(timestamp);
  }

  return timestamps.sort((a, b) => a - b);
}

/**
 * Calculate concurrent users with vLLM continuous batching
 * Accounts for dynamic joining/leaving of requests
 *
 * @param {number} currentTime - Current simulation time
 * @param {Array} requests - Array of request objects with timestamps and durations
 * @returns {number} Number of concurrent users at current time
 */
export function calculateConcurrentUsersVLLM(currentTime, requests) {
  let activeRequests = 0;

  for (const request of requests) {
    // Check if request is active at current time
    if (request.startTime <= currentTime && currentTime < request.endTime) {
      activeRequests++;
    }
  }

  return activeRequests;
}

/**
 * Simulate request lifecycle with vLLM
 *
 * @param {Object} config - Simulation configuration
 * @returns {Array} Array of request objects with timing information
 */
export function generateRequests(config) {
  const {
    totalRequests,
    duration,
    distribution,
    model,
    gpuType,
    workloadMix,
    precision = 'fp16'
  } = config;

  // Generate timestamps based on distribution
  let timestamps;
  if (distribution === 'bell_curve') {
    timestamps = generateBellCurveDistribution(totalRequests, duration);
  } else if (distribution === 'uniform') {
    timestamps = Array.from({ length: totalRequests }, (_, i) =>
      (i / totalRequests) * duration
    );
  } else {
    // Default to uniform if distribution not recognized
    timestamps = Array.from({ length: totalRequests }, (_, i) =>
      (i / totalRequests) * duration
    );
  }

  // Create request objects with durations
  const requests = timestamps.map((timestamp, idx) => {
    // Select workload based on mix percentages
    const workloadType = selectWorkloadFromMix(workloadMix);

    // Get realistic duration for this request
    const duration = calculateRequestDuration(
      model,
      gpuType,
      workloadType,
      Math.min(16, Math.floor(totalRequests / (duration / 10))), // Estimate batch size
      precision
    );

    return {
      id: idx,
      startTime: timestamp,
      endTime: timestamp + duration.totalSeconds,
      duration: duration.totalSeconds,
      workload: workloadType,
      prefillTime: duration.breakdown.prefillTime,
      generationTime: duration.breakdown.generationTime
    };
  });

  return requests;
}

/**
 * Main vLLM simulation runner
 *
 * @param {Object} config - Complete simulation configuration
 * @returns {Object} Simulation results with VRAM usage over time
 */
export function runVLLMSimulation(config) {
  const {
    model,
    workloadSlots,
    duration,
    maxConcurrentUsers,
    gpuType,
    precision = 'fp16',
    distribution = 'uniform',
    timePattern = 'steady'
  } = config;

  // Calculate weighted workload from slots
  const effectiveWorkload = calculateWeightedWorkload(workloadSlots);

  // Estimate request rate based on throughput
  const avgDuration = calculateRequestDuration(
    model,
    gpuType,
    effectiveWorkload,
    maxConcurrentUsers / 2, // Average batch size
    precision
  ).totalSeconds;

  const requestsPerSecond = maxConcurrentUsers / avgDuration;
  const totalRequests = Math.floor(requestsPerSecond * duration);

  // Generate requests with realistic timing
  const requests = generateRequests({
    totalRequests,
    duration,
    distribution,
    model,
    gpuType,
    workloadMix: extractWorkloadMix(workloadSlots),
    precision
  });

  // Sample VRAM usage over time
  const sampleInterval = Math.max(1, Math.floor(duration / 100)); // 100 samples max
  const samples = [];

  for (let t = 0; t <= duration; t += sampleInterval) {
    // Calculate concurrent users at this timestamp
    const concurrentUsers = calculateConcurrentUsersVLLM(t, requests);

    // Apply time pattern if specified
    const patternMultiplier = getTimePatternMultiplier(t, duration, timePattern);
    const adjustedConcurrentUsers = Math.floor(concurrentUsers * patternMultiplier);

    if (adjustedConcurrentUsers > 0) {
      // Calculate VRAM with vLLM optimizations
      const vram = calculateTotalVRAMvLLM(
        model,
        effectiveWorkload,
        adjustedConcurrentUsers,
        precision
      );

      samples.push({
        timestamp: t,
        concurrentUsers: adjustedConcurrentUsers,
        vramGB: vram.totalGB,
        breakdown: vram.breakdown,
        details: vram.details,
        metadata: vram.metadata
      });
    } else {
      // Just model loaded, no active requests
      const baseVRAM = model.parameters * PRECISION_BYTES[precision] * 1.2;
      samples.push({
        timestamp: t,
        concurrentUsers: 0,
        vramGB: baseVRAM / (1024 ** 3),
        breakdown: {
          baseModelGB: baseVRAM / (1024 ** 3),
          kvCacheGB: 0,
          activationsGB: 0,
          overheadGB: 0
        },
        metadata: {
          isGQA: model.architecture.useGQA || false,
          precision
        }
      });
    }
  }

  // Calculate statistics
  const stats = {
    maxVRAM: Math.max(...samples.map(s => s.vramGB)),
    minVRAM: Math.min(...samples.map(s => s.vramGB)),
    avgVRAM: samples.reduce((sum, s) => sum + s.vramGB, 0) / samples.length,
    maxConcurrentUsers: Math.max(...samples.map(s => s.concurrentUsers)),
    avgConcurrentUsers: samples.reduce((sum, s) => sum + s.concurrentUsers, 0) / samples.length,
    totalRequests,
    effectiveThroughput: totalRequests / duration,
    gqaEnabled: model.architecture.useGQA || false,
    compressionRatio: model.architecture.useGQA ?
      model.architecture.attentionHeads / (model.architecture.kvHeads || model.architecture.attentionHeads) : 1
  };

  return {
    samples,
    stats,
    config,
    recommendations: generateGPURecommendations(stats.maxVRAM, model.architecture.useGQA)
  };
}

/**
 * Generate GPU recommendations based on VRAM requirements
 *
 * @param {number} requiredVRAMGB - Required VRAM in GB
 * @param {boolean} gqaEnabled - Whether GQA is enabled
 * @returns {Array<string>} GPU recommendations
 */
function generateGPURecommendations(requiredVRAMGB, gqaEnabled = false) {
  const recommendations = [];

  // Add GQA notice if applicable
  if (gqaEnabled) {
    recommendations.push('💡 GQA optimization detected - significantly reduced VRAM requirements');
  }

  // GPU recommendations based on VRAM
  if (requiredVRAMGB <= 8) {
    recommendations.push('✅ RTX 4060 Ti (8GB) - Sufficient');
    recommendations.push('✅ RTX 3060 (12GB) - Comfortable headroom');
  } else if (requiredVRAMGB <= 12) {
    recommendations.push('✅ RTX 3060 (12GB) - Sufficient');
    recommendations.push('✅ RTX 4070 (12GB) - Better performance');
  } else if (requiredVRAMGB <= 16) {
    recommendations.push('✅ RTX 4060 Ti (16GB) - Sufficient');
    recommendations.push('✅ RTX 4070 Ti (16GB) - Better performance');
  } else if (requiredVRAMGB <= 24) {
    recommendations.push('✅ RTX 3090 (24GB) - Good value');
    recommendations.push('✅ RTX 4090 (24GB) - Best performance');
  } else if (requiredVRAMGB <= 48) {
    recommendations.push('⚠️ RTX 6000 Ada (48GB) - Professional');
    recommendations.push('⚠️ A6000 (48GB) - Datacenter grade');
  } else if (requiredVRAMGB <= 80) {
    recommendations.push('⚠️ A100 (80GB) - Datacenter only');
    recommendations.push('⚠️ H100 (80GB) - Latest datacenter');
  } else {
    recommendations.push('❌ Multiple GPUs required');
    recommendations.push('❌ Consider model quantization or smaller model');
  }

  return recommendations;
}

// Helper functions
function calculateWeightedWorkload(workloadSlots) {
  const activeSlots = workloadSlots.filter(slot => slot.isActive && slot.workload);

  const totalInputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload.inputTokens * slot.percentage) / 100,
    0
  );

  const totalOutputTokens = activeSlots.reduce(
    (sum, slot) => sum + (slot.workload.outputTokens * slot.percentage) / 100,
    0
  );

  return {
    inputTokens: Math.round(totalInputTokens),
    outputTokens: Math.round(totalOutputTokens),
    category: activeSlots[0]?.workload?.category || 'chat'
  };
}

function extractWorkloadMix(workloadSlots) {
  const mix = {};
  workloadSlots
    .filter(slot => slot.isActive && slot.workload)
    .forEach(slot => {
      mix[slot.workload.category] = slot.percentage / 100;
    });
  return mix;
}

function selectWorkloadFromMix(workloadMix) {
  const random = Math.random();
  let cumulative = 0;

  for (const [category, weight] of Object.entries(workloadMix)) {
    cumulative += weight;
    if (random < cumulative) {
      return {
        category,
        inputTokens: category === 'rag' ? 2000 : 500,
        outputTokens: category === 'code' ? 500 : 200
      };
    }
  }

  return { category: 'chat', inputTokens: 500, outputTokens: 200 };
}

function getTimePatternMultiplier(timestamp, duration, pattern) {
  // Simplified time pattern multiplier
  switch (pattern) {
    case 'peak_hours':
      const hour = (timestamp / 3600) % 24;
      if (hour >= 9 && hour <= 17) return 1.5;
      if (hour >= 22 || hour <= 6) return 0.3;
      return 1.0;
    case 'steady':
    default:
      return 1.0;
  }
}

export default {
  generateBellCurveDistribution,
  calculateConcurrentUsersVLLM,
  generateRequests,
  runVLLMSimulation
};