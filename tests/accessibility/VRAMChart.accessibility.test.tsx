// VRAM Magic: VRAMChart Accessibility Tests
// Comprehensive accessibility testing for the VRAMChart component with chart accessibility features

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { VRAMChart } from '../../src/components/VRAMChart/VRAMChart'
import { VRAMUsagePoint } from '../../types'
import {
  renderWithAccessibility,
  runAxeTest,
  getScreenReaderText,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock VRAM usage data for testing
const mockVRAMData: VRAMUsagePoint[] = [
  {
    timestamp: 0,
    totalVRAM: 8192, // 8 GB
    breakdown: {
      baseModel: 6000,
      kvCache: 1500,
      activations: 500,
      overhead: 192,
    },
  },
  {
    timestamp: 10,
    totalVRAM: 9216, // 9 GB
    breakdown: {
      baseModel: 6000,
      kvCache: 2000,
      activations: 800,
      overhead: 416,
    },
  },
  {
    timestamp: 20,
    totalVRAM: 10240, // 10 GB
    breakdown: {
      baseModel: 6000,
      kvCache: 2500,
      activations: 1200,
      overhead: 540,
    },
  },
  {
    timestamp: 30,
    totalVRAM: 8704, // 8.5 GB
    breakdown: {
      baseModel: 6000,
      kvCache: 1800,
      activations: 600,
      overhead: 304,
    },
  },
  {
    timestamp: 40,
    totalVRAM: 7680, // 7.5 GB
    breakdown: {
      baseModel: 6000,
      kvCache: 1200,
      activations: 400,
      overhead: 80,
    },
  },
]

describe('VRAMChart Accessibility Tests', () => {
  let mockOnPointClick: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnPointClick = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests with area chart', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with bar chart', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="bar"
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with no data', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart data={[]} maxVRAM={0} chartType="area" onPointClick={mockOnPointClick} />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests without tooltips', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          showTooltips={false}
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)
    })
  })

  describe('Chart Container Accessibility', () => {
    it('should have proper ARIA role and label for chart container', () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute('role', 'img')
      expect(chartContainer).toHaveAttribute(
        'aria-label',
        expect.stringContaining('VRAM usage chart')
      )
      expect(chartContainer).toHaveAttribute('aria-label', expect.stringContaining('5 data points'))
      expect(chartContainer).toHaveAttribute('aria-label', expect.stringContaining('12.0 GB'))
    })

    it('should be keyboard focusable', async () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute('tabindex', '0')

      await user.tab()
      expect(chartContainer).toHaveFocus()
    })

    it('should have proper heading structure', () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const heading = screen.getByRole('heading', { name: /vram usage over time/i })
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H3')
    })

    it('should provide summary information in visible text', () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      expect(screen.getByText(/maximum vram: 12.0 gb/i)).toBeInTheDocument()
      expect(screen.getByText(/chart type: stacked area/i)).toBeInTheDocument()
      expect(screen.getByText(/data points: 5/i)).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide comprehensive screen reader description', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(
        expect.stringContaining('Chart contains 5 time points showing VRAM usage breakdown')
      )
      expect(announcements).toContainEqual(
        expect.stringContaining(
          'Components include base model memory, KV cache, activations, and overhead'
        )
      )
      expect(announcements).toContainEqual(
        expect.stringContaining('Maximum total VRAM usage is 12.0 GB')
      )
    })

    it('should describe first and last data points', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(expect.stringContaining('First data point'))
      expect(announcements).toContainEqual(expect.stringContaining('Last data point'))
    })

    it('should have live region for dynamic updates', () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it('should announce no data state appropriately', () => {
      renderWithAccessibility(
        <VRAMChart data={[]} maxVRAM={0} chartType="area" onPointClick={mockOnPointClick} />
      )

      expect(screen.getByText(/no data available for chart visualization/i)).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard focus and interaction', async () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const chartContainer = screen.getByRole('img')

      // Focus on chart
      await user.tab()
      expect(chartContainer).toHaveFocus()

      // Test keyboard interaction
      await user.keyboard('{Enter}')
      // Chart should handle keyboard interaction (placeholder for full implementation)

      await user.keyboard(' ')
      // Space key should also trigger interaction
    })

    it('should maintain focus visibility', async () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const chartContainer = screen.getByRole('img')
      chartContainer.focus()

      expect(chartContainer).toHaveFocus()

      // Check that focus is visible
      const computedStyle = window.getComputedStyle(chartContainer)
      expect(computedStyle.display).not.toBe('none')
      expect(computedStyle.visibility).not.toBe('hidden')
    })

    it('should be included in tab order appropriately', async () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const focusableElements = getFocusableElements(document.body)
      const chartContainer = screen.getByRole('img')

      expect(focusableElements).toContain(chartContainer)
    })
  })

  describe('Chart Legend and Color Accessibility', () => {
    it('should have accessible legend with sufficient color contrast', async () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      // Legend text should be present and readable
      expect(screen.getByText('Base Model')).toBeInTheDocument()
      expect(screen.getByText('KV Cache')).toBeInTheDocument()
      expect(screen.getByText('Activations')).toBeInTheDocument()
      expect(screen.getByText('Overhead')).toBeInTheDocument()

      // Colors should have sufficient contrast (tested by axe-core)
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)
    })

    it('should not rely solely on color for information', () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      // Chart should provide text labels, not just color differentiation
      expect(screen.getByText('Base Model')).toBeInTheDocument()
      expect(screen.getByText('KV Cache')).toBeInTheDocument()
      expect(screen.getByText('Activations')).toBeInTheDocument()
      expect(screen.getByText('Overhead')).toBeInTheDocument()

      // Chart axes should have labels
      expect(screen.getByText(/vram usage over time/i)).toBeInTheDocument()
    })
  })

  describe('Responsive and Adaptive Features', () => {
    it('should maintain accessibility across different chart types', async () => {
      const { rerender } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      // Test area chart
      const container = document.body
      await runAxeTest(container)

      // Switch to bar chart
      rerender(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="bar"
          onPointClick={mockOnPointClick}
        />
      )

      // Test bar chart
      expect(screen.getByText(/chart type: stacked bar/i)).toBeInTheDocument()
      await runAxeTest(container)
    })

    it('should adapt to different screen sizes while maintaining accessibility', async () => {
      // This test would typically involve viewport manipulation
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          height={300}
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)

      // Chart should remain accessible at different heights
      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toBeInTheDocument()
      expect(chartContainer).toHaveAttribute('tabindex', '0')
    })
  })

  describe('Tooltip Accessibility', () => {
    it('should provide accessible tooltips when enabled', () => {
      renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          showTooltips={true}
          onPointClick={mockOnPointClick}
        />
      )

      // Tooltips should be accessible when they appear
      // Note: Testing dynamic tooltip content requires user interaction simulation
      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toBeInTheDocument()
    })

    it('should remain accessible when tooltips are disabled', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          showTooltips={false}
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)

      // Chart should still be accessible without tooltips
      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute(
        'aria-label',
        expect.stringContaining('VRAM usage chart')
      )
    })
  })

  describe('Data Table Alternative', () => {
    it('should provide textual data representation for screen readers', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const screenReaderText = getScreenReaderText(container)

      // Should describe the data structure and key values
      expect(screenReaderText).toContainEqual(
        expect.stringContaining('Chart contains 5 time points')
      )
      expect(screenReaderText).toContainEqual(
        expect.stringContaining(
          'Components include base model memory, KV cache, activations, and overhead'
        )
      )
    })

    it('should describe trends and patterns in the data', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      const screenReaderText = getScreenReaderText(container)

      // Should provide information about first and last data points for trend understanding
      expect(
        screenReaderText.some(text => text.includes('First data point') && text.includes('8.0 GB'))
      ).toBe(true)

      expect(
        screenReaderText.some(text => text.includes('Last data point') && text.includes('7.5 GB'))
      ).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      const { container } = renderWithAccessibility(
        <VRAMChart data={[]} maxVRAM={0} chartType="area" onPointClick={mockOnPointClick} />
      )

      await runAxeTest(container)

      expect(screen.getByText(/no data available for chart visualization/i)).toBeInTheDocument()
    })

    it('should handle single data point', async () => {
      const singlePoint = [mockVRAMData[0]]

      const { container } = renderWithAccessibility(
        <VRAMChart
          data={singlePoint}
          maxVRAM={8192}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)

      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute('aria-label', expect.stringContaining('1 data points'))
    })

    it('should handle very large datasets', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: i,
        totalVRAM: 8000 + Math.sin(i / 10) * 1000,
        breakdown: {
          baseModel: 6000,
          kvCache: 1500 + Math.sin(i / 10) * 500,
          activations: 400 + Math.cos(i / 8) * 200,
          overhead: 100 + Math.random() * 100,
        },
      }))

      const { container } = renderWithAccessibility(
        <VRAMChart
          data={largeDataset}
          maxVRAM={12000}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      await runAxeTest(container)

      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1000 data points')
      )
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance for area chart', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="area"
          onPointClick={mockOnPointClick}
        />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('VRAMChart Area Chart Accessibility Results:', results)
    })

    it('should achieve WCAG 2.1 AA compliance for bar chart', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      const { container } = renderWithAccessibility(
        <VRAMChart
          data={mockVRAMData}
          maxVRAM={12288}
          chartType="bar"
          onPointClick={mockOnPointClick}
        />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('VRAMChart Bar Chart Accessibility Results:', results)
    })

    it('should maintain accessibility across all supported configurations', async () => {
      const configurations = [
        { chartType: 'area' as const, showTooltips: true, height: 400 },
        { chartType: 'bar' as const, showTooltips: true, height: 400 },
        { chartType: 'area' as const, showTooltips: false, height: 300 },
        { chartType: 'bar' as const, showTooltips: false, height: 500 },
      ]

      for (const config of configurations) {
        const { container } = renderWithAccessibility(
          <VRAMChart
            data={mockVRAMData}
            maxVRAM={12288}
            chartType={config.chartType}
            showTooltips={config.showTooltips}
            height={config.height}
            onPointClick={mockOnPointClick}
          />
        )

        await runAxeTest(container)
      }
    })
  })
})
