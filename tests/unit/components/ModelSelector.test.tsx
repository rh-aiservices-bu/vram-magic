import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'

import { ModelSelector } from '../../../src/components/ModelSelector'
import { Model, ModelPrecision } from '../../../src/types'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Create a test theme
const testTheme = createTheme()

// Mock data for testing
const mockModels: Model[] = [
  {
    id: 'llama-2-7b',
    name: 'Llama 2 7B',
    description: "Meta's Llama 2 7B parameter language model optimized for dialogue use cases",
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
      baseVRAM: 14336,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [],
    metadata: {
      releaseDate: '2023-07-18',
      organization: 'Meta',
      license: 'Custom',
      tags: ['chat', 'instruct', 'open-source'],
    },
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: "OpenAI's GPT-3.5 Turbo model optimized for chat completions",
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
      baseVRAM: 358400,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [],
    metadata: {
      releaseDate: '2023-03-01',
      organization: 'OpenAI',
      license: 'Proprietary',
      tags: ['chat', 'completion', 'api'],
    },
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: "Anthropic's Claude 3 Haiku - fast and cost-effective model",
    parameters: 7500000000,
    precision: ModelPrecision.INT8,
    architecture: {
      layers: 40,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 100000,
      maxSequenceLength: 200000,
    },
    vramRequirements: {
      baseVRAM: 9216,
      kvCacheCoefficient: 0.1,
      activationMultiplier: 3,
      overheadFactor: 1.1,
    },
    performance: [],
    metadata: {
      releaseDate: '2024-03-04',
      organization: 'Anthropic',
      license: 'Proprietary',
      tags: ['chat', 'reasoning', 'cost-effective'],
    },
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: "Mistral AI's high-performance 7B parameter model",
    parameters: 7300000000,
    precision: ModelPrecision.FP32,
    architecture: {
      layers: 32,
      hiddenSize: 4096,
      attentionHeads: 32,
      vocabularySize: 32000,
      maxSequenceLength: 32768,
    },
    vramRequirements: {
      baseVRAM: 28672,
      kvCacheCoefficient: 0.125,
      activationMultiplier: 4,
      overheadFactor: 1.2,
    },
    performance: [],
    metadata: {
      releaseDate: '2023-09-27',
      organization: 'Mistral AI',
      license: 'Apache 2.0',
      tags: ['open-source', 'instruct', 'code'],
    },
  },
]

// Test wrapper component with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>{children}</ThemeProvider>
)

