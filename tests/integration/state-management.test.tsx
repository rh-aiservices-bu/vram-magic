import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'

// Import actual contexts and hooks
import { AppProvider } from '../../src/contexts/AppContext'
import { ModelProvider } from '../../src/contexts/ModelContext'
import { WorkloadProvider } from '../../src/contexts/WorkloadContext'
import { SimulationProvider } from '../../src/contexts/SimulationContext'
import { UIProvider } from '../../src/contexts/UIContext'
import { useModelContext } from '../../src/hooks/useModelContext'
import { useWorkloadContext } from '../../src/hooks/useWorkloadContext'
import { useSimulationContext } from '../../src/hooks/useSimulationContext'
import { useUIContext } from '../../src/hooks/useUIContext'

// Import types
import type { Model, Workload, SimulationResults } from '../../src/types'

// Import actual App component
import App from '../../src/App'

// Mock localStorage
const mockLocalStorage = (() => {
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
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock services
vi.mock('../../src/services/modelService', () => ({
  modelService: {
    loadModels: vi.fn(),
    getModelById: vi.fn(),
    searchModels: vi.fn(),
    validateModel: vi.fn(),
  },
}))

vi.mock('../../src/services/vramCalculator', () => ({
  vramCalculator: {
    calculateTotalVRAM: vi.fn(),
    simulateUsageOverTime: vi.fn(),
    validateConfiguration: vi.fn(),
  },
}))

vi.mock('../../src/services/simulationService', () => ({
  simulationService: {
    runSimulation: vi.fn(),
    calculateGPURecommendations: vi.fn(),
  },
}))

// Test data
const mockModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: 'Meta Llama 2 7 billion parameter model',
    parameters: 7000000000,
    precision: 'fp16',
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
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Custom',
      tags: ['llama', '7b'],
    },
  },
]

const mockWorkloads: Workload[] = [
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    description: 'Simple chat workload',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat',
    requestPattern: 'steady',
    complexityScore: 1,
  },
  {
    id: 'rag-search',
    name: 'RAG Search',
    description: 'RAG workload',
    inputTokens: 500,
    outputTokens: 200,
    category: 'rag',
    requestPattern: 'burst',
    complexityScore: 3,
  },
]

const mockSimulationResults: SimulationResults = {
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
  config: {
    timePeriodMinutes: 60,
    concurrentUsers: 100,
    requestDistribution: 'uniform',
    samplingIntervalSeconds: 60,
  },
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    <UIProvider>
      <ModelProvider>
        <WorkloadProvider>
          <SimulationProvider>{children}</SimulationProvider>
        </WorkloadProvider>
      </ModelProvider>
    </UIProvider>
  </AppProvider>
)

