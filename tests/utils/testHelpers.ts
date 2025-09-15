// Test helper functions and utilities
import { vi } from 'vitest'

// Mock data factories
export const createMockModel = (overrides = {}) => ({
  id: 'test-model',
  name: 'Test Model',
  description: 'A test model for integration tests',
  parameters: 7000000000,
  precision: 'fp16' as const,
  architecture: {
    layers: 32,
    hiddenSize: 4096,
    attentionHeads: 32,
    vocabularySize: 32000,
    maxSequenceLength: 4096,
  },
  vramRequirements: {
    baseVRAM: 14336,
    kvCacheCoefficient: 0.125,
    activationMultiplier: 4,
    overheadFactor: 1.2,
  },
  performance: [],
  metadata: {
    releaseDate: '2023-01-01',
    organization: 'Test Org',
    license: 'Test License',
    tags: ['test'],
  },
  ...overrides,
})

export const createMockWorkload = (overrides = {}) => ({
  id: 'test-workload',
  name: 'Test Workload',
  description: 'A test workload for integration tests',
  inputTokens: 100,
  outputTokens: 50,
  category: 'chat' as const,
  requestPattern: 'steady' as const,
  complexityScore: 1,
  ...overrides,
})

export const createMockSimulationConfig = (overrides = {}) => ({
  timePeriodMinutes: 60,
  concurrentUsers: 100,
  requestDistribution: 'uniform' as const,
  samplingIntervalSeconds: 60,
  ...overrides,
})

export const createMockSimulationResults = (overrides = {}) => ({
  usagePoints: [
    {
      timestamp: 0,
      totalVRAM: 16800,
      breakdown: {
        baseModel: 14000,
        kvCache: 2100,
        activations: 500,
        overhead: 200,
        workloadBreakdown: [],
      },
      activeRequests: [],
    },
  ],
  summary: {
    maxVRAM: 16800,
    averageVRAM: 16800,
    peakTimestamp: 0,
    totalRequests: 1,
    successfulRequests: 1,
  },
  gpuRecommendations: [],
  config: createMockSimulationConfig(),
  ...overrides,
})

// Helper functions for common test patterns
export const waitForLoadingToComplete = async (getByText: (matcher: RegExp) => HTMLElement) => {
  // Wait for any loading states to complete
  const loadingIndicators = [/loading/i, /calculating/i, /running simulation/i, /processing/i]

  for (const indicator of loadingIndicators) {
    try {
      const element = getByText(indicator)
      if (element) {
        // Wait for element to disappear (simplified for this example)
        // In a real implementation, you'd use waitFor from testing-library
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch {
      // Element might not exist, which is fine
    }
  }
}

// Mock localStorage for tests
export const createMockLocalStorage = () => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store)
      return keys[index] || null
    }),
    get length() {
      return Object.keys(store).length
    },
  }
}

// Setup mock services with realistic delays
export const setupMockServices = () => {
  // Note: This would need proper typing and imports in a real implementation
  const mockModelService = {
    loadModels: vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
      return [createMockModel()]
    }),
    getModelById: vi.fn().mockImplementation(async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 50))
      return id === 'test-model' ? createMockModel() : null
    }),
  }

  const mockVramCalculator = {
    calculateTotalVRAM: vi
      .fn()
      .mockImplementation((model: unknown, sequenceLength: number, batchSize: number) => {
        // Simulate realistic calculation
        const baseVRAM = model.parameters * 0.000002 * 1.2 // Rough approximation
        const kvCache =
          model.architecture.layers *
          model.architecture.hiddenSize *
          sequenceLength *
          batchSize *
          0.000002
        const activations = model.architecture.hiddenSize * sequenceLength * batchSize * 0.000008
        return baseVRAM + kvCache + activations
      }),

    simulateUsageOverTime: vi.fn().mockImplementation((config: unknown) => {
      const points = []
      const intervalMs = config.config.samplingIntervalSeconds * 1000
      const totalDurationMs = config.config.timePeriodMinutes * 60 * 1000

      for (let t = 0; t <= totalDurationMs; t += intervalMs) {
        points.push({
          timestamp: t,
          totalVRAM: 16800 + Math.sin(t / (totalDurationMs / 6.28)) * 2000, // Simulate variation
          breakdown: {
            baseModel: 14000,
            kvCache: 2100 + Math.sin(t / (totalDurationMs / 6.28)) * 1000,
            activations: 500 + Math.sin(t / (totalDurationMs / 6.28)) * 200,
            overhead: 200,
            workloadBreakdown: [],
          },
          activeRequests: [],
        })
      }

      return points
    }),
  }

  return { modelService: mockModelService, vramCalculator: mockVramCalculator }
}

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const startTime = performance.now()
  renderFn()
  const endTime = performance.now()
  return endTime - startTime
}

// Accessibility testing utilities
export const getAccessibilityViolations = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe')
  return await axe(container)
}

// Custom matchers for better test assertions
export const customMatchers = {
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },

  toHaveValidationError(received: HTMLElement, errorMessage?: string) {
    const hasErrorClass =
      received.classList.contains('error') ||
      received.classList.contains('Mui-error') ||
      received.getAttribute('aria-invalid') === 'true'

    if (errorMessage) {
      const errorElement =
        document.querySelector(`[aria-describedby="${received.id}"]`) ||
        received.querySelector('.error-message')
      const hasErrorMessage = errorElement?.textContent?.includes(errorMessage)

      return {
        pass: hasErrorClass && hasErrorMessage,
        message: () => `expected element to have validation error with message "${errorMessage}"`,
      }
    }

    return {
      pass: hasErrorClass,
      message: () => `expected element to have validation error styling`,
    }
  },
}