describe('ModelSelector Component', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockOnModelSelect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    mockOnModelSelect = vi.fn()
  })

  describe('Component Rendering and Initial State', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should render autocomplete input
      expect(screen.getByLabelText('Select model for VRAM calculation')).toBeInTheDocument()
      expect(screen.getByTestId('model-selector-input')).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Search models by name, organization, or tags...')
      ).toBeInTheDocument()
    })

    it('should display model count in helper text', () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      expect(screen.getByText(`${mockModels.length} models available`)).toBeInTheDocument()
    })

    it('should be disabled when models array is empty', () => {
      render(
        <TestWrapper>
          <ModelSelector models={[]} selectedModel={null} onModelSelect={mockOnModelSelect} />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      expect(input).toBeDisabled()
      expect(screen.getByText('0 models available')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
            disabled={true}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      expect(input).toBeDisabled()
    })

    it('should display error state correctly', () => {
      const errorMessage = 'Failed to load models'
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
            error={errorMessage}
          />
        </TestWrapper>
      )

      // Should display error in helper text
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      // Should show error styling on input
      expect(screen.getByTestId('model-selector-input')).toHaveAttribute('aria-invalid', 'true')
      // Should display error alert
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('Model Selection and Interaction', () => {
    it('should open dropdown when clicked', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      // Should show dropdown with all models
      await waitFor(() => {
        expect(screen.getByRole('listbox', { name: 'Available models list' })).toBeVisible()
      })

      // Should display all model options
      mockModels.forEach(model => {
        expect(screen.getByText(model.name)).toBeInTheDocument()
        expect(screen.getByText(model.description)).toBeInTheDocument()
      })
    })

    it('should call onModelSelect when a model is selected', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      // Select first model
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
      })

      await user.click(screen.getByText('Llama 2 7B'))

      // Should call onModelSelect with the selected model
      expect(mockOnModelSelect).toHaveBeenCalledWith(mockModels[0])
    })

    it('should display selected model information', () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={mockModels[0]}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      // Should show selected model info alert
      expect(
        screen.getByText(/Llama 2 7B.*requires approximately.*GB.*of VRAM/)
      ).toBeInTheDocument()
      expect(screen.getByText(/7.0B parameters/)).toBeInTheDocument()
      expect(screen.getByText(/FP16 precision/)).toBeInTheDocument()
    })

    it('should not call onModelSelect when same model is selected', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={mockModels[0]}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      // Click on already selected model
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
      })

      await user.click(screen.getByText('Llama 2 7B'))

      // Should not call onModelSelect for same selection
      expect(mockOnModelSelect).not.toHaveBeenCalled()
    })
  })

  describe('Search Functionality', () => {
    it('should filter models based on name search', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'llama')

      await user.click(input) // Open dropdown

      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
        expect(screen.queryByText('GPT-3.5 Turbo')).not.toBeInTheDocument()
      })
    })

    it('should filter models based on organization search', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'openai')

      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('GPT-3.5 Turbo')).toBeVisible()
        expect(screen.queryByText('Llama 2 7B')).not.toBeInTheDocument()
      })
    })

    it('should filter models based on tags search', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'open-source')

      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
        expect(screen.getByText('Mistral 7B')).toBeVisible()
        expect(screen.queryByText('GPT-3.5 Turbo')).not.toBeInTheDocument()
        expect(screen.queryByText('Claude 3 Haiku')).not.toBeInTheDocument()
      })
    })

    it('should filter models based on precision search', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'fp32')

      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('Mistral 7B')).toBeVisible()
        expect(screen.queryByText('Llama 2 7B')).not.toBeInTheDocument()
      })
    })

    it('should show no options message when no models match search', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'nonexistent')

      await user.click(input)

      await waitFor(() => {
        expect(
          screen.getByText('No models match your search. Try different keywords.')
        ).toBeVisible()
      })
    })

    it('should clear search when input is cleared', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.type(input, 'llama')
      await user.clear(input)

      await user.click(input)

      // Should show all models again
      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
        expect(screen.getByText('GPT-3.5 Turbo')).toBeVisible()
      })
    })
  })

  describe('Model Option Display', () => {
    it('should display model details correctly in options', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        const llamaOption = screen.getByText('Llama 2 7B')
        expect(llamaOption).toBeVisible()
      })

      // Should display parameter count
      expect(screen.getByText('7.0B params')).toBeInTheDocument()

      // Should display estimated VRAM
      expect(screen.getByText(/~\d+\.\d+GB/)).toBeInTheDocument()

      // Should display organization
      expect(screen.getByText('Meta')).toBeInTheDocument()

      // Should display precision chip
      expect(screen.getByText('FP16')).toBeInTheDocument()

      // Should display tags
      expect(screen.getByText('chat')).toBeInTheDocument()
      expect(screen.getByText('instruct')).toBeInTheDocument()
      expect(screen.getByText('open-source')).toBeInTheDocument()
    })

    it('should show truncated tags with count when there are many tags', async () => {
      const modelWithManyTags: Model = {
        ...mockModels[0],
        metadata: {
          ...mockModels[0].metadata,
          tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
        },
      }

      render(
        <TestWrapper>
          <ModelSelector
            models={[modelWithManyTags]}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeVisible()
        expect(screen.getByText('tag2')).toBeVisible()
        expect(screen.getByText('tag3')).toBeVisible()
        expect(screen.getByText('+3')).toBeVisible() // Shows remaining count
        expect(screen.queryByText('tag4')).not.toBeInTheDocument()
      })
    })

    it('should highlight selected option', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={mockModels[0]}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        const llamaOption = screen.getByText('Llama 2 7B')
        expect(llamaOption).toBeVisible()
      })

      // Selected model should have different styling (this would need to be checked via class or style)
      // In a real test, you might check for specific CSS classes or aria-selected attribute
    })

    it('should display proper precision colors', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('FP16')).toBeVisible() // Should be warning color
        expect(screen.getByText('FP32')).toBeVisible() // Should be error color
        expect(screen.getByText('INT8')).toBeVisible() // Should be success color
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support arrow key navigation through options', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeVisible()
      })

      // Navigate with arrow keys
      await user.keyboard('[ArrowDown]')
      await user.keyboard('[ArrowDown]')
      await user.keyboard('[Enter]')

      // Should select the focused option
      expect(mockOnModelSelect).toHaveBeenCalled()
    })

    it('should support Escape key to close dropdown', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeVisible()
      })

      await user.keyboard('[Escape]')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state when models array is empty and not disabled', () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={[]}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
            disabled={false}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      expect(input).toBeDisabled() // Should be disabled when no models
    })

    it('should show no models message when models array is empty', async () => {
      render(
        <TestWrapper>
          <ModelSelector models={[]} selectedModel={null} onModelSelect={mockOnModelSelect} />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(
          screen.getByText('No models available. Please check your connection and try again.')
        ).toBeVisible()
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce model selection to screen readers', () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={mockModels[0]}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      // Should have live region for screen reader announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()

      // Should contain announcement text about the selected model
      expect(liveRegion).toHaveTextContent(
        /Llama 2 7B.*selected.*7\.0B.*parameters.*FP16.*precision/
      )
    })

    it('should have proper ARIA labels for all interactive elements', async () => {
      const { container } = render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should have proper aria-label on input
      expect(screen.getByLabelText('Select model for VRAM calculation')).toBeInTheDocument()

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByRole('listbox', { name: 'Available models list' })).toBeVisible()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle models with missing or invalid data gracefully', async () => {
      const invalidModel: Model = {
        ...mockModels[0],
        parameters: 0, // Invalid parameter count
        metadata: {
          ...mockModels[0].metadata,
          tags: [], // Empty tags array
        },
      }

      render(
        <TestWrapper>
          <ModelSelector
            models={[invalidModel]}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('Llama 2 7B')).toBeVisible()
      })

      // Should still display the model even with invalid data
      expect(screen.getByText('0 params')).toBeInTheDocument()
    })

    it('should handle rapid user interactions gracefully', async () => {
      render(
        <TestWrapper>
          <ModelSelector
            models={mockModels}
            selectedModel={null}
            onModelSelect={mockOnModelSelect}
          />
        </TestWrapper>
      )

      const input = screen.getByTestId('model-selector-input')

      // Rapid clicks and typing
      await user.click(input)
      await user.type(input, 'test', { delay: 10 })
      await user.clear(input)
      await user.type(input, 'llama', { delay: 10 })

      // Should handle rapid changes without errors
      expect(input).toBeInTheDocument()
    })
  })
})
