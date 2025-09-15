import type { Meta, StoryObj } from '@storybook/react-vite'

import { VRAMChart } from './VRAMChart'
import { VRAMUsagePoint } from '../../types'

// Generate sample VRAM usage data
const generateSampleData = (points: number = 50, baseVRAM: number = 13500): VRAMUsagePoint[] => {
  const data: VRAMUsagePoint[] = []
  const startTime = Date.now() - points * 60000 // Start 50 minutes ago

  for (let i = 0; i < points; i++) {
    const timestamp = startTime + i * 60000 // 1 minute intervals
    const usage = 0.3 + Math.sin(i * 0.2) * 0.4 + Math.random() * 0.2 // Simulate usage pattern
    const activeRequests = Math.floor(Math.random() * 10) + 1

    const kvCache = baseVRAM * 0.3 * usage
    const activations = baseVRAM * 0.2 * usage
    const overhead = (baseVRAM + kvCache + activations) * 0.1
    const total = baseVRAM + kvCache + activations + overhead

    data.push({
      timestamp,
      totalVRAM: total,
      breakdown: {
        baseModel: baseVRAM,
        kvCache,
        activations,
        overhead,
        total,
        workloadBreakdown: [
          {
            workloadId: 'chat',
            vramUsage: kvCache * 0.4,
            requestCount: Math.floor(Math.random() * 5) + 1,
            color: '#1976d2',
          },
          {
            workloadId: 'rag',
            vramUsage: kvCache * 0.3,
            requestCount: Math.floor(Math.random() * 3) + 1,
            color: '#2e7d32',
          },
          {
            workloadId: 'coding',
            vramUsage: kvCache * 0.3,
            requestCount: Math.floor(Math.random() * 4) + 1,
            color: '#ed6c02',
          },
        ],
      },
      activeRequests: Array.from({ length: activeRequests }, (_, index) => ({
        requestId: `req-${timestamp}-${index}`,
        workloadId: ['chat', 'rag', 'coding'][index % 3],
        startTime: timestamp - Math.random() * 30000,
        estimatedEndTime: timestamp + Math.random() * 60000,
        vramConsumption: baseVRAM * 0.1 + Math.random() * baseVRAM * 0.2,
      })),
    })
  }

  return data
}

// Sample data sets
const steadyUsageData = generateSampleData(30, 13500)
const peakUsageData = generateSampleData(20, 27000) // Higher VRAM model
const lowUsageData = generateSampleData(25, 7000) // Smaller model
const volatileUsageData = generateSampleData(40, 16000)

const meta: Meta<typeof VRAMChart> = {
  title: 'Components/VRAMChart',
  component: VRAMChart,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# VRAMChart Component

A powerful data visualization component for displaying VRAM usage over time using Recharts library.

## Features

- **Interactive Charts**: Area and bar chart options with hover tooltips
- **VRAM Breakdown**: Stacked visualization showing base model, KV cache, activations, and overhead
- **Time Series**: Real-time visualization of VRAM usage patterns
- **Accessibility**: Keyboard navigation and screen reader support
- **Responsive**: Adapts to container size with configurable height
- **Click Events**: Interactive data point selection

## Usage

The VRAMChart is the primary visualization component for displaying simulation results, showing how VRAM usage changes over time based on workload patterns and concurrent users.
        `,
      },
    },
  },
  argTypes: {
    data: {
      description: 'Array of VRAM usage points over time',
      control: { type: 'object' },
    },
    maxVRAM: {
      description: 'Maximum VRAM available (for scaling)',
      control: { type: 'number' },
    },
    chartType: {
      description: 'Type of chart visualization',
      control: { type: 'select' },
      options: ['area', 'bar'],
    },
    showTooltips: {
      description: 'Whether to show interactive tooltips',
      control: { type: 'boolean' },
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'range', min: 200, max: 800, step: 50 },
    },
    onPointClick: {
      description: 'Callback fired when a data point is clicked',
      action: 'point clicked',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default area chart with steady VRAM usage
 */
export const Default: Story = {
  args: {
    data: steadyUsageData,
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * Bar chart visualization
 */
export const BarChart: Story = {
  args: {
    data: steadyUsageData,
    maxVRAM: 24000,
    chartType: 'bar',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * High VRAM usage scenario (near capacity)
 */
export const HighUsage: Story = {
  args: {
    data: peakUsageData,
    maxVRAM: 32000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'This scenario shows VRAM usage approaching the maximum capacity, useful for identifying potential memory bottlenecks.',
      },
    },
  },
}

/**
 * Low VRAM usage (efficient scenario)
 */
export const LowUsage: Story = {
  args: {
    data: lowUsageData,
    maxVRAM: 16000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'This scenario demonstrates efficient VRAM usage with a smaller model, showing plenty of headroom for scaling.',
      },
    },
  },
}

/**
 * Volatile usage patterns
 */
export const VolatileUsage: Story = {
  args: {
    data: volatileUsageData,
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'This scenario shows highly variable VRAM usage patterns, typical of mixed workloads with different complexity levels.',
      },
    },
  },
}

/**
 * Compact chart (reduced height)
 */
export const CompactChart: Story = {
  args: {
    data: steadyUsageData,
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 250,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * Tall chart for detailed analysis
 */
export const TallChart: Story = {
  args: {
    data: steadyUsageData,
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 600,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * Chart without tooltips
 */
export const NoTooltips: Story = {
  args: {
    data: steadyUsageData,
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: false,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * Empty state (no data)
 */
export const EmptyState: Story = {
  args: {
    data: [],
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'This shows how the chart handles an empty data state, typically displayed while waiting for simulation results.',
      },
    },
  },
}

/**
 * Single data point
 */
export const SingleDataPoint: Story = {
  args: {
    data: steadyUsageData.slice(0, 1),
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
}

/**
 * Large dataset (100 points)
 */
export const LargeDataset: Story = {
  args: {
    data: generateSampleData(100, 15000),
    maxVRAM: 24000,
    chartType: 'area',
    showTooltips: true,
    height: 400,
    onPointClick: () => console.log('Action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'This demonstrates chart performance with a larger dataset, useful for longer simulation periods.',
      },
    },
  },
}
