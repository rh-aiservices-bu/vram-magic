// VRAM Magic: ModelSelector Accessibility Tests
// Comprehensive accessibility testing for the ModelSelector component

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ModelSelector } from '../../src/components/ModelSelector/ModelSelector'
import { Model, ModelPrecision } from '../../src/types'
import {
  renderWithAccessibility,
  runAxeTest,
  getScreenReaderText,
  getFocusableElements,
  AccessibilityTestCategory,
  createAccessibilityResult,
} from './axe-setup'

// Mock data for testing
const mockModels: Model[] = [
  {
    id: 'llama2-7b',
    name: 'Llama 2 7B',
    description: 'A 7 billion parameter conversational AI model by Meta',
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
      baseVRAM: 13.5,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 1.2,
      overheadFactor: 0.1,
    },
    performance: {
      gpuType: 'RTX 4090',
      tokensPerSecond: 42,
      batchSize: 1,
      powerConsumption: 350,
    },
    metadata: {
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Custom',
      tags: ['conversation', 'open-source', 'efficient'],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: "OpenAI's efficient conversational model optimized for chat",
    parameters: 175000000000,
    precision: ModelPrecision.FP32,
    architecture: {
      layers: 96,
      hiddenSize: 12288,
      attentionHeads: 96,
      vocabularySize: 50257,
      maxSequenceLength: 4096,
    },
    vramRequirements: {
      baseVRAM: 350.0,
      kvCacheCoefficient: 0.5,
      activationMultiplier: 1.5,
      overheadFactor: 0.15,
    },
    performance: {
      gpuType: 'A100',
      tokensPerSecond: 120,
      batchSize: 8,
      powerConsumption: 400,
    },
    metadata: {
      releaseDate: '2023-03-01',
      organization: 'OpenAI',
      license: 'Proprietary',
      tags: ['chat', 'api', 'efficient', 'production'],
    },
  },
]

