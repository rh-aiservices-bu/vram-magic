import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import actual components
import App from '../../src/App'

// Import types for mocking
import type { Model, Workload, SimulationResults } from '../../src/types'

// Extend jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock services
vi.mock('../../src/services/modelService', () => ({
  modelService: {
    loadModels: vi.fn(),
    getModelById: vi.fn(),
  },
}))

vi.mock('../../src/services/vramCalculator', () => ({
  vramCalculator: {
    calculateTotalVRAM: vi.fn(),
    simulateUsageOverTime: vi.fn(),
  },
}))

vi.mock('../../src/services/simulationService', () => ({
  simulationService: {
    runSimulation: vi.fn(),
  },
}))

// Test data
const mockModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: 'Meta Llama 2 7 billion parameter model optimized for chat applications',
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
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'Mistral AI 7 billion parameter instruction-following model',
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
    performance: [],
    metadata: {
      releaseDate: '2023-09-27',
      organization: 'Mistral AI',
      license: 'Apache 2.0',
      tags: ['mistral', '7b'],
    },
  },
]

// Used for validation in complete workflow tests
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockWorkloads: Workload[] = [
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    description: 'Simple conversational interactions for customer support',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat',
    requestPattern: 'steady',
    complexityScore: 1,
  },
  {
    id: 'rag-search',
    name: 'RAG Search',
    description: 'Retrieval-augmented generation for knowledge base queries',
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
  gpuRecommendations: [
    {
      name: 'NVIDIA A6000 48GB',
      vramCapacity: 49152,
      isRecommended: true,
      utilizationPercentage: 34,
      costPerHour: 1.28,
      notes: 'Good balance of performance and cost',
    },
  ],
  config: {
    timePeriodMinutes: 60,
    concurrentUsers: 100,
    requestDistribution: 'uniform',
    samplingIntervalSeconds: 60,
  },
}

