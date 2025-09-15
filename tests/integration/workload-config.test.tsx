import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { axe, toHaveNoViolations } from 'jest-axe'

// These imports will fail initially - this is intentional for TDD
import { WorkloadConfigurator, PercentageSlider } from '@/components'
import { AppProvider } from '@/contexts/AppContext'
import { Workload, WorkloadSlot as WorkloadSlotType } from '@/types'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock workload data for testing
const mockWorkloads: Workload[] = [
  {
    id: 'chat-basic',
    name: 'Basic Chat',
    inputTokens: 100,
    outputTokens: 50,
    category: 'chat',
    description: 'Simple conversational interactions',
  },
  {
    id: 'rag-search',
    name: 'RAG Search',
    inputTokens: 500,
    outputTokens: 200,
    category: 'rag',
    description: 'Retrieval-augmented generation queries',
  },
  {
    id: 'code-gen',
    name: 'Code Generation',
    inputTokens: 200,
    outputTokens: 300,
    category: 'coding',
    description: 'Programming assistance and code generation',
  },
  {
    id: 'creative-writing',
    name: 'Creative Writing',
    inputTokens: 150,
    outputTokens: 400,
    category: 'creative',
    description: 'Story and content creation',
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    inputTokens: 800,
    outputTokens: 600,
    category: 'analysis',
    description: 'Complex data processing and insights',
  },
]

const mockWorkloadSlots: WorkloadSlotType[] = [
  { workload: null, percentage: 0, isActive: true },
  { workload: null, percentage: 0, isActive: true },
  { workload: null, percentage: 0, isActive: true },
  { workload: null, percentage: 0, isActive: true },
  { workload: null, percentage: 0, isActive: true },
]

// Mock drag and drop events
interface MockDataTransfer {
  getData: () => string
  setData: (type: string, data: string) => void
}

const mockDragEvent = (dataTransfer: MockDataTransfer) => ({
  dataTransfer: {
    getData: vi.fn(() => dataTransfer.getData()),
    setData: vi.fn((_type: string, _data: string) => dataTransfer.setData(_type, _data)),
    clearData: vi.fn(),
    effectAllowed: 'move',
    dropEffect: 'move',
    files: [],
    items: [],
    types: [],
  },
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
})

// Test wrapper component with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    <AppProvider>{children}</AppProvider>
  </DndProvider>
)

