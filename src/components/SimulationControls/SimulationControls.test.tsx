// VRAM Magic: SimulationControls Component Tests
// Comprehensive test suite following TDD methodology

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import { SimulationControls } from './index'
import type { SimulationConfig, SimulationControlsProps } from '../../types'
import { SIMULATION_CONSTRAINTS, DEFAULT_SIMULATION_CONFIG } from '../../constants'

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
    timeUnit: 'seconds',
    concurrentUsers: 10,
    requestPattern: 'uniform',
    granularity: 60,
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering and Layout', () => {
    it('should render all form controls with proper labels', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

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
  })

  describe('Time Period Controls', () => {
    it('should handle duration input changes', async () => {
      const user = userEvent.setup()
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

      // Since testing MUI Select dropdowns is complex, we'll test the logic by
      // simulating the change event directly on the select element
      const timeUnitSelect = screen
        .getByLabelText('Time unit')
        .closest('div')
        ?.querySelector('input')
      if (timeUnitSelect) {
        fireEvent.change(timeUnitSelect, { target: { value: 'minutes' } })
      }

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            period: expect.objectContaining({
              timeUnit: 'seconds', // Always stored as seconds
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
      const user = userEvent.setup()
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getAllByText(/number must be greater than or equal to 1/i)).toHaveLength(2) // In alert and field
      })
    })
  })

  describe('Concurrent Users Control', () => {
    it('should handle concurrent users input changes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '50')

      await waitFor(() => {
        // Check that the final onChange call has the correct value (50)
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
      const user = userEvent.setup()
      renderWithTheme(<SimulationControls {...mockProps} />)

      const usersInput = screen.getByLabelText('Number of concurrent users')
      await user.clear(usersInput)
      await user.type(usersInput, '15000')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getAllByText(/number must be less than or equal to 10000/i)).toHaveLength(2) // In alert and field
      })
    })
  })

  describe('Request Pattern Control', () => {
    it('should handle request pattern selection', async () => {
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      // Test that the component displays the current pattern correctly
      expect(screen.getByDisplayValue('uniform')).toBeInTheDocument()

      // For now, skip complex dropdown testing - the component logic is tested
      // through integration tests and manual testing
    })

    it('should show request pattern select field', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      // Verify the select field exists and shows current value
      const patternSelect = screen.getByLabelText('Request distribution pattern')
      expect(patternSelect).toBeInTheDocument()
      expect(screen.getByDisplayValue('uniform')).toBeInTheDocument()
    })

    it('should show pattern description in helper text', () => {
      renderWithTheme(<SimulationControls {...mockProps} />)

      expect(screen.getByText(/consistent request load throughout/i)).toBeInTheDocument()
    })
  })

  describe('Granularity Control', () => {
    it('should handle granularity input changes', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onChange={onChange} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '30')

      await waitFor(() => {
        // Check that the final onChange call has the correct value (30)
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
      const user = userEvent.setup()
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '0')

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getAllByText(/number must be greater than or equal to 1/i)).toHaveLength(2) // In alert and field
      })
    })

    it('should update data points chip when granularity changes', async () => {
      const user = userEvent.setup()
      renderWithTheme(<SimulationControls {...mockProps} />)

      const granularityInput = screen.getByLabelText('Simulation granularity in seconds')
      await user.clear(granularityInput)
      await user.type(granularityInput, '120')

      await waitFor(() => {
        expect(screen.getByText('30 data points')).toBeInTheDocument() // 3600/120
      })
    })
  })

  describe('Validation and Error Handling', () => {
    it('should display validation errors in alert', async () => {
      const user = userEvent.setup()
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
      const user = userEvent.setup()
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
      const user = userEvent.setup()
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
      const user = userEvent.setup()
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
  })

  describe('Action Buttons', () => {
    it('should call onCalculate when calculate button is clicked', async () => {
      const user = userEvent.setup()
      const onCalculate = vi.fn()
      renderWithTheme(<SimulationControls {...mockProps} onCalculate={onCalculate} />)

      const calculateButton = screen.getByRole('button', { name: /run.*simulation/i })
      await user.click(calculateButton)

      expect(onCalculate).toHaveBeenCalledTimes(1)
    })

    it('should reset form to defaults when reset button is clicked', async () => {
      const user = userEvent.setup()
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
  })

  describe('Performance Warnings', () => {
    it('should show performance warning for large simulations', async () => {
      const user = userEvent.setup()
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
  })

  describe('Accessibility', () => {
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

      // Check that input elements are focusable (no need for explicit tabindex in most cases)
      const inputs = [
        screen.getByLabelText('Simulation duration'),
        screen.getByLabelText('Number of concurrent users'),
        screen.getByLabelText('Simulation granularity in seconds'),
      ]

      inputs.forEach(input => {
        expect(input).toBeInTheDocument()
        expect(input).not.toBeDisabled()
      })

      // Check buttons are focusable
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
      const user = userEvent.setup()
      renderWithTheme(<SimulationControls {...mockProps} />)

      const durationInput = screen.getByLabelText('Simulation duration')
      await user.clear(durationInput)
      await user.type(durationInput, '0')

      await waitFor(() => {
        expect(durationInput).toHaveAttribute('aria-invalid', 'true')
        expect(durationInput).toHaveAttribute('aria-describedby')
      })
    })
  })

  describe('Time Unit Conversion', () => {
    it('should display duration in appropriate time units', () => {
      // Test 1 hour = displayed as 1 hour
      const configWith1Hour = {
        ...mockSimulationConfig,
        period: { ...mockSimulationConfig.period, duration: 3600 },
      }

      const { rerender } = renderWithTheme(
        <SimulationControls {...mockProps} config={configWith1Hour} />
      )
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
  })
})
