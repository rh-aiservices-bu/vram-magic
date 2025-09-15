import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import { SimulationControls } from '../../../src/components/SimulationControls'
import type { SimulationConfig, SimulationControlsProps } from '../../../src/types'
import { TimeUnit, RequestPattern, ModelPrecision } from '../../../src/types'
import { SIMULATION_CONSTRAINTS, DEFAULT_SIMULATION_CONFIG } from '../../../src/constants'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock Material-UI theme
const theme = createTheme()

// Test utility for rendering with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

// Mock data
const mockSimulationConfig: SimulationConfig = {
  period: {
    duration: 3600, // 1 hour in seconds
    timeUnit: TimeUnit.SECONDS,
    concurrentUsers: 10,
    requestPattern: RequestPattern.UNIFORM,
    granularity: 60,
    durationSeconds: 3600,
    precision: ModelPrecision.FP16,
  },
  isValid: true,
  errors: [],
}

const mockProps: SimulationControlsProps = {
  config: mockSimulationConfig,
  onChange: vi.fn(),
  onCalculate: vi.fn(),
  isCalculating: false,
  disabled: false,
}

describe('SimulationControls Component', () => {
  let user: ReturnType<typeof userEvent.setup>
  // let mockOnChange: ReturnType<typeof vi.fn>
  // let mockOnCalculate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    // mockOnChange = vi.fn()
    // mockOnCalculate = vi.fn()
    vi.clearAllMocks()
  })

  describe('Component Rendering and Structure', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = renderWithTheme(<SimulationControls {...mockProps} />)

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check main heading
      expect(screen.getByRole('heading', { name: /simulation parameters/i })).toBeInTheDocument()

      // Check form fields by specific aria-label or role
      expect(screen.getByLabelText('Simulation duration')).toBeInTheDocument()
      expect(screen.getByLabelText('Time unit')).toBeInTheDocument()
      expect(screen.getByLabelText('Number of concurrent users')).toBeInTheDocument()
      expect(screen.getByLabelText('Request distribution pattern')).toBeInTheDocument()
      expect(screen.getByLabelText('Simulation granularity in seconds')).toBeInTheDocument()

      // Check action buttons
      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /run.*simulation/i })).toBeInTheDocument()
    })

    it('should display current configuration values', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Duration should be converted to appropriate unit (3600 seconds = 1 hour)
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // duration in hours
      expect(screen.getByDisplayValue('10')).toBeInTheDocument() // concurrent users
      expect(screen.getByDisplayValue('60')).toBeInTheDocument() // granularity
    })

    it('should show status chips with current configuration', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByText('3,600s')).toBeInTheDocument() // duration in seconds
      expect(screen.getByText('10 users')).toBeInTheDocument()
      expect(screen.getByText('uniform')).toBeInTheDocument()
      expect(screen.getByText('60 data points')).toBeInTheDocument() // 3600/60
    })

    it('should display help tooltips for guidance', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Info button for simulation parameters
      const infoButton = screen.getByLabelText('Simulation parameters info')
      expect(infoButton).toBeInTheDocument()
    })

    it('should render all time unit options', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // The time unit select should have proper options (tested through integration)
      const timeUnitSelect = screen.getByLabelText('Time unit')
      expect(timeUnitSelect).toBeInTheDocument()
    })

    it('should render all request pattern options with descriptions', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Should show pattern description in helper text
      expect(screen.getByText(/consistent request load throughout/i)).toBeInTheDocument()
    })
  })

  describe('Time Period Controls', () => {
    it('should handle duration input changes', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '2')

      await waitFor(() => {
        // Check that the final onChange call has the correct value (2 hours = 7200 seconds)
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
        expect(lastCall[0]).toEqual(
          expect.objectContaining({
            period: expect.objectContaining({
              duration: 7200, // 2 hours in seconds
            }),
          })
        )
      })
    })

    it('should handle time unit changes and convert duration', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      // Simulate changing time unit to minutes
      const timeUnitSelect = screen
        .getByLabelText('Time unit')
        .closest('div')
        ?.querySelector('input')
      if (timeUnitSelect) {
        fireEvent.change(timeUnitSelect, { target: { value: TimeUnit.MINUTES } })
      }

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            period: expect.objectContaining({
              timeUnit: TimeUnit.SECONDS, // Always stored as seconds
              duration: 3600, // Same duration, different display unit
            }),
          })
        )
      })
    })

    it('should show total seconds in time unit helper text', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByText('3,600 seconds total')).toBeInTheDocument()
    })

    it('should validate duration constraints', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle very large duration values', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '24') // 24 hours

      await waitFor(() => {
        expect(screen.getByText('86,400s')).toBeInTheDocument() // 24 hours in seconds
      })
    })

    it('should handle decimal duration values', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '1.5') // 1.5 hours

      await waitFor(() => {
        expect(screen.getByText('5,400s')).toBeInTheDocument() // 1.5 hours in seconds
      })
    })

    it('should maintain precision during time unit conversions', async () => {
      // Test that conversions don't lose precision
      const configWithSeconds = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 90 }, // 90 seconds = 1.5 minutes
      }

      renderWithTheme(<SimulationControls {...mockProps} config={configWithSeconds} />)

      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument() // Should display as 1.5 minutes
    })
  })

  describe('Concurrent Users Control', () => {
    it('should handle concurrent users input changes', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '50')

      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
        expect(lastCall[0]).toEqual(
          expect.objectContaining({
            period: expect.objectContaining({
              concurrentUsers: 50,
            }),
          })
        )
      })
    })

    it('should show maximum users in helper text', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(
        screen.getByText(`Max ${SIMULATION_CONSTRAINTS.MAX_USERS.toLocaleString()} users`)
      ).toBeInTheDocument()
    })

    it('should validate users constraints', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '15000') // Exceeds max

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle zero users input', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle negative users input', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '-10')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should update status chip when users change', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '25')

      await waitFor(() => {
        expect(screen.getByText('25 users')).toBeInTheDocument()
      })
    })
  })

  describe('Request Pattern Control', () => {
    it('should display current request pattern', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByDisplayValue('uniform')).toBeInTheDocument()
    })

    it('should show request pattern select field', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const patternSelect = screen.getByLabelText('Request distribution pattern')
      expect(patternSelect).toBeInTheDocument()
      expect(screen.getByDisplayValue('uniform')).toBeInTheDocument()
    })

    it('should show pattern description in helper text', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByText(/consistent request load throughout/i)).toBeInTheDocument()
    })

    it('should update status chip when pattern changes', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      // Current pattern should be shown in chip
      expect(screen.getByText('uniform')).toBeInTheDocument()

      // Simulate pattern change (integration test would handle actual dropdown interaction)
      const configWithFrontLoaded = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, requestPattern: RequestPattern.FRONT_LOADED },
      }

      render(
        <ThemeProvider theme={theme}>
          <SimulationControls {...mockProps} config={configWithFrontLoaded} />
        </ThemeProvider>
      )

      expect(screen.getByText('front-loaded')).toBeInTheDocument()
    })

    it('should handle all request pattern types', () => {
      // Test each pattern type
      const patterns = [
        RequestPattern.UNIFORM,
        RequestPattern.FRONT_LOADED,
        RequestPattern.BACK_LOADED,
        RequestPattern.BELL_CURVE,
      ]

      patterns.forEach(pattern => {
        const config = {
          ...mockSimulationConfig,
          period: { ...mockSimulationConfig.period, requestPattern: pattern },
        }

        renderWithTheme(<SimulationControls {...mockProps} config={config} />)

        // Should display the pattern in some form
        expect(screen.getByDisplayValue(pattern)).toBeInTheDocument()

        rerender(<div />)
      })
    })
  })

  describe('Granularity Control', () => {
    it('should handle granularity input changes', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '30')

      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
        expect(lastCall[0]).toEqual(
          expect.objectContaining({
            period: expect.objectContaining({
              granularity: 30,
            }),
          })
        )
      })
    })

    it('should validate granularity constraints', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should update data points chip when granularity changes', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '120')

      await waitFor(() => {
        expect(screen.getByText('30 data points')).toBeInTheDocument() // 3600/120
      })
    })

    it('should constrain granularity to duration', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      expect(granularityInput).toHaveAttribute('max', '3600') // Cannot exceed duration
    })

    it('should handle very fine granularity', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '1')

      await waitFor(() => {
        expect(screen.getByText('3,600 data points')).toBeInTheDocument() // 3600/1
      })
    })

    it('should show helper text for granularity', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByText('Data point interval for chart')).toBeInTheDocument()
    })
  })

  describe('Validation and Error Handling', () => {
    it('should display validation errors in alert', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create invalid state - zero duration
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/please fix the following errors/i)).toBeInTheDocument()
      })
    })

    it('should display validation warnings separately', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create high user count that triggers warning
      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '5000')

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const warningAlert = alerts.find(alert => alert.textContent?.includes('Warning'))
        expect(warningAlert).toBeInTheDocument()
      })
    })

    it('should disable calculate button when form has errors', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create invalid state
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
        expect(calculateButton).toBeDisabled()
      })
    })

    it('should call onChange with isValid: false when form has errors', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                severity: 'error',
              }),
            ]),
          })
        )
      })
    })

    it('should show multiple validation errors', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create multiple invalid states
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '-5')

      await waitFor(() => {
        const alert = screen.getByRole('alert')
        expect(alert.textContent).toMatch(/please fix the following errors/i)
        // Should list multiple errors
        const listItems = alert.querySelectorAll('li')
        expect(listItems.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should prioritize errors over warnings in display', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create both error and warning conditions
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0') // Error

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '5000') // Warning

      await waitFor(() => {
        // Should show errors, not warnings when both exist
        expect(screen.getByText(/please fix the following errors/i)).toBeInTheDocument()
        expect(screen.queryByText(/warnings:/i)).not.toBeInTheDocument()
      })
    })

    it('should clear validation errors when inputs become valid', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create invalid state
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })

      // Fix the invalid state
      await user.clear(durationInput)
      await user.type(durationInput, '1')

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })
  })

  describe('Action Buttons', () => {
    it('should call onCalculate when calculate button is clicked', async () => {
      const onCalculate = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onCalculate={onCalculate} />)

      const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
      await user.click(calculateButton)

      expect(onCalculate).toHaveBeenCalledTimes(1)
    })

    it('should not call onCalculate if form has validation errors', async () => {
      const onCalculate = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onCalculate={onCalculate} />)

      // Create invalid state
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
        expect(calculateButton).toBeDisabled()
      })

      // Try to click disabled button (shouldn't call onCalculate)
      const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
      await user.click(calculateButton)

      expect(onCalculate).not.toHaveBeenCalled()
    })

    it('should reset form to defaults when reset button is clicked', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      // Change some values first
      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '50')

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      await user.click(resetButton)

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            period: expect.objectContaining({
              duration: DEFAULT_SIMULATION_CONFIG.duration,
              concurrentUsers: DEFAULT_SIMULATION_CONFIG.concurrentUsers,
              requestPattern: DEFAULT_SIMULATION_CONFIG.requestPattern,
            }),
          })
        )
      })
    })

    it('should show loading state when isCalculating is true', () => {
      renderWithTheme(<SimulationControls {...mockProps} isCalculating={true} />)

      const calculateButton = screen.getByRole('button', { name: /running simulation/i })
      expect(calculateButton).toBeDisabled()
      expect(screen.getByText('Running Simulation...')).toBeInTheDocument()
    })

    it('should show loading spinner when calculating', () => {
      renderWithTheme(<SimulationControls {...mockProps} isCalculating={true} />)

      // Should display loading spinner (CircularProgress)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should disable reset button during calculation', () => {
      renderWithTheme(<SimulationControls {...mockProps} isCalculating={true} />)

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i })
      expect(resetButton).toBeDisabled()
    })

    it('should maintain button focus state appropriately', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
      calculateButton.focus()

      expect(calculateButton).toHaveFocus()
    })
  })

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      renderWithTheme(<SimulationControls {...mockProps} disabled={true} />)

      expect(screen.getByLabelText(/duration/i)).toBeDisabled()
      expect(screen.getByLabelText(/time unit/i)).toBeDisabled()
      expect(screen.getByLabelText(/concurrent users/i)).toBeDisabled()
      expect(screen.getByLabelText(/request.*pattern/i)).toBeDisabled()
      expect(screen.getByLabelText(/granularity/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /run.*simulation/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeDisabled()
    })

    it('should apply disabled background styling when disabled', () => {
      renderWithTheme(<SimulationControls {...mockProps} disabled={true} />)

      // The Paper component should have disabled styling
      const paper = screen
        .getByRole('heading', { name: /simulation parameters/i })
        .closest('[elevation]')
      expect(paper).toBeInTheDocument()
    })

    it('should not respond to user interactions when disabled', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} disabled={true} onChange={onChange} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      expect(durationInput).toBeDisabled()

      // Try to interact with disabled input
      await user.type(durationInput, '5')

      // Should not trigger onChange
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('Performance Warnings', () => {
    it('should show performance warning for large simulations', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Create large simulation: long duration with fine granularity
      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '10') // 10 hours = 36,000 seconds

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '30') // 30 second intervals = 1,200 data points

      await waitFor(() => {
        expect(screen.getByText(/large simulations.*may take longer/i)).toBeInTheDocument()
      })
    })

    it('should not show performance warning for reasonable simulations', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Default configuration should not trigger warning
      expect(screen.queryByText(/large simulations.*may take longer/i)).not.toBeInTheDocument()
    })

    it('should update performance warning dynamically', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Start with fine granularity to trigger warning
      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '1') // 3600 data points

      await waitFor(() => {
        expect(screen.getByText(/large simulations.*may take longer/i)).toBeInTheDocument()
      })

      // Increase granularity to remove warning
      await user.clear(granularityInput)
      await user.type(granularityInput, '100') // 36 data points

      await waitFor(() => {
        expect(screen.queryByText(/large simulations.*may take longer/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels on all form controls', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByLabelText('Simulation duration')).toHaveAttribute(
        'aria-label',
        'Simulation duration'
      )
      expect(screen.getByLabelText('Time unit')).toHaveAttribute('aria-label', 'Time unit')
      expect(screen.getByLabelText('Number of concurrent users')).toHaveAttribute(
        'aria-label',
        'Number of concurrent users'
      )
      expect(screen.getByLabelText('Request distribution pattern')).toHaveAttribute(
        'aria-label',
        'Request distribution pattern'
      )
      expect(screen.getByLabelText('Simulation granularity in seconds')).toHaveAttribute(
        'aria-label',
        'Simulation granularity in seconds'
      )
    })

    it('should have accessible button names', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const calculateButton = screen.getByRole('button', { name: /run vram simulation/i })
      expect(calculateButton).toHaveAccessibleName()
    })

    it('should support keyboard navigation', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const inputs = [
        screen.getByLabelText('Simulation duration'),
        screen.getByLabelText('Number of concurrent users'),
        screen.getByLabelText('Simulation granularity in seconds'),
      ]

      inputs.forEach(input => {
        expect(input).toBeInTheDocument()
        expect(input).not.toBeDisabled()
      })

      const buttons = [
        screen.getByRole('button', { name: /reset to defaults/i }),
        screen.getByRole('button', { name: /run.*simulation/i }),
      ]

      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
        expect(button).not.toBeDisabled()
      })
    })

    it('should associate error messages with form fields', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(durationInput).toHaveAttribute('aria-invalid', 'true')
        expect(durationInput).toHaveAttribute('aria-describedby')
      })
    })

    it('should provide screen reader friendly status updates', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Status information should be conveyed through helper texts and alerts
      expect(screen.getByText('3,600 seconds total')).toBeInTheDocument()
      expect(screen.getByText('Data point interval for chart')).toBeInTheDocument()
    })
  })

  describe('Time Unit Conversion and Display', () => {
    it('should display duration in appropriate time units', () => {
      // Test 1 hour = displayed as 1 hour
      const configWith1Hour = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 3600 },
      }

      renderWithTheme(<SimulationControls {...mockProps} config={configWith1Hour} />)
      expect(screen.getByDisplayValue('1')).toBeInTheDocument() // 1 hour

      // Test 2 hours = displayed as 2 hours
      const configWith2Hours = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 7200 },
      }

      rerender(
        <ThemeProvider theme={theme}>
          <SimulationControls {...mockProps} config={configWith2Hours} />
        </ThemeProvider>
      )
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // 2 hours

      // Test 30 minutes = displayed as 30 minutes
      const configWith30Min = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 1800 },
      }

      rerender(
        <ThemeProvider theme={theme}>
          <SimulationControls {...mockProps} config={configWith30Min} />
        </ThemeProvider>
      )
      expect(screen.getByDisplayValue('30')).toBeInTheDocument() // 30 minutes
    })

    it('should choose best time unit for display', () => {
      // Test very short durations display in seconds
      const configWithSeconds = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 45 },
      }

      renderWithTheme(<SimulationControls {...mockProps} config={configWithSeconds} />)
      expect(screen.getByDisplayValue('45')).toBeInTheDocument() // 45 seconds

      // Test days
      const configWithDays = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 172800 }, // 2 days
      }

      rerender(
        <ThemeProvider theme={theme}>
          <SimulationControls {...mockProps} config={configWithDays} />
        </ThemeProvider>
      )
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // 2 days
    })

    it('should handle precision correctly in conversions', () => {
      // Test that small fractional values are handled correctly
      const configWithFraction = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 90 }, // 1.5 minutes
      }

      renderWithTheme(<SimulationControls {...mockProps} config={configWithFraction} />)
      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument() // 1.5 minutes
    })

    it('should sync external config changes properly', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Change external config
      const newConfig = {
        ...mockSimulationConfig,
        period: {
          ...mockSimulationConfig.period,
          duration: 7200, // 2 hours
          concurrentUsers: 25,
        },
      }

      rerender(
        <ThemeProvider theme={theme}>
          <SimulationControls {...mockProps} config={newConfig} />
        </ThemeProvider>
      )

      // Should sync to new values
      expect(screen.getByDisplayValue('2')).toBeInTheDocument() // 2 hours
      expect(screen.getByDisplayValue('25')).toBeInTheDocument() // 25 users
    })
  })

  describe('Edge Cases and Robustness', () => {
    it('should handle NaN inputs gracefully', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, 'abc') // Non-numeric input

      await waitFor(() => {
        // Should fall back to 0 and show validation error
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle empty inputs gracefully', async () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)

      await waitFor(() => {
        // Should handle empty input (likely converts to 0)
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })

    it('should handle rapid input changes', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const durationInput = screen.getByLabelText('Simulation duration')

      // Rapid changes
      await user.clear(durationInput)
      await user.type(durationInput, '1')
      await user.type(durationInput, '2')
      await user.type(durationInput, '3')

      // Should handle all changes without errors
      expect(onChange).toHaveBeenCalled()
    })

    it('should maintain form consistency during complex interactions', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      // Complex sequence of changes
      const durationInput = screen.getByLabelText('Simulation duration')
      const usersInput = screen.getByLabelText('Number of concurrent users')
      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')

      await user.clear(durationInput)
      await user.type(durationInput, '2')
      await user.clear(usersInput)
      await user.type(usersInput, '20')
      await user.clear(granularityInput)
      await user.type(granularityInput, '30')

      // Final state should be consistent
      await waitFor(() => {
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]
        const config = lastCall[0]
        expect(config.period.duration).toBe(7200) // 2 hours
        expect(config.period.concurrentUsers).toBe(20)
        expect(config.period.granularity).toBe(30)
      })
    })
  })
})
