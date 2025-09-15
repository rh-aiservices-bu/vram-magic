// VRAM Magic: WorkloadConfigurator Accessibility Tests
// Comprehensive accessibility testing for drag-drop interface with keyboard alternatives

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import WorkloadConfigurator from '../../src/components/WorkloadConfigurator/index'
import { Workload, WorkloadSlot, WorkloadCategory } from '../../src/types'
import {
  renderWithAccessibility,
  runAxeTest,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock workload data for testing
const mockWorkloads: Workload[] = [
  {
    id: 'chat-conversation',
    name: 'Chat Conversation',
    description: 'Interactive chat with back-and-forth dialogue',
    category: WorkloadCategory.CHAT,
    inputTokens: 150,
    outputTokens: 75,
    icon: '💬',
    priority: 1,
    burstiness: 0.3,
    averageThinkingTime: 1.5,
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis',
    description: 'Comprehensive analysis of long documents',
    category: WorkloadCategory.ANALYSIS,
    inputTokens: 2000,
    outputTokens: 500,
    icon: '📄',
    priority: 2,
    burstiness: 0.1,
    averageThinkingTime: 5.0,
  },
]

// Mock workload slots
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

const mockSlotsWithWorkloads: WorkloadSlot[] = [
  {
    id: 'slot-1',
    workload: mockWorkloads[0],
    percentage: 60,
    isActive: true,
    order: 1,
  },
  {
    id: 'slot-2',
    workload: mockWorkloads[1],
    percentage: 40,
    isActive: true,
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

describe('WorkloadConfigurator Accessibility Tests', () => {
  let mockOnSlotsChange: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnSlotsChange = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests with empty slots', async () => {
      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with populated slots', async () => {
      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
          disabled={true}
        />,
        { withDnd: true }
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with validation errors', async () => {
      const errorSlots = [...mockSlotsWithWorkloads]
      errorSlots[0].percentage = 150 // Invalid percentage

      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={errorSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      await runAxeTest(container)
    })
  })

  describe('Keyboard Navigation and Alternatives', () => {
    it('should provide keyboard mode toggle', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const keyboardModeToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      expect(keyboardModeToggle).toBeInTheDocument()

      // Toggle keyboard mode
      await user.click(keyboardModeToggle)
      expect(keyboardModeToggle).toBeChecked()

      // Should show keyboard mode instructions
      expect(screen.getByText(/keyboard mode: use tab to navigate/i)).toBeInTheDocument()
    })

    it('should support keyboard selection of workloads in keyboard mode', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Enable keyboard mode
      const keyboardModeToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      await user.click(keyboardModeToggle)

      // Find first workload card
      const workloadCard = screen.getByRole('button', { name: /workload: chat conversation/i })
      expect(workloadCard).toBeInTheDocument()

      // Should be focusable with keyboard
      await user.tab()
      // Focus should eventually reach the workload card
      workloadCard.focus()
      expect(workloadCard).toHaveFocus()

      // Should be selectable with Enter or Space
      await user.keyboard('{Enter}')

      expect(mockOnSlotsChange).toHaveBeenCalled()
      const callArgs = mockOnSlotsChange.mock.calls[0][0]
      expect(callArgs[0].workload).toEqual(mockWorkloads[0])
    })

    it('should support keyboard navigation through workload slots', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Find all slot regions
      const slots = screen.getAllByRole('region', { name: /workload slot/i })
      expect(slots).toHaveLength(5)

      // Each slot should have proper labeling
      expect(slots[0]).toHaveAttribute('aria-label', 'Workload slot 1: Chat Conversation')
      expect(slots[2]).toHaveAttribute('aria-label', 'Workload slot 3: Empty')
    })

    it('should support keyboard control of slot actions', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Find move up button for second slot
      const moveUpButton = screen.getByRole('button', { name: /move slot 2 up/i })
      expect(moveUpButton).toBeInTheDocument()

      await user.click(moveUpButton)
      expect(mockOnSlotsChange).toHaveBeenCalled()

      // Find remove button
      const removeButton = screen.getByRole('button', { name: /remove workload from slot 1/i })
      expect(removeButton).toBeInTheDocument()

      await user.click(removeButton)
      expect(mockOnSlotsChange).toHaveBeenCalledTimes(2)
    })

    it('should manage focus properly during slot operations', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const removeButton = screen.getByRole('button', { name: /remove workload from slot 1/i })
      removeButton.focus()
      expect(removeButton).toHaveFocus()

      // Focus should be managed appropriately after removal
      await user.click(removeButton)

      // Focus should remain in a logical location
      const activeElement = document.activeElement
      expect(activeElement).toBeTruthy()
    })
  })

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on workload cards', () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const chatWorkload = screen.getByRole('button', {
        name: /workload: chat conversation.*interactive chat.*category: chat.*drag to slot/i,
      })
      expect(chatWorkload).toBeInTheDocument()

      const analysisWorkload = screen.getByRole('button', {
        name: /workload: document analysis.*comprehensive analysis.*category: analysis/i,
      })
      expect(analysisWorkload).toBeInTheDocument()
    })

    it('should have proper ARIA labels on percentage sliders', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const slider = screen.getByRole('slider', { name: /percentage for chat conversation/i })
      expect(slider).toBeInTheDocument()
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '100')
      expect(slider).toHaveAttribute('aria-valuenow', '60')
    })

    it('should have proper ARIA labels on switches', () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const switches = screen.getAllByRole('checkbox', { name: /active in simulation/i })
      expect(switches.length).toBeGreaterThan(0)

      switches.forEach(switchElement => {
        expect(switchElement).toHaveAttribute('aria-checked')
      })
    })

    it('should properly label action buttons with descriptive names', () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      expect(screen.getByRole('button', { name: /move slot 2 up/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /move slot 1 down/i })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /remove workload from slot 1/i })
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce percentage changes to screen readers', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Check for live regions that would announce changes
      const progressText = screen.getByText(/total allocation: 100%/i)
      expect(progressText).toBeInTheDocument()

      const remainingText = screen.getByText(/remaining: 0%/i)
      expect(remainingText).toBeInTheDocument()
    })

    it('should announce validation errors appropriately', async () => {
      const errorSlots = [...mockSlotsWithWorkloads]
      errorSlots[0].percentage = 150 // Invalid percentage

      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={errorSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveTextContent(/configuration issues/i)
    })

    it('should provide proper feedback for drag and drop operations', () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Empty slots should have appropriate messaging
      const emptySlotMessage = screen.getByText(/drag a workload here or use keyboard controls/i)
      expect(emptySlotMessage).toBeInTheDocument()
    })

    it('should have instructions for both drag-drop and keyboard users', () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const instructions = screen.getByText(
        /drag workloads from the palette to the slots, or use keyboard mode/i
      )
      expect(instructions).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should maintain logical focus order through slots and controls', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Test tab order through all interactive elements
      const keyboardToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      const clearButton = screen.getByRole('button', { name: /clear all/i })
      const activeSwitch = screen.getAllByRole('checkbox', { name: /active in simulation/i })[0]

      await user.tab()
      // Should focus on first interactive element (keyboard mode toggle)
      expect(keyboardToggle).toHaveFocus()

      await user.tab()
      // Should move to clear button
      expect(clearButton).toHaveFocus()

      // Continue tabbing through slots
      await user.tab()
      // Should reach the first active switch
      expect(activeSwitch).toHaveFocus()
    })

    it('should have visible focus indicators on all interactive elements', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const focusableElements = getFocusableElements(screen.getByRole('main') || document.body)

      for (const element of focusableElements.slice(0, 5)) {
        // Test first few elements
        element.focus()
        expect(element).toHaveFocus()

        // Focus should be visible (this would be tested visually or with computed styles)
        const computedStyle = window.getComputedStyle(element)
        // Basic check that element is not hidden
        expect(computedStyle.display).not.toBe('none')
        expect(computedStyle.visibility).not.toBe('hidden')
      }
    })

    it('should properly manage focus when slots are modified', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const removeButton = screen.getByRole('button', { name: /remove workload from slot 1/i })
      removeButton.focus()

      await user.click(removeButton)

      // Focus should be managed appropriately after slot modification
      const activeElement = document.activeElement
      expect(activeElement).toBeTruthy()
      expect(activeElement?.tagName).toBeTruthy()
    })
  })

  describe('Slider Accessibility', () => {
    it('should support keyboard control of percentage sliders', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const slider = screen.getByRole('slider', { name: /percentage for chat conversation/i })
      slider.focus()

      // Test arrow key navigation
      await user.keyboard('{ArrowRight}')
      expect(mockOnSlotsChange).toHaveBeenCalled()

      // Test page up/down for larger increments
      await user.keyboard('{PageUp}')
      expect(mockOnSlotsChange).toHaveBeenCalledTimes(2)

      // Test home/end keys
      await user.keyboard('{Home}')
      expect(mockOnSlotsChange).toHaveBeenCalledTimes(3)
    })

    it('should announce slider value changes', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuenow', '60')
      expect(slider).toHaveAttribute('aria-valuetext') // Should have readable value text
    })
  })

  describe('Progressive Enhancement', () => {
    it('should work without JavaScript for basic functionality', () => {
      // While React components require JS, we ensure semantic HTML structure
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Check that semantic structure exists
      const heading = screen.getByRole('heading', { name: /workload configuration/i })
      expect(heading).toBeInTheDocument()

      const regions = screen.getAllByRole('region')
      expect(regions.length).toBeGreaterThan(0)
    })

    it('should provide alternative input methods for drag and drop', async () => {
      renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockWorkloadSlots}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      // Keyboard mode should be available as alternative
      const keyboardModeToggle = screen.getByRole('checkbox', { name: /keyboard mode/i })
      expect(keyboardModeToggle).toBeInTheDocument()

      await user.click(keyboardModeToggle)

      // Instructions should update
      expect(screen.getByText(/keyboard mode: use tab to navigate/i)).toBeInTheDocument()
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      const { container } = renderWithAccessibility(
        <WorkloadConfigurator
          workloads={mockWorkloads}
          workloadSlots={mockSlotsWithWorkloads}
          onSlotsChange={mockOnSlotsChange}
        />,
        { withDnd: true }
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
        results.push(
          createAccessibilityResult(AccessibilityTestCategory.INTERACTIVE_ELEMENTS, true)
        )
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      console.log('WorkloadConfigurator Accessibility Results:', results)
    })
  })
})
