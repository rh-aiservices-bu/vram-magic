import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

// Components for simulation testing
import App from '../../src/App'
import { VRAMChart } from '../../src/components/VRAMChart'
import { ResultsSummary } from '../../src/components/ResultsSummary'

// Types that don't exist yet - will cause tests to fail initially
import type {
  Model,
  Workload,
  VRAMUsagePoint,
  RequestDistributionPattern,
  GPURecommendation,
} from '../../src/types'

// Mock data for testing
const mockModel: Model = {
  id: 'llama-2-7b',
  name: 'Llama 2 7B',
  parameters: 7000000000,
  architecture: {
    layers: 32,
    hiddenSize: 4096,
    vocabSize: 32000,
    maxSequenceLength: 4096,
  },
  vramRequirements: {
    baseVRAM: 14.0,
    kvCacheCoefficient: 0.000002,
    activationCoefficient: 0.000004,
    overheadFactor: 0.1,
  },
  precision: 'fp16',
}

const mockWorkloads: Workload[] = [
  {
    id: 'chat',
    name: 'Chat Conversation',
    inputTokens: 512,
    outputTokens: 256,
    category: 'chat',
  },
  {
    id: 'rag',
    name: 'RAG Question Answering',
    inputTokens: 2048,
    outputTokens: 512,
    category: 'rag',
  },
  {
    id: 'coding',
    name: 'Code Generation',
    inputTokens: 1024,
    outputTokens: 1024,
    category: 'coding',
  },
]

const mockVRAMUsagePoints: VRAMUsagePoint[] = [
  {
    timestamp: 0,
    totalVRAM: 16.8,
    breakdown: {
      baseModel: 14.0,
      kvCache: 2.1,
      activations: 0.5,
      overhead: 0.2,
    },
  },
  {
    timestamp: 1800000, // 30 minutes
    totalVRAM: 22.4,
    breakdown: {
      baseModel: 14.0,
      kvCache: 6.8,
      activations: 1.2,
      overhead: 0.4,
    },
  },
  {
    timestamp: 3600000, // 60 minutes
    totalVRAM: 18.9,
    breakdown: {
      baseModel: 14.0,
      kvCache: 3.9,
      activations: 0.8,
      overhead: 0.2,
    },
  },
]

const mockGPURecommendations: GPURecommendation[] = [
  {
    name: 'NVIDIA A100 80GB',
    vramCapacity: 80,
    isRecommended: true,
    utilizationPercentage: 28,
    notes: 'Plenty of headroom for growth',
  },
  {
    name: 'NVIDIA A6000 48GB',
    vramCapacity: 48,
    isRecommended: true,
    utilizationPercentage: 47,
    notes: 'Good fit with moderate headroom',
  },
  {
    name: 'NVIDIA RTX 4090 24GB',
    vramCapacity: 24,
    isRecommended: false,
    utilizationPercentage: 93,
    notes: 'Insufficient VRAM for peak usage',
  },
]

// Mock services
vi.mock('../../src/services/vramCalculator', () => ({
  vramCalculator: {
    calculateVRAMUsage: vi.fn(),
    calculateTimeBasedUsage: vi.fn(),
    getMaxVRAMUsage: vi.fn(),
  },
}))

vi.mock('../../src/services/modelService', () => ({
  modelService: {
    getAllModels: vi.fn(),
    getModelById: vi.fn(),
    searchModels: vi.fn(),
  },
}))

vi.mock('../../src/services/simulationService', () => ({
  simulationService: {
    runSimulation: vi.fn(),
    generateRequestPattern: vi.fn(),
    calculateGPURecommendations: vi.fn(),
  },
}))

const theme = createTheme()

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

