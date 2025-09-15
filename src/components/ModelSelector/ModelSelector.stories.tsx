import type { Meta, StoryObj } from '@storybook/react-vite'
import { ModelSelector } from './ModelSelector'
import { Model, ModelPrecision } from '../../types'

// Sample model data for stories
const sampleModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description:
      "Meta's Llama 2 model with 7 billion parameters, optimized for chat and instruction following",
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
      tags: ['chat', 'assistant', 'open-source', 'instruction-following'],
      benchmarks: [{ name: 'MMLU', score: 45.3, unit: 'accuracy' }],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description:
      "OpenAI's efficient model optimized for chat applications with faster response times",
    parameters: 175000000000,
    precision: ModelPrecision.FP16,
    architecture: {
      layers: 96,
      hiddenSize: 12288,
      attentionHeads: 96,
      vocabularySize: 50257,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 350000,
      kvCacheCoefficient: 1.1,
      activationMultiplier: 1.3,
      overheadFactor: 1.1,
    },
    performance: [
      {
        gpuType: 'A100',
        tokensPerSecond: 120,
        batchSize: 8,
        powerConsumption: 400,
      },
    ],
    metadata: {
      releaseDate: '2023-03-01',
      organization: 'OpenAI',
      license: 'OpenAI License',
      tags: ['chat', 'assistant', 'api', 'commercial'],
      benchmarks: [{ name: 'MMLU', score: 70.0, unit: 'accuracy' }],
    },
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description:
      "Anthropic's fastest model in the Claude 3 family, optimized for speed and efficiency",
    parameters: 20000000000,
    precision: ModelPrecision.FP16,
    architecture: {
      layers: 40,
      hiddenSize: 8192,
      attentionHeads: 64,
      vocabularySize: 100000,
      maxSequenceLength: 200000,
    },
    vramRequirements: {
      baseVRAM: 40000,
      kvCacheCoefficient: 1.0,
      activationMultiplier: 1.2,
      overheadFactor: 1.05,
    },
    performance: [
      {
        gpuType: 'RTX 4090',
        tokensPerSecond: 60,
        batchSize: 2,
        powerConsumption: 350,
      },
    ],
    metadata: {
      releaseDate: '2024-03-04',
      organization: 'Anthropic',
      license: 'Anthropic License',
      tags: ['chat', 'assistant', 'fast', 'efficient'],
      benchmarks: [{ name: 'MMLU', score: 75.2, unit: 'accuracy' }],
    },
  },
]

const meta: Meta<typeof ModelSelector> = {
  title: 'Components/ModelSelector',
  component: ModelSelector,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
# ModelSelector Component

An advanced autocomplete component for selecting Large Language Models with detailed information display.

## Features

- **Search & Filter**: Type to search by model name, organization, or tags
- **Rich Preview**: Shows model parameters, precision, and performance metrics
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive**: Adapts to different screen sizes
- **Loading States**: Skeleton loading for better UX

## Usage

The ModelSelector is typically used at the beginning of the VRAM calculation workflow to allow users to select which LLM they want to analyze.
        `,
      },
    },
  },
  argTypes: {
    models: {
      description: 'Array of available models to choose from',
      control: { type: 'object' },
    },
    selectedModel: {
      description: 'Currently selected model (controlled component)',
      control: { type: 'object' },
    },
    onModelSelect: {
      description: 'Callback fired when a model is selected',
    },
    disabled: {
      description: 'Whether the selector is disabled',
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

/**
 * Default state with no model selected
 */
export const Default: Story = {
  args: {
    models: sampleModels,
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: undefined,
  },
}

/**
 * With a model already selected
 */
export const WithSelectedModel: Story = {
  args: {
    models: sampleModels,
    selectedModel: sampleModels[0], // Llama 2 7B
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: undefined,
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    models: sampleModels,
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: true,
    error: undefined,
  },
}

/**
 * With error message
 */
export const WithError: Story = {
  args: {
    models: sampleModels,
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: 'Failed to load models. Please check your connection and try again.',
  },
}

/**
 * Empty state with no models available
 */
export const EmptyState: Story = {
  args: {
    models: [],
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: undefined,
  },
}

/**
 * Loading state (shows when models are being fetched)
 */
export const LoadingState: Story = {
  args: {
    models: [], // Empty while loading
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: true,
    error: undefined,
  },
  parameters: {
    docs: {
      description: {
        story: 'This represents the loading state while models are being fetched from the server.',
      },
    },
  },
}

/**
 * Single model scenario
 */
export const SingleModel: Story = {
  args: {
    models: [sampleModels[0]], // Only Llama 2 7B
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: undefined,
  },
}

/**
 * Large dataset scenario
 */
export const LargeDataset: Story = {
  args: {
    models: [
      ...sampleModels,
      // Add more models to simulate a large dataset
      ...Array.from({ length: 10 }, (_, i) => ({
        ...sampleModels[0],
        id: `model-${i + 4}`,
        name: `Test Model ${i + 4}`,
        description: `Generated test model ${i + 4} for demonstration purposes`,
        parameters: (i + 1) * 1000000000,
      })),
    ],
    selectedModel: null,
    onModelSelect: (model: Model) => console.log('Model selected:', model),
    disabled: false,
    error: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          'This story demonstrates how the component handles a large number of models with search functionality.',
      },
    },
  },
}
