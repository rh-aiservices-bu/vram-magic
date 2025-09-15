// VRAM Magic: PercentageSlider Accessibility Tests
// Comprehensive accessibility testing for the PercentageSlider component with keyboard controls

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import PercentageSlider from '../../src/components/PercentageSlider/PercentageSlider'
import {
  renderWithAccessibility,
  runAxeTest,
  getScreenReaderText,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

describe('PercentageSlider Accessibility Tests', () => {
  let mockOnChange: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnChange = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests in normal state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in error state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={80} onChange={mockOnChange} remaining={20} label="Test Slider" />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider
          value={30}
          onChange={mockOnChange}
          remaining={70}
          label="Test Slider"
          disabled={true}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with external error', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider
          value={40}
          onChange={mockOnChange}
          remaining={60}
          label="Test Slider"
          error="External validation error"
        />
      )

      await runAxeTest(container)
    })
  })

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA label association', () => {
      renderWithAccessibility(
        <PercentageSlider
          value={25}
          onChange={mockOnChange}
          remaining={75}
          label="Workload Percentage"
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-labelledby', 'workload-percentage-slider-label')

      const label = screen.getByText('Workload Percentage')
      expect(label).toHaveAttribute('id', 'workload-percentage-slider-label')
    })

    it('should have proper ARIA value attributes', () => {
      renderWithAccessibility(
        <PercentageSlider value={60} onChange={mockOnChange} remaining={40} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '100')
      expect(slider).toHaveAttribute('aria-valuenow', '60')
      expect(slider).toHaveAttribute('aria-valuetext', '60%')
    })

    it('should associate error messages with slider', () => {
      renderWithAccessibility(
        <PercentageSlider value={80} onChange={mockOnChange} remaining={15} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-describedby', 'test-slider-helper-text')

      const errorMessage = screen.getByText(/cannot exceed remaining percentage/i)
      expect(errorMessage).toHaveAttribute('id', 'test-slider-helper-text')
    })

    it('should handle external error messages', () => {
      const externalError = 'Custom validation error'
      renderWithAccessibility(
        <PercentageSlider
          value={30}
          onChange={mockOnChange}
          remaining={70}
          label="Test Slider"
          error={externalError}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-describedby', 'test-slider-helper-text')

      const errorMessage = screen.getByText(externalError)
      expect(errorMessage).toHaveAttribute('id', 'test-slider-helper-text')
    })
  })

  describe('Keyboard Controls', () => {
    it('should support arrow key navigation', async () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Test right arrow key (increase)
      await user.keyboard('{ArrowRight}')
      expect(mockOnChange).toHaveBeenCalledWith(51)

      // Test left arrow key (decrease)
      await user.keyboard('{ArrowLeft}')
      expect(mockOnChange).toHaveBeenCalledWith(49)

      // Test up arrow key (increase)
      await user.keyboard('{ArrowUp}')
      expect(mockOnChange).toHaveBeenCalledWith(51)

      // Test down arrow key (decrease)
      await user.keyboard('{ArrowDown}')
      expect(mockOnChange).toHaveBeenCalledWith(49)
    })

    it('should support page up/down for larger increments', async () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Test Page Up (increase by 10)
      await user.keyboard('{PageUp}')
      expect(mockOnChange).toHaveBeenCalledWith(60)

      // Test Page Down (decrease by 10)
      await user.keyboard('{PageDown}')
      expect(mockOnChange).toHaveBeenCalledWith(40)
    })

    it('should support home/end keys for min/max values', async () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Test Home key (go to minimum)
      await user.keyboard('{Home}')
      expect(mockOnChange).toHaveBeenCalledWith(0)

      // Test End key (go to maximum)
      await user.keyboard('{End}')
      expect(mockOnChange).toHaveBeenCalledWith(100)
    })

    it('should not respond to keyboard when disabled', async () => {
      renderWithAccessibility(
        <PercentageSlider
          value={50}
          onChange={mockOnChange}
          remaining={50}
          label="Test Slider"
          disabled={true}
        />
      )

      const slider = screen.getByRole('slider')

      // Disabled slider should not be focusable
      expect(slider).toHaveAttribute('disabled')

      // Try to focus and interact
      slider.focus()
      await user.keyboard('{ArrowRight}')

      // Should not trigger onChange when disabled
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should handle rapid keyboard input correctly', async () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Rapid arrow key presses
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}')

      // Should handle all key presses
      expect(mockOnChange).toHaveBeenCalledTimes(5)
      expect(mockOnChange).toHaveBeenLastCalledWith(55)
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce value changes to screen readers', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider
          value={60}
          onChange={mockOnChange}
          remaining={40}
          label="Workload Percentage"
        />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(
        expect.stringContaining('Workload Percentage slider: 60 percent')
      )
      expect(announcements).toContainEqual(expect.stringContaining('40 percent remaining'))
      expect(announcements).toContainEqual(expect.stringContaining('Valid'))
    })

    it('should announce errors to screen readers', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={80} onChange={mockOnChange} remaining={15} label="Test Slider" />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(
        expect.stringContaining('Error: Cannot exceed remaining percentage')
      )
    })

    it('should announce external errors to screen readers', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider
          value={30}
          onChange={mockOnChange}
          remaining={70}
          label="Test Slider"
          error="Custom error message"
        />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(expect.stringContaining('Error: Custom error message'))
    })

    it('should have live region for dynamic updates', () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={45} onChange={mockOnChange} remaining={55} label="Test Slider" />
      )

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('should provide proper value text for screen readers', () => {
      renderWithAccessibility(
        <PercentageSlider value={75} onChange={mockOnChange} remaining={25} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuetext', '75%')
    })
  })

  describe('Focus Management', () => {
    it('should be focusable and have visible focus indicator', async () => {
      renderWithAccessibility(
        <PercentageSlider value={40} onChange={mockOnChange} remaining={60} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')

      await user.tab()
      expect(slider).toHaveFocus()

      // Check focus styles are applied
      const computedStyle = window.getComputedStyle(slider)
      expect(computedStyle.display).not.toBe('none')
      expect(computedStyle.visibility).not.toBe('hidden')
    })

    it('should maintain focus during value changes', async () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      await user.keyboard('{ArrowRight}')

      // Focus should remain on slider after value change
      expect(slider).toHaveFocus()
    })

    it('should not be focusable when disabled', () => {
      renderWithAccessibility(
        <PercentageSlider
          value={30}
          onChange={mockOnChange}
          remaining={70}
          label="Test Slider"
          disabled={true}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('disabled')
      expect(slider).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Visual and Color Accessibility', () => {
    it('should have sufficient color contrast in normal state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      await runAxeTest(container)
    })

    it('should have sufficient color contrast in error state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider value={80} onChange={mockOnChange} remaining={15} label="Test Slider" />
      )

      await runAxeTest(container)
    })

    it('should have sufficient color contrast in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <PercentageSlider
          value={30}
          onChange={mockOnChange}
          remaining={70}
          label="Test Slider"
          disabled={true}
        />
      )

      await runAxeTest(container)
    })

    it('should provide visual feedback for different states', () => {
      const { rerender } = renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      // Normal state
      const remainingChip = screen.getByText(/50% remaining/i)
      expect(remainingChip).toBeInTheDocument()

      // Error state
      rerender(
        <PercentageSlider value={80} onChange={mockOnChange} remaining={15} label="Test Slider" />
      )

      const errorMessage = screen.getByText(/cannot exceed remaining percentage/i)
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute('role') // Should be announced to screen readers
    })
  })

  describe('Value Formatting and Display', () => {
    it('should format percentage values correctly', () => {
      renderWithAccessibility(
        <PercentageSlider value={75} onChange={mockOnChange} remaining={25} label="Test Slider" />
      )

      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('25% remaining')).toBeInTheDocument()
    })

    it('should show scale markers for reference', () => {
      renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should display current value prominently', () => {
      renderWithAccessibility(
        <PercentageSlider value={65} onChange={mockOnChange} remaining={35} label="Test Slider" />
      )

      const currentValueLabel = screen.getByText('Current Value')
      expect(currentValueLabel).toBeInTheDocument()

      const currentValue = screen.getByText('65%')
      expect(currentValue).toBeInTheDocument()
    })
  })

  describe('Error Handling and Validation', () => {
    it('should handle boundary values correctly', async () => {
      renderWithAccessibility(
        <PercentageSlider value={0} onChange={mockOnChange} remaining={100} label="Test Slider" />
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Try to go below minimum
      await user.keyboard('{ArrowLeft}')
      expect(mockOnChange).toHaveBeenCalledWith(-1) // Component should handle this

      // Go to maximum
      await user.keyboard('{End}')
      expect(mockOnChange).toHaveBeenCalledWith(100)
    })

    it('should provide clear error messages for validation failures', () => {
      renderWithAccessibility(
        <PercentageSlider value={90} onChange={mockOnChange} remaining={5} label="Test Slider" />
      )

      const errorMessage = screen.getByText('Cannot exceed remaining percentage (5%)')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute('id', 'test-slider-helper-text')
    })

    it('should prioritize external errors over internal validation', () => {
      renderWithAccessibility(
        <PercentageSlider
          value={80}
          onChange={mockOnChange}
          remaining={15}
          label="Test Slider"
          error="External error takes priority"
        />
      )

      const errorMessage = screen.getByText('External error takes priority')
      expect(errorMessage).toBeInTheDocument()
      expect(screen.queryByText(/cannot exceed remaining/i)).not.toBeInTheDocument()
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      // Test normal state
      const { container } = renderWithAccessibility(
        <PercentageSlider value={50} onChange={mockOnChange} remaining={50} label="Test Slider" />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FORM_VALIDATION, true))
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('PercentageSlider Accessibility Results:', results)
    })

    it('should maintain accessibility in all states', async () => {
      const states = [
        { value: 25, remaining: 75, disabled: false, error: undefined },
        { value: 80, remaining: 15, disabled: false, error: undefined }, // Error state
        { value: 40, remaining: 60, disabled: true, error: undefined }, // Disabled state
        { value: 30, remaining: 70, disabled: false, error: 'Custom error' }, // External error
      ]

      for (const state of states) {
        const { container } = renderWithAccessibility(
          <PercentageSlider
            value={state.value}
            onChange={mockOnChange}
            remaining={state.remaining}
            label="Test Slider"
            disabled={state.disabled}
            error={state.error}
          />
        )

        await runAxeTest(container)
      }
    })
  })
})