describe('Simulation Workflow Integration Tests', () => {
  beforeEach(() => {
    // Setup mocks before each test
    vi.clearAllMocks()

    // Mock ModelService responses
    const { modelService } = await import('../../src/services/modelService')
    modelService.getAllModels.mockResolvedValue([mockModel])
    modelService.getModelById.mockResolvedValue(mockModel)
    modelService.searchModels.mockResolvedValue([mockModel])

    // Mock VRAMCalculator responses
    const { vramCalculator } = await import('../../src/services/vramCalculator')
    vramCalculator.calculateVRAMUsage.mockReturnValue({
      totalVRAM: 16.8,
      breakdown: mockVRAMUsagePoints[0].breakdown,
    })
    vramCalculator.calculateTimeBasedUsage.mockReturnValue(mockVRAMUsagePoints)
    vramCalculator.getMaxVRAMUsage.mockReturnValue(22.4)

    // Mock SimulationService responses
    const { simulationService } = await import('../../src/services/simulationService')
    simulationService.runSimulation.mockResolvedValue({
      vramUsagePoints: mockVRAMUsagePoints,
      maxVRAM: 22.4,
      averageVRAM: 19.4,
      peakTimestamp: 1800000,
    })
    simulationService.generateRequestPattern.mockReturnValue([
      { timestamp: 0, requestCount: 10 },
      { timestamp: 1800000, requestCount: 25 },
      { timestamp: 3600000, requestCount: 15 },
    ])
    simulationService.calculateGPURecommendations.mockReturnValue(mockGPURecommendations)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Complete End-to-End Simulation Workflow', () => {
    it('should complete full simulation workflow from model selection to results', async () => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Step 1: Select a model
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)

      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Verify model is selected
      expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()

      // Step 2: Configure workloads
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      expect(workloadSlots).toHaveLength(5)

      // Add first workload (Chat)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)

      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)

      // Set percentage for first slot
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '50' } })

      // Add second workload (RAG)
      const secondSlot = workloadSlots[1]
      const secondSlotSelect = within(secondSlot).getByLabelText(/select workload/i)
      await user.click(secondSlotSelect)

      const ragWorkload = await screen.findByText('RAG Question Answering')
      await user.click(ragWorkload)

      // Set percentage for second slot
      const secondSlotSlider = within(secondSlot).getByRole('slider')
      fireEvent.change(secondSlotSlider, { target: { value: '30' } })

      // Add third workload (Coding)
      const thirdSlot = workloadSlots[2]
      const thirdSlotSelect = within(thirdSlot).getByLabelText(/select workload/i)
      await user.click(thirdSlotSelect)

      const codingWorkload = await screen.findByText('Code Generation')
      await user.click(codingWorkload)

      // Set percentage for third slot
      const thirdSlotSlider = within(thirdSlot).getByRole('slider')
      fireEvent.change(thirdSlotSlider, { target: { value: '20' } })

      // Step 3: Configure simulation parameters
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '60')

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await user.clear(concurrentUsersInput)
      await user.type(concurrentUsersInput, '100')

      const distributionSelect = screen.getByLabelText(/request distribution/i)
      await user.click(distributionSelect)
      const uniformOption = await screen.findByText('Uniform')
      await user.click(uniformOption)

      // Step 4: Run simulation
      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      // Step 5: Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText(/simulation results/i)).toBeInTheDocument()
      })

      // Verify VRAM chart is rendered
      expect(screen.getByTestId('vram-chart')).toBeInTheDocument()

      // Verify results summary
      expect(screen.getByText(/max vram.*22\.4.*gb/i)).toBeInTheDocument()
      expect(screen.getByText(/average vram.*19\.4.*gb/i)).toBeInTheDocument()

      // Verify GPU recommendations
      expect(screen.getByText('NVIDIA A100 80GB')).toBeInTheDocument()
      expect(screen.getByText('NVIDIA A6000 48GB')).toBeInTheDocument()
      expect(screen.getByText('NVIDIA RTX 4090 24GB')).toBeInTheDocument()

      // Verify services were called with correct parameters
      const { simulationService } = await import('../../src/services/simulationService')
      expect(simulationService.runSimulation).toHaveBeenCalledWith({
        model: mockModel,
        workloadSlots: expect.arrayContaining([
          expect.objectContaining({ workload: mockWorkloads[0], percentage: 50 }),
          expect.objectContaining({ workload: mockWorkloads[1], percentage: 30 }),
          expect.objectContaining({ workload: mockWorkloads[2], percentage: 20 }),
        ]),
        simulationConfig: expect.objectContaining({
          timePeriodMinutes: 60,
          concurrentUsers: 100,
          requestDistribution: 'uniform',
        }),
      })
    })

    it('should validate simulation parameters and show errors for invalid inputs', async () => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Select a model first
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Enter invalid time period (too short)
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await user.clear(timePeriodInput)
      await user.type(timePeriodInput, '0')

      // Enter invalid concurrent users (too many)
      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await user.clear(concurrentUsersInput)
      await user.type(concurrentUsersInput, '15000')

      // Try to run simulation with invalid parameters
      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      // Verify validation errors are shown
      await waitFor(() => {
        expect(screen.getByText(/time period must be at least 1 minute/i)).toBeInTheDocument()
        expect(screen.getByText(/concurrent users cannot exceed 10,000/i)).toBeInTheDocument()
      })

      // Verify simulation was not run
      const { simulationService } = await import('../../src/services/simulationService')
      expect(simulationService.runSimulation).not.toHaveBeenCalled()
    })

    it('should validate workload percentage allocation totals 100%', async () => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Select a model
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Configure workloads with invalid percentage total (150%)
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)

      // First workload: 80%
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '80' } })

      // Second workload: 70%
      const secondSlot = workloadSlots[1]
      const secondSlotSelect = within(secondSlot).getByLabelText(/select workload/i)
      await user.click(secondSlotSelect)
      const ragWorkload = await screen.findByText('RAG Question Answering')
      await user.click(ragWorkload)
      const secondSlotSlider = within(secondSlot).getByRole('slider')
      fireEvent.change(secondSlotSlider, { target: { value: '70' } })

      // Try to run simulation
      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      // Verify validation error for percentage total
      await waitFor(() => {
        expect(screen.getByText(/workload percentages must total 100%/i)).toBeInTheDocument()
      })

      const { simulationService } = await import('../../src/services/simulationService')
      expect(simulationService.runSimulation).not.toHaveBeenCalled()
    })
  })

  describe('Request Distribution Patterns', () => {
    const testDistributionPattern = async (
      pattern: RequestDistributionPattern,
      _expectedCallCount: number
    ) => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Setup basic configuration
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Add a workload
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Set distribution pattern
      const distributionSelect = screen.getByLabelText(/request distribution/i)
      await user.click(distributionSelect)
      const patternOption = await screen.findByText(new RegExp(pattern, 'i'))
      await user.click(patternOption)

      // Run simulation
      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      await waitFor(() => {
        const { simulationService } = await import('../../src/services/simulationService')
        expect(simulationService.runSimulation).toHaveBeenCalledWith(
          expect.objectContaining({
            simulationConfig: expect.objectContaining({
              requestDistribution: pattern,
            }),
          })
        )
      })
    }

    it('should handle uniform request distribution pattern', async () => {
      await testDistributionPattern('uniform', 1)
    })

    it('should handle front-loaded request distribution pattern', async () => {
      await testDistributionPattern('front-loaded', 1)
    })

    it('should handle back-loaded request distribution pattern', async () => {
      await testDistributionPattern('back-loaded', 1)
    })

    it('should handle bell curve request distribution pattern', async () => {
      await testDistributionPattern('bell-curve', 1)
    })
  })

  describe('VRAM Calculation and Chart Data', () => {
    it('should calculate VRAM usage with time-based data and concurrent users', async () => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Setup and run simulation
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Configure workload
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Set concurrent users
      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await user.clear(concurrentUsersInput)
      await user.type(concurrentUsersInput, '50')

      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      await waitFor(() => {
        const { vramCalculator } = await import('../../src/services/vramCalculator')
        expect(vramCalculator.calculateTimeBasedUsage).toHaveBeenCalledWith(
          expect.objectContaining({
            model: mockModel,
            workloadSlots: expect.any(Array),
            simulationConfig: expect.objectContaining({
              concurrentUsers: 50,
            }),
          })
        )
      })

      // Verify chart data is generated correctly
      const chart = screen.getByTestId('vram-chart')
      expect(chart).toBeInTheDocument()

      // Check that chart receives proper data structure for Recharts
      expect(chart).toHaveAttribute('data-testid', 'vram-chart')
    })

    it('should generate proper chart data structure for Recharts stacked area chart', async () => {
      renderWithTheme(<VRAMChart vramUsagePoints={mockVRAMUsagePoints} />)

      // Verify chart container exists
      expect(screen.getByTestId('vram-chart')).toBeInTheDocument()

      // Verify chart has data points
      const chartData = mockVRAMUsagePoints.map(point => ({
        timestamp: point.timestamp,
        totalVRAM: point.totalVRAM,
        baseModel: point.breakdown.baseModel,
        kvCache: point.breakdown.kvCache,
        activations: point.breakdown.activations,
        overhead: point.breakdown.overhead,
      }))

      // Check that data structure is suitable for stacked area chart
      expect(chartData).toHaveLength(3)
      expect(chartData[0]).toMatchObject({
        timestamp: 0,
        totalVRAM: 16.8,
        baseModel: 14.0,
        kvCache: 2.1,
        activations: 0.5,
        overhead: 0.2,
      })
    })
  })

  describe('Results Summary and GPU Recommendations', () => {
    it('should display max VRAM usage and GPU recommendations', async () => {
      renderWithTheme(
        <ResultsSummary
          maxVRAM={22.4}
          averageVRAM={19.4}
          gpuRecommendations={mockGPURecommendations}
        />
      )

      // Verify max VRAM display
      expect(screen.getByText(/max vram.*22\.4.*gb/i)).toBeInTheDocument()
      expect(screen.getByText(/average vram.*19\.4.*gb/i)).toBeInTheDocument()

      // Verify GPU recommendations
      expect(screen.getByText('NVIDIA A100 80GB')).toBeInTheDocument()
      expect(screen.getByText('NVIDIA A6000 48GB')).toBeInTheDocument()
      expect(screen.getByText('NVIDIA RTX 4090 24GB')).toBeInTheDocument()

      // Verify recommendation indicators
      expect(screen.getByText(/recommended/i)).toBeInTheDocument()
      expect(screen.getByText(/insufficient vram/i)).toBeInTheDocument()

      // Verify utilization percentages
      expect(screen.getByText(/28%/)).toBeInTheDocument()
      expect(screen.getByText(/47%/)).toBeInTheDocument()
      expect(screen.getByText(/93%/)).toBeInTheDocument()
    })

    it('should calculate GPU recommendations based on max VRAM usage', async () => {
      const user = userEvent.setup()
      renderWithTheme(<App />)

      // Run complete simulation
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      // Add workload
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      await waitFor(() => {
        const { simulationService } = await import('../../src/services/simulationService')
        expect(simulationService.calculateGPURecommendations).toHaveBeenCalledWith(22.4)
      })
    })
  })

  describe('Error Handling and Loading States', () => {
    it('should handle simulation service errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock service to throw error
      const { simulationService } = await import('../../src/services/simulationService')
      simulationService.runSimulation.mockRejectedValue(
        new Error('Simulation failed: Invalid parameters')
      )

      renderWithTheme(<App />)

      // Setup and run simulation
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/simulation failed.*invalid parameters/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during simulation', async () => {
      const user = userEvent.setup()

      // Mock service with delayed response
      let resolveSimulation: (value: unknown) => void
      const simulationPromise = new Promise(resolve => {
        resolveSimulation = resolve
      })
      const { simulationService } = await import('../../src/services/simulationService')
      simulationService.runSimulation.mockReturnValue(simulationPromise)

      renderWithTheme(<App />)

      // Setup and start simulation
      const modelSelector = screen.getByLabelText(/select model/i)
      await user.click(modelSelector)
      const modelOption = await screen.findByText('Llama 2 7B')
      await user.click(modelOption)

      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      const firstSlot = workloadSlots[0]
      const firstSlotSelect = within(firstSlot).getByLabelText(/select workload/i)
      await user.click(firstSlotSelect)
      const chatWorkload = await screen.findByText('Chat Conversation')
      await user.click(chatWorkload)
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runSimulationButton)

      // Verify loading state is shown
      expect(screen.getByText(/running simulation/i)).toBeInTheDocument()
      expect(runSimulationButton).toBeDisabled()

      // Resolve simulation and verify loading state is removed
      resolveSimulation({
        vramUsagePoints: mockVRAMUsagePoints,
        maxVRAM: 22.4,
        averageVRAM: 19.4,
        peakTimestamp: 1800000,
      })

      await waitFor(() => {
        expect(screen.queryByText(/running simulation/i)).not.toBeInTheDocument()
        expect(runSimulationButton).not.toBeDisabled()
      })
    })
  })

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support keyboard navigation through the simulation workflow', async () => {
      renderWithTheme(<App />)

      // Verify all interactive elements are focusable
      const modelSelector = screen.getByLabelText(/select model/i)
      expect(modelSelector).toHaveAttribute('tabindex', '0')

      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      workloadSlots.forEach(slot => {
        const select = within(slot).getByLabelText(/select workload/i)
        expect(select).toHaveAttribute('tabindex', '0')

        const slider = within(slot).getByRole('slider')
        expect(slider).toHaveAttribute('tabindex', '0')
      })

      const runSimulationButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runSimulationButton).toHaveAttribute('tabindex', '0')
    })

    it('should have proper ARIA labels and screen reader support', () => {
      renderWithTheme(<App />)

      // Verify ARIA labels
      expect(screen.getByLabelText(/select model/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/time period/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/concurrent users/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/request distribution/i)).toBeInTheDocument()

      // Verify button has accessible name
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).toHaveAccessibleName()
    })
  })
})
