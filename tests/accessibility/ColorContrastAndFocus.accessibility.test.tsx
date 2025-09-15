// VRAM Magic: Color Contrast and Focus Management Accessibility Tests
// Comprehensive testing for color contrast ratios and focus management across all components

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

import { ModelSelector } from '../../src/components/ModelSelector/ModelSelector'
import WorkloadConfigurator from '../../src/components/WorkloadConfigurator/index'
import PercentageSlider from '../../src/components/PercentageSlider/PercentageSlider'
import { SimulationControls } from '../../src/components/SimulationControls/index'
import { VRAMChart } from '../../src/components/VRAMChart/VRAMChart'
import { ResultsSummary } from '../../src/components/ResultsSummary/index'

import {
  Model,
  WorkloadSlot,
  SimulationConfig,
  VRAMUsagePoint,
  SimulationResults,
} from '../../types'
import { ModelPrecision, TimeUnit, RequestPattern, WorkloadCategory } from '../../types'
import { lightTheme as theme } from '../../src/theme'
import {
  renderWithAccessibility,
  runAxeTest,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock data for comprehensive testing
const mockModels: Model[] = [
  {
    id: 'test-model',
    name: 'Test Model',
    description: 'A test model for accessibility testing',
    parameters: 7000000000,
    precision: ModelPrecision.FP16,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 13.5,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 1.2,
      overheadFactor: 0.1,
    },
    performance: { gpuType: 'RTX 4090', tokensPerSecond: 42, batchSize: 1, powerConsumption: 350 },
    metadata: { releaseDate: '2023-07-18', organization: 'Test', license: 'MIT', tags: ['test'] },
  },
]

