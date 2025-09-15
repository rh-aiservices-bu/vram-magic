import type { Meta, StoryObj } from '@storybook/react-vite'

import ResultsSummary from './index'
import { SimulationResults, Model, VRAMUsagePoint, ModelPrecision } from '../../types'

// Sample model for results
const sampleModel: Model = {
  id: 'llama-2-7b',
  name: 'Llama 2 7B',
  description: "Meta's Llama 2 model with 7 billion parameters",
  parameters: 7000000000,
  precision: ModelPrecision.FP16,
  architecture: {
    layers: 32,
    hiddenSize: 4096,
    attentionHeads: 32,
    vocabularySize: 32000,
    maxSequenceLength: 4096,
  },
  vramRequirements: {
    baseVRAM: 13500,
    kvCacheCoefficient: 1.2,
    activationMultiplier: 1.5,
    overheadFactor: 1.15,
  },
  performance: [
    {
      gpuType: 'RTX 4090',
      tokensPerSecond: 45,
      batchSize: 1,
      powerConsumption: 350,
    },
  ],
  metadata: {
    releaseDate: '2023-07-18',
    organization: 'Meta',
    license: 'Llama 2 Community License',
    tags: ['chat', 'assistant'],
    benchmarks: [],
  },
}

// Generate sample usage points
const generateUsagePoints = (count: number, baseVRAM: number): VRAMUsagePoint[] => {
  const points: VRAMUsagePoint[] = []
  const startTime = Date.now() - count * 60000

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * 60000
    const usage = 0.4 + Math.sin(i * 0.1) * 0.3 + Math.random() * 0.2

    const kvCache = baseVRAM * 0.3 * usage
    const activations = baseVRAM * 0.2 * usage
    const overhead = (baseVRAM + kvCache + activations) * 0.1
    const total = baseVRAM + kvCache + activations + overhead

    points.push({
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
            vramUsage: kvCache * 0.5,
            requestCount: Math.floor(Math.random() * 5) + 1,
            color: '#1976d2',
          },
          {
            workloadId: 'rag',
            vramUsage: kvCache * 0.5,
            requestCount: Math.floor(Math.random() * 3) + 1,
            color: '#2e7d32',
          },
        ],
      },
      activeRequests: [],
    })
  }

  return points
}

// Sample simulation results
const sampleResults: SimulationResults = {
  maxVRAM: 18750,
  averageVRAM: 16200,
  usagePoints: generateUsagePoints(30, 13500),
  recommendations: [
    'RTX 4090 (24GB) - Recommended for optimal performance',
    'RTX 3090 (24GB) - Good alternative with similar capacity',
    'A100 (40GB) - Enterprise option with higher memory bandwidth',
  ],
  warnings: [
    'Peak usage approaches 78% of RTX 4090 capacity',
    'Consider load balancing for production deployment',
  ],
  calculatedAt: Date.now(),
}

const highUsageResults: SimulationResults = {
  maxVRAM: 22100,
  averageVRAM: 19800,
  usagePoints: generateUsagePoints(25, 16000),
  recommendations: [
    'A100 (40GB) - Required for this workload',
    'RTX 6000 Ada (48GB) - Professional option',
    'Consider model optimization to reduce VRAM usage',
  ],
  warnings: [
    'CRITICAL: Exceeds RTX 4090 24GB capacity',
    'Requires enterprise-grade GPU for safe operation',
    'Consider reducing concurrent users or workload complexity',
  ],
  calculatedAt: Date.now(),
}

const lowUsageResults: SimulationResults = {
  maxVRAM: 8900,
  averageVRAM: 7200,
  usagePoints: generateUsagePoints(20, 6000),
  recommendations: [
    'RTX 3080 (10GB) - Sufficient for this workload',
    'RTX 4070 (12GB) - Good headroom for scaling',
    'RTX 4080 (16GB) - Recommended for production',
  ],
  warnings: [],
  calculatedAt: Date.now(),
}

