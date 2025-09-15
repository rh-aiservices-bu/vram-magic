import type { Meta, StoryObj } from '@storybook/react-vite'

import { useState } from 'react'
import PercentageSlider from './PercentageSlider'
import { Box } from '@mui/material'

// Simple action replacement for stories
const action =
  (name: string) =>
  (...args: unknown[]) =>
    console.log(`Action ${name}:`, args)

const meta: Meta<typeof PercentageSlider> = {
  title: 'Components/PercentageSlider',
  component: PercentageSlider,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# PercentageSlider Component

A specialized slider component for setting workload percentages with real-time validation and visual feedback.

## Features

- **Real-time Validation**: Shows remaining percentage and prevents over-allocation
- **Visual Feedback**: Color changes based on validation state (error state when exceeding 100%)
- **Accessibility**: Full keyboard navigation and ARIA labels
- **Custom Styling**: Material UI theming with custom thumb and track styles
- **Label Integration**: Clear labeling for workload identification

## Usage

Used within the WorkloadConfigurator to set percentage allocation for each workload slot. The component automatically calculates remaining percentage and provides visual feedback for constraint violations.
        `,
      },
    },
  },
  argTypes: {
    value: {
      description: 'Current percentage value (0-100)',
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    onChange: {
      description: 'Callback fired when the slider value changes',
      action: 'value changed',
    },
    remaining: {
      description: 'Remaining percentage available for allocation',
      control: { type: 'number' },
    },
    label: {
      description: 'Label for the workload',
      control: { type: 'text' },
    },
    disabled: {
      description: 'Whether the slider is disabled',
      control: { type: 'boolean' },
    },
    error: {
      description: 'Error message to display',
      control: { type: 'text' },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper for controlled component
const InteractiveSlider = (args: {
  value: number
  remaining: number
  label: string
  disabled?: boolean
  error?: string
}) => {
  const [value, setValue] = useState(args.value)

  return (
    <Box sx={{ width: 400, p: 2 }}>
      <PercentageSlider
        {...args}
        value={value}
        onChange={newValue => {
          setValue(newValue)
          console.log('Value changed:', newValue)
        }}
      />
    </Box>
  )
}

/**
 * Default state with moderate allocation
 */
export const Default: Story = {
  render: InteractiveSlider,
  args: {
    value: 25,
    remaining: 60,
    label: 'Chat Workload',
    disabled: false,
    error: undefined,
  },
}

/**
 * High allocation approaching limit
 */
export const HighAllocation: Story = {
  render: InteractiveSlider,
  args: {
    value: 45,
    remaining: 10,
    label: 'RAG Workload',
    disabled: false,
    error: undefined,
  },
}

/**
 * Error state when allocation exceeds remaining
 */
export const ErrorState: Story = {
  render: InteractiveSlider,
  args: {
    value: 35,
    remaining: 5,
    label: 'Coding Workload',
    disabled: false,
    error: 'Allocation exceeds remaining percentage (5%)',
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: InteractiveSlider,
  args: {
    value: 20,
    remaining: 40,
    label: 'Creative Workload',
    disabled: true,
    error: undefined,
  },
}

/**
 * Zero allocation
 */
export const ZeroAllocation: Story = {
  render: InteractiveSlider,
  args: {
    value: 0,
    remaining: 100,
    label: 'Analysis Workload',
    disabled: false,
    error: undefined,
  },
}

/**
 * Maximum allocation (100%)
 */
export const MaximumAllocation: Story = {
  render: InteractiveSlider,
  args: {
    value: 100,
    remaining: 0,
    label: 'Single Workload',
    disabled: false,
    error: undefined,
  },
}

/**
 * Very low remaining percentage
 */
export const LowRemaining: Story = {
  render: InteractiveSlider,
  args: {
    value: 10,
    remaining: 3,
    label: 'Custom Workload',
    disabled: false,
    error: undefined,
  },
}

/**
 * Multiple sliders to show interaction
 */
export const MultipleSliders: Story = {
  render: () => {
    const [values, setValues] = useState([25, 30, 20, 15, 0])
    const total = values.reduce((sum, val) => sum + val, 0)
    const remaining = 100 - total

    const updateValue = (index: number, newValue: number) => {
      const newValues = [...values]
      newValues[index] = newValue
      setValues(newValues)
      action(`slider ${index} changed`)(newValue)
    }

    const workloadLabels = [
      'Chat Workload',
      'RAG Workload',
      'Coding Workload',
      'Creative Workload',
      'Custom Workload',
    ]

    return (
      <Box sx={{ width: 500, p: 2 }}>
        {values.map((value, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <PercentageSlider
              value={value}
              onChange={newValue => updateValue(index, newValue)}
              remaining={remaining + value} // Add current value back to remaining
              label={workloadLabels[index]}
              disabled={false}
              error={remaining < 0 ? 'Total allocation exceeds 100%' : undefined}
            />
          </Box>
        ))}
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: remaining < 0 ? 'error.light' : 'success.light',
            borderRadius: 1,
          }}
        >
          <strong>
            Total: {total}% | Remaining: {remaining}%
          </strong>
        </Box>
      </Box>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          'This story demonstrates how multiple percentage sliders work together with shared state validation.',
      },
    },
  },
}