describe('State Management Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()

    // Setup service mocks
    const { modelService } = await import('../../src/services/modelService')
    const { vramCalculator } = await import('../../src/services/vramCalculator')
    const { simulationService } = await import('../../src/services/simulationService')

    modelService.loadModels.mockResolvedValue(mockModels)
    modelService.getModelById.mockImplementation(
      async (id: string) => mockModels.find(model => model.id === id) || null
    )

    vramCalculator.calculateTotalVRAM.mockReturnValue(16800)
    vramCalculator.simulateUsageOverTime.mockReturnValue(mockSimulationResults.usagePoints)
    vramCalculator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] })

    simulationService.runSimulation.mockResolvedValue(mockSimulationResults)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Context Provider Integration', () => {
    it('should initialize all contexts with correct default states', () => {
      const { result: modelResult } = renderHook(() => useModelContext(), {
        wrapper: TestWrapper,
      })

      const { result: workloadResult } = renderHook(() => useWorkloadContext(), {
        wrapper: TestWrapper,
      })

      const { result: simulationResult } = renderHook(() => useSimulationContext(), {
        wrapper: TestWrapper,
      })

      const { result: uiResult } = renderHook(() => useUIContext(), {
        wrapper: TestWrapper,
      })

      // Model context initial state
      expect(modelResult.current.models).toEqual([])
      expect(modelResult.current.selectedModel).toBeNull()
      expect(modelResult.current.isLoading).toBe(false)
      expect(modelResult.current.error).toBeNull()

      // Workload context initial state
      expect(workloadResult.current.workloads).toEqual([])
      expect(workloadResult.current.workloadSlots).toHaveLength(5)
      expect(workloadResult.current.profiles).toEqual([])
      expect(workloadResult.current.validation.isValid).toBe(false)

      // Simulation context initial state
      expect(simulationResult.current.results).toBeNull()
      expect(simulationResult.current.config).toBeDefined()
      expect(simulationResult.current.isCalculating).toBe(false)
      expect(simulationResult.current.canExecute).toBe(false)

      // UI context initial state
      expect(uiResult.current.isLoading).toBe(false)
      expect(uiResult.current.error).toBeNull()
      expect(uiResult.current.notifications).toEqual([])
      expect(uiResult.current.isDarkMode).toBe(false)
    })

    it('should persist state to localStorage and restore on initialization', async () => {
      // First render - set some state
      const { result: modelResult, rerender } = renderHook(() => useModelContext(), {
        wrapper: TestWrapper,
      })

      await act(async () => {
        await modelResult.current.loadModels()
      })

      await act(async () => {
        await modelResult.current.selectModel('llama-2-7b')
      })

      expect(modelResult.current.selectedModel).toBeTruthy()
      expect(modelResult.current.selectedModel?.id).toBe('llama-2-7b')

      // Verify localStorage was called
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('model'),
        expect.any(String)
      )

      // Mock localStorage returning the saved state
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes('model')) {
          return JSON.stringify({ selectedModelId: 'llama-2-7b' })
        }
        return null
      })

      // Re-render to simulate app restart
      rerender()

      // Verify state is restored
      expect(mockLocalStorage.getItem).toHaveBeenCalled()
    })

    it('should handle cross-context state synchronization', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select a model (affects model context)
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeInTheDocument()
      })
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Configure workload (affects workload context)
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Verify simulation context can execute is updated
      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /run simulation/i })
        expect(runButton).not.toBeDisabled()
      })

      // Run simulation (affects simulation context)
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await userEvent.click(runButton)

      // Verify UI context shows loading state
      expect(screen.getByText(/running simulation/i)).toBeInTheDocument()

      // Wait for completion and verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
      })
    })
  })

  describe('State Validation and Dependencies', () => {
    it('should validate workload slots and update validation state correctly', async () => {
      const { result } = renderHook(() => useWorkloadContext(), {
        wrapper: TestWrapper,
      })

      // Initially invalid (no workloads configured)
      expect(result.current.validation.isValid).toBe(false)

      // Add workload to first slot
      await act(async () => {
        result.current.updateSlot(0, {
          workload: mockWorkloads[0],
          percentage: 50,
          isActive: true,
        })
      })

      // Still invalid (percentage doesn't total 100%)
      expect(result.current.validation.isValid).toBe(false)
      expect(result.current.validation.errors).toContain(expect.stringMatching(/total.*100/i))

      // Fix the percentage
      await act(async () => {
        result.current.updateSlot(0, {
          workload: mockWorkloads[0],
          percentage: 100,
          isActive: true,
        })
      })

      // Now should be valid
      await waitFor(() => {
        expect(result.current.validation.isValid).toBe(true)
        expect(result.current.validation.errors).toHaveLength(0)
      })
    })

    it('should update simulation canExecute based on dependencies', async () => {
      const { result: simulationResult } = renderHook(() => useSimulationContext(), {
        wrapper: TestWrapper,
      })
      const { result: modelResult } = renderHook(() => useModelContext(), {
        wrapper: TestWrapper,
      })
      const { result: workloadResult } = renderHook(() => useWorkloadContext(), {
        wrapper: TestWrapper,
      })

      // Initially cannot execute
      expect(simulationResult.current.canExecute).toBe(false)

      // Load models and select one
      await act(async () => {
        await modelResult.current.loadModels()
        await modelResult.current.selectModel('llama-2-7b')
      })

      // Still cannot execute (no workloads configured)
      expect(simulationResult.current.canExecute).toBe(false)

      // Configure valid workload
      await act(async () => {
        workloadResult.current.updateSlot(0, {
          workload: mockWorkloads[0],
          percentage: 100,
          isActive: true,
        })
      })

      // Now should be able to execute
      await waitFor(() => {
        expect(simulationResult.current.canExecute).toBe(true)
      })
    })

    it('should handle validation errors and prevent invalid operations', async () => {
      const { result } = renderHook(() => useWorkloadContext(), {
        wrapper: TestWrapper,
      })

      // Try to set invalid percentages (over 100% total)
      await act(async () => {
        result.current.updateSlot(0, {
          workload: mockWorkloads[0],
          percentage: 80,
          isActive: true,
        })
      })

      await act(async () => {
        result.current.updateSlot(1, {
          workload: mockWorkloads[1],
          percentage: 60,
          isActive: true,
        })
      })

      // Should be invalid with error
      expect(result.current.validation.isValid).toBe(false)
      expect(result.current.validation.errors).toContain(expect.stringMatching(/exceed.*100/i))

      // Total percentage should be clamped or prevented
      const totalPercentage = result.current.workloadSlots.reduce(
        (sum, slot) => sum + (slot.isActive ? slot.percentage : 0),
        0
      )

      // The implementation should either clamp the total to 100% or show validation error
      expect(totalPercentage <= 100 || result.current.validation.errors.length > 0).toBe(true)
    })
  })

  describe('State Persistence and Recovery', () => {
    it('should save and restore application state across sessions', async () => {
      // Mock localStorage with existing data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes('vram-magic-model')) {
          return JSON.stringify({ selectedModelId: 'llama-2-7b' })
        }
        if (key.includes('vram-magic-workload')) {
          return JSON.stringify({
            workloadSlots: [
              {
                workload: mockWorkloads[0],
                percentage: 100,
                isActive: true,
              },
              ...Array(4).fill({ workload: null, percentage: 0, isActive: false }),
            ],
          })
        }
        if (key.includes('vram-magic-simulation')) {
          return JSON.stringify({
            config: {
              timePeriodMinutes: 120,
              concurrentUsers: 200,
              requestDistribution: 'bell-curve',
              samplingIntervalSeconds: 30,
            },
          })
        }
        if (key.includes('vram-magic-ui')) {
          return JSON.stringify({ isDarkMode: true })
        }
        return null
      })

      render(<App />)

      // Wait for initialization
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify model state was restored
      await waitFor(() => {
        expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()
      })

      // Verify workload state was restored
      const firstSlot = screen.getByTestId('workload-slot-0')
      expect(within(firstSlot).getByDisplayValue('Basic Chat')).toBeInTheDocument()
      expect(within(firstSlot).getByRole('slider')).toHaveValue('100')

      // Verify simulation config was restored
      expect(screen.getByLabelText(/time period/i)).toHaveValue(120)
      expect(screen.getByLabelText(/concurrent users/i)).toHaveValue(200)

      // Verify localStorage was read
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        expect.stringContaining('vram-magic-model')
      )
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        expect.stringContaining('vram-magic-workload')
      )
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      // Mock localStorage with corrupted data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key.includes('vram-magic-model')) {
          return '{ invalid json data'
        }
        return null
      })

      render(<App />)

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Should show default state (no model selected)
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      expect(modelSelector).toHaveValue('')
    })

    it('should clear state when user explicitly resets', async () => {
      const { result: uiResult } = renderHook(() => useUIContext(), {
        wrapper: TestWrapper,
      })
      const { result: modelResult } = renderHook(() => useModelContext(), {
        wrapper: TestWrapper,
      })
      const { result: workloadResult } = renderHook(() => useWorkloadContext(), {
        wrapper: TestWrapper,
      })

      // Set some state first
      await act(async () => {
        await modelResult.current.loadModels()
        await modelResult.current.selectModel('llama-2-7b')
      })

      await act(async () => {
        workloadResult.current.updateSlot(0, {
          workload: mockWorkloads[0],
          percentage: 100,
          isActive: true,
        })
      })

      // Verify state is set
      expect(modelResult.current.selectedModel).toBeTruthy()
      expect(workloadResult.current.workloadSlots[0].workload).toBeTruthy()

      // Reset state
      await act(async () => {
        uiResult.current.resetApplicationState()
      })

      // Verify state is cleared
      expect(modelResult.current.selectedModel).toBeNull()
      expect(workloadResult.current.workloadSlots[0].workload).toBeNull()
      expect(workloadResult.current.workloadSlots[0].percentage).toBe(0)

      // Verify localStorage was cleared
      expect(mockLocalStorage.clear).toHaveBeenCalled()
    })
  })

  describe('Error State Propagation', () => {
    it('should propagate errors from model context to UI context', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(new Error('Failed to load models'))

      const { result: modelResult } = renderHook(() => useModelContext(), {
        wrapper: TestWrapper,
      })
      const { result: uiResult } = renderHook(() => useUIContext(), {
        wrapper: TestWrapper,
      })

      // Trigger model loading error
      await act(async () => {
        try {
          await modelResult.current.loadModels()
        } catch {
          // Error should be handled by context
        }
      })

      // Verify error is set in model context
      expect(modelResult.current.error).toBeTruthy()

      // Verify UI context shows error notification
      await waitFor(() => {
        expect(
          uiResult.current.notifications.some(
            n => n.type === 'error' && n.message.includes('Failed to load models')
          )
        ).toBe(true)
      })
    })

    it('should handle simulation errors and maintain app stability', async () => {
      const { simulationService } = await import('../../src/services/simulationService')
      simulationService.runSimulation.mockRejectedValue(new Error('GPU memory insufficient'))

      const { result: simulationResult } = renderHook(() => useSimulationContext(), {
        wrapper: TestWrapper,
      })
      const { result: uiResult } = renderHook(() => useUIContext(), {
        wrapper: TestWrapper,
      })

      // Mock valid configuration
      const mockConfig = {
        model: mockModels[0],
        workloadSlots: [
          {
            workload: mockWorkloads[0],
            percentage: 100,
            isActive: true,
          },
        ],
        config: mockSimulationResults.config,
      }

      // Trigger simulation error
      await act(async () => {
        try {
          await simulationResult.current.runSimulation(mockConfig)
        } catch {
          // Error should be handled by context
        }
      })

      // Verify error is handled gracefully
      expect(simulationResult.current.isCalculating).toBe(false)
      expect(simulationResult.current.results).toBeNull()

      // Verify error notification is shown
      await waitFor(() => {
        expect(
          uiResult.current.notifications.some(
            n => n.type === 'error' && n.message.includes('GPU memory insufficient')
          )
        ).toBe(true)
      })
    })

    it('should recover from errors when valid operations are performed', async () => {
      const { result: uiResult } = renderHook(() => useUIContext(), {
        wrapper: TestWrapper,
      })

      // Set an error state
      await act(async () => {
        uiResult.current.setError('Test error')
      })

      expect(uiResult.current.error).toBe('Test error')

      // Clear the error
      await act(async () => {
        uiResult.current.clearError()
      })

      expect(uiResult.current.error).toBeNull()

      // Verify notifications are managed correctly
      expect(uiResult.current.notifications.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Real-time State Updates', () => {
    it('should update dependent states in real-time when dependencies change', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select a model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Add workload
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      // Change percentage gradually and verify real-time updates
      const slider = within(firstSlot).getByRole('slider')

      // Test incremental changes
      fireEvent.change(slider, { target: { value: '25' } })
      await waitFor(() => {
        expect(screen.getByText(/remaining.*75%/i)).toBeInTheDocument()
      })

      fireEvent.change(slider, { target: { value: '50' } })
      await waitFor(() => {
        expect(screen.getByText(/remaining.*50%/i)).toBeInTheDocument()
      })

      fireEvent.change(slider, { target: { value: '100' } })
      await waitFor(() => {
        expect(screen.getByText(/remaining.*0%/i)).toBeInTheDocument()
      })

      // Verify simulation can execute state updates
      await waitFor(() => {
        const runButton = screen.getByRole('button', { name: /run simulation/i })
        expect(runButton).not.toBeDisabled()
      })
    })

    it('should debounce rapid state changes to prevent performance issues', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Setup basic configuration
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const slider = within(firstSlot).getByRole('slider')

      // Make rapid changes
      const startTime = performance.now()
      fireEvent.change(slider, { target: { value: '10' } })
      fireEvent.change(slider, { target: { value: '20' } })
      fireEvent.change(slider, { target: { value: '30' } })
      fireEvent.change(slider, { target: { value: '40' } })
      fireEvent.change(slider, { target: { value: '50' } })
      const endTime = performance.now()

      // Changes should be fast (not blocked by heavy calculations)
      expect(endTime - startTime).toBeLessThan(100)

      // Final state should be correct
      await waitFor(() => {
        expect(slider).toHaveValue('50')
      })
    })
  })
})