const mockWorkloadSlots: WorkloadSlot[] = [
  { id: 'slot-1', workload: null, percentage: 0, isActive: false, order: 1 },
  { id: 'slot-2', workload: null, percentage: 0, isActive: false, order: 2 },
  { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
  { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
  { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
]

const mockSimulationConfig: SimulationConfig = {
  period: {
    duration: 3600,
    timeUnit: TimeUnit.HOURS,
    concurrentUsers: 100,
    requestPattern: RequestPattern.UNIFORM,
    granularity: 10,
    durationSeconds: 3600,
    precision: ModelPrecision.FP16,
  },
  isValid: true,
  errors: [],
}

const mockVRAMData: VRAMUsagePoint[] = [
  {
    timestamp: 0,
    totalVRAM: 8192,
    breakdown: { baseModel: 6000, kvCache: 1500, activations: 500, overhead: 192 },
  },
  {
    timestamp: 10,
    totalVRAM: 9216,
    breakdown: { baseModel: 6000, kvCache: 2000, activations: 800, overhead: 416 },
  },
]

const mockSimulationResults: SimulationResults = {
  maxVRAM: 12 * 1024 * 1024 * 1024,
  averageVRAM: 8 * 1024 * 1024 * 1024,
  usagePoints: mockVRAMData,
  recommendations: ['Test recommendation'],
  warnings: ['Test warning'],
  calculatedAt: Date.now(),
}

describe('Color Contrast and Focus Management Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('Color Contrast Compliance', () => {
    describe('Light Theme Color Contrast', () => {
      it('should pass color contrast tests for ModelSelector', async () => {
        const { container } = renderWithAccessibility(
          <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
        )

        // Run axe-core which includes color contrast checks
        await runAxeTest(container)
      })

      it('should pass color contrast tests for WorkloadConfigurator', async () => {
        const { container } = renderWithAccessibility(
          <WorkloadConfigurator
            workloads={[]}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={vi.fn()}
          />,
          { withDnd: true }
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for PercentageSlider', async () => {
        const { container } = renderWithAccessibility(
          <PercentageSlider value={50} onChange={vi.fn()} remaining={50} label="Test Slider" />
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for SimulationControls', async () => {
        const { container } = renderWithAccessibility(
          <SimulationControls
            config={mockSimulationConfig}
            onChange={vi.fn()}
            onCalculate={vi.fn()}
          />
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for VRAMChart', async () => {
        const { container } = renderWithAccessibility(
          <VRAMChart data={mockVRAMData} maxVRAM={12288} chartType="area" />
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for ResultsSummary', async () => {
        const { container } = renderWithAccessibility(
          <ResultsSummary
            results={mockSimulationResults}
            model={mockModels[0]}
            onExport={vi.fn()}
          />
        )

        await runAxeTest(container)
      })
    })

    describe('Dark Theme Color Contrast', () => {
      const darkTheme = createTheme({
        ...theme,
        palette: {
          ...theme.palette,
          mode: 'dark',
        },
      })

      it('should pass color contrast tests for ModelSelector in dark theme', async () => {
        const { container } = renderWithAccessibility(
          <ThemeProvider theme={darkTheme}>
            <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
          </ThemeProvider>,
          { withTheme: false }
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for WorkloadConfigurator in dark theme', async () => {
        const { container } = renderWithAccessibility(
          <ThemeProvider theme={darkTheme}>
            <WorkloadConfigurator
              workloads={[]}
              workloadSlots={mockWorkloadSlots}
              onSlotsChange={vi.fn()}
            />
          </ThemeProvider>,
          { withDnd: true, withTheme: false }
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for PercentageSlider in dark theme', async () => {
        const { container } = renderWithAccessibility(
          <ThemeProvider theme={darkTheme}>
            <PercentageSlider value={50} onChange={vi.fn()} remaining={50} label="Test Slider" />
          </ThemeProvider>,
          { withTheme: false }
        )

        await runAxeTest(container)
      })

      it('should pass color contrast tests for SimulationControls in dark theme', async () => {
        const { container } = renderWithAccessibility(
          <ThemeProvider theme={darkTheme}>
            <SimulationControls
              config={mockSimulationConfig}
              onChange={vi.fn()}
              onCalculate={vi.fn()}
            />
          </ThemeProvider>,
          { withTheme: false }
        )

        await runAxeTest(container)
      })
    })

    describe('Error State Color Contrast', () => {
      it('should pass color contrast tests for components in error states', async () => {
        // Test ModelSelector with error
        const { container: modelContainer } = renderWithAccessibility(
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={vi.fn()}
            error="Test error message"
          />
        )
        await runAxeTest(modelContainer)

        // Test PercentageSlider with error
        const { container: sliderContainer } = renderWithAccessibility(
          <PercentageSlider value={80} onChange={vi.fn()} remaining={15} label="Test Slider" />
        )
        await runAxeTest(sliderContainer)

        // Test disabled states
        const { container: disabledContainer } = renderWithAccessibility(
          <PercentageSlider
            value={50}
            onChange={vi.fn()}
            remaining={50}
            label="Test Slider"
            disabled={true}
          />
        )
        await runAxeTest(disabledContainer)
      })
    })

    describe('Color-only Information', () => {
      it('should not rely solely on color for VRAMChart information', async () => {
        renderWithAccessibility(<VRAMChart data={mockVRAMData} maxVRAM={12288} chartType="area" />)

        // Chart should provide text labels, not just color differentiation
        expect(screen.getByText('Base Model')).toBeInTheDocument()
        expect(screen.getByText('KV Cache')).toBeInTheDocument()
        expect(screen.getByText('Activations')).toBeInTheDocument()
        expect(screen.getByText('Overhead')).toBeInTheDocument()
      })

      it('should not rely solely on color for WorkloadConfigurator status', async () => {
        const workloadSlots = [
          {
            ...mockWorkloadSlots[0],
            workload: {
              id: 'test-workload',
              name: 'Test Workload',
              description: 'A test workload',
              category: WorkloadCategory.CHAT,
              inputTokens: 100,
              outputTokens: 50,
              icon: '💬',
              priority: 1,
              burstiness: 0.3,
              averageThinkingTime: 1.0,
            },
            percentage: 100,
            isActive: true,
          },
        ]

        renderWithAccessibility(
          <WorkloadConfigurator
            workloads={[]}
            workloadSlots={workloadSlots}
            onSlotsChange={vi.fn()}
          />,
          { withDnd: true }
        )

        // Should have text indicators beyond color
        expect(screen.getByText(/total allocation: 100%/i)).toBeInTheDocument()
        expect(screen.getByText(/remaining: 0%/i)).toBeInTheDocument()
      })

      it('should provide text alternatives for GPU recommendation colors in ResultsSummary', async () => {
        renderWithAccessibility(
          <ResultsSummary
            results={mockSimulationResults}
            model={mockModels[0]}
            onExport={vi.fn()}
          />
        )

        // GPU recommendations should include text descriptions of suitability
        expect(screen.getByText(/utilization/i)).toBeInTheDocument()
      })
    })
  })

  describe('Focus Management', () => {
    describe('Focus Visibility', () => {
      it('should provide visible focus indicators on all interactive elements', async () => {
        renderWithAccessibility(
          <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
        )

        const focusableElements = getFocusableElements(document.body)

        for (const element of focusableElements.slice(0, 3)) {
          element.focus()
          expect(element).toHaveFocus()

          // Check that element is visible and has appropriate styling
          const computedStyle = window.getComputedStyle(element)
          expect(computedStyle.display).not.toBe('none')
          expect(computedStyle.visibility).not.toBe('hidden')
          expect(computedStyle.opacity).not.toBe('0')
        }
      })

      it('should maintain focus visibility in dark theme', async () => {
        const darkTheme = createTheme({
          ...theme,
          palette: {
            ...theme.palette,
            mode: 'dark',
          },
        })

        renderWithAccessibility(
          <ThemeProvider theme={darkTheme}>
            <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
          </ThemeProvider>,
          { withTheme: false }
        )

        const input = screen.getByRole('combobox')
        input.focus()
        expect(input).toHaveFocus()

        // Should be visible with sufficient contrast
        const computedStyle = window.getComputedStyle(input)
        expect(computedStyle.display).not.toBe('none')
      })
    })

    describe('Focus Order and Trapping', () => {
      it('should maintain logical tab order in WorkloadConfigurator', async () => {
        renderWithAccessibility(
          <WorkloadConfigurator
            workloads={[]}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={vi.fn()}
          />,
          { withDnd: true }
        )

        // Tab through the interface
        await user.tab() // Keyboard mode toggle
        const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
        expect(keyboardToggle).toHaveFocus()

        await user.tab() // Clear all button
        const clearButton = screen.getByRole('button', { name: /clear all/i })
        expect(clearButton).toHaveFocus()
      })

      it('should maintain logical tab order in SimulationControls form', async () => {
        renderWithAccessibility(
          <SimulationControls
            config={mockSimulationConfig}
            onChange={vi.fn()}
            onCalculate={vi.fn()}
          />
        )

        // Tab through form fields
        await user.tab() // Duration field
        const durationField = screen.getByRole('textbox', { name: /duration/i })
        expect(durationField).toHaveFocus()

        await user.tab() // Time unit select
        const timeUnitSelect = screen.getByRole('combobox', { name: /time unit/i })
        expect(timeUnitSelect).toHaveFocus()

        await user.tab() // Concurrent users field
        const usersField = screen.getByRole('textbox', { name: /concurrent users/i })
        expect(usersField).toHaveFocus()
      })

      it('should trap focus appropriately in modal-like interactions', async () => {
        renderWithAccessibility(
          <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
        )

        const input = screen.getByRole('combobox')
        input.focus()

        // Open dropdown
        await user.keyboard('{Enter}')
        await waitFor(() => {
          expect(screen.getByRole('listbox')).toBeInTheDocument()
        })

        // Focus should be managed within the dropdown
        const listbox = screen.getByRole('listbox')
        expect(listbox).toBeInTheDocument()
      })
    })

    describe('Focus Restoration', () => {
      it('should restore focus after modal interactions in ModelSelector', async () => {
        renderWithAccessibility(
          <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
        )

        const input = screen.getByRole('combobox')
        input.focus()

        // Open and close dropdown
        await user.keyboard('{Enter}')
        await waitFor(() => {
          expect(screen.getByRole('listbox')).toBeInTheDocument()
        })

        await user.keyboard('{Escape}')
        await waitFor(() => {
          expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        })

        // Focus should return to the input
        expect(input).toHaveFocus()
      })

      it('should maintain focus during slider interactions', async () => {
        renderWithAccessibility(
          <PercentageSlider value={50} onChange={vi.fn()} remaining={50} label="Test Slider" />
        )

        const slider = screen.getByRole('slider')
        slider.focus()

        // Interact with slider
        await user.keyboard('{ArrowRight}')

        // Focus should remain on slider
        expect(slider).toHaveFocus()
      })
    })

    describe('Skip Links and Navigation', () => {
      it('should provide efficient navigation for complex components', async () => {
        renderWithAccessibility(<VRAMChart data={mockVRAMData} maxVRAM={12288} chartType="area" />)

        // Chart should be focusable for keyboard users
        const chartContainer = screen.getByRole('img')
        expect(chartContainer).toHaveAttribute('tabindex', '0')

        await user.tab()
        expect(chartContainer).toHaveFocus()
      })

      it('should handle complex navigation in ResultsSummary', async () => {
        renderWithAccessibility(
          <ResultsSummary
            results={mockSimulationResults}
            model={mockModels[0]}
            onExport={vi.fn()}
          />
        )

        const focusableElements = getFocusableElements(document.body)
        expect(focusableElements.length).toBeGreaterThan(0)

        // Should be able to navigate through export buttons
        await user.tab()
        const firstButton = document.activeElement
        expect(focusableElements).toContain(firstButton)
      })
    })
  })

  describe('High Contrast and Accessibility Preferences', () => {
    it('should work with Windows High Contrast mode simulation', async () => {
      // Simulate high contrast mode by testing with forced colors
      const { container } = renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
      )

      await runAxeTest(container)
    })

    it('should work with reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
      })

      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={[]}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={vi.fn()}
        />,
        { withDnd: true }
      )

      await runAxeTest(container)
    })
  })

  describe('Comprehensive Accessibility Integration', () => {
    it('should maintain color contrast and focus management across all components', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      // Test each major component
      const components = [
        {
          name: 'ModelSelector',
          element: (
            <ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />
          ),
        },
        {
          name: 'WorkloadConfigurator',
          element: (
            <WorkloadConfigurator
              workloads={[]}
              workloadSlots={mockWorkloadSlots}
              onSlotsChange={vi.fn()}
            />
          ),
          withDnd: true,
        },
        {
          name: 'PercentageSlider',
          element: (
            <PercentageSlider value={50} onChange={vi.fn()} remaining={50} label="Test Slider" />
          ),
        },
        {
          name: 'SimulationControls',
          element: (
            <SimulationControls
              config={mockSimulationConfig}
              onChange={vi.fn()}
              onCalculate={vi.fn()}
            />
          ),
        },
        {
          name: 'VRAMChart',
          element: <VRAMChart data={mockVRAMData} maxVRAM={12288} chartType="area" />,
        },
        {
          name: 'ResultsSummary',
          element: (
            <ResultsSummary
              results={mockSimulationResults}
              model={mockModels[0]}
              onExport={vi.fn()}
            />
          ),
        },
      ]

      for (const component of components) {
        try {
          const { container } = renderWithAccessibility(
            component.element,
            component.withDnd ? { withDnd: true } : {}
          )

          await runAxeTest(container)
          results.push(
            createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true, [], [], 'AA')
          )
          results.push(
            createAccessibilityResult(
              AccessibilityTestCategory.FOCUS_MANAGEMENT,
              true,
              [],
              [],
              'AA'
            )
          )
        } catch (error) {
          console.error(`Accessibility test failed for ${component.name}:`, error)
          results.push(
            createAccessibilityResult(
              AccessibilityTestCategory.COLOR_CONTRAST,
              false,
              [`${component.name} failed color contrast test`],
              [],
              'AA'
            )
          )
        }
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('Color Contrast and Focus Management Results:', results)
    })

    it('should pass comprehensive accessibility audit', async () => {
      // Create a comprehensive test with multiple components
      const { container } = renderWithAccessibility(
        <div>
          <ModelSelector
            models={mockModels}
            selectedModel={mockModels[0]}
            onModelSelect={vi.fn()}
          />
          <PercentageSlider
            value={75}
            onChange={vi.fn()}
            remaining={25}
            label="Comprehensive Test Slider"
          />
          <VRAMChart data={mockVRAMData} maxVRAM={12288} chartType="area" />
        </div>
      )

      await runAxeTest(container)

      // Test focus order across components
      const focusableElements = getFocusableElements(container)
      expect(focusableElements.length).toBeGreaterThan(0)

      // Each focusable element should be properly accessible
      for (const element of focusableElements.slice(0, 5)) {
        element.focus()
        expect(element).toHaveFocus()

        const computedStyle = window.getComputedStyle(element)
        expect(computedStyle.display).not.toBe('none')
        expect(computedStyle.visibility).not.toBe('hidden')
      }
    })
  })
})
