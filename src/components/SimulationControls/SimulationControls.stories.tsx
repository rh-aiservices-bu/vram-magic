import type { Meta, StoryObj } from '@storybook/react-vite'

import { useState } from 'react'
import { Box } from '@mui/material'
import SimulationControls from './index'
import {
  SimulationConfig,
  SimulationPeriod,
  TimeUnit,
  RequestPattern,
  ModelPrecision,
  ValidationError,
  ThinkTimeDistribution,
  UserBehaviorPattern,
} from '../../types'

// Sample simulation configurations
const createSimulationConfig = (
  period: Partial<SimulationPeriod>,
  isValid = true,
  errors: ValidationError[] = []
): SimulationConfig => ({
  period: {
    duration: 30,
    timeUnit: TimeUnit.MINUTES,
    totalUsers: 30,
    maxThinkTime: 30,
    thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
    userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
    requestPattern: RequestPattern.UNIFORM,
    granularity: 60,
    durationSeconds: 1800,
    precision: ModelPrecision.FP16,
    ...period,
  },
  isValid,
  errors,
})

const defaultConfig = createSimulationConfig({})
const longSimulationConfig = createSimulationConfig({
  duration: 24,
  timeUnit: TimeUnit.HOURS,
  totalUsers: 150,
  maxThinkTime: 60,
  thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
  userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
  durationSeconds: 86400,
})
const heavyLoadConfig = createSimulationConfig({
  duration: 2,
  timeUnit: TimeUnit.HOURS,
  totalUsers: 300,
  maxThinkTime: 20,
  thinkTimeDistribution: ThinkTimeDistribution.EXPONENTIAL,
  userBehaviorPattern: UserBehaviorPattern.API_SERVICE,
  requestPattern: RequestPattern.FRONT_LOADED,
  durationSeconds: 7200,
})
const invalidConfig = createSimulationConfig(
  {
    duration: 0,
    totalUsers: -5,
  },
  false,
  [
    {
      field: 'duration',
      message: 'Duration must be greater than 0',
      severity: 'error',
    },
    {
      field: 'totalUsers',
      message: 'Total users must be a positive number',
      severity: 'error',
    },
  ]
)

const meta: Meta<typeof SimulationControls> = {
  title: 'Components/SimulationControls',
  component: SimulationControls,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# SimulationControls Component

A comprehensive form interface for configuring VRAM simulation parameters with real-time validation.

## Features

- **Time Configuration**: Duration and time unit selection (minutes, hours, days)
- **Load Testing**: Concurrent users and request pattern configuration
- **Precision Settings**: Model precision selection for VRAM calculations
- **Real-time Validation**: Form validation with immediate feedback
- **Calculate Button**: Integrated action button with loading states
- **Accessibility**: Full keyboard navigation and ARIA labels

## Usage

The SimulationControls component provides the final configuration step before running VRAM calculations. It integrates with the simulation engine to provide accurate time-based VRAM usage predictions.
        `,
      },
    },
  },
  argTypes: {
    config: {
      description: 'Current simulation configuration',
      control: { type: 'object' },
    },
    onChange: {
      description: 'Callback fired when configuration changes',
      action: 'config changed',
    },
    onCalculate: {
      description: 'Callback fired when calculate button is clicked',
      action: 'calculate clicked',
    },
    isCalculating: {
      description: 'Whether calculation is in progress',
      control: { type: 'boolean' },
    },
    disabled: {
      description: 'Whether the controls are disabled',
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper for controlled component
const InteractiveControls = (args: {
  config: SimulationConfig
  disabled?: boolean
  isCalculating?: boolean
}) => {
  const [config, setConfig] = useState<SimulationConfig>(args.config)
  const [isCalculating, setIsCalculating] = useState(args.isCalculating || false)

  const handleConfigChange = (newConfig: SimulationConfig) => {
    setConfig(newConfig)
    console.log('Config changed:', newConfig)
  }

  const handleCalculate = () => {
    setIsCalculating(true)
    console.log('Calculate clicked')

    // Simulate calculation delay
    setTimeout(() => {
      setIsCalculating(false)
    }, 3000)
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <SimulationControls
        {...args}
        config={config}
        onChange={handleConfigChange}
        onCalculate={handleCalculate}
        isCalculating={isCalculating}
      />
    </Box>
  )
}

/**
 * Default configuration for typical use cases
 */
export const Default: Story = {
  render: InteractiveControls,
  args: {
    config: defaultConfig,
    disabled: false,
  },
}

/**
 * Long-running simulation configuration
 */
export const LongSimulation: Story = {
  render: InteractiveControls,
  args: {
    config: longSimulationConfig,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Configuration for long-running simulations over 24 hours with higher user load.',
      },
    },
  },
}

/**
 * Heavy load testing scenario
 */
export const HeavyLoad: Story = {
  render: InteractiveControls,
  args: {
    config: heavyLoadConfig,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'High-intensity load testing with burst request patterns and many concurrent users.',
      },
    },
  },
}

/**
 * Form with validation errors
 */
export const WithValidationErrors: Story = {
  render: InteractiveControls,
  args: {
    config: invalidConfig,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates validation error handling with invalid input values.',
      },
    },
  },
}

/**
 * Calculation in progress
 */
export const Calculating: Story = {
  render: InteractiveControls,
  args: {
    config: defaultConfig,
    isCalculating: true,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading state during VRAM calculation processing.',
      },
    },
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: InteractiveControls,
  args: {
    config: defaultConfig,
    disabled: true,
    isCalculating: false,
  },
}

/**
 * Quick test configuration
 */
export const QuickTest: Story = {
  render: InteractiveControls,
  args: {
    config: createSimulationConfig({
      duration: 5,
      timeUnit: TimeUnit.MINUTES,
      totalUsers: 3,
      maxThinkTime: 60,
      thinkTimeDistribution: ThinkTimeDistribution.UNIFORM,
      userBehaviorPattern: UserBehaviorPattern.INTERACTIVE_CHAT,
      requestPattern: RequestPattern.UNIFORM,
      granularity: 30,
      durationSeconds: 300,
    }),
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal configuration for quick testing and validation.',
      },
    },
  },
}

/**
 * Burst pattern testing
 */
export const BurstPattern: Story = {
  render: InteractiveControls,
  args: {
    config: createSimulationConfig({
      duration: 1,
      timeUnit: TimeUnit.HOURS,
      totalUsers: 75,
      maxThinkTime: 45,
      thinkTimeDistribution: ThinkTimeDistribution.BELL_CURVE,
      userBehaviorPattern: UserBehaviorPattern.CODE_ASSISTANCE,
      requestPattern: RequestPattern.FRONT_LOADED,
      granularity: 120,
      durationSeconds: 3600,
    }),
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Configuration for testing burst request patterns that simulate traffic spikes.',
      },
    },
  },
}

/**
 * Enterprise scale simulation
 */
export const EnterpriseScale: Story = {
  render: InteractiveControls,
  args: {
    config: createSimulationConfig({
      duration: 7,
      timeUnit: TimeUnit.DAYS,
      totalUsers: 600,
      maxThinkTime: 120,
      thinkTimeDistribution: ThinkTimeDistribution.LOGNORMAL,
      userBehaviorPattern: UserBehaviorPattern.RESEARCH_QUERIES,
      requestPattern: RequestPattern.BELL_CURVE,
      granularity: 300,
      precision: ModelPrecision.FP32,
      durationSeconds: 604800,
    }),
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large-scale enterprise simulation configuration for week-long analysis.',
      },
    },
  },
}
