import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

import WorkloadConfigurator from '../../../src/components/WorkloadConfigurator'
import { Workload, WorkloadSlot, WorkloadCategory, ValidationError } from '../../../src/types'
// import { DEFAULT_WORKLOADS } from '../../../src/data/workloads'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Create a test theme
const testTheme = createTheme()

// Mock data for testing
const mockWorkloads: Workload[] = [
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
    id: 'rag-search',
    name: 'Document Q&A',
    description: 'Search and answer questions from document knowledge base',
    inputTokens: 400,
    outputTokens: 250,
    category: WorkloadCategory.RAG,
    icon: '🔍',
    examples: ['What does the report say about...?', 'Find information on...'],
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    description: 'Generate code snippets and programming solutions',
    inputTokens: 200,
    outputTokens: 400,
    category: WorkloadCategory.CODING,
    icon: '💻',
    examples: ['Write a function to...', 'Create a script that...'],
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    description: 'Generate creative content like stories and articles',
    inputTokens: 100,
    outputTokens: 600,
    category: WorkloadCategory.CREATIVE,
    icon: '✍️',
    examples: ['Write a short story about...', 'Create an article on...'],
  },
]

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

// Test wrapper component with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    <DndProvider backend={HTML5Backend}>{children}</DndProvider>
  </ThemeProvider>
)

