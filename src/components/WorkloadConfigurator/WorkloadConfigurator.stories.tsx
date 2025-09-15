import type { Meta, StoryObj } from '@storybook/react-vite'

import { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Box } from '@mui/material'
import WorkloadConfigurator from './index'
import { Workload, WorkloadSlot, Profile, WorkloadCategory } from '../../types'
import { ValidationError } from '../../types/contexts'

// Sample workloads
const sampleWorkloads: Workload[] = [
  {
    id: 'chat-simple',
    name: 'Simple Chat',
    description: 'Basic conversational interactions with short responses',
    inputTokens: 150,
    outputTokens: 100,
    category: WorkloadCategory.CHAT,
    icon: '💬',
    examples: ['How are you today?', "What's the weather like?"],
  },
  {
    id: 'chat-detailed',
    name: 'Detailed Chat',
    description: 'In-depth conversations requiring longer explanations',
    inputTokens: 300,
    outputTokens: 500,
    category: WorkloadCategory.CHAT,
    icon: '💬',
    examples: ['Explain quantum physics', 'Help me plan a trip'],
  },
  {
    id: 'rag-simple',
    name: 'Simple RAG',
    description: 'Basic retrieval-augmented generation queries',
    inputTokens: 800,
    outputTokens: 300,
    category: WorkloadCategory.RAG,
    icon: '📚',
    examples: ['Search documents for...', 'Find information about...'],
  },
  {
    id: 'rag-complex',
    name: 'Complex RAG',
    description: 'Multi-document analysis with complex reasoning',
    inputTokens: 2000,
    outputTokens: 800,
    category: WorkloadCategory.RAG,
    icon: '📚',
    examples: ['Analyze these reports and summarize', 'Compare multiple sources'],
  },
  {
    id: 'coding-simple',
    name: 'Simple Coding',
    description: 'Basic code generation and explanation',
    inputTokens: 200,
    outputTokens: 300,
    category: WorkloadCategory.CODING,
    icon: '💻',
    examples: ['Write a function to...', 'Explain this code snippet'],
  },
  {
    id: 'coding-complex',
    name: 'Complex Coding',
    description: 'Large codebase analysis and refactoring',
    inputTokens: 1500,
    outputTokens: 1000,
    category: WorkloadCategory.CODING,
    icon: '💻',
    examples: ['Refactor this entire module', 'Debug this complex system'],
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Story writing and creative content generation',
    inputTokens: 500,
    outputTokens: 1200,
    category: WorkloadCategory.CREATIVE,
    icon: '✍️',
    examples: ['Write a short story about...', 'Create a poem on...'],
  },
  {
    id: 'analysis-data',
    name: 'Data Analysis',
    description: 'Statistical analysis and data interpretation',
    inputTokens: 1000,
    outputTokens: 600,
    category: WorkloadCategory.ANALYSIS,
    icon: '📊',
    examples: ['Analyze this dataset', 'Interpret these statistics'],
  },
]

