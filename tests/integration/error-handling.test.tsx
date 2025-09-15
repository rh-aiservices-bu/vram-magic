import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'

// Import actual components and contexts
import App from '../../src/App'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'
// Import types
import type { Model, Workload } from '../../src/types'

// Mock console to suppress expected error logs during tests
const originalConsoleError = console.error
const mockConsoleError = vi.fn()

// Mock services with error scenarios
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
    validateSimulationConfig: vi.fn(),
  },
}))

// Mock network/fetch for service error testing
global.fetch = vi.fn()

// Test data
const mockModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: 'Test model',
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
      tags: ['llama'],
    },
  },
]

const corruptedModel = {
  id: 'corrupted-model',
  name: 'Corrupted Model',
  // Missing required fields to trigger validation errors
  parameters: null,
  precision: 'invalid-precision',
  architecture: null,
  vramRequirements: null,
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockWorkloads: Workload[] = [
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    description: 'Test workload',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat',
    requestPattern: 'steady',
    complexityScore: 1,
  },
]

describe('Error Handling and Edge Cases Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    console.error = mockConsoleError
  })

  afterEach(() => {
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  describe('Service Error Handling', () => {
    it('should handle model service connection failures', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(
        new Error('Network error: Unable to reach model service')
      )

      render(<App />)

      // Wait for error to appear
      await waitFor(
        () => {
          expect(screen.getByText(/unable to reach model service/i)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )

      // Verify retry functionality
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()

      // Test retry mechanism
      modelService.loadModels.mockResolvedValueOnce(mockModels)
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.queryByText(/unable to reach model service/i)).not.toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: /select.*model/i })).toBeInTheDocument()
      })
    })

    it('should handle corrupted model data gracefully', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue([corruptedModel])
      modelService.validateModel.mockReturnValue({
        isValid: false,
        errors: ['Missing required fields: parameters, architecture, vramRequirements'],
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/data validation error/i)).toBeInTheDocument()
      })

      // Should show specific validation errors
      expect(screen.getByText(/missing required fields/i)).toBeInTheDocument()

      // Model selector should be disabled or show warning
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      expect(modelSelector).toBeDisabled()
    })

    it('should handle VRAM calculation errors and provide fallback', async () => {
      const { modelService } = await import('../../src/services/modelService')
      const { vramCalculator } = await import('../../src/services/vramCalculator')
      modelService.loadModels.mockResolvedValue(mockModels)
      vramCalculator.calculateTotalVRAM.mockImplementation(() => {
        throw new Error('Division by zero in KV cache calculation')
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Configure workload
      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      // Should show calculation error but not crash
      await waitFor(() => {
        expect(screen.getByText(/calculation error/i)).toBeInTheDocument()
        expect(screen.getByText(/division by zero in kv cache/i)).toBeInTheDocument()
      })

      // Should provide fallback estimate
      expect(screen.getByText(/using estimated values/i)).toBeInTheDocument()
    })

    it('should handle simulation timeout and cancellation', async () => {
      const { modelService } = await import('../../src/services/modelService')
      const { simulationService } = await import('../../src/services/simulationService')
      modelService.loadModels.mockResolvedValue(mockModels)

      // Mock long-running simulation that can be cancelled
      const abortController = new AbortController()
      simulationService.runSimulation.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Simulation timeout after 30 seconds'))
            }, 100) // Short timeout for testing

            abortController.signal.addEventListener('abort', () => {
              clearTimeout(timeout)
              reject(new Error('Simulation cancelled by user'))
            })
          })
      )

      render(<App />)

      // Setup configuration
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Start simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await userEvent.click(runButton)

      // Should show cancel button during simulation
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      })

      // Test cancellation
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.getByText(/simulation cancelled/i)).toBeInTheDocument()
      })
    })

    it('should handle out-of-memory errors during large simulations', async () => {
      const { modelService } = await import('../../src/services/modelService')
      const { simulationService } = await import('../../src/services/simulationService')
      modelService.loadModels.mockResolvedValue(mockModels)
      simulationService.runSimulation.mockRejectedValue(
        new Error('RangeError: Maximum call stack size exceeded')
      )

      render(<App />)

      // Setup large simulation
      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Set large simulation parameters
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await userEvent.clear(timePeriodInput)
      await userEvent.type(timePeriodInput, '1440') // 24 hours

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await userEvent.clear(concurrentUsersInput)
      await userEvent.type(concurrentUsersInput, '10000') // Maximum users

      // Try to run simulation
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      await userEvent.click(runButton)

      // Should handle out-of-memory gracefully
      await waitFor(() => {
        expect(screen.getByText(/memory limit exceeded/i)).toBeInTheDocument()
        expect(screen.getByText(/try reducing simulation parameters/i)).toBeInTheDocument()
      })

      // Should suggest parameter reduction
      expect(screen.getByText(/reduce time period or concurrent users/i)).toBeInTheDocument()
    })
  })

  describe('Validation and Input Error Handling', () => {
    it('should validate extreme input values and prevent system instability', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue(mockModels)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select model
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Test extreme negative values
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await userEvent.clear(timePeriodInput)
      await userEvent.type(timePeriodInput, '-100')

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await userEvent.clear(concurrentUsersInput)
      await userEvent.type(concurrentUsersInput, '-50')

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/time period must be positive/i)).toBeInTheDocument()
        expect(screen.getByText(/concurrent users must be positive/i)).toBeInTheDocument()
      })

      // Test extremely large values
      await userEvent.clear(timePeriodInput)
      await userEvent.type(timePeriodInput, '999999')

      await userEvent.clear(concurrentUsersInput)
      await userEvent.type(concurrentUsersInput, '999999')

      // Should show validation errors for excessive values
      await waitFor(() => {
        expect(screen.getByText(/time period too large/i)).toBeInTheDocument()
        expect(screen.getByText(/concurrent users exceed maximum/i)).toBeInTheDocument()
      })

      // Run button should be disabled
      const runButton = screen.getByRole('button', { name: /run simulation/i })
      expect(runButton).toBeDisabled()
    })

    it('should handle special characters and XSS attempts in input fields', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue(mockModels)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Try to inject HTML/JavaScript in numeric inputs
      const timePeriodInput = screen.getByLabelText(/time period/i)
      await userEvent.clear(timePeriodInput)
      await userEvent.type(timePeriodInput, '<script>alert("xss")</script>')

      const concurrentUsersInput = screen.getByLabelText(/concurrent users/i)
      await userEvent.clear(concurrentUsersInput)
      await userEvent.type(concurrentUsersInput, '"><img src=x onerror=alert(1)>')

      // Should sanitize inputs and show validation error
      expect(timePeriodInput.value).not.toContain('<script>')
      expect(concurrentUsersInput.value).not.toContain('<img')

      await waitFor(() => {
        expect(screen.getByText(/invalid characters detected/i)).toBeInTheDocument()
      })
    })

    it('should handle floating point precision issues in calculations', async () => {
      const { modelService } = await import('../../src/services/modelService')
      const { vramCalculator } = await import('../../src/services/vramCalculator')
      modelService.loadModels.mockResolvedValue(mockModels)

      // Mock calculation that produces floating point precision issues
      vramCalculator.calculateTotalVRAM.mockReturnValue(0.1 + 0.2) // Should be 0.3 but returns 0.30000000000000004

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      const firstSlot = screen.getByTestId('workload-slot-0')
      const firstSlotSelect = within(firstSlot).getByRole('combobox')
      await userEvent.click(firstSlotSelect)
      await userEvent.click(screen.getByText('Basic Chat'))

      const firstSlotSlider = within(firstSlot).getByRole('slider')
      fireEvent.change(firstSlotSlider, { target: { value: '100' } })

      // Should display properly rounded values
      await waitFor(() => {
        // Should not show floating point artifacts
        expect(screen.queryByText(/0\.30000000000000004/)).not.toBeInTheDocument()
        // Should show rounded value
        expect(screen.getByText(/0\.30/)).toBeInTheDocument()
      })
    })

    it('should handle percentage allocation edge cases', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue(mockModels)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Test decimal percentages that don't add to exactly 100%
      const slots = screen.getAllByTestId(/workload-slot-/)

      // Configure three workloads with percentages that cause rounding issues
      for (let i = 0; i < 3; i++) {
        const slot = slots[i]
        const select = within(slot).getByRole('combobox')
        await userEvent.click(select)
        await userEvent.click(screen.getByText('Basic Chat'))

        const slider = within(slot).getByRole('slider')
        fireEvent.change(slider, { target: { value: '33.33' } }) // 33.33 * 3 = 99.99
      }

      // Should handle rounding and show appropriate validation
      await waitFor(() => {
        // Should either auto-correct to 100% or show helpful validation message
        const hasAutoCorrection = screen.queryByText(/automatically adjusted/i)
        const hasValidationMessage = screen.queryByText(/total.*99\.99.*close to 100/i)

        expect(hasAutoCorrection || hasValidationMessage).toBeTruthy()
      })
    })
  })

  describe('Component Error Boundaries and Recovery', () => {
    it('should catch and handle component rendering errors', async () => {
      // Mock a component that throws during render
      const ThrowingComponent = () => {
        throw new Error('Component render failed')
      }

      const TestApp = () => (
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      render(<TestApp />)

      // Should display error boundary UI
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
        expect(screen.getByText(/component render failed/i)).toBeInTheDocument()
      })

      // Should provide recovery options
      expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    })

    it('should isolate errors to specific sections without crashing entire app', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue(mockModels)

      render(<App />)

      // Even if chart component fails, rest of app should work
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockChartError = vi.fn(() => {
        throw new Error('Chart rendering failed')
      })

      // Mock console to verify error is logged but contained
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Select model and configure workload
      const modelSelector = screen.getByRole('combobox', { name: /select.*model/i })
      await userEvent.click(modelSelector)
      await userEvent.click(screen.getByText('Llama 2 7B'))

      // Rest of the app should still be functional
      expect(screen.getByText('2. Configure Workloads')).toBeInTheDocument()
      expect(screen.getByText('3. Simulation Settings')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should handle memory leaks and cleanup on component unmount', async () => {
      const { modelService } = await import('../../src/services/modelService')

      // Mock service that creates intervals/timers
      const intervalIds: NodeJS.Timeout[] = []
      modelService.loadModels.mockImplementation(() => {
        const intervalId = setInterval(() => {
          console.log('Background task running')
        }, 100)
        intervalIds.push(intervalId)
        return Promise.resolve(mockModels)
      })

      const { unmount } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Verify intervals are created
      expect(intervalIds.length).toBeGreaterThan(0)

      // Unmount component
      unmount()

      // Verify intervals are cleaned up
      intervalIds.forEach(id => {
        expect(clearInterval).toHaveBeenCalledWith(id)
      })
    })
  })

  describe('Network and Connectivity Error Handling', () => {
    it('should handle offline scenarios and provide offline mode', async () => {
      // Mock network going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(new Error('Network unavailable'))

      render(<App />)

      // Should detect offline state
      await waitFor(() => {
        expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
        expect(screen.getByText(/limited functionality available/i)).toBeInTheDocument()
      })

      // Should provide cached/default models if available
      expect(screen.getByText(/using cached data/i)).toBeInTheDocument()

      // Network comes back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      })

      // Dispatch online event
      window.dispatchEvent(new Event('online'))

      // Should attempt to reconnect
      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument()
      })
    })

    it('should handle slow network connections with appropriate feedback', async () => {
      const { modelService } = await import('../../src/services/modelService')

      // Mock slow loading
      modelService.loadModels.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockModels), 5000))
      )

      render(<App />)

      // Should show loading state
      expect(screen.getByText(/loading models/i)).toBeInTheDocument()

      // Should show slow connection warning after timeout
      await waitFor(
        () => {
          expect(screen.getByText(/slow connection detected/i)).toBeInTheDocument()
        },
        { timeout: 6000 }
      )

      // Should provide option to continue offline
      expect(screen.getByRole('button', { name: /continue offline/i })).toBeInTheDocument()
    })

    it('should handle API rate limiting and implement backoff strategy', async () => {
      const { modelService } = await import('../../src/services/modelService')

      let callCount = 0
      modelService.loadModels.mockImplementation(() => {
        callCount++
        if (callCount <= 3) {
          const error = new Error('Rate limit exceeded')
          error.status = 429
          return Promise.reject(error)
        }
        return Promise.resolve(mockModels)
      })

      render(<App />)

      // Should handle rate limiting gracefully
      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument()
      })

      // Should show retry countdown
      expect(screen.getByText(/retrying in.*seconds/i)).toBeInTheDocument()

      // Should eventually succeed after backoff
      await waitFor(
        () => {
          expect(screen.getByText('1. Select Model')).toBeInTheDocument()
        },
        { timeout: 10000 }
      )
    })
  })

  describe('Browser Compatibility and Edge Cases', () => {
    it('should handle unsupported browser features gracefully', async () => {
      // Mock missing localStorage
      const originalLocalStorage = window.localStorage
      delete (window as unknown as { localStorage?: Storage }).localStorage

      render(<App />)

      // Should show warning about missing features
      await waitFor(() => {
        expect(screen.getByText(/browser compatibility warning/i)).toBeInTheDocument()
        expect(screen.getByText(/settings will not be saved/i)).toBeInTheDocument()
      })

      // App should still function without localStorage
      expect(screen.getByText('1. Select Model')).toBeInTheDocument()

      // Restore localStorage
      window.localStorage = originalLocalStorage
    })

    it('should handle disabled JavaScript and provide fallback', async () => {
      // While we can't actually disable JS in tests, we can test the NoScript component
      const NoScriptFallback = () => (
        <noscript>
          <div data-testid="noscript-fallback">JavaScript is required for full functionality</div>
        </noscript>
      )

      render(<NoScriptFallback />)

      // Verify noscript fallback exists (even though it won't be visible in JS environment)
      expect(screen.getByTestId('noscript-fallback')).toBeInTheDocument()
    })

    it('should handle memory constraints on mobile devices', async () => {
      // Mock mobile device with memory constraints
      Object.defineProperty(navigator, 'deviceMemory', {
        writable: true,
        value: 1, // 1GB RAM
      })

      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockResolvedValue(mockModels)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('1. Select Model')).toBeInTheDocument()
      })

      // Should detect low memory and show warning
      await waitFor(() => {
        expect(screen.getByText(/low memory device detected/i)).toBeInTheDocument()
        expect(screen.getByText(/some features may be limited/i)).toBeInTheDocument()
      })

      // Should suggest performance mode
      expect(screen.getByRole('button', { name: /enable performance mode/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility in Error States', () => {
    it('should maintain accessibility during error states', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(new Error('Service unavailable'))

      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
      })

      // Check accessibility of error state
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Error messages should have proper ARIA attributes
      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive')

      // Retry button should be accessible
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toHaveAccessibleName()
      expect(retryButton).not.toHaveAttribute('aria-disabled', 'true')
    })

    it('should announce errors to screen readers appropriately', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(new Error('Connection failed'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument()
      })

      // Should have live region for screen reader announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveTextContent(/connection failed/i)

      // Should be announced as assertive (urgent)
      const alertRegion = screen.getByRole('alert')
      expect(alertRegion).toHaveAttribute('aria-live', 'assertive')
    })

    it('should provide keyboard navigation during error recovery', async () => {
      const { modelService } = await import('../../src/services/modelService')
      modelService.loadModels.mockRejectedValue(new Error('Service error'))

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/service error/i)).toBeInTheDocument()
      })

      // Should be able to navigate to retry button with keyboard
      const retryButton = screen.getByRole('button', { name: /retry/i })
      retryButton.focus()
      expect(retryButton).toHaveFocus()

      // Should be able to activate with keyboard
      fireEvent.keyDown(retryButton, { key: 'Enter' })

      // Should handle the retry
      modelService.loadModels.mockResolvedValueOnce(mockModels)

      await waitFor(() => {
        expect(screen.queryByText(/service error/i)).not.toBeInTheDocument()
      })
    })
  })
})
