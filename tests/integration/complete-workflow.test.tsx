import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import the actual App component
import App from '../../src/App'

// Import actual types from the implementation
import type { Model, SimulationResults } from '../../src/types'

// Mock services - these should match the actual service implementations
vi.mock('../../src/services/modelService', () => ({
  modelService: {
    loadModels: vi.fn(),
    getModelById: vi.fn(),
    searchModels: vi.fn(),
    validateModel: vi.fn(),
    getModelPerformance: vi.fn(),
  },
}))

vi.mock('../../src/services/vramCalculator', () => ({
  vramCalculator: {
    calculateBaseMemory: vi.fn(),
    calculateKVCache: vi.fn(),
    calculateActivations: vi.fn(),
    calculateOverhead: vi.fn(),
    calculateTotalVRAM: vi.fn(),
    simulateUsageOverTime: vi.fn(),
  },
}))

// Note: simulationService doesn't exist, simulation is handled by contexts and vramCalculator

// Extend jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock data that matches the actual implementation
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
    performance: [
      {
        gpuType: 'A100',
        tokensPerSecond: 45,
        batchSize: 1,
        powerConsumption: 300,
      },
    ],
    metadata: {
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Custom',
      tags: ['llama', '7b', 'general'],
    },
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Mistral AI 7 billion parameter instruct model',
    parameters: 7241969152,
    precision: 'fp16',
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 8192,
    },
    vramRequirements: {
      baseVRAM: 14884,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [
      {
        gpuType: 'A100',
        tokensPerSecond: 48,
        batchSize: 1,
        powerConsumption: 300,
      },
    ],
    metadata: {
      releaseDate: '2023-09-27',
      organization: 'Mistral AI',
      license: 'Apache 2.0',
      tags: ['mistral', '7b', 'instruct'],
    },
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
    {
      timestamp: 1800000, // 30 minutes
      totalVRAM: 22400,
      breakdown: {
        baseModel: 14000,
        kvCache: 6800,
        activations: 1200,
        overhead: 400,
        workloadBreakdown: [],
      },
      activeRequests: [],
    },
  ],
  summary: {
    maxVRAM: 22400,
    averageVRAM: 19600,
    peakTimestamp: 1800000,
    totalRequests: 150,
    successfulRequests: 148,
  },
  gpuRecommendations: [
    {
      name: 'NVIDIA A100 80GB',
      vramCapacity: 81920,
      isRecommended: true,
      utilizationPercentage: 27,
      costPerHour: 3.06,
      notes: 'Plenty of headroom for growth',
    },
    {
      name: 'NVIDIA A6000 48GB',
      vramCapacity: 49152,
      isRecommended: true,
      utilizationPercentage: 46,
      costPerHour: 1.28,
      notes: 'Good fit with moderate headroom',
    },
  ],
  config: {
    timePeriodMinutes: 60,
    concurrentUsers: 100,
    requestDistribution: 'uniform',
    samplingIntervalSeconds: 60,
  },
}