describe('WorkloadConfigurator Component', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockOnSlotsChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    mockOnSlotsChange = vi.fn()
  })

  describe('Component Rendering and Initial State', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should render main title
      expect(screen.getByText('Workload Configuration')).toBeInTheDocument()

      // Should render workload slots section
      expect(screen.getByText('Workload Slots')).toBeInTheDocument()

      // Should render workload palette section
      expect(screen.getByText('Available Workloads')).toBeInTheDocument()
    })

    it('should render all workload slots', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should display all 5 slots
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Slot ${i}`)).toBeInTheDocument()
        expect(screen.getByLabelText(`Workload slot ${i}: Empty`)).toBeInTheDocument()
      }
    })

    it('should render workload palette organized by categories', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should display workload cards
      expect(screen.getByText('Simple Chat')).toBeInTheDocument()
      expect(screen.getByText('Document Q&A')).toBeInTheDocument()
      expect(screen.getByText('Code Generation')).toBeInTheDocument()
      expect(screen.getByText('Creative Writing')).toBeInTheDocument()

      // Should display category labels
      expect(screen.getByText('Chat & Conversation')).toBeInTheDocument()
      expect(screen.getByText('Retrieval Augmented Generation')).toBeInTheDocument()
    })

    it('should display progress tracking correctly', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should show total allocation and remaining percentage
      expect(screen.getByText('Total Allocation: 0%')).toBeInTheDocument()
      expect(screen.getByText('Remaining: 100%')).toBeInTheDocument()

      // Should show progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should display instructions', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      expect(screen.getByText(/Instructions:/)).toBeInTheDocument()
      expect(screen.getByText(/Drag workloads from the palette to the slots/)).toBeInTheDocument()
    })
  })

  describe('Keyboard Mode Functionality', () => {
    it('should toggle keyboard mode', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      expect(keyboardToggle).not.toBeChecked()

      await user.click(keyboardToggle)
      expect(keyboardToggle).toBeChecked()

      // Should display keyboard mode instructions
      expect(
        screen.getByText(/Keyboard mode: Use Tab to navigate, Enter\/Space to add workloads/)
      ).toBeInTheDocument()
    })

    it('should support keyboard workload selection in keyboard mode', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Enable keyboard mode
      const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      await user.click(keyboardToggle)

      // Focus on a workload card and press Enter
      const workloadCard = screen.getByLabelText(/Workload: Simple Chat/)
      workloadCard.focus()
      await user.keyboard('[Enter]')

      // Should call onSlotsChange with workload added to first empty slot
      expect(mockOnSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workload: mockWorkloads[0],
            isActive: true,
          }),
        ])
      )
    })

    it('should support Space key for workload selection in keyboard mode', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Enable keyboard mode
      const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      await user.click(keyboardToggle)

      // Focus on a workload card and press Space
      const workloadCard = screen.getByLabelText(/Workload: Document Q&A/)
      workloadCard.focus()
      await user.keyboard(' ')

      // Should call onSlotsChange
      expect(mockOnSlotsChange).toHaveBeenCalled()
    })
  })

  describe('Clear All Functionality', () => {
    it('should enable Clear All button when slots have workloads', () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      expect(clearAllButton).not.toBeDisabled()
    })

    it('should disable Clear All button when no active slots', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      expect(clearAllButton).toBeDisabled()
    })

    it('should clear all slots when Clear All is clicked', async () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 60 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 40 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      await user.click(clearAllButton)

      // Should call onSlotsChange with all slots cleared
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
  })

  describe('Workload Slot Management', () => {
    it('should display workload in slot when assigned', () => {
      const slotsWithWorkload = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkload}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should display workload name in slot
      expect(screen.getByText('Simple Chat')).toBeInTheDocument()
      expect(screen.getByText('Chat & Conversation')).toBeInTheDocument()

      // Should display active switch
      expect(screen.getByRole('checkbox', { name: /active in simulation/i })).toBeChecked()

      // Should display percentage slider
      expect(screen.getByLabelText('Percentage for Simple Chat')).toBeInTheDocument()
    })

    it('should handle workload removal from slot', async () => {
      const slotsWithWorkload = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkload}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const removeButton = screen.getByLabelText('Remove workload from slot 1')
      await user.click(removeButton)

      // Should call onSlotsChange with workload removed
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

    it('should handle percentage change via slider', async () => {
      const slotsWithWorkload = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkload}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const slider = screen.getByLabelText('Percentage for Simple Chat')

      // Change slider value
      fireEvent.change(slider, { target: { value: 75 } })

      // Should call onSlotsChange with updated percentage
      expect(mockOnSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            percentage: 75,
          }),
        ])
      )
    })

    it('should handle active state toggle', async () => {
      const slotsWithWorkload = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkload}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      const activeSwitch = screen.getByRole('checkbox', { name: /active in simulation/i })
      await user.click(activeSwitch)

      // Should call onSlotsChange with active state toggled
      expect(mockOnSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            isActive: false,
            percentage: 0, // Should reset percentage when inactive
          }),
        ])
      )
    })

    it('should handle slot reordering with move up button', async () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 30 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 70 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Move second slot up
      const moveUpButton = screen.getByLabelText('Move slot 2 up')
      await user.click(moveUpButton)

      // Should reorder slots
      expect(mockOnSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workload: mockWorkloads[1], // Second workload should now be first
            order: 1,
          }),
          expect.objectContaining({
            workload: mockWorkloads[0], // First workload should now be second
            order: 2,
          }),
        ])
      )
    })

    it('should handle slot reordering with move down button', async () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 30 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 70 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Move first slot down
      const moveDownButton = screen.getByLabelText('Move slot 1 down')
      await user.click(moveDownButton)

      // Should reorder slots
      expect(mockOnSlotsChange).toHaveBeenCalled()
    })

    it('should disable move buttons appropriately', () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 30 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 70 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // First slot's move up button should be disabled
      const firstMoveUpButton = screen.getByLabelText('Move slot 1 up')
      expect(firstMoveUpButton).toBeDisabled()

      // Last slot's move down button should be disabled (when slot 5 has content)
      const lastSlotWithContent = slotsWithWorkloads.findIndex(
        (slot, idx) => idx === slotsWithWorkloads.length - 1 && slot.workload
      )
      if (lastSlotWithContent !== -1) {
        const lastMoveDownButton = screen.getByLabelText(
          `Move slot ${lastSlotWithContent + 1} down`
        )
        expect(lastMoveDownButton).toBeDisabled()
      }
    })
  })

  describe('Progress and Validation', () => {
    it('should update progress display based on slot percentages', () => {
      const slotsWithWorkloads = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 30 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 45 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkloads}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should show correct total allocation
      expect(screen.getByText('Total Allocation: 75%')).toBeInTheDocument()
      expect(screen.getByText('Remaining: 25%')).toBeInTheDocument()

      // Progress bar should reflect the percentage
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '75')
    })

    it('should display validation errors when provided', () => {
      const validationErrors: ValidationError[] = [
        {
          field: 'workloadSlots',
          message: 'Total percentage must equal 100%',
          severity: 'error',
        },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
            errors={validationErrors}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Configuration Issues:')).toBeInTheDocument()
      expect(screen.getByText('Total percentage must equal 100%')).toBeInTheDocument()
    })

    it('should show success color when total equals 100%', () => {
      const perfectSlots = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 60 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 40 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={perfectSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Total Allocation: 100%')).toBeInTheDocument()
      expect(screen.getByText('Remaining: 0%')).toBeInTheDocument()

      // Progress bar should show success color (test via class or attribute)
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    })

    it('should show error color when total exceeds 100%', () => {
      const excessiveSlots = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 70 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={excessiveSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      expect(screen.getByText('Total Allocation: 120%')).toBeInTheDocument()
      expect(screen.getByText('Remaining: -20%')).toBeInTheDocument()
    })
  })

  describe('Workload Card Behavior', () => {
    it('should disable workload cards that are already in use', () => {
      const slotsWithWorkload = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 50 },
        ...mockWorkloadSlots.slice(1),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithWorkload}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // The used workload card should indicate it's already in use
      const usedWorkloadCard = screen.getByLabelText(/Workload: Simple Chat.*Already in use/)
      expect(usedWorkloadCard).toHaveAttribute('tabindex', '-1') // Should not be focusable
    })

    it('should display workload information correctly in cards', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should display workload details
      expect(screen.getByText('Simple Chat')).toBeInTheDocument()
      expect(
        screen.getByText('Basic conversational interactions with short responses')
      ).toBeInTheDocument()
      expect(screen.getByText('150→100 tokens')).toBeInTheDocument()

      // Should display category chip
      expect(screen.getByText('Chat & Conversation')).toBeInTheDocument()

      // Should display workload icon
      expect(screen.getByText('💬')).toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('should disable all interactions when disabled prop is true', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
            disabled={true}
          />
        </TestWrapper>
      )

      // Clear All button should be disabled
      const clearAllButton = screen.getByRole('button', { name: /clear all/i })
      expect(clearAllButton).toBeDisabled()

      // Workload cards should not be interactive
      const workloadCards = screen.getAllByLabelText(/Workload:/)
      workloadCards.forEach(card => {
        expect(card).toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for all interactive elements', async () => {
      const { container } = render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should have proper labels for slots
      expect(screen.getByLabelText('Workload slot 1: Empty')).toBeInTheDocument()

      // Should have proper labels for workload cards
      expect(screen.getByLabelText(/Workload: Simple Chat/)).toBeInTheDocument()
    })

    it('should support keyboard navigation through workload cards', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should be able to tab through workload cards
      const firstWorkloadCard = screen.getByLabelText(/Workload: Simple Chat/)
      firstWorkloadCard.focus()
      expect(firstWorkloadCard).toHaveFocus()

      // Tab should move to next workload card
      await user.keyboard('[Tab]')
      const nextElement = document.activeElement
      expect(nextElement).toHaveAttribute('aria-label')
    })

    it('should provide appropriate drop zone feedback', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Empty slots should show appropriate message
      expect(screen.getByText('Drag a workload here or use keyboard controls')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty workloads array gracefully', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={[]}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Should still render the component structure
      expect(screen.getByText('Workload Configuration')).toBeInTheDocument()
      expect(screen.getByText('Available Workloads')).toBeInTheDocument()
    })

    it('should handle maximum percentage constraints correctly', async () => {
      const slotsWithHighPercentage = [
        { ...mockWorkloadSlots[0], workload: mockWorkloads[0], isActive: true, percentage: 80 },
        { ...mockWorkloadSlots[1], workload: mockWorkloads[1], isActive: true, percentage: 15 },
        ...mockWorkloadSlots.slice(2),
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={slotsWithHighPercentage}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // The second slot should have a maximum value constrained by remaining percentage
      const secondSlider = screen.getByLabelText('Percentage for Document Q&A')
      expect(secondSlider).toHaveAttribute('max', '20') // 15 + 5 remaining = 20 max
    })

    it('should handle rapid user interactions without errors', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloads={mockWorkloads}
            workloadSlots={mockWorkloadSlots}
            onSlotsChange={mockOnSlotsChange}
          />
        </TestWrapper>
      )

      // Rapid interactions should not cause errors
      const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      await user.click(keyboardToggle)
      await user.click(keyboardToggle)
      await user.click(keyboardToggle)

      // Should still be functional
      expect(keyboardToggle).toBeInTheDocument()
    })
  })
})