const meta: Meta<typeof ResultsSummary> = {
  title: 'Components/ResultsSummary',
  component: ResultsSummary,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# ResultsSummary Component

A comprehensive results display component showing VRAM calculation outcomes with GPU recommendations and export capabilities.

## Features

- **VRAM Statistics**: Maximum and average VRAM usage display
- **GPU Recommendations**: Curated list of suitable GPU options
- **Warning System**: Critical alerts for capacity issues
- **Export Options**: JSON, CSV, and PNG export functionality
- **Visual Indicators**: Color-coded status based on usage levels
- **Accessibility**: Screen reader friendly with proper ARIA labels

## Usage

The ResultsSummary component displays the final output of VRAM calculations, providing actionable insights for GPU selection and deployment planning.
        `,
      },
    },
  },
  argTypes: {
    results: {
      description: 'Simulation results to display (null for loading/empty state)',
      control: { type: 'object' },
    },
    model: {
      description: 'Selected model information',
      control: { type: 'object' },
    },
    onExport: {
      description: 'Callback fired when export is requested',
      action: 'export requested',
    },
    loading: {
      description: 'Whether results are being calculated',
      control: { type: 'boolean' },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

/**
 * Standard results with moderate VRAM usage
 */
export const Default: Story = {
  args: {
    results: sampleResults,
    model: sampleModel,
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
}

/**
 * High VRAM usage with warnings
 */
export const HighUsage: Story = {
  args: {
    results: highUsageResults,
    model: {
      ...sampleModel,
      name: 'Large Language Model',
      parameters: 30000000000,
    },
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Results showing high VRAM usage that exceeds common GPU capacities, with critical warnings.',
      },
    },
  },
}

/**
 * Low VRAM usage (efficient scenario)
 */
export const LowUsage: Story = {
  args: {
    results: lowUsageResults,
    model: {
      ...sampleModel,
      name: 'Efficient Model 3B',
      parameters: 3000000000,
    },
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Results showing efficient VRAM usage with plenty of headroom for scaling.',
      },
    },
  },
}

/**
 * Loading state while calculation is in progress
 */
export const Loading: Story = {
  args: {
    results: null,
    model: sampleModel,
    onExport: () => console.log('Action triggered'),
    loading: true,
  },
}

/**
 * Empty state (no results)
 */
export const EmptyState: Story = {
  args: {
    results: null,
    model: null,
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state before any calculations have been performed.',
      },
    },
  },
}

/**
 * Results without warnings
 */
export const NoWarnings: Story = {
  args: {
    results: {
      ...sampleResults,
      warnings: [],
    },
    model: sampleModel,
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
}

/**
 * Results with extensive recommendations
 */
export const ExtensiveRecommendations: Story = {
  args: {
    results: {
      ...sampleResults,
      recommendations: [
        'RTX 4090 (24GB) - Recommended for optimal performance',
        'RTX 3090 (24GB) - Good alternative with similar capacity',
        'RTX 4080 (16GB) - Budget option with acceptable performance',
        'A100 (40GB) - Enterprise option with higher memory bandwidth',
        'H100 (80GB) - Latest enterprise GPU with maximum performance',
        'RTX 6000 Ada (48GB) - Professional workstation option',
      ],
    },
    model: sampleModel,
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
}

/**
 * Minimal VRAM usage
 */
export const MinimalUsage: Story = {
  args: {
    results: {
      maxVRAM: 4200,
      averageVRAM: 3800,
      usagePoints: generateUsagePoints(15, 3000),
      recommendations: [
        'RTX 3060 (8GB) - More than sufficient',
        'GTX 1660 Ti (6GB) - Budget option that works',
        'RTX 4060 (8GB) - Modern efficient choice',
      ],
      warnings: [],
      calculatedAt: Date.now(),
    },
    model: {
      ...sampleModel,
      name: 'Tiny Model 1B',
      parameters: 1000000000,
    },
    onExport: () => console.log('Action triggered'),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Results for very small models that work well on consumer GPUs.',
      },
    },
  },
}

/**
 * Results with model but no export functionality
 */
export const NoExport: Story = {
  args: {
    results: sampleResults,
    model: sampleModel,
    loading: false,
    // onExport omitted to test optional prop
  },
}
