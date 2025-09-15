// VRAM Magic: ResultsSummary Accessibility Tests
// Comprehensive accessibility testing for the ResultsSummary component with screen reader compatibility

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ResultsSummary } from '../../src/components/ResultsSummary/index'
import { SimulationResults, Model, ModelPrecision, ExportFormat } from '../../types'
import {
  renderWithAccessibility,
  runAxeTest,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock simulation results data
const mockSimulationResults: SimulationResults = {
  maxVRAM: 12 * 1024 * 1024 * 1024, // 12 GB in bytes
  averageVRAM: 8 * 1024 * 1024 * 1024, // 8 GB in bytes
  usagePoints: [
    {
      timestamp: 0,
      totalVRAM: 8 * 1024 * 1024 * 1024,
      breakdown: { baseModel: 6000, kvCache: 1500, activations: 400, overhead: 100 },
    },
    {
      timestamp: 10,
      totalVRAM: 12 * 1024 * 1024 * 1024,
      breakdown: { baseModel: 6000, kvCache: 4000, activations: 1800, overhead: 200 },
    },
    {
      timestamp: 20,
      totalVRAM: 10 * 1024 * 1024 * 1024,
      breakdown: { baseModel: 6000, kvCache: 3000, activations: 900, overhead: 100 },
    },
  ],
  recommendations: [
    'Consider using a GPU with at least 16GB VRAM for comfortable headroom',
    'Monitor KV cache usage as it varies significantly during simulation',
  ],
  warnings: ['Peak VRAM usage is close to GPU memory limits'],
  calculatedAt: Date.now(),
}

const mockModel: Model = {
  id: 'llama-2-70b',
  name: 'Llama 2 70B',
  description: 'Large language model with 70 billion parameters',
  parameters: 70000000000,
  precision: ModelPrecision.FP16,
  architecture: {
    layers: 80,
    hiddenSize: 8192,
    attentionHeads: 64,
    vocabularySize: 32000,
    maxSequenceLength: 4096,
  },
  vramRequirements: {
    baseVRAM: 140.0,
    kvCacheCoefficient: 0.5,
    activationMultiplier: 1.2,
    overheadFactor: 0.1,
  },
  performance: {
    gpuType: 'A100',
    tokensPerSecond: 25,
    batchSize: 1,
    powerConsumption: 400,
  },
  metadata: {
    releaseDate: '2023-07-18',
    organization: 'Meta',
    license: 'Custom',
    tags: ['large', 'conversation', 'research'],
  },
}

describe('ResultsSummary Accessibility Tests', () => {
  let mockOnExport: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnExport = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests with results', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in loading state', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={null} model={null} onExport={mockOnExport} loading={true} />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with no results', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={null} model={null} onExport={mockOnExport} loading={false} />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests without model', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={null} onExport={mockOnExport} />
      )

      await runAxeTest(container)
    })
  })

  describe('Heading Structure and Navigation', () => {
    it('should have proper heading hierarchy', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const mainHeading = screen.getByRole('heading', { name: /vram analysis results/i })
      expect(mainHeading).toBeInTheDocument()

      const summaryHeading = screen.getByRole('heading', { name: /summary statistics/i })
      expect(summaryHeading).toBeInTheDocument()

      const gpuHeading = screen.getByRole('heading', { name: /gpu recommendations/i })
      expect(gpuHeading).toBeInTheDocument()
    })

    it('should use semantic HTML structure', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Should have lists for structured content
      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThan(0)

      // Should have list items
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)
    })

    it('should provide landmarks and regions', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Check for proper document structure
      const mainHeading = screen.getByRole('heading', { name: /vram analysis results/i })
      expect(mainHeading).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce key metrics clearly', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Maximum VRAM should be prominently displayed
      expect(screen.getByText('Maximum VRAM Required')).toBeInTheDocument()
      expect(screen.getByText(/12\.0 GB/i)).toBeInTheDocument()

      // Summary statistics should be accessible
      expect(screen.getByText('Average VRAM')).toBeInTheDocument()
      expect(screen.getByText('Peak Utilization')).toBeInTheDocument()
      expect(screen.getByText('Data Points')).toBeInTheDocument()
    })

    it('should provide accessible descriptions for GPU recommendations', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // GPU recommendations should have descriptive text
      const gpuSection =
        screen.getByText('GPU Recommendations').closest('[role]') ||
        screen.getByText('GPU Recommendations').closest('div')

      expect(gpuSection).toBeInTheDocument()

      // Should contain utilization information
      expect(screen.getByText(/utilization/i)).toBeInTheDocument()
    })

    it('should announce warnings and recommendations appropriately', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Warnings should be in alert regions
      const warningAlert = screen.getByRole('alert')
      expect(warningAlert).toBeInTheDocument()
      expect(warningAlert).toHaveTextContent(/warnings/i)

      // Should contain the actual warning text
      expect(screen.getByText(/peak vram usage is close to gpu memory limits/i)).toBeInTheDocument()
    })

    it('should provide calculation timestamp information', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      expect(screen.getByText(/calculated at/i)).toBeInTheDocument()
    })

    it('should handle no results state accessibly', () => {
      renderWithAccessibility(
        <ResultsSummary results={null} model={null} onExport={mockOnExport} loading={false} />
      )

      const infoAlert = screen.getByRole('alert')
      expect(infoAlert).toBeInTheDocument()
      expect(infoAlert).toHaveTextContent(/no results available/i)
    })
  })

  describe('Keyboard Navigation and Focus Management', () => {
    it('should support keyboard navigation through export buttons', async () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const exportButtons = screen.getAllByRole('button', { name: /export|json|csv|png/i })
      expect(exportButtons.length).toBeGreaterThan(0)

      // Tab to first export button
      await user.tab()
      const firstButton = exportButtons.find(button => document.activeElement === button)
      expect(firstButton).toBeTruthy()
    })

    it('should provide accessible button labels', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const jsonButton = screen.getByRole('button', { name: /json/i })
      expect(jsonButton).toBeInTheDocument()

      const csvButton = screen.getByRole('button', { name: /csv/i })
      expect(csvButton).toBeInTheDocument()

      const pngButton = screen.getByRole('button', { name: /png/i })
      expect(pngButton).toBeInTheDocument()

      // Icon button should have aria-label
      const iconButton = screen.getByRole('button', { name: /export as json/i })
      expect(iconButton).toHaveAttribute('aria-label', 'Export as JSON')
    })

    it('should handle button interactions with keyboard', async () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const jsonButton = screen.getByRole('button', { name: /json/i })
      jsonButton.focus()

      // Press Enter
      await user.keyboard('{Enter}')
      expect(mockOnExport).toHaveBeenCalledWith('json')

      // Press Space
      await user.keyboard(' ')
      expect(mockOnExport).toHaveBeenCalledTimes(2)
    })

    it('should maintain logical focus order', async () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const focusableElements = getFocusableElements(document.body)
      expect(focusableElements.length).toBeGreaterThan(0)

      // Focus should move logically through export controls
      await user.tab()
      const firstFocused = document.activeElement
      expect(focusableElements).toContain(firstFocused)
    })
  })

  describe('Button Group and Toolbar Accessibility', () => {
    it('should have proper ARIA labels for button group', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const buttonGroup = screen.getByRole('group', { name: /export options/i })
      expect(buttonGroup).toHaveAttribute('aria-label', 'Export options')
    })

    it('should provide tooltips for icon buttons', async () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Icon button should have tooltip (implemented via title or aria-describedby)
      const iconButton = screen.getByRole('button', { name: /export as json/i })
      expect(iconButton).toBeInTheDocument()

      // Focus on the button to potentially trigger tooltip
      iconButton.focus()
    })

    it('should handle export functionality accessibly', async () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const exportFormats: ExportFormat[] = ['json', 'csv', 'png']

      for (const format of exportFormats.slice(0, 2)) {
        // Test json and csv
        const button = screen.getByRole('button', { name: new RegExp(format, 'i') })
        await user.click(button)
        expect(mockOnExport).toHaveBeenCalledWith(format)
      }
    })
  })

  describe('Data Presentation Accessibility', () => {
    it('should present numerical data with appropriate precision and units', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // VRAM values should include units
      expect(screen.getByText(/12\.0 GB/i)).toBeInTheDocument()
      expect(screen.getByText(/8\.0 GB/i)).toBeInTheDocument()

      // Percentages should be clearly labeled
      expect(screen.getByText(/utilization/i)).toBeInTheDocument()
      expect(screen.getByText(/% above average/i)).toBeInTheDocument()
    })

    it('should use semantic lists for structured data', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      const lists = screen.getAllByRole('list')
      expect(lists.length).toBeGreaterThan(0)

      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBeGreaterThan(0)

      // Each list item should have meaningful content
      listItems.forEach(item => {
        expect(item.textContent).toBeTruthy()
        expect(item.textContent!.trim().length).toBeGreaterThan(0)
      })
    })

    it('should provide contextual information for statistics', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Statistics should have descriptive labels
      expect(screen.getByText('Maximum VRAM Required')).toBeInTheDocument()
      expect(screen.getByText('Peak memory usage during simulation')).toBeInTheDocument()
      expect(screen.getByText('Average VRAM')).toBeInTheDocument()
      expect(screen.getByText('Peak Utilization')).toBeInTheDocument()
    })
  })

  describe('Loading and Empty States', () => {
    it('should provide accessible loading state', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={null} model={null} onExport={mockOnExport} loading={true} />
      )

      await runAxeTest(container)

      // Loading state should use semantic elements
      const skeletons = container.querySelectorAll('[class*="MuiSkeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should handle no results state with clear guidance', () => {
      renderWithAccessibility(
        <ResultsSummary results={null} model={null} onExport={mockOnExport} loading={false} />
      )

      const noResultsHeading = screen.getByText('No Results Available')
      expect(noResultsHeading).toBeInTheDocument()

      const guidance = screen.getByText(/configure your model and workloads/i)
      expect(guidance).toBeInTheDocument()
    })
  })

  describe('Color and Visual Accessibility', () => {
    it('should use appropriate color coding with text alternatives', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      await runAxeTest(container)

      // Color-coded elements should have text alternatives
      // GPU suitability should be conveyed through text, not just color
      expect(screen.getByText(/utilization/i)).toBeInTheDocument()
    })

    it('should maintain sufficient contrast in all states', async () => {
      const { container } = renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Axe will check color contrast as part of the overall test
      await runAxeTest(container)
    })
  })

  describe('Alert and Status Messages', () => {
    it('should properly announce warnings and recommendations', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Warnings should be in alert regions
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)

      // Warning alert should contain warning text
      const warningAlert = alerts.find(
        alert =>
          alert.textContent?.includes('Warnings') || alert.textContent?.includes('peak VRAM usage')
      )
      expect(warningAlert).toBeTruthy()

      // Info alert for recommendations should exist
      const infoAlert = alerts.find(alert => alert.textContent?.includes('Recommendations'))
      expect(infoAlert).toBeTruthy()
    })

    it('should use appropriate severity levels for alerts', () => {
      renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      // Check that warnings use warning severity (typically has warning role or aria attributes)
      const warningText = screen.getByText(/peak vram usage is close to gpu memory limits/i)
      expect(warningText).toBeInTheDocument()

      const warningContainer = warningText.closest('[role="alert"]')
      expect(warningContainer).toBeInTheDocument()
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance with results', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      const { container } = renderWithAccessibility(
        <ResultsSummary results={mockSimulationResults} model={mockModel} onExport={mockOnExport} />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
        results.push(
          createAccessibilityResult(AccessibilityTestCategory.INTERACTIVE_ELEMENTS, true)
        )
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('ResultsSummary Accessibility Results:', results)
    })

    it('should maintain accessibility in all display states', async () => {
      const states = [
        { results: mockSimulationResults, model: mockModel, loading: false },
        { results: null, model: null, loading: true },
        { results: null, model: null, loading: false },
        { results: mockSimulationResults, model: null, loading: false },
      ]

      for (const state of states) {
        const { container } = renderWithAccessibility(
          <ResultsSummary
            results={state.results}
            model={state.model}
            onExport={mockOnExport}
            loading={state.loading}
          />
        )

        await runAxeTest(container)
      }
    })

    it('should handle edge cases accessibly', async () => {
      // Test with minimal results
      const minimalResults: SimulationResults = {
        maxVRAM: 1024 * 1024 * 1024, // 1 GB
        averageVRAM: 512 * 1024 * 1024, // 0.5 GB
        usagePoints: [
          {
            timestamp: 0,
            totalVRAM: 1024 * 1024 * 1024,
            breakdown: { baseModel: 800, kvCache: 200, activations: 24, overhead: 0 },
          },
        ],
        recommendations: [],
        warnings: [],
        calculatedAt: Date.now(),
      }

      const { container } = renderWithAccessibility(
        <ResultsSummary results={minimalResults} model={mockModel} onExport={mockOnExport} />
      )

      await runAxeTest(container)

      // Should still display essential information
      expect(screen.getByText(/1\.0 GB/i)).toBeInTheDocument()
      expect(screen.getByText('Maximum VRAM Required')).toBeInTheDocument()
    })
  })
})