// Sample profiles
const sampleProfiles: Profile[] = [
  {
    id: 'chat-focused',
    name: 'Chat Focused',
    description: 'Optimized for conversational AI applications',
    workloadDistribution: [
      { workloadId: sampleWorkloads[0].id, percentage: 60 },
      { workloadId: sampleWorkloads[1].id, percentage: 40 },
    ],
    isBuiltIn: true,
    tags: ['chat', 'conversation'],
  },
  {
    id: 'balanced',
    name: 'Balanced Workload',
    description: 'Even distribution across multiple use cases',
    workloadDistribution: [
      { workloadId: sampleWorkloads[0].id, percentage: 25 },
      { workloadId: sampleWorkloads[2].id, percentage: 25 },
      { workloadId: sampleWorkloads[4].id, percentage: 25 },
      { workloadId: sampleWorkloads[6].id, percentage: 25 },
    ],
    isBuiltIn: true,
    tags: ['balanced', 'mixed'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Suite',
    description: 'Heavy RAG and analysis workloads for enterprise use',
    workloadDistribution: [
      { workloadId: sampleWorkloads[3].id, percentage: 40 },
      { workloadId: sampleWorkloads[5].id, percentage: 30 },
      { workloadId: sampleWorkloads[7].id, percentage: 20 },
      { workloadId: sampleWorkloads[1].id, percentage: 10 },
    ],
    isBuiltIn: true,
    tags: ['enterprise', 'rag', 'analysis'],
  },
]

const meta: Meta<typeof WorkloadConfigurator> = {
  title: 'Components/WorkloadConfigurator',
  component: WorkloadConfigurator,
  decorators: [
    Story => (
      <DndProvider backend={HTML5Backend}>
        <Box sx={{ width: '100%', maxWidth: 1200, margin: '0 auto', p: 2 }}>
          <Story />
        </Box>
      </DndProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# WorkloadConfigurator Component

An advanced drag-and-drop interface for configuring LLM workload distributions with real-time validation.

## Features

- **Drag & Drop**: Intuitive workload assignment using React DnD
- **5 Workload Slots**: Configure up to 5 different workload types
- **Real-time Validation**: Percentage constraints with visual feedback
- **Profile System**: Save and load predefined workload configurations
- **Accessibility**: Full keyboard navigation fallback for drag operations
- **Category Organization**: Workloads grouped by type (Chat, RAG, Coding, etc.)

## Usage

The WorkloadConfigurator is the primary interface for users to define their LLM usage patterns. It combines with the PercentageSlider components to create a comprehensive workload management system.
        `,
      },
    },
  },
  argTypes: {
    workloads: {
      description: 'Available workloads to choose from',
      control: { type: 'object' },
    },
    workloadSlots: {
      description: 'Current workload slot configuration',
      control: { type: 'object' },
    },
    onSlotsChange: {
      description: 'Callback fired when workload slots change',
      action: 'slots changed',
    },
    onProfileSelect: {
      description: 'Callback fired when a profile is selected',
      action: 'profile selected',
    },
    profiles: {
      description: 'Available workload profiles',
      control: { type: 'object' },
    },
    disabled: {
      description: 'Whether the configurator is disabled',
      control: { type: 'boolean' },
    },
    errors: {
      description: 'Validation errors to display',
      control: { type: 'object' },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

// Interactive wrapper for controlled component
const InteractiveConfigurator = (args: {
  workloads: Workload[]
  workloadSlots: WorkloadSlot[]
  profiles: Profile[]
  disabled?: boolean
  errors: ValidationError[]
}) => {
  const [workloadSlots, setWorkloadSlots] = useState<WorkloadSlot[]>(args.workloadSlots)

  const handleSlotsChange = (newSlots: WorkloadSlot[]) => {
    setWorkloadSlots(newSlots)
    console.log('Slots changed:', newSlots)
  }

  const handleProfileSelect = (profile: Profile) => {
    // Convert profile workload distribution to workload slots
    const newSlots: WorkloadSlot[] = Array.from({ length: 5 }, (_, index) => {
      const distribution = profile.workloadDistribution[index]
      if (distribution) {
        const workload = args.workloads.find((w: Workload) => w.id === distribution.workloadId)
        return {
          id: `slot-${index + 1}`,
          workload: workload || null,
          percentage: distribution.percentage,
          isActive: workload !== null,
          order: index + 1,
        }
      }
      return {
        id: `slot-${index + 1}`,
        workload: null,
        percentage: 0,
        isActive: false,
        order: index + 1,
      }
    })
    setWorkloadSlots(newSlots)
    console.log('Profile selected:', profile)
  }

  return (
    <WorkloadConfigurator
      {...args}
      workloadSlots={workloadSlots}
      onSlotsChange={handleSlotsChange}
      onProfileSelect={handleProfileSelect}
    />
  )
}

/**
 * Default empty state
 */
export const Default: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: null, percentage: 0, isActive: false, order: 1 },
      { id: 'slot-2', workload: null, percentage: 0, isActive: false, order: 2 },
      { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: false,
    errors: [],
  },
}

/**
 * Partially configured workloads
 */
export const PartiallyConfigured: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 40, isActive: true, order: 1 },
      { id: 'slot-2', workload: sampleWorkloads[2], percentage: 35, isActive: true, order: 2 },
      { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: false,
    errors: [],
  },
}

/**
 * Fully configured workloads
 */
export const FullyConfigured: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 25, isActive: true, order: 1 },
      { id: 'slot-2', workload: sampleWorkloads[2], percentage: 25, isActive: true, order: 2 },
      { id: 'slot-3', workload: sampleWorkloads[4], percentage: 25, isActive: true, order: 3 },
      { id: 'slot-4', workload: sampleWorkloads[6], percentage: 25, isActive: true, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: false,
    errors: [],
  },
}

/**
 * Over-allocated (validation error)
 */
export const WithValidationErrors: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 40, isActive: true, order: 1 },
      { id: 'slot-2', workload: sampleWorkloads[2], percentage: 35, isActive: true, order: 2 },
      { id: 'slot-3', workload: sampleWorkloads[4], percentage: 30, isActive: true, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: false,
    errors: [
      {
        field: 'workloadSlots',
        message: 'Total percentage allocation exceeds 100% (currently 105%)',
        severity: 'error',
      },
    ],
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 50, isActive: true, order: 1 },
      { id: 'slot-2', workload: sampleWorkloads[2], percentage: 50, isActive: true, order: 2 },
      { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: true,
    errors: [],
  },
}

/**
 * Limited workload options
 */
export const LimitedWorkloads: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads.slice(0, 3), // Only first 3 workloads
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 60, isActive: true, order: 1 },
      { id: 'slot-2', workload: null, percentage: 0, isActive: false, order: 2 },
      { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: sampleProfiles.slice(0, 1), // Only one profile
    disabled: false,
    errors: [],
  },
}

/**
 * No profiles available
 */
export const NoProfiles: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: null, percentage: 0, isActive: false, order: 1 },
      { id: 'slot-2', workload: null, percentage: 0, isActive: false, order: 2 },
      { id: 'slot-3', workload: null, percentage: 0, isActive: false, order: 3 },
      { id: 'slot-4', workload: null, percentage: 0, isActive: false, order: 4 },
      { id: 'slot-5', workload: null, percentage: 0, isActive: false, order: 5 },
    ],
    profiles: [], // No profiles
    disabled: false,
    errors: [],
  },
}

/**
 * All slots filled
 */
export const AllSlotsFilled: Story = {
  render: InteractiveConfigurator,
  args: {
    workloads: sampleWorkloads,
    workloadSlots: [
      { id: 'slot-1', workload: sampleWorkloads[0], percentage: 20, isActive: true, order: 1 },
      { id: 'slot-2', workload: sampleWorkloads[2], percentage: 20, isActive: true, order: 2 },
      { id: 'slot-3', workload: sampleWorkloads[4], percentage: 20, isActive: true, order: 3 },
      { id: 'slot-4', workload: sampleWorkloads[6], percentage: 20, isActive: true, order: 4 },
      { id: 'slot-5', workload: sampleWorkloads[7], percentage: 20, isActive: true, order: 5 },
    ],
    profiles: sampleProfiles,
    disabled: false,
    errors: [],
  },
}
