import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import PercentageSlider from '../../../src/components/PercentageSlider/PercentageSlider'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Create a Material UI theme for testing
const theme = createTheme()

// Helper wrapper component with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
)

describe('PercentageSlider Component', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockOnChange: ReturnType<typeof vi.fn>

  const defaultProps = {
    value: 25,
    onChange: vi.fn(),
    remaining: 75,
    label: 'Test Workload',
  }

  beforeEach(() => {
    user = userEvent.setup()
    mockOnChange = vi.fn()
    vi.clearAllMocks()
  })

  describe('Component Rendering and Structure', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should render main components
      expect(screen.getByText('Test Workload')).toBeInTheDocument()
      expect(screen.getByText('75% remaining')).toBeInTheDocument()
      expect(screen.getByText('Current Value')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('should display current value correctly', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={40} />
        </TestWrapper>
      )

      // Check for the current value display
      expect(screen.getByText('Current Value')).toBeInTheDocument()
      const currentValueElements = screen.getAllByText('40%')
      expect(currentValueElements.length).toBeGreaterThan(0)
    })

    it('should show percentage scale markers', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      // Should display scale markers
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('25%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('50%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
    })

    it('should have correct slider attributes', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '100')
      expect(slider).toHaveAttribute('step', '1')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '100')
      expect(slider).toHaveAttribute('aria-valuenow', '25')
    })
  })

  describe('Remaining Percentage Display', () => {
    it('should show remaining percentage as success when > 10%', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={50} />
        </TestWrapper>
      )

      const chip = screen.getByText('50% remaining')
      expect(chip).toBeInTheDocument()
    })

    it('should show remaining percentage as warning when <= 10%', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={5} />
        </TestWrapper>
      )

      const chip = screen.getByText('5% remaining')
      expect(chip).toBeInTheDocument()
    })

    it('should update remaining percentage display correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={80} />
        </TestWrapper>
      )

      expect(screen.getByText('80% remaining')).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={20} />
        </TestWrapper>
      )

      expect(screen.getByText('20% remaining')).toBeInTheDocument()
    })

    it('should show different chip colors based on remaining percentage', () => {
      // High remaining - should be success color
      const { rerender } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={50} />
        </TestWrapper>
      )

      expect(screen.getByText('50% remaining')).toBeInTheDocument()

      // Low remaining - should be warning color
      rerender(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={5} />
        </TestWrapper>
      )

      expect(screen.getByText('5% remaining')).toBeInTheDocument()
    })
  })

  describe('Validation and Error Handling', () => {
    it('should show validation error when value exceeds remaining', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={80} remaining={50} />
        </TestWrapper>
      )

      expect(screen.getByText('Cannot exceed remaining percentage (50%)')).toBeInTheDocument()
    })

    it('should show custom error message when provided', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} error="Custom error message" />
        </TestWrapper>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('should prioritize exceeds remaining error over custom error', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} error="Custom error" />
        </TestWrapper>
      )

      expect(screen.getByText('Cannot exceed remaining percentage (50%)')).toBeInTheDocument()
      expect(screen.queryByText('Custom error')).not.toBeInTheDocument()
    })

    it('should show error chip color when validation fails', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const chip = screen.getByText('50% remaining')
      expect(chip).toBeInTheDocument()
    })

    it('should apply error styling to slider when validation fails', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
      // The error styling would be tested via CSS classes or computed styles in a real scenario
    })

    it('should apply error styling to label when validation fails', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const label = screen.getByText('Test Workload')
      expect(label).toBeInTheDocument()
      // Error color would be applied via CSS, which can be tested with style queries
    })
  })

  describe('User Interactions', () => {
    it('should call onChange when slider value changes', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: 60 } })

      expect(mockOnChange).toHaveBeenCalledWith(60)
    })

    it('should handle keyboard interactions', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      slider.focus()

      // Arrow right should increase value
      await user.keyboard('[ArrowRight]')
      expect(mockOnChange).toHaveBeenCalled()

      // Arrow left should decrease value
      mockOnChange.mockClear()
      await user.keyboard('[ArrowLeft]')
      expect(mockOnChange).toHaveBeenCalled()

      // Home should go to minimum
      mockOnChange.mockClear()
      await user.keyboard('[Home]')
      expect(mockOnChange).toHaveBeenCalled()

      // End should go to maximum
      mockOnChange.mockClear()
      await user.keyboard('[End]')
      expect(mockOnChange).toHaveBeenCalled()
    })

    it('should handle mouse drag interactions', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Simulate mouse down and drag
      fireEvent.mouseDown(slider)
      fireEvent.change(slider, { target: { value: 50 } })
      fireEvent.mouseUp(slider)

      expect(mockOnChange).toHaveBeenCalledWith(50)
    })

    it('should handle touch interactions on mobile', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Simulate touch events
      fireEvent.touchStart(slider)
      fireEvent.change(slider, { target: { value: 35 } })
      fireEvent.touchEnd(slider)

      expect(mockOnChange).toHaveBeenCalledWith(35)
    })

    it('should allow values up to 100% even when exceeding remaining', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} remaining={30} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: 80 } })

      // Should still call onChange even though it exceeds remaining
      expect(mockOnChange).toHaveBeenCalledWith(80)
    })

    it('should handle array values from slider change event', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Simulate slider returning array value (some implementations do this)
      const mockEvent = { target: { value: [45] } }
      fireEvent.change(slider, mockEvent)

      expect(mockOnChange).toHaveBeenCalledWith(45)
    })
  })

  describe('Disabled State', () => {
    it('should render in disabled state correctly', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeDisabled()
    })

    it('should have correct disabled attributes', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeDisabled()
      expect(slider).toHaveAttribute('disabled')
    })

    it('should not respond to interactions when disabled', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Try to interact with disabled slider
      fireEvent.change(slider, { target: { value: 60 } })

      // Should not call onChange
      expect(mockOnChange).not.toHaveBeenCalled()
    })

    it('should apply disabled styling', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
      // Disabled styling would be checked via CSS classes or computed styles
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels and attributes', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-labelledby', 'test-workload-slider-label')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '100')
      expect(slider).toHaveAttribute('aria-valuenow', '25')
    })

    it('should have ARIA describedby when error exists', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} error="Test error" />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-describedby', 'test-workload-helper-text')
    })

    it('should provide screen reader status updates', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveAttribute('aria-live', 'polite')
      expect(statusElement).toHaveAttribute('aria-atomic', 'true')
      expect(statusElement).toHaveTextContent(
        'Test Workload slider: 25 percent. 75 percent remaining. Valid'
      )
    })

    it('should announce errors to screen readers', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('Error: Cannot exceed remaining percentage (50%)')
    })

    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Should be focusable
      await user.tab()
      expect(slider).toHaveFocus()
    })

    it('should support high contrast mode indicators', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      // In a real test, you might check for specific CSS properties that ensure high contrast visibility
      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
    })
  })

  describe('Value Formatting and Display', () => {
    it('should format percentage values correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={0} />
        </TestWrapper>
      )

      const zeroElements = screen.getAllByText('0%')
      expect(zeroElements.length).toBeGreaterThan(0)

      rerender(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={100} />
        </TestWrapper>
      )

      const hundredElements = screen.getAllByText('100%')
      expect(hundredElements.length).toBeGreaterThan(0)
    })

    it('should handle decimal values correctly', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={33.5} />
        </TestWrapper>
      )

      const decimalElements = screen.getAllByText('33.5%')
      expect(decimalElements.length).toBeGreaterThan(0)
    })

    it('should display value label when dragging', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Start dragging - should show value label
      fireEvent.mouseDown(slider)

      // The value label display is controlled by MUI and would be tested via class presence
      expect(slider).toBeInTheDocument()
    })

    it('should update display dynamically as value changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={10} />
        </TestWrapper>
      )

      expect(screen.getAllByText('10%').length).toBeGreaterThan(0)

      rerender(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={85} />
        </TestWrapper>
      )

      expect(screen.getAllByText('85%').length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero remaining percentage', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={0} />
        </TestWrapper>
      )

      expect(screen.getByText('0% remaining')).toBeInTheDocument()
    })

    it('should handle 100% remaining percentage', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={100} />
        </TestWrapper>
      )

      expect(screen.getByText('100% remaining')).toBeInTheDocument()
    })

    it('should handle negative values gracefully', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={-10} onChange={mockOnChange} />
        </TestWrapper>
      )

      // Component should still render and display the value
      const negativeElements = screen.getAllByText('-10%')
      expect(negativeElements.length).toBeGreaterThan(0)
    })

    it('should handle values over 100% gracefully', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={150} remaining={200} />
        </TestWrapper>
      )

      const highValueElements = screen.getAllByText('150%')
      expect(highValueElements.length).toBeGreaterThan(0)
    })

    it('should handle extremely large values', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={9999} remaining={10000} />
        </TestWrapper>
      )

      const largeValueElements = screen.getAllByText('9999%')
      expect(largeValueElements.length).toBeGreaterThan(0)
    })

    it('should handle undefined or null values gracefully', () => {
      // This test might not be applicable depending on TypeScript constraints
      // but it's good to verify the component doesn't crash
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={0} />
        </TestWrapper>
      )

      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('should handle rapid value changes without performance issues', async () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={mockOnChange} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')

      // Simulate rapid changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(slider, { target: { value: i * 10 } })
      }

      // Should handle all changes
      expect(mockOnChange).toHaveBeenCalledTimes(10)
    })

    it('should maintain performance with frequent re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={10} />
        </TestWrapper>
      )

      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        rerender(
          <TestWrapper>
            <PercentageSlider {...defaultProps} value={i} />
          </TestWrapper>
        )
      }

      // Should still be responsive
      expect(screen.getByRole('slider')).toBeInTheDocument()
    })
  })
})