describe('Workload Configuration Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockOnWorkloadSlotsChange: ReturnType<typeof vi.fn>
  let mockOnValidationChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    mockOnWorkloadSlotsChange = vi.fn()
    mockOnValidationChange = vi.fn()
  })

  describe('Component Rendering and Initial State', () => {
    it('should render WorkloadConfigurator with all 5 slots', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should display all 5 workload slots
      const slots = screen.getAllByTestId(/workload-slot-/)
      expect(slots).toHaveLength(5)

      // Should display remaining percentage (100% initially)
      expect(screen.getByText('Remaining: 100%')).toBeInTheDocument()

      // Should display total percentage validation
      expect(screen.getByTestId('total-percentage-display')).toHaveTextContent('0%')
    })

    it('should render available workloads in the workload library', () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should display all available workloads
      mockWorkloads.forEach(workload => {
        expect(screen.getByText(workload.name)).toBeInTheDocument()
        expect(screen.getByText(workload.description)).toBeInTheDocument()
      })
    })

    it('should have proper ARIA labels and accessibility structure', async () => {
      const { container } = render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should have proper ARIA labels
      expect(screen.getByLabelText('Workload configuration area')).toBeInTheDocument()
      expect(screen.getByLabelText('Available workloads library')).toBeInTheDocument()
      expect(screen.getByLabelText('Workload slots configuration')).toBeInTheDocument()
    })
  })

  describe('Drag and Drop Functionality', () => {
    it('should handle dragging workload from library to slot', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const chatWorkload = screen.getByTestId('workload-item-chat-basic')
      const firstSlot = screen.getByTestId('workload-slot-0')

      // Simulate drag start
      const dragData = { getData: () => 'chat-basic', setData: () => {} }
      fireEvent.dragStart(chatWorkload, mockDragEvent(dragData))

      // Simulate drag over slot
      fireEvent.dragOver(firstSlot, mockDragEvent(dragData))

      // Simulate drop
      fireEvent.drop(firstSlot, mockDragEvent(dragData))

      // Should call onWorkloadSlotsChange with updated slots
      await waitFor(() => {
        expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              workload: expect.objectContaining({ id: 'chat-basic' }),
              percentage: 0,
              isActive: true,
            }),
          ])
        )
      })
    })

    it('should handle dragging workload between slots', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 50, isActive: true },
        { workload: mockWorkloads[1], percentage: 50, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const firstSlot = screen.getByTestId('workload-slot-0')
      const thirdSlot = screen.getByTestId('workload-slot-2')

      // Simulate dragging from first slot to third slot
      const dragData = { getData: () => '0', setData: () => {} }
      fireEvent.dragStart(firstSlot, mockDragEvent(dragData))
      fireEvent.dragOver(thirdSlot, mockDragEvent(dragData))
      fireEvent.drop(thirdSlot, mockDragEvent(dragData))

      // Should reorder the workloads
      await waitFor(() => {
        expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ workload: null }),
            expect.objectContaining({ workload: mockWorkloads[1] }),
            expect.objectContaining({ workload: mockWorkloads[0] }),
          ])
        )
      })
    })

    it('should provide visual feedback during drag operations', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const chatWorkload = screen.getByTestId('workload-item-chat-basic')
      const firstSlot = screen.getByTestId('workload-slot-0')

      // Start dragging
      const dragData = { getData: () => 'chat-basic', setData: () => {} }
      fireEvent.dragStart(chatWorkload, mockDragEvent(dragData))

      // Should show drag feedback
      expect(chatWorkload).toHaveClass('dragging')

      // Drag over slot
      fireEvent.dragOver(firstSlot, mockDragEvent(dragData))

      // Should show drop zone highlight
      expect(firstSlot).toHaveClass('drag-over')

      // End drag
      fireEvent.dragEnd(chatWorkload, mockDragEvent(dragData))

      // Should remove drag feedback
      expect(chatWorkload).not.toHaveClass('dragging')
      expect(firstSlot).not.toHaveClass('drag-over')
    })
  })

  describe('Keyboard Navigation and Accessibility', () => {
    it('should support keyboard navigation for workload selection', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Focus on first workload
      const firstWorkload = screen.getByTestId('workload-item-chat-basic')
      firstWorkload.focus()

      // Navigate with arrow keys
      await user.keyboard('[ArrowDown]')
      expect(screen.getByTestId('workload-item-rag-search')).toHaveFocus()

      await user.keyboard('[ArrowDown]')
      expect(screen.getByTestId('workload-item-code-gen')).toHaveFocus()

      await user.keyboard('[ArrowUp]')
      expect(screen.getByTestId('workload-item-rag-search')).toHaveFocus()
    })

    it('should support keyboard shortcuts for slot assignment', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Focus on a workload
      const chatWorkload = screen.getByTestId('workload-item-chat-basic')
      chatWorkload.focus()

      // Press Enter to show slot selection menu
      await user.keyboard('[Enter]')
      expect(screen.getByRole('menu', { name: 'Select slot for workload' })).toBeVisible()

      // Select first slot with keyboard
      await user.keyboard('[ArrowDown]')
      await user.keyboard('[Enter]')

      // Should assign workload to slot
      await waitFor(() => {
        expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              workload: expect.objectContaining({ id: 'chat-basic' }),
            }),
          ])
        )
      })
    })

    it('should support keyboard navigation between slots', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 30, isActive: true },
        { workload: mockWorkloads[1], percentage: 40, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Focus on first slot
      const firstSlot = screen.getByTestId('workload-slot-0')
      firstSlot.focus()

      // Navigate between slots with Tab
      await user.keyboard('[Tab]')
      expect(screen.getByTestId('percentage-slider-0')).toHaveFocus()

      await user.keyboard('[Tab]')
      expect(screen.getByTestId('workload-slot-1')).toHaveFocus()

      // Navigate with arrow keys within slot configuration
      await user.keyboard('[ArrowRight]')
      expect(screen.getByTestId('percentage-slider-1')).toHaveFocus()
    })

    it('should announce changes to screen readers', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should have live region for announcements
      expect(
        screen.getByRole('status', { name: 'Workload configuration status' })
      ).toBeInTheDocument()

      // Simulate workload assignment
      const firstSlot = screen.getByTestId('workload-slot-0')

      fireEvent.drop(firstSlot, mockDragEvent({ getData: () => 'chat-basic', setData: () => {} }))

      // Should announce the change
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(
          'Basic Chat workload assigned to slot 1'
        )
      })
    })
  })

  describe('Percentage Slider Validation', () => {
    it('should render percentage sliders for active slots', () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 50, isActive: true },
        { workload: mockWorkloads[1], percentage: 30, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should display percentage sliders for slots with workloads
      expect(screen.getByTestId('percentage-slider-0')).toBeInTheDocument()
      expect(screen.getByTestId('percentage-slider-1')).toBeInTheDocument()

      // Should display current percentages
      expect(screen.getByDisplayValue('50')).toBeInTheDocument()
      expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    })

    it('should update percentage values with slider interaction', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 50, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <PercentageSlider
            slotIndex={0}
            value={50}
            max={100}
            disabled={false}
            onPercentageChange={(index, value) => {
              const newSlots = [...slotsWithWorkloads]
              newSlots[index].percentage = value
              mockOnWorkloadSlotsChange(newSlots)
            }}
          />
        </TestWrapper>
      )

      const slider = screen.getByTestId('percentage-slider-0')

      // Change slider value
      fireEvent.change(slider, { target: { value: '75' } })

      // Should call update function
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ percentage: 75 })])
      )
    })

    it('should validate that total percentage equals 100%', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 60, isActive: true },
        { workload: mockWorkloads[1], percentage: 30, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should show validation error for incorrect total
      expect(screen.getByTestId('total-percentage-display')).toHaveTextContent('90%')
      expect(screen.getByText('Total must equal 100%')).toBeInTheDocument()
      expect(screen.getByTestId('validation-error')).toHaveClass('error')

      // Should call validation change with error state
      expect(mockOnValidationChange).toHaveBeenCalledWith({
        isValid: false,
        errors: ['Total percentage must equal 100%. Current total: 90%'],
      })
    })

    it('should show remaining percentage in real-time', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 40, isActive: true },
        { workload: mockWorkloads[1], percentage: 35, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Should show remaining percentage
      expect(screen.getByText('Remaining: 25%')).toBeInTheDocument()

      // Should show visual progress bar
      const progressBar = screen.getByTestId('percentage-progress-bar')
      expect(progressBar).toHaveAttribute('value', '75')
      expect(progressBar).toHaveAttribute('max', '100')
    })

    it('should prevent percentage values exceeding 100% total', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 80, isActive: true },
        { workload: mockWorkloads[1], percentage: 15, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const secondSlider = screen.getByTestId('percentage-slider-1')

      // Try to set value that would exceed 100%
      fireEvent.change(secondSlider, { target: { value: '30' } })

      // Should be clamped to maximum allowed (5% remaining)
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ percentage: 80 }),
          expect.objectContaining({ percentage: 20 }), // Clamped to max allowed
        ])
      )
    })

    it('should support keyboard input for precise percentage values', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 33, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <PercentageSlider
            slotIndex={0}
            value={33}
            max={100}
            disabled={false}
            onPercentageChange={(index, value) => {
              const newSlots = [...slotsWithWorkloads]
              newSlots[index].percentage = value
              mockOnWorkloadSlotsChange(newSlots)
            }}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('percentage-input-0')

      // Clear and type new value
      await user.clear(input)
      await user.type(input, '42')

      // Should update percentage
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ percentage: 42 })])
      )
    })
  })

  describe('Workload Removal and Slot Management', () => {
    it('should support removing workloads from slots', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 50, isActive: true },
        { workload: mockWorkloads[1], percentage: 50, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const removeButton = screen.getByTestId('remove-workload-0')

      // Click remove button
      await user.click(removeButton)

      // Should remove workload and reset percentage
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workload: null,
            percentage: 0,
          }),
          expect.objectContaining({
            workload: mockWorkloads[1],
            percentage: 50,
          }),
        ])
      )
    })

    it('should support keyboard shortcut for workload removal', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 50, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      const firstSlot = screen.getByTestId('workload-slot-0')
      firstSlot.focus()

      // Press Delete key
      await user.keyboard('[Delete]')

      // Should remove workload
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workload: null,
            percentage: 0,
          }),
        ])
      )
    })

    it('should redistribute percentages when workload is removed', async () => {
      const slotsWithWorkloads = [
        { workload: mockWorkloads[0], percentage: 40, isActive: true },
        { workload: mockWorkloads[1], percentage: 30, isActive: true },
        { workload: mockWorkloads[2], percentage: 30, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={slotsWithWorkloads}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
            redistributeOnRemoval={true}
          />
        </TestWrapper>
      )

      const removeButton = screen.getByTestId('remove-workload-1')
      await user.click(removeButton)

      // Should redistribute the 30% among remaining workloads
      expect(mockOnWorkloadSlotsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workload: mockWorkloads[0],
            percentage: 55, // 40 + 15 (half of redistributed 30%)
          }),
          expect.objectContaining({
            workload: null,
            percentage: 0,
          }),
          expect.objectContaining({
            workload: mockWorkloads[2],
            percentage: 45, // 30 + 15 (half of redistributed 30%)
          }),
        ])
      )
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should complete full workload configuration workflow', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Step 1: Drag first workload to slot 1
      const firstSlot = screen.getByTestId('workload-slot-0')
      fireEvent.drop(firstSlot, mockDragEvent({ getData: () => 'chat-basic', setData: () => {} }))

      await waitFor(() => {
        expect(mockOnWorkloadSlotsChange).toHaveBeenCalled()
      })

      // Step 2: Drag second workload to slot 2
      const secondSlot = screen.getByTestId('workload-slot-1')
      fireEvent.drop(secondSlot, mockDragEvent({ getData: () => 'rag-search', setData: () => {} }))

      // Step 3: Set percentages
      const firstSlider = screen.getByTestId('percentage-slider-0')
      const secondSlider = screen.getByTestId('percentage-slider-1')

      fireEvent.change(firstSlider, { target: { value: '70' } })
      fireEvent.change(secondSlider, { target: { value: '30' } })

      // Step 4: Verify validation passes
      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: true,
          errors: [],
        })
      })

      // Should show success state
      expect(screen.getByTestId('total-percentage-display')).toHaveTextContent('100%')
      expect(screen.getByText('Configuration valid')).toBeInTheDocument()
      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument()
    })

    it('should maintain accessibility throughout complete workflow', async () => {
      const { container } = render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Initial accessibility check
      let results = await axe(container)
      expect(results).toHaveNoViolations()

      // Add workloads via keyboard
      const chatWorkload = screen.getByTestId('workload-item-chat-basic')
      chatWorkload.focus()
      await user.keyboard('[Enter]') // Open slot selection
      await user.keyboard('[ArrowDown]') // Select first slot
      await user.keyboard('[Enter]') // Confirm

      // Check accessibility after workload assignment
      results = await axe(container)
      expect(results).toHaveNoViolations()

      // Configure percentages via keyboard
      const percentageInput = screen.getByTestId('percentage-input-0')
      percentageInput.focus()
      await user.clear(percentageInput)
      await user.type(percentageInput, '100')

      // Final accessibility check
      results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle error states gracefully', async () => {
      render(
        <TestWrapper>
          <WorkloadConfigurator
            workloadSlots={mockWorkloadSlots}
            availableWorkloads={mockWorkloads}
            onWorkloadSlotsChange={mockOnWorkloadSlotsChange}
            onValidationChange={mockOnValidationChange}
          />
        </TestWrapper>
      )

      // Create invalid configuration (total > 100%)
      const slotsWithInvalidTotal = [
        { workload: mockWorkloads[0], percentage: 60, isActive: true },
        { workload: mockWorkloads[1], percentage: 50, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
        { workload: null, percentage: 0, isActive: true },
      ]

      // Simulate updating with invalid configuration
      mockOnWorkloadSlotsChange(slotsWithInvalidTotal)

      // Should show error state
      expect(mockOnValidationChange).toHaveBeenCalledWith({
        isValid: false,
        errors: ['Total percentage exceeds 100%. Current total: 110%'],
      })

      // Should display error message
      expect(screen.getByText('Total exceeds 100%')).toBeInTheDocument()
      expect(screen.getByTestId('validation-error')).toHaveClass('error')

      // Should disable calculation button
      expect(screen.getByTestId('calculate-button')).toBeDisabled()
    })
  })
})
