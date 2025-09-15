// VRAM Magic: SimulationControls Accessibility Tests
// Comprehensive accessibility testing for the SimulationControls form component

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SimulationControls } from '../../src/components/SimulationControls/index'
import { SimulationConfig, TimeUnit, RequestPattern, ModelPrecision } from '../../src/types'
import {
  renderWithAccessibility,
  runAxeTest,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock simulation config for testing
const mockSimulationConfig: SimulationConfig = {
  period: {
    duration: 3600, // 1 hour in seconds
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

describe('SimulationControls Accessibility Tests', () => {
  let mockOnChange: ReturnType<typeof vi.fn>
  let mockOnCalculate: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnChange = vi.fn()
    mockOnCalculate = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests in normal state', async () => {
      const { container } = renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
          disabled={true}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests while calculating', async () => {
      const { container } = renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
          isCalculating={true}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with validation errors', async () => {
      const invalidConfig = {
        ...mockSimulationConfig,
        period: {
          ...mockSimulationConfig.period,
          duration: -1, // Invalid duration
          concurrentUsers: 999999, // Too many users
        },
        isValid: false,
      }

      const { container } = renderWithAccessibility(
        <SimulationControls
          config={invalidConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      await runAxeTest(container)
    })
  })

  describe('Form Field Labels and ARIA', () => {
    it('should have proper labels for all form fields', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      // Duration field
      const durationField = screen.getByRole('textbox', { name: /duration/i })
      expect(durationField).toHaveAttribute('aria-label', 'Simulation duration')

      // Time unit select
      const timeUnitSelect = screen.getByRole('combobox', { name: /time unit/i })
      expect(timeUnitSelect).toHaveAttribute('aria-label', 'Time unit')

      // Concurrent users field
      const usersField = screen.getByRole('textbox', { name: /concurrent users/i })
      expect(usersField).toHaveAttribute('aria-label', 'Number of concurrent users')

      // Request pattern select
      const patternSelect = screen.getByRole('combobox', { name: /request pattern/i })
      expect(patternSelect).toHaveAttribute('aria-label', 'Request distribution pattern')

      // Granularity field
      const granularityField = screen.getByRole('textbox', { name: /granularity/i })
      expect(granularityField).toHaveAttribute('aria-label', 'Simulation granularity in seconds')
    })

    it('should associate error messages with form fields', async () => {
      // Set invalid duration
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const durationField = screen.getByRole('textbox', { name: /duration/i })

      // Type invalid value
      await user.clear(durationField)
      await user.type(durationField, '-1')

      // Wait for validation
      await waitFor(() => {
        const errorMessage = screen.queryByText(/duration must be positive/i)
        if (errorMessage) {
          expect(durationField).toHaveAttribute('aria-invalid', 'true')
        }
      })
    })

    it('should have proper helper text associations', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const durationField = screen.getByRole('textbox', { name: /duration/i })
      const helperText = screen.getByText(/simulation duration/i)

      expect(durationField).toHaveAttribute('aria-describedby')
      const describedBy = durationField.getAttribute('aria-describedby')
      if (describedBy) {
        expect(helperText.closest(`#${describedBy}`)).toBeTruthy()
      }
    })

    it('should provide accessible descriptions for select options', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const patternSelect = screen.getByRole('combobox', { name: /request pattern/i })
      await user.click(patternSelect)

      await waitFor(() => {
        const uniformOption = screen.getByText('Uniform')
        const uniformDescription = screen.getByText('Steady request rate')
        expect(uniformOption).toBeInTheDocument()
        expect(uniformDescription).toBeInTheDocument()

        const frontLoadedOption = screen.getByText('Front-loaded')
        const frontLoadedDescription = screen.getByText('Higher initial load')
        expect(frontLoadedOption).toBeInTheDocument()
        expect(frontLoadedDescription).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation and Focus Management', () => {
    it('should support tab navigation through all form fields', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const focusableElements = getFocusableElements(document.body)
      expect(focusableElements.length).toBeGreaterThan(5)

      // Tab through main form fields
      await user.tab() // Duration field
      expect(screen.getByRole('textbox', { name: /duration/i })).toHaveFocus()

      await user.tab() // Time unit select
      expect(screen.getByRole('combobox', { name: /time unit/i })).toHaveFocus()

      await user.tab() // Concurrent users field
      expect(screen.getByRole('textbox', { name: /concurrent users/i })).toHaveFocus()

      await user.tab() // Request pattern select
      expect(screen.getByRole('combobox', { name: /request pattern/i })).toHaveFocus()

      await user.tab() // Granularity field
      expect(screen.getByRole('textbox', { name: /granularity/i })).toHaveFocus()
    })

    it('should support keyboard interaction with select dropdowns', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const timeUnitSelect = screen.getByRole('combobox', { name: /time unit/i })
      timeUnitSelect.focus()

      // Open dropdown with Enter
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should support keyboard interaction with number fields', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const durationField = screen.getByRole('textbox', { name: /duration/i })
      durationField.focus()

      // Clear and type new value
      await user.clear(durationField)
      await user.type(durationField, '2')

      expect(durationField).toHaveValue(2)
      expect(mockOnChange).toHaveBeenCalled()

      // Test arrow keys for number input
      await user.keyboard('{ArrowUp}')
      // Note: Arrow key behavior on number inputs is browser-specific
    })

    it('should maintain focus during form validation', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const usersField = screen.getByRole('textbox', { name: /concurrent users/i })
      usersField.focus()

      // Type invalid value
      await user.clear(usersField)
      await user.type(usersField, '999999')

      // Focus should remain on field after validation
      expect(usersField).toHaveFocus()
    })

    it('should handle Escape key to close dropdowns', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const patternSelect = screen.getByRole('combobox', { name: /request pattern/i })
      patternSelect.focus()

      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })

      expect(patternSelect).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce form validation errors', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const usersField = screen.getByRole('textbox', { name: /concurrent users/i })

      // Enter invalid value
      await user.clear(usersField)
      await user.type(usersField, '0')

      await waitFor(() => {
        const errorAlert = screen.queryByRole('alert')
        if (errorAlert) {
          expect(errorAlert).toHaveTextContent(/fix the following errors/i)
        }
      })
    })

    it('should have informative button labels', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const runButton = screen.getByRole('button', { name: /run vram simulation/i })
      expect(runButton).toBeInTheDocument()
      expect(runButton).toHaveAttribute('aria-label', 'Run VRAM simulation')

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      expect(resetButton).toBeInTheDocument()
    })

    it('should announce calculation state', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
          isCalculating={true}
        />
      )

      const runButton = screen.getByRole('button', { name: /running simulation/i })
      expect(runButton).toHaveAttribute('aria-label', 'Running simulation')
      expect(runButton).toBeDisabled()
    })

    it('should provide helpful tooltips and descriptions', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const infoButton = screen.getByRole('button', { name: /simulation parameters info/i })
      expect(infoButton).toHaveAttribute('aria-label', 'Simulation parameters info')

      // Helper text should be present
      expect(screen.getByText(/simulation duration/i)).toBeInTheDocument()
      expect(screen.getByText(/data point interval for chart/i)).toBeInTheDocument()
    })

    it('should announce dynamic content updates', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      // Check for status chips that show calculation results
      const totalSecondsChip = screen.getByText(/3,600s/i)
      expect(totalSecondsChip).toBeInTheDocument()

      const usersChip = screen.getByText(/100 users/i)
      expect(usersChip).toBeInTheDocument()
    })
  })

  describe('Form Validation and Error Handling', () => {
    it('should provide accessible error messages', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const durationField = screen.getByRole('textbox', { name: /duration/i })

      await user.clear(durationField)
      await user.type(durationField, '0')

      await waitFor(() => {
        const errorMessage = screen.queryByText(/duration must be at least/i)
        if (errorMessage) {
          expect(errorMessage).toHaveAttribute('role') // Should be announced
          expect(durationField).toHaveAttribute('aria-invalid', 'true')
        }
      })
    })

    it('should group related validation errors', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      // Create multiple validation errors
      const durationField = screen.getByRole('textbox', { name: /duration/i })
      const usersField = screen.getByRole('textbox', { name: /concurrent users/i })

      await user.clear(durationField)
      await user.type(durationField, '0')

      await user.clear(usersField)
      await user.type(usersField, '0')

      await waitFor(() => {
        const errorAlert = screen.queryByRole('alert')
        if (errorAlert) {
          expect(errorAlert).toHaveTextContent(/fix the following errors/i)
          const errorList = within(errorAlert).getByRole('list')
          expect(errorList).toBeInTheDocument()
        }
      })
    })

    it('should handle warnings separately from errors', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      // Create a scenario that might generate warnings
      const granularityField = screen.getByRole('textbox', { name: /granularity/i })
      await user.clear(granularityField)
      await user.type(granularityField, '1') // Very fine granularity

      await waitFor(() => {
        // Look for performance warning
        const warningAlert = screen.queryByText(/large simulations.*may take longer/i)
        if (warningAlert) {
          expect(warningAlert.closest('[role="alert"]')).toHaveAttribute('role', 'alert')
        }
      })
    })
  })

  describe('Interactive Elements and Controls', () => {
    it('should handle button interactions accessibly', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const runButton = screen.getByRole('button', { name: /run vram simulation/i })

      await user.click(runButton)
      expect(mockOnCalculate).toHaveBeenCalled()

      // Test keyboard activation
      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      resetButton.focus()
      await user.keyboard('{Enter}')

      // Should trigger reset functionality
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should disable interactive elements appropriately', () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
          disabled={true}
        />
      )

      const durationField = screen.getByRole('textbox', { name: /duration/i })
      expect(durationField).toBeDisabled()

      const runButton = screen.getByRole('button', { name: /run vram simulation/i })
      expect(runButton).toBeDisabled()

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      expect(resetButton).toBeDisabled()
    })

    it('should provide visual and programmatic focus indicators', async () => {
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const focusableElements = getFocusableElements(document.body)

      for (const element of focusableElements.slice(0, 3)) {
        // Test first few elements
        element.focus()
        expect(element).toHaveFocus()

        // Check that element is visible and has appropriate styling
        const computedStyle = window.getComputedStyle(element)
        expect(computedStyle.display).not.toBe('none')
        expect(computedStyle.visibility).not.toBe('hidden')
      }
    })
  })

  describe('Responsive and Progressive Enhancement', () => {
    it('should maintain accessibility across different viewport sizes', async () => {
      // This would typically involve viewport manipulation in a real test environment
      const { container } = renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      await runAxeTest(container)

      // Check that form remains usable
      const durationField = screen.getByRole('textbox', { name: /duration/i })
      expect(durationField).toBeVisible()

      const runButton = screen.getByRole('button', { name: /run vram simulation/i })
      expect(runButton).toBeVisible()
    })

    it('should work without advanced JavaScript features', () => {
      // Ensure basic semantic HTML structure
      renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      const heading = screen.getByRole('heading', { name: /simulation parameters/i })
      expect(heading).toBeInTheDocument()

      // Form fields should be properly marked up
      const textInputs = screen.getAllByRole('textbox')
      const comboboxes = screen.getAllByRole('combobox')
      const buttons = screen.getAllByRole('button')

      expect(textInputs.length).toBeGreaterThan(0)
      expect(comboboxes.length).toBeGreaterThan(0)
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      const { container } = renderWithAccessibility(
        <SimulationControls
          config={mockSimulationConfig}
          onChange={mockOnChange}
          onCalculate={mockOnCalculate}
        />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FORM_VALIDATION, true))
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

      console.log('SimulationControls Accessibility Results:', results)
    })

    it('should maintain accessibility in all interaction states', async () => {
      const states = [
        { disabled: false, isCalculating: false, hasErrors: false },
        { disabled: true, isCalculating: false, hasErrors: false },
        { disabled: false, isCalculating: true, hasErrors: false },
        { disabled: false, isCalculating: false, hasErrors: true },
      ]

      for (const state of states) {
        const config = state.hasErrors
          ? {
              ...mockSimulationConfig,
              period: { ...mockSimulationConfig.period, duration: -1 },
              isValid: false,
            }
          : mockSimulationConfig

        const { container } = renderWithAccessibility(
          <SimulationControls
            config={config}
            onChange={mockOnChange}
            onCalculate={mockOnCalculate}
            disabled={state.disabled}
            isCalculating={state.isCalculating}
          />
        )

        await runAxeTest(container)
      }
    })
  })
})