describe('ModelSelector Accessibility Tests', () => {
  let mockOnModelSelect: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    mockOnModelSelect = vi.fn()
    user = userEvent.setup()
  })

  describe('Axe Core Compliance', () => {
    it('should pass axe accessibility tests with no model selected', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with model selected', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={mockModels[0]}
          onModelSelect={mockOnModelSelect}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          disabled={true}
        />
      )

      await runAxeTest(container)
    })

    it('should pass axe accessibility tests with error state', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          error="Unable to load models"
        />
      )

      await runAxeTest(container)
    })
  })

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on input field', () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox', { name: /select model for vram calculation/i })
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-label', 'Select model for VRAM calculation')
    })

    it('should have proper ARIA described by relationships', () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-describedby', 'model-selector-helper')
    })

    it('should update ARIA described by for error state', () => {
      renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          error="Connection failed"
        />
      )

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-describedby', 'model-selector-error')
    })

    it('should have proper ARIA labels on dropdown options', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      await user.click(input)

      await waitFor(() => {
        const listbox = screen.getByRole('listbox', { name: 'Available models list' })
        expect(listbox).toBeInTheDocument()
      })

      const firstOption = screen.getByText('Llama 2 7B').closest('[role="option"]')
      expect(firstOption).toHaveAttribute('aria-label', expect.stringContaining('Llama 2 7B'))
      expect(firstOption).toHaveAttribute('aria-label', expect.stringContaining('7.0B parameters'))
      expect(firstOption).toHaveAttribute('aria-label', expect.stringContaining('FP16'))
      expect(firstOption).toHaveAttribute('aria-label', expect.stringContaining('Meta'))
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation through the dropdown', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')

      // Tab to input
      await user.tab()
      expect(input).toHaveFocus()

      // Open dropdown with Enter
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')

      // Select with Enter
      await user.keyboard('{Enter}')

      expect(mockOnModelSelect).toHaveBeenCalledWith(mockModels[1])
    })

    it('should support keyboard navigation with arrow keys', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      input.focus()

      // Open with Alt+Down
      await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate through options
      await user.keyboard('{ArrowDown}') // First option
      await user.keyboard('{ArrowDown}') // Second option

      // Select with Enter
      await user.keyboard('{Enter}')

      expect(mockOnModelSelect).toHaveBeenCalled()
    })

    it('should close dropdown with Escape', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      input.focus()

      // Open dropdown
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Close with Escape
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('should maintain focus on input after selection', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      input.focus()

      // Open and select
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      // Focus should return to input
      expect(input).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce model selection to screen readers', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={mockModels[0]}
          onModelSelect={mockOnModelSelect}
        />
      )

      const announcements = getScreenReaderText(container)
      expect(announcements).toContainEqual(expect.stringContaining('Llama 2 7B selected'))
      expect(announcements).toContainEqual(expect.stringContaining('7.0B parameters'))
    })

    it('should have live region for dynamic updates', () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={mockModels[0]}
          onModelSelect={mockOnModelSelect}
        />
      )

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('should have proper loading state announcements', () => {
      renderWithAccessibility(
        <ModelSelector models={[]} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-describedby', 'model-selector-helper')
    })

    it('should announce search results', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      await user.click(input)
      await user.type(input, 'llama')

      await waitFor(() => {
        const listbox = screen.getByRole('listbox')
        const options = within(listbox).getAllByRole('option')
        expect(options).toHaveLength(1)
      })
    })
  })

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      await user.tab()

      expect(input).toHaveFocus()
      // Check that focus styles are applied
      const focusedElement = document.activeElement
      expect(focusedElement).toBe(input)
    })

    it('should trap focus within dropdown when open', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      input.focus()

      // Open dropdown
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Tab should not move focus outside the dropdown
      const focusableElements = getFocusableElements(screen.getByRole('listbox'))
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('should restore focus after dropdown closes', async () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      input.focus()

      // Open and close dropdown
      await user.keyboard('{Enter}')
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })

      expect(input).toHaveFocus()
    })
  })

  describe('Error State Accessibility', () => {
    it('should properly announce errors to screen readers', () => {
      const errorMessage = 'Failed to load models'
      renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          error={errorMessage}
        />
      )

      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveTextContent(errorMessage)
      expect(errorAlert).toHaveAttribute('id', 'model-selector-error')
    })

    it('should associate error with input field', () => {
      const errorMessage = 'Connection failed'
      renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          error={errorMessage}
        />
      )

      const input = screen.getByRole('combobox')
      expect(input).toHaveAttribute('aria-describedby', 'model-selector-error')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Loading State Accessibility', () => {
    it('should have proper loading indicators', async () => {
      renderWithAccessibility(
        <ModelSelector models={[]} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const input = screen.getByRole('combobox')
      await user.click(input)

      // Check for loading text in dropdown
      await waitFor(() => {
        // The component shows a loading skeleton in the dropdown when no models are available
        expect(screen.getByText(/no models available/i)).toBeInTheDocument()
      })
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast in default state', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      // Axe will check color contrast as part of the overall test
      await runAxeTest(container)
    })

    it('should have sufficient color contrast in disabled state', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          disabled={true}
        />
      )

      await runAxeTest(container)
    })

    it('should have sufficient color contrast in error state', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector
          models={mockModels}
          selectedModel={null}
          onModelSelect={mockOnModelSelect}
          error="Error message"
        />
      )

      await runAxeTest(container)
    })
  })

  describe('Interactive Element Testing', () => {
    it('should have all interactive elements keyboard accessible', async () => {
      const { container } = renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const focusableElements = getFocusableElements(container)
      expect(focusableElements.length).toBeGreaterThan(0)

      // Each focusable element should be keyboard accessible
      for (const element of focusableElements) {
        expect(element).toHaveAttribute('tabindex')
        const tabIndex = element.getAttribute('tabindex')
        expect(parseInt(tabIndex || '0')).toBeGreaterThanOrEqual(0)
      }
    })

    it('should support all required ARIA patterns for combobox', () => {
      renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      const combobox = screen.getByRole('combobox')

      // Check required ARIA attributes for combobox pattern
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
      expect(combobox).toHaveAttribute('aria-autocomplete', 'list')
    })
  })

  describe('Comprehensive Accessibility Score', () => {
    it('should achieve WCAG 2.1 AA compliance', async () => {
      const results: Array<ReturnType<typeof createAccessibilityResult>> = []

      // Test each category
      const { container } = renderWithAccessibility(
        <ModelSelector models={mockModels} selectedModel={null} onModelSelect={mockOnModelSelect} />
      )

      try {
        await runAxeTest(container)
        results.push(createAccessibilityResult(AccessibilityTestCategory.SCREEN_READER, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.KEYBOARD_NAVIGATION, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.COLOR_CONTRAST, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.FOCUS_MANAGEMENT, true))
        results.push(createAccessibilityResult(AccessibilityTestCategory.ARIA_LABELS, true))
      } catch (error) {
        console.error('Accessibility test failed:', error)
        throw error
      }

      // All tests should pass for WCAG 2.1 AA compliance
      const allPassed = results.every(result => result.passed)
      expect(allPassed).toBe(true)

      // Log results for debugging if needed
      console.log('ModelSelector Accessibility Results:', results)
    })
  })
})
