// VRAM Magic: WorkloadConfigurator Component Tests
// Tests for drag-and-drop workload configuration with accessibility support

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import WorkloadConfigurator from './index'
import { WorkloadSlot, Workload, WorkloadCategory } from '../../types'
import { DEFAULT_WORKLOADS } from '../../data/workloads'

// Mock react-dnd for testing
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dnd-provider">{children}</div>
  ),
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, vi.fn()],
}))

vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}))

// Test data
const mockWorkloadSlots: WorkloadSlot[] = [
  {
    id: 'slot-1',
    workload: null,
    percentage: 0,
    isActive: false,
    order: 1,
  },
  {
    id: 'slot-2',
    workload: null,
    percentage: 0,
    isActive: false,
    order: 2,
  },
  {
    id: 'slot-3',
    workload: null,
    percentage: 0,
    isActive: false,
    order: 3,
  },
  {
    id: 'slot-4',
    workload: null,
    percentage: 0,
    isActive: false,
    order: 4,
  },
  {
    id: 'slot-5',
    workload: null,
    percentage: 0,
    isActive: false,
    order: 5,
  },
]

const mockWorkload: Workload = {
  id: 'test-workload',
  name: 'Test Workload',
  description: 'A test workload for testing',
  inputTokens: 100,
  outputTokens: 50,
  category: WorkloadCategory.CHAT,
  icon: '🧪',
  examples: ['Test example'],
}

const defaultProps = {
  workloads: DEFAULT_WORKLOADS,
  workloadSlots: mockWorkloadSlots,
  onSlotsChange: vi.fn(),
  onProfileSelect: vi.fn(),
  profiles: [],
  disabled: false,
  errors: [],
}

describe('WorkloadConfigurator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with correct title', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    expect(screen.getByText('Workload Configuration')).toBeInTheDocument()
  })

  it('renders 5 workload slots', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(`Slot ${i}`)).toBeInTheDocument()
    }
  })

  it('renders available workloads palette', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    expect(screen.getByText('Available Workloads')).toBeInTheDocument()

    // Check that some default workloads are rendered
    expect(screen.getByText('Simple Chat')).toBeInTheDocument()
    expect(screen.getByText('Document Q&A')).toBeInTheDocument()
  })

  it('displays total allocation and remaining percentage', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    expect(screen.getByText('Total Allocation: 0%')).toBeInTheDocument()
    expect(screen.getByText('Remaining: 100%')).toBeInTheDocument()
  })

  it('shows progress bar for allocation', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('enables keyboard mode toggle', async () => {
    const user = userEvent.setup()
    render(<WorkloadConfigurator {...defaultProps} />)

    const keyboardModeToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
    expect(keyboardModeToggle).not.toBeChecked()

    await user.click(keyboardModeToggle)
    expect(keyboardModeToggle).toBeChecked()

    // Should show keyboard mode info alert
    expect(
      screen.getByText(
        'Keyboard mode: Use Tab to navigate, Enter/Space to add workloads to the first empty slot.'
      )
    ).toBeInTheDocument()
  })

  it('enables clear all button when slots have workloads', () => {
    const slotsWithWorkload = [
      {
        ...mockWorkloadSlots[0],
        workload: mockWorkload,
        isActive: true,
        percentage: 50,
      },
      ...mockWorkloadSlots.slice(1),
    ]

    render(<WorkloadConfigurator {...defaultProps} workloadSlots={slotsWithWorkload} />)

    const clearAllButton = screen.getByRole('button', { name: /clear all/i })
    expect(clearAllButton).not.toBeDisabled()
  })

  it('disables clear all button when no active slots', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    const clearAllButton = screen.getByRole('button', { name: /clear all/i })
    expect(clearAllButton).toBeDisabled()
  })

  it('calls onSlotsChange when clearing all slots', async () => {
    const user = userEvent.setup()
    const slotsWithWorkload = [
      {
        ...mockWorkloadSlots[0],
        workload: mockWorkload,
        isActive: true,
        percentage: 50,
      },
      ...mockWorkloadSlots.slice(1),
    ]

    const mockOnSlotsChange = vi.fn()
    render(
      <WorkloadConfigurator
        {...defaultProps}
        workloadSlots={slotsWithWorkload}
        onSlotsChange={mockOnSlotsChange}
      />
    )

    const clearAllButton = screen.getByRole('button', { name: /clear all/i })
    await user.click(clearAllButton)

    expect(mockOnSlotsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          workload: null,
          isActive: false,
          percentage: 0,
        }),
      ])
    )
  })

  it('renders workload categories correctly', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    // Check that workload categories are rendered (look for the heading elements)
    const chatCategory = screen.getByRole('heading', { name: 'Chat & Conversation' })
    expect(chatCategory).toBeInTheDocument()

    const ragCategory = screen.getByRole('heading', { name: 'Retrieval Augmented Generation' })
    expect(ragCategory).toBeInTheDocument()
  })

  it('shows instructions at the bottom', () => {
    render(<WorkloadConfigurator {...defaultProps} />)

    expect(screen.getByText(/Instructions:/)).toBeInTheDocument()
    expect(screen.getByText(/Drag workloads from the palette to the slots/)).toBeInTheDocument()
  })

  it('renders with disabled state', () => {
    render(<WorkloadConfigurator {...defaultProps} disabled={true} />)

    const clearAllButton = screen.getByRole('button', { name: /clear all/i })
    expect(clearAllButton).toBeDisabled()
  })

  it('displays validation errors when provided', () => {
    const errors = [
      {
        field: 'workloadSlots',
        message: 'Total percentage must equal 100%',
        severity: 'error' as const,
      },
    ]

    render(<WorkloadConfigurator {...defaultProps} errors={errors} />)

    expect(screen.getByText('Configuration Issues:')).toBeInTheDocument()
    expect(screen.getByText('Total percentage must equal 100%')).toBeInTheDocument()
  })
})