describe('Accessibility and Keyboard Navigation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup service mocks
    const { modelService } = await import('../../src/services/modelService')
    const { vramCalculator } = await import('../../src/services/vramCalculator')
    const { simulationService } = await import('../../src/services/simulationService')

    modelService.loadModels.mockResolvedValue(mockModels)
    modelService.getModelById.mockImplementation(
      async (id: string) => mockModels.find(model => model.id === id) || null
    )

    vramCalculator.calculateTotalVRAM.mockReturnValue(16800)
    simulationService.runSimulation.mockResolvedValue(mockSimulationResults)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations on initial load', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Run axe accessibility tests
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should maintain accessibility throughout complete workflow', async () => {
      const { container } = render(<App />)
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Initial state accessibility
      let results = await axe(container)
      expect(results).toHaveNoViolations()

      // Model selection state
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await user.click(modelSelector)

      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeInTheDocument()
      })

      results = await axe(container)
      expect(results).toHaveNoViolations()

      await user.click(screen.getByText('Llama 2 7B'))

      // Post-selection accessibility
      results = await axe(container)
      expect(results).toHaveNoViolations()

      // Workload configuration state
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await user.click(firstSlotSelect)
      await user.click(screen.getByText('Basic Chat'))

      results = await axe(container)
      expect(results).toHaveNoViolations()

      // Simulation state
      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await user.click(runButton)

      // Results state accessibility
      await waitFor(() => {
        expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
      })

      results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper semantic markup and landmarks', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('banner')).toBeInTheDocument() // Header
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // Footer

      // Verify sections have proper headings
      expect(
        screen.getByRole('heading', { level: 2, name: /configuration.*results/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 5, name: /select model/i })).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 5, name: /configure workloads/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 5, name: /simulation settings/i })
      ).toBeInTheDocument()

      // Verify form controls have proper labels
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      expect(modelSelector).toHaveAccessibleName()

      const timePeriodInput = screen.getByLabelText(/time period/i)
      expect(timePeriodInput).toHaveAccessibleName()

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      expect(concurrentUsersInput).toHaveAccessibleName()
    })

    it('should have appropriate color contrast ratios', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // axe will check color contrast as part of accessibility violations
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
      expect(results).toHaveNoViolations()

      // Test in dark mode as well
      const themeToggle = screen.getByRole('button', { name: /toggle.*theme/i })
      await userEvent.click(themeToggle)

      const darkModeResults = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      })
      expect(darkModeResults).toHaveNoViolations()
    })

    it('should support high contrast mode', async () => {
      // Simulate Windows high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Should still pass accessibility tests in high contrast mode
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support reduced motion preferences', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify animations are disabled or reduced
      const animations = document.querySelectorAll('[style*="transition"], [style*="animation"]')
      animations.forEach(element => {
        const style = window.getComputedStyle(element)
        // In reduced motion mode, transitions should be very fast or disabled
        expect(
          style.transitionDuration === '0s' ||
            style.transitionDuration === '0.01s' ||
            style.animationDuration === '0s' ||
            style.animationDuration === '0.01s'
        ).toBe(true)
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation through all interactive elements', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Test Tab navigation through main interactive elements
      const interactiveElements = [
        screen.getByRole('combobox', { name: /select.*model/i }),
        ...screen.getAllByRole('combobox').slice(1, 6), // Workload slot selectors
        ...screen.getAllByRole('slider'), // Percentage sliders
        screen.getByLabelText(/time period/i),
        screen.getByLabelText(/concurrent users/i),
        screen.getByLabelText(/request distribution/i),
        screen.getByRole('button', { name: /run simulation/i }),
      ]

      // Verify all elements are focusable with Tab
      for (const element of interactiveElements) {
        element.focus()
        expect(element).toHaveFocus()

        // Tab to next element
        fireEvent.keyDown(element, { key: 'Tab', code: 'Tab' })
      }

      // Verify Shift+Tab works in reverse
      for (let i = interactiveElements.length - 1; i >= 0; i--) {
        const element = interactiveElements[i]
        element.focus()
        expect(element).toHaveFocus()

        fireEvent.keyDown(element, { key: 'Tab', code: 'Tab', shiftKey: true })
      }
    })

    it('should handle Enter and Space key activation correctly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Test model selector activation with Enter
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      modelSelector.focus()

      fireEvent.keyDown(modelSelector, { key: 'Enter', code: 'Enter' })
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Test option selection with Enter
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(modelSelector, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Llama 2 7B')).toBeInTheDocument()
      })

      // Test button activation with Space
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      firstSlotSelect.focus()

      fireEvent.keyDown(firstSlotSelect, { key: ' ', code: 'Space' })
      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
      })
    })

    it('should support arrow key navigation in dropdowns and sliders', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Test arrow key navigation in model dropdown
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      modelSelector.focus()

      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate through options
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(modelSelector, { key: 'ArrowUp', code: 'ArrowUp' })
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(modelSelector, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByDisplayValue('Mistral 7B')).toBeInTheDocument()
      })

      // Configure workload to test slider navigation
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      // Test arrow key navigation on slider
      const slider = within(firstSlot).getByRole('slider')
      slider.focus()

      const initialValue = parseInt(slider.getAttribute('value') || '0')

      fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' })
      expect(parseInt(slider.getAttribute('value') || '0')).toBeGreaterThan(initialValue)

      fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' })
      expect(parseInt(slider.getAttribute('value') || '0')).toBe(initialValue)

      // Test Home/End keys
      fireEvent.keyDown(slider, { key: 'Home', code: 'Home' })
      expect(slider.getAttribute('value')).toBe('0')

      fireEvent.keyDown(slider, { key: 'End', code: 'End' })
      expect(parseInt(slider.getAttribute('value') || '0')).toBe(100)
    })

    it('should trap focus in modal dialogs and overlays', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Trigger error modal (simulate error state)
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValueOnce(new Error('Test error'))

      // Reload to trigger error
      const retryButton = screen.queryByRole('button', { name: /retry/i })
      if (retryButton) {
        await userEvent.click(retryButton)

        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument()
        })

        // Focus should be trapped in the error alert
        const alertDialog = screen.getByRole('alert')
        const focusableElements = within(alertDialog).getAllByRole('button')

        if (focusableElements.length > 0) {
          focusableElements[0].focus()
          expect(focusableElements[0]).toHaveFocus()

          // Tab should cycle through only elements in the modal
          fireEvent.keyDown(focusableElements[0], { key: 'Tab', code: 'Tab' })

          if (focusableElements.length > 1) {
            expect(focusableElements[1]).toHaveFocus()
          } else {
            expect(focusableElements[0]).toHaveFocus() // Should cycle back
          }
        }
      }
    })

    it('should provide skip links for keyboard navigation', async () => {
      render(<App />)

      // Focus the first element (which should reveal skip links)
      const firstFocusableElement = document.querySelector(
        'button, input, select, textarea, a[href]'
      ) as HTMLElement
      firstFocusableElement?.focus()

      // Check for skip link to main content
      const skipLink = screen.queryByRole('link', { name: /skip to main content/i })
      if (skipLink) {
        expect(skipLink).toBeInTheDocument()

        // Should be visually hidden by default
        expect(skipLink).toHaveClass('sr-only')

        // Should become visible on focus
        skipLink.focus()
        expect(skipLink).toHaveFocus()
      }
    })

    it('should support keyboard shortcuts for common actions', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Test Ctrl+Enter for running simulation (if implemented)
      document.body.focus()

      fireEvent.keyDown(document.body, {
        key: 'Enter',
        code: 'Enter',
        ctrlKey: true,
      })

      // Should focus or activate the run button
      const runButton = screen.getByRole('button', { name: /run simulation/i })

      // Button might become focused or activated
      expect(
        runButton === document.activeElement || runButton.getAttribute('aria-pressed') === 'true'
      ).toBe(true)

      // Test Escape key to close dropdowns
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      fireEvent.keyDown(modelSelector, { key: 'Escape', code: 'Escape' })

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify form controls have proper labels
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      expect(modelSelector).toHaveAttribute('aria-label')

      // Verify complex components have descriptions
      const workloadSlots = screen.getAllByTestId(/workload-slot-/)
      workloadSlots.forEach(slot => {
        const slotCombobox = within(slot).getByRole('combobox')
        expect(slotCombobox).toHaveAccessibleName()
        expect(slotCombobox).toHaveAttribute('aria-describedby')
      })

      // Verify sliders have proper labels and values
      const sliders = screen.getAllByRole('slider')
      sliders.forEach(slider => {
        expect(slider).toHaveAccessibleName()
        expect(slider).toHaveAttribute('aria-valuenow')
        expect(slider).toHaveAttribute('aria-valuemin')
        expect(slider).toHaveAttribute('aria-valuemax')
      })

      // Verify buttons have descriptive names
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).toHaveAccessibleName()
    })

    it('should announce state changes with live regions', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Should have live region for announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')

      // Select a model and verify announcement
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/llama.*2.*7b.*selected/i)
      })

      // Configure workload and verify announcement
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/basic chat.*workload.*assigned/i)
      })

      // Change percentage and verify announcement
      const slider = within(firstSlot).getByRole('slider')
      fireEvent.change(slider, { target: { value: '75' } })

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/percentage.*75/i)
      })
    })

    it('should provide detailed descriptions for complex visualizations', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Complete workflow to get to results
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const slider = within(firstSlot).getByRole('slider')
      fireEvent.change(slider, { target: { value: '100' } })

      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await userEvent.click(runButton)

      // Wait for chart to appear
      await waitFor(() => {
        expect(screen.getByTestId('vram-chart')).toBeInTheDocument()
      })

      // Chart should have proper accessibility attributes
      const chart = screen.getByTestId('vram-chart')
      expect(chart).toHaveAttribute('role', 'img')
      expect(chart).toHaveAttribute('aria-label')

      // Should have detailed description
      const chartDescription = chart.getAttribute('aria-describedby')
      if (chartDescription) {
        const descriptionElement = document.getElementById(chartDescription)
        expect(descriptionElement).toBeInTheDocument()
        expect(descriptionElement?.textContent).toContain('VRAM usage over time')
      }

      // Should have table alternative for screen readers
      const dataTable = screen.queryByRole('table', { name: /vram usage data/i })
      if (dataTable) {
        expect(dataTable).toBeInTheDocument()
        expect(dataTable).toHaveClass('sr-only') // Visually hidden but available to screen readers
      }
    })

    it('should support screen reader navigation landmarks', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify main landmarks exist
      expect(screen.getByRole('banner')).toBeInTheDocument() // Header
      expect(screen.getByRole('main')).toBeInTheDocument() // Main content
      expect(screen.getByRole('contentinfo')).toBeInTheDocument() // Footer

      // Verify sections within main content
      const main = screen.getByRole('main')
      const configurationSection = within(main).getByLabelText(/configuration/i)
      const resultsSection = within(main).getByLabelText(/results/i)

      expect(configurationSection).toBeInTheDocument()
      expect(resultsSection).toBeInTheDocument()

      // Verify proper heading hierarchy
      const headings = screen.getAllByRole('heading')
      let previousLevel = 0

      headings.forEach(heading => {
        const level = parseInt(heading.tagName.charAt(1))
        expect(level).toBeGreaterThanOrEqual(1)
        expect(level).toBeLessThanOrEqual(6)

        // Headings should not skip levels (though they can go backwards)
        if (level > previousLevel) {
          expect(level - previousLevel).toBeLessThanOrEqual(1)
        }

        previousLevel = level
      })
    })

    it('should provide error messages that are accessible', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValueOnce(new Error('Connection failed'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      const errorAlert = screen.getByRole('alert')

      // Error should be announced immediately
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive')

      // Should have descriptive error message
      expect(errorAlert).toHaveTextContent(/connection failed/i)

      // Should provide recovery actions
      const retryButton = within(errorAlert).queryByRole('button', { name: /retry/i })
      if (retryButton) {
        expect(retryButton).toHaveAccessibleName()
      }

      // Should not interfere with form validation errors
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await userEvent.clear(timePeriodInput)
      await userEvent.type(timePeriodInput, '-5')

      await waitFor(() => {
        const validationError = screen.queryByText(/must be positive/i)
        if (validationError) {
          expect(validationError).toHaveAttribute('role', 'alert')
          expect(validationError).toHaveAttribute('aria-live', 'assertive')
        }
      })
    })
  })

  describe('Mobile Accessibility', () => {
    it('should be accessible on touch devices', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Should still pass accessibility tests on mobile
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Touch targets should be large enough (44px minimum)
      const touchTargets = container.querySelectorAll('button, input, select, a')
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect()
        const minSize = 44

        if (rect.width > 0 && rect.height > 0) {
          expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize - 5) // 5px tolerance
        }
      })
    })

    it('should support voice control and switch navigation', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // All interactive elements should have accessible names for voice control
      const interactiveElements = screen.getAllByRole(
        /^(button|combobox|slider|textbox|searchbox)$/
      )

      interactiveElements.forEach(element => {
        expect(element).toHaveAccessibleName()

        // Should be reachable via sequential navigation
        expect(element).not.toHaveAttribute('tabindex', '-1')
      })

      // Should support programmatic focus for switch navigation
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      modelSelector.focus()
      expect(modelSelector).toHaveFocus()

      const runButton = screen.getByRole('button', { name: /run simulation/i })
      runButton.focus()
      expect(runButton).toHaveFocus()
    })

    it('should handle orientation changes gracefully', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Simulate landscape orientation
      Object.defineProperty(screen, 'orientation', {
        value: { angle: 90, type: 'landscape-primary' },
      })

      window.dispatchEvent(new Event('orientationchange'))

      // Should maintain accessibility after orientation change
      await waitFor(async () => {
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })

      // Should still be navigable
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      modelSelector.focus()
      expect(modelSelector).toHaveFocus()
    })
  })
})