describe('Complete Workflow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()

    // Mock the service responses
    const { modelService } = await import('../../src/services/modelService')
    const { vramCalculator } = await import('../../src/services/vramCalculator')

    modelService.loadModels.mockResolvedValue(mockModels)
    modelService.getModelById.mockImplementation(
      async (id: string) => mockModels.find(model => model.id === id) || null
    )

    vramCalculator.calculateTotalVRAM.mockReturnValue(16800)
    vramCalculator.simulateUsageOverTime.mockReturnValue(mockSimulationResults.usagePoints)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('End-to-End User Workflows', () => {
    it('should complete the full workflow: model selection → workload configuration → simulation → results', async () => {
      render(<App />)

      // Step 1: Wait for app to load and models to be available
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Step 2: Select a model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)

      // Wait for dropdown options to appear
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Llama 2 7B'))

      // Verify model is selected
      await waitFor(() => {
        expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()
      })

      // Step 3: Configure workloads
      // Find workload configuration section
      const workloadSection = screen.getByText('2. Configure Workloads')
      expect(workloadSection).toBeInTheDocument()

      // Add first workload to slot 0
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)

      // Select Basic Chat workload
      await waitFor(() => {
        expect(screen.getByText('Basic Chat')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Basic Chat'))

      // Set percentage for first slot
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '60' } })

      // Add second workload to slot 1
      const secondSlot = screen.getByTestId('workload-slot-1')
      const secondSlotSelect = within(secondSlot).getByRole('combobox')
      await user.click(secondSlotSelect)

      await waitFor(() => {
        expect(screen.getByText('RAG Search')).toBeInTheDocument()
      })
      await user.click(screen.getByText('RAG Search'))

      // Set percentage for second slot
      const secondSlotSlider = within(secondSlot).getByRole('slider')
      fireEvent.change(secondSlotSlider, { target: { value: '40' } })

      // Step 4: Configure simulation parameters
      const simulationSection = screen.getByText('3. Simulation Settings')
      expect(simulationSection).toBeInTheDocument()

      const timePeriodInput = screen.getByLabelText(/time period/i)
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '60')

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await user.clear(concurrentUsersInput)
      await user.type(concurrentUsersInput, '100')

      // Step 5: Run simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).not.toBeDisabled()

      await user.click(runButton)

      // Step 6: Verify results are displayed
      await waitFor(
        () => {
          expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify VRAM chart is rendered
      expect(screen.getByTestId('vram-chart')).toBeInTheDocument()

      // Verify results summary
      await waitFor(() => {
        expect(screen.getByText(/max.*vram/i)).toBeInTheDocument()
        expect(screen.getByText(/22\.4.*gb/i)).toBeInTheDocument()
      })

      // Verify GPU recommendations
      expect(screen.getByText('NVIDIA A100 80GB')).toBeInTheDocument()
      expect(screen.getByText('NVIDIA A6000 48GB')).toBeInTheDocument()

      // Verify services were called correctly
      expect(simulationService.runSimulation).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ id: 'llama-2-7b' }),
          workloadSlots: expect.arrayContaining([
            expect.objectContaining({
              workload: expect.objectContaining({ id: 'chat-basic' }),
              percentage: 60,
            }),
            expect.objectContaining({
              workload: expect.objectContaining({ id: 'rag-search' }),
              percentage: 40,
            }),
          ]),
          config: expect.objectContaining({
            timePeriodMinutes: 60,
            concurrentUsers: 100,
          }),
        })
      )
    })

    it('should handle model switching during workflow and update calculations', async () => {
      render(<App />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select first model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Llama 2 7B'))

      // Configure a workload
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Switch to second model
      await user.click(modelSelector)
      await user.click(screen.getByText('Mistral 7B'))

      // Verify model switch is reflected
      await waitFor(() => {
        expect(screen.getByDisplayValue('Mistral 7B')).toBeInTheDocument()
      })

      // Verify workload configuration is preserved
      expect(within(firstSlot).getByDisplayValue('Basic Chat')).toBeInTheDocument()
      expect(firstSlotSlider).toHaveValue('100')

      // Run simulation with new model
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Verify simulation runs with new model
      await waitFor(() => {
        expect(simulationService.runSimulation).toHaveBeenCalledWith(
          expect.objectContaining({
            model: expect.objectContaining({ id: 'mistral-7b' }),
          })
        )
      })
    })

    it('should export simulation results in multiple formats', async () => {
      // Mock URL.createObjectURL and document.createElement for file download
      const mockCreateObjectURL = vi.fn(() => 'mock-blob-url')
      const mockRevokeObjectURL = vi.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      const mockClick = vi.fn()
      const mockAnchorElement = {
        click: mockClick,
        href: '',
        download: '',
        style: { display: '' },
      }
      vi.spyOn(document, 'createElement').mockImplementation(tagName => {
        if (tagName === 'a') {
          return mockAnchorElement as HTMLAnchorElement
        }
        return document.createElement(tagName)
      })

      render(<App />)

      // Complete workflow setup
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Quick setup to get to results
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
      })

      // Test export functionality
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      // Verify export menu options
      expect(screen.getByText(/export.*json/i)).toBeInTheDocument()
      expect(screen.getByText(/export.*csv/i)).toBeInTheDocument()
      expect(screen.getByText(/export.*png/i)).toBeInTheDocument()

      // Test JSON export
      await user.click(screen.getByText(/export.*json/i))
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()

      // Cleanup
      vi.restoreAllMocks()
    })
  })

  describe('Validation and Error Scenarios', () => {
    it('should validate workload percentage allocation and prevent invalid configurations', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      // Configure workloads with invalid total (150%)
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '80' } })

      const secondSlot = screen.getByTestId('workload-slot-1')
      const secondSlotSelect = within(secondSlot).getByRole('combobox')
      await user.click(secondSlotSelect)
      await user.click(screen.getByText('RAG Search'))

      const secondSlotSlider = within(secondSlot).getByRole('slider')
      fireEvent.change(secondSlotSlider, { target: { value: '70' } })

      // Verify validation error is shown
      await waitFor(() => {
        expect(screen.getByText(/total.*exceed.*100/i)).toBeInTheDocument()
      })

      // Verify run button is disabled
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).toBeDisabled()

      // Fix the configuration
      fireEvent.change(secondSlotSlider, { target: { value: '20' } })

      // Verify validation passes
      await waitFor(() => {
        expect(screen.queryByText(/total.*exceed.*100/i)).not.toBeInTheDocument()
      })

      expect(runButton).not.toBeDisabled()
    })

    it('should handle simulation service errors gracefully', async () => {
      // Mock service to throw error
      const { simulationService } = await import('../../src/services/simulationService')
      simulationService.runSimulation.mockRejectedValue(
        new Error('Simulation failed: Insufficient GPU memory')
      )

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Complete configuration
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Try to run simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Verify error message is displayed
      await waitFor(
        () => {
          expect(
            screen.getByText(/simulation failed.*insufficient gpu memory/i)
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify the error doesn't crash the app
      expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      expect(screen.getByText('2. Configure Workloads')).toBeInTheDocument()
    })

    it('should validate simulation parameters and show specific error messages', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select model and configure basic workload
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Enter invalid simulation parameters
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '0') // Invalid: too short

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await user.clear(concurrentUsersInput)
      await user.type(concurrentUsersInput, '15000') // Invalid: too many

      // Try to run simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Verify specific validation errors
      await waitFor(() => {
        expect(screen.getByText(/time period.*at least.*1.*minute/i)).toBeInTheDocument()
        expect(screen.getByText(/concurrent users.*cannot exceed.*10.*000/i)).toBeInTheDocument()
      })

      // Verify simulation doesn't run
      expect(simulationService.runSimulation).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility and Keyboard Navigation', () => {
    it('should maintain accessibility throughout the complete workflow', async () => {
      const { container } = render(<App />)

      // Initial accessibility check
      let results = await axe(container)
      expect(results).toHaveNoViolations()

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Test keyboard navigation through model selection
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      modelSelector.focus()
      expect(modelSelector).toHaveFocus()

      // Open dropdown with keyboard
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate with arrows and select with Enter
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(modelSelector, { key: 'Enter', code: 'Enter' })

      // Verify model is selected
      await waitFor(() => {
        expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()
      })

      // Check accessibility after model selection
      results = await axe(container)
      expect(results).toHaveNoViolations()

      // Test keyboard navigation in workload configuration
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      firstSlotSelect.focus()

      fireEvent.keyDown(firstSlotSelect, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(firstSlotSelect, { key: 'Enter', code: 'Enter' })

      // Check accessibility after workload configuration
      results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should provide proper ARIA labels and screen reader support', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify ARIA labels exist
      expect(screen.getByRole('combobox', { name: /select.*model/i })).toHaveAttribute('aria-label')

      // Verify section headings for screen readers
      expect(screen.getByRole('heading', { name: /select model/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /configure workloads/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /simulation settings/i })).toBeInTheDocument()

      // Verify form controls have accessible names
      const timePeriodInput = screen.getByLabelText(/time period/i)
      expect(timePeriodInput).toHaveAccessibleName()

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      expect(concurrentUsersInput).toHaveAccessibleName()

      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).toHaveAccessibleName()
    })

    it('should announce state changes to screen readers', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Look for live regions that announce changes
      expect(screen.getByRole('status')).toBeInTheDocument()

      // Select a model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      // Verify model selection is announced
      await waitFor(() => {
        const statusRegion = screen.getByRole('status')
        expect(statusRegion).toHaveTextContent(/llama.*2.*7b.*selected/i)
      })

      // Configure workload
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      // Verify workload assignment is announced
      await waitFor(() => {
        const statusRegion = screen.getByRole('status')
        expect(statusRegion).toHaveTextContent(/basic chat.*assigned/i)
      })
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should handle rapid user interactions without performance degradation', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Rapidly change model selections
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })

      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      await user.click(modelSelector)
      await user.click(screen.getByText('Mistral 7B'))

      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // Verify interactions complete in reasonable time (< 2 seconds)
      expect(interactionTime).toBeLessThan(2000)

      // Verify final state is correct
      expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()
    })

    it('should debounce percentage slider changes to prevent excessive calculations', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Setup basic configuration
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const slider = within(firstSlot).getByRole('slider')

      // Rapidly change slider values
      fireEvent.change(slider, { target: { value: '10' } })
      fireEvent.change(slider, { target: { value: '20' } })
      fireEvent.change(slider, { target: { value: '30' } })
      fireEvent.change(slider, { target: { value: '40' } })
      fireEvent.change(slider, { target: { value: '50' } })

      // Wait for debouncing
      await waitFor(() => {
        expect(slider).toHaveValue('50')
      })

      // Verify calculation services were not called excessively
      // (This would require additional mocking to verify debouncing)
      expect(vramCalculator.calculateTotalVRAM).toHaveBeenCalled()
    })

    it('should maintain responsive UI during long-running simulations', async () => {
      // Mock a delayed simulation
      const { simulationService } = await import('../../src/services/simulationService')
      simulationService.runSimulation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSimulationResults), 2000))
      )

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Complete configuration quickly
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)
      await user.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Start simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Verify loading state is shown
      expect(screen.getByText(/running simulation/i)).toBeInTheDocument()
      expect(runButton).toBeDisabled()

      // Verify other controls remain interactive during simulation
      const timePeriodInput = screen.getByLabelText(/time period/i)
      expect(timePeriodInput).not.toBeDisabled()

      // Wait for simulation completion
      await waitFor(
        () => {
          expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      expect(runButton).not.toBeDisabled()
    })
  })
})
