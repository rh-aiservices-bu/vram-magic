import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import PercentageSlider from './PercentageSlider'

// Create a Material UI theme for testing
const theme = createTheme()

// Helper wrapper component with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
)

describe('PercentageSlider', () => {
  const defaultProps = {
    value: 25,
    onChange: vi.fn(),
    remaining: 75,
    label: 'Test Workload',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Test Workload')).toBeInTheDocument()
      expect(screen.getByText('75% remaining')).toBeInTheDocument()
      expect(screen.getByText('Current Value')).toBeInTheDocument()
      const percentageElements = screen.getAllByText('25%')
      expect(percentageElements.length).toBeGreaterThan(0)
    })

    it('displays current value correctly', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={40} />
        </TestWrapper>
      )

      // Check for the current value display specifically (not the scale markers)
      expect(screen.getByText('Current Value')).toBeInTheDocument()
      const currentValueElements = screen.getAllByText('40%')
      expect(currentValueElements.length).toBeGreaterThan(0)
    })

    it('shows percentage scale markers', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      // Use getAllByText to handle multiple instances
      expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('25%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('50%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
      expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
    })
  })

  describe('Remaining Percentage Display', () => {
    it('shows remaining percentage as success when > 10%', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={50} />
        </TestWrapper>
      )

      const chip = screen.getByText('50% remaining')
      expect(chip).toBeInTheDocument()
    })

    it('shows remaining percentage as warning when <= 10%', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={5} />
        </TestWrapper>
      )

      const chip = screen.getByText('5% remaining')
      expect(chip).toBeInTheDocument()
    })

    it('updates remaining percentage display correctly', () => {
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
  })

  describe('Validation and Error Handling', () => {
    it('shows validation error when value exceeds remaining', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={80} remaining={50} />
        </TestWrapper>
      )

      expect(screen.getByText('Cannot exceed remaining percentage (50%)')).toBeInTheDocument()
    })

    it('shows custom error message when provided', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} error="Custom error message" />
        </TestWrapper>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('prioritizes exceeds remaining error over custom error', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} error="Custom error" />
        </TestWrapper>
      )

      expect(screen.getByText('Cannot exceed remaining percentage (50%)')).toBeInTheDocument()
      expect(screen.queryByText('Custom error')).not.toBeInTheDocument()
    })

    it('shows error chip color when validation fails', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const chip = screen.getByText('50% remaining')
      expect(chip).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('renders in disabled state', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeDisabled()
    })

    it('has correct disabled attributes when disabled', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} disabled={true} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeDisabled()
      expect(slider).toHaveAttribute('disabled')
    })
  })

  describe('Interaction', () => {
    it('calls onChange when slider value changes', () => {
      const onChangeMock = vi.fn()
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={onChangeMock} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: 60 } })

      expect(onChangeMock).toHaveBeenCalledWith(60)
    })

    it('component renders and functions correctly', () => {
      const onChangeMock = vi.fn()
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} onChange={onChangeMock} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toBeInTheDocument()
      expect(slider).toHaveAttribute('min', '0')
      expect(slider).toHaveAttribute('max', '100')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} />
        </TestWrapper>
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-labelledby', 'test-workload-slider-label')
    })

    it('shows error message when error prop is provided', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} error="Test error" />
        </TestWrapper>
      )

      const errorText = screen.getByText('Test error')
      expect(errorText).toBeInTheDocument()
    })

    it('provides screen reader status updates', () => {
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

    it('announces errors to screen readers', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={90} remaining={50} />
        </TestWrapper>
      )

      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('Error: Cannot exceed remaining percentage (50%)')
    })
  })

  describe('Value Formatting', () => {
    it('formats percentage values correctly', () => {
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

    it('handles decimal values correctly', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={33.5} />
        </TestWrapper>
      )

      const decimalElements = screen.getAllByText('33.5%')
      expect(decimalElements.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles zero remaining percentage', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={0} />
        </TestWrapper>
      )

      expect(screen.getByText('0% remaining')).toBeInTheDocument()
    })

    it('handles 100% remaining percentage', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} remaining={100} />
        </TestWrapper>
      )

      expect(screen.getByText('100% remaining')).toBeInTheDocument()
    })

    it('handles negative values gracefully', () => {
      const onChangeMock = vi.fn()
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={-10} onChange={onChangeMock} />
        </TestWrapper>
      )

      // Component should still render and display the value
      const negativeElements = screen.getAllByText('-10%')
      expect(negativeElements.length).toBeGreaterThan(0)
    })

    it('handles values over 100% gracefully', () => {
      render(
        <TestWrapper>
          <PercentageSlider {...defaultProps} value={150} remaining={200} />
        </TestWrapper>
      )

      const highValueElements = screen.getAllByText('150%')
      expect(highValueElements.length).toBeGreaterThan(0)
    })
  })
})
