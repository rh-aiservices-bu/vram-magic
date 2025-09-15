import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

// Components for integration testing
import { ModelSelector } from '../../src/components/ModelSelector'
import App from '../../src/App'

// Services that don't exist yet - will cause tests to fail initially (TDD approach)
import { vramCalculator } from '../../src/services/vramCalculator'
import { modelService } from '../../src/services/modelService'

// Types from specification contracts
import { Model, ModelPrecision, VRAMUsagePoint, PRECISION_BYTES } from '../../src/types'

// Extend jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('Model Selection Workflow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  // Mock model data based on specification requirements
  const mockModels: Model[] = [
    {
      id: 'llama-2-7b',
      name: 'Llama 2 7B',
      description: 'Meta Llama 2 7 billion parameter model',
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
      performance: [
        {
          gpuType: 'A100',
          tokensPerSecond: 45,
          batchSize: 1,
          powerConsumption: 300,
        },
        {
          gpuType: 'RTX 4090',
          tokensPerSecond: 32,
          batchSize: 1,
          powerConsumption: 450,
        },
      ],
      metadata: {
        releaseDate: '2023-07-18',
        organization: 'Meta',
        license: 'Custom',
        tags: ['llama', '7b', 'general'],
      },
    },
    {
      id: 'mistral-7b',
      name: 'Mistral 7B',
      description: 'Mistral AI 7 billion parameter instruct model',
      parameters: 7241969152,
      precision: ModelPrecision.FP16,
      architecture: {
        layers: 32,
        hiddenSize: 4096,
        attentionHeads: 32,
        vocabularySize: 32000,
        maxSequenceLength: 8192,
      },
      vramRequirements: {
        baseVRAM: 14884,
        kvCacheCoefficient: 0.125,
        activationMultiplier: 4,
        overheadFactor: 1.2,
      },
      performance: [
        {
          gpuType: 'A100',
          tokensPerSecond: 48,
          batchSize: 1,
          powerConsumption: 300,
        },
      ],
      metadata: {
        releaseDate: '2023-09-27',
        organization: 'Mistral AI',
        license: 'Apache 2.0',
        tags: ['mistral', '7b', 'instruct'],
      },
    },
    {
      id: 'codellama-13b',
      name: 'Code Llama 13B',
      description: 'Meta Code Llama 13 billion parameter coding model',
      parameters: 13015864320,
      precision: ModelPrecision.FP32,
      architecture: {
        layers: 40,
        hiddenSize: 5120,
        attentionHeads: 40,
        vocabularySize: 32016,
        maxSequenceLength: 16384,
      },
      vramRequirements: {
        baseVRAM: 52063,
        kvCacheCoefficient: 0.156,
        activationMultiplier: 4,
        overheadFactor: 1.2,
      },
      performance: [
        {
          gpuType: 'A100',
          tokensPerSecond: 28,
          batchSize: 1,
          powerConsumption: 350,
        },
      ],
      metadata: {
        releaseDate: '2023-08-24',
        organization: 'Meta',
        license: 'Custom',
        tags: ['llama', 'code', '13b'],
      },
    },
    {
      id: 'gemma-2b',
      name: 'Gemma 2B',
      description: 'Google Gemma 2 billion parameter model',
      parameters: 2506172416,
      precision: ModelPrecision.INT8,
      architecture: {
        layers: 18,
        hiddenSize: 2048,
        attentionHeads: 8,
        vocabularySize: 256128,
        maxSequenceLength: 8192,
      },
      vramRequirements: {
        baseVRAM: 2506,
        kvCacheCoefficient: 0.071,
        activationMultiplier: 4,
        overheadFactor: 1.2,
      },
      performance: [
        {
          gpuType: 'RTX 4090',
          tokensPerSecond: 85,
          batchSize: 1,
          powerConsumption: 300,
        },
      ],
      metadata: {
        releaseDate: '2024-02-21',
        organization: 'Google',
        license: 'Gemma Terms',
        tags: ['gemma', '2b', 'small'],
      },
    },
  ]

  beforeEach(() => {
    user = userEvent.setup()

    // Mock the model service
    vi.mocked(modelService.loadModels).mockResolvedValue(mockModels)
    vi.mocked(modelService.getModelById).mockImplementation(async (id: string) => {
      return mockModels.find(model => model.id === id) || null
    })

    // Mock VRAM calculator service with formulas from research.md
    vi.mocked(vramCalculator.calculateBaseMemory).mockImplementation((model: Model) => {
      // Model Memory = Parameters × Precision (bytes) × 1.2 (overhead factor)
      return (
        model.parameters * PRECISION_BYTES[model.precision] * model.vramRequirements.overheadFactor
      )
    })

    vi.mocked(vramCalculator.calculateKVCache).mockImplementation(
      (model: Model, sequenceLength: number, batchSize: number) => {
        // KV-Cache Memory = 2 × Layers × Hidden_Size × Sequence_Length × Batch_Size × Precision
        return (
          2 *
          model.architecture.layers *
          model.architecture.hiddenSize *
          sequenceLength *
          batchSize *
          PRECISION_BYTES[model.precision]
        )
      }
    )

    vi.mocked(vramCalculator.calculateActivations).mockImplementation(
      (model: Model, sequenceLength: number, batchSize: number) => {
        // Activation Memory = Hidden_Size × Sequence_Length × Batch_Size × Precision × 4
        return (
          model.architecture.hiddenSize *
          sequenceLength *
          batchSize *
          PRECISION_BYTES[model.precision] *
          model.vramRequirements.activationMultiplier
        )
      }
    )

    vi.mocked(vramCalculator.calculateOverhead).mockImplementation(
      (baseMemory: number, additionalMemory: number) => {
        // Overhead = 0.1 × (Model Memory + KV-Cache Memory)
        return 0.1 * (baseMemory + additionalMemory)
      }
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Model Selection Workflow', () => {
    it('should allow user to select model and see immediate VRAM estimate', async () => {
      // Render the main application
      render(<App />)

      // Wait for models to load
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Verify loading state is cleared
      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument()

      // Open model selector dropdown
      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)

      // Verify all models are available in dropdown
      await waitFor(() => {
        expect(screen.getByRole('option', { name: /llama 2 7b/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /mistral 7b/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /code llama 13b/i })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /gemma 2b/i })).toBeInTheDocument()
      })

      // Select Llama 2 7B model
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify model is selected and displayed
      expect(screen.getByDisplayValue(/llama 2 7b/i)).toBeInTheDocument()

      // Verify VRAM estimate appears
      await waitFor(() => {
        expect(screen.getByText(/base vram/i)).toBeInTheDocument()
        expect(screen.getByText(/14.*gb/i)).toBeInTheDocument() // Should show ~14GB base
      })

      // Verify model details are displayed
      expect(screen.getByText(/7.*billion.*parameters/i)).toBeInTheDocument()
      expect(screen.getByText(/fp16.*precision/i)).toBeInTheDocument()
    })

    it('should calculate accurate VRAM for FP16 model with sequence length', async () => {
      const llama7b = mockModels[0] // Llama 2 7B FP16
      const sequenceLength = 2048
      const batchSize = 1

      render(<ModelSelector models={mockModels} selectedModel={null} onModelSelect={vi.fn()} />)

      // Select the model
      const selector = screen.getByRole('combobox')
      await user.click(selector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Expected calculations based on research.md formulas:
      const expectedBaseMemory = llama7b.parameters * PRECISION_BYTES[ModelPrecision.FP16] * 1.2
      const expectedKVCache = 2 * 32 * 4096 * sequenceLength * batchSize * 2 // FP16 = 2 bytes
      const expectedActivations = 4096 * sequenceLength * batchSize * 2 * 4
      const expectedOverhead = 0.1 * (expectedBaseMemory + expectedKVCache)
      const expectedTotal =
        expectedBaseMemory + expectedKVCache + expectedActivations + expectedOverhead

      // Verify calculation services were called with correct parameters
      expect(vramCalculator.calculateBaseMemory).toHaveBeenCalledWith(llama7b)
      expect(vramCalculator.calculateKVCache).toHaveBeenCalledWith(
        llama7b,
        sequenceLength,
        batchSize
      )
      expect(vramCalculator.calculateActivations).toHaveBeenCalledWith(
        llama7b,
        sequenceLength,
        batchSize
      )

      // Verify results are displayed (approximately, allowing for rounding)
      const totalGB = expectedTotal / (1024 * 1024 * 1024)
      const expectedRange = new RegExp(`${Math.floor(totalGB)}.*${Math.ceil(totalGB)}.*gb`, 'i')
      await waitFor(() => {
        expect(screen.getByText(expectedRange)).toBeInTheDocument()
      })
    })

    it('should handle different model precisions correctly', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Test FP32 model (Code Llama 13B)
      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /code llama 13b/i }))

      // Verify FP32 precision shows higher VRAM usage
      await waitFor(() => {
        expect(screen.getByText(/fp32.*precision/i)).toBeInTheDocument()
        expect(screen.getByText(/52.*gb/i)).toBeInTheDocument() // Should show ~52GB base for FP32
      })

      // Switch to INT8 model (Gemma 2B)
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /gemma 2b/i }))

      // Verify INT8 precision shows much lower VRAM usage
      await waitFor(() => {
        expect(screen.getByText(/int8.*precision/i)).toBeInTheDocument()
        expect(screen.getByText(/2.*gb/i)).toBeInTheDocument() // Should show ~2GB base for INT8
      })
    })

    it('should update VRAM visualization when model changes', async () => {
      render(<App />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Select first model
      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify chart appears
      await waitFor(() => {
        expect(screen.getByRole('img', { name: /vram usage chart/i })).toBeInTheDocument()
      })

      // Get initial chart data
      const initialChart = screen.getByRole('img', { name: /vram usage chart/i })
      const initialAriaLabel = initialChart.getAttribute('aria-label')

      // Change to different model
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /code llama 13b/i }))

      // Verify chart updates with new data
      await waitFor(() => {
        const updatedChart = screen.getByRole('img', { name: /vram usage chart/i })
        const updatedAriaLabel = updatedChart.getAttribute('aria-label')
        expect(updatedAriaLabel).not.toBe(initialAriaLabel)
      })
    })

    it('should display GPU recommendations based on calculated VRAM', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Select high VRAM model (Code Llama 13B FP32)
      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /code llama 13b/i }))

      // Verify high-end GPU recommendations appear
      await waitFor(() => {
        expect(screen.getByText(/recommended gpu/i)).toBeInTheDocument()
        expect(screen.getByText(/a100/i)).toBeInTheDocument()
        expect(screen.getByText(/80gb.*vram/i)).toBeInTheDocument()
      })

      // Switch to low VRAM model (Gemma 2B INT8)
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /gemma 2b/i }))

      // Verify consumer GPU recommendations appear
      await waitFor(() => {
        expect(screen.getByText(/rtx.*4090/i)).toBeInTheDocument()
        expect(screen.getByText(/24gb.*vram/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle model loading errors gracefully', async () => {
      // Mock service to return error
      vi.mocked(modelService.loadModels).mockRejectedValue(new Error('Failed to load models'))

      render(<App />)

      // Verify error state is displayed
      await waitFor(() => {
        expect(screen.getByText(/failed.*load.*models/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })

      // Verify model selector is disabled
      expect(screen.getByRole('combobox', { name: /select model/i })).toBeDisabled()
    })

    it('should handle empty model list', async () => {
      vi.mocked(modelService.loadModels).mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/no models available/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('combobox', { name: /select model/i })).toBeDisabled()
    })

    it('should validate model data and show warnings for incomplete models', async () => {
      const incompleteModel: Model = {
        ...mockModels[0],
        performance: [], // Missing performance data
        vramRequirements: {
          ...mockModels[0].vramRequirements,
          baseVRAM: 0, // Invalid base VRAM
        },
      }

      vi.mocked(modelService.loadModels).mockResolvedValue([incompleteModel])

      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify warning messages appear
      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument()
        expect(screen.getByText(/performance.*data.*missing/i)).toBeInTheDocument()
        expect(screen.getByText(/vram.*calculation.*may.*inaccurate/i)).toBeInTheDocument()
      })
    })

    it('should handle calculation service failures', async () => {
      vi.mocked(vramCalculator.calculateBaseMemory).mockImplementation(() => {
        throw new Error('Calculation failed')
      })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/calculation.*error/i)).toBeInTheDocument()
        expect(screen.getByText(/unable.*calculate.*vram/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States and User Feedback', () => {
    it('should show loading states during model selection and calculation', async () => {
      // Mock delayed responses
      vi.mocked(modelService.loadModels).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockModels), 1000))
      )

      render(<App />)

      // Verify initial loading state
      expect(screen.getByText(/loading models/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      expect(screen.queryByText(/loading models/i)).not.toBeInTheDocument()
    })

    it('should show calculation progress when switching models', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Add delay to calculation mock
      vi.mocked(vramCalculator.calculateBaseMemory).mockImplementation(() => {
        // Simulate calculation delay
        return new Promise(resolve => setTimeout(() => resolve(14336), 500)) as unknown as number
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify calculation loading state
      expect(screen.getByText(/calculating.*vram/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()

      // Wait for calculation to complete
      await waitFor(
        () => {
          expect(screen.queryByText(/calculating.*vram/i)).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      // Run axe accessibility tests
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation for model selection', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })

      // Focus the selector
      modelSelector.focus()
      expect(modelSelector).toHaveFocus()

      // Open dropdown with keyboard
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })

      // Verify dropdown opens
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Navigate with arrow keys
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })
      fireEvent.keyDown(modelSelector, { key: 'ArrowDown', code: 'ArrowDown' })

      // Select with Enter
      fireEvent.keyDown(modelSelector, { key: 'Enter', code: 'Enter' })

      // Verify selection worked
      await waitFor(() => {
        expect(screen.getByDisplayValue(/mistral 7b/i)).toBeInTheDocument()
      })
    })

    it('should announce VRAM calculation results to screen readers', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify live region for announcements
      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent(/vram.*calculated.*14.*gb/i)
      })
    })

    it('should provide clear focus indicators and labels', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })

      // Verify ARIA attributes
      expect(modelSelector).toHaveAttribute('aria-label', expect.stringMatching(/select.*model/i))
      expect(modelSelector).toHaveAttribute('aria-expanded', 'false')
      expect(modelSelector).toHaveAttribute('aria-haspopup', 'listbox')

      // Open dropdown
      await user.click(modelSelector)

      // Verify expanded state
      expect(modelSelector).toHaveAttribute('aria-expanded', 'true')

      // Verify option labels
      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Integration with Charts and Results', () => {
    it('should update chart data when model selection changes', async () => {
      const mockChartData: VRAMUsagePoint[] = [
        {
          timestamp: 0,
          totalVRAM: 14336,
          breakdown: {
            baseModel: 12000,
            kvCache: 1500,
            activations: 636,
            overhead: 200,
            workloadBreakdown: [],
          },
          activeRequests: [],
        },
      ]

      vi.mocked(vramCalculator.simulateUsageOverTime).mockReturnValue(mockChartData)

      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Verify simulation was called
      await waitFor(() => {
        expect(vramCalculator.simulateUsageOverTime).toHaveBeenCalled()
      })

      // Verify chart displays data
      expect(screen.getByRole('img', { name: /vram usage chart/i })).toBeInTheDocument()
    })

    it('should provide export functionality for results', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      // Wait for results to be calculated
      await waitFor(() => {
        expect(screen.getByText(/base vram/i)).toBeInTheDocument()
      })

      // Verify export options are available
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()

      await user.click(exportButton)

      // Verify export menu
      expect(screen.getByRole('menuitem', { name: /export.*json/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /export.*csv/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /export.*png/i })).toBeInTheDocument()
    })
  })

  describe('Performance and Responsiveness', () => {
    it('should debounce rapid model selection changes', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const modelSelector = screen.getByRole('combobox', { name: /select model/i })

      // Rapidly change selections
      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /llama 2 7b/i }))

      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /mistral 7b/i }))

      await user.click(modelSelector)
      await user.click(screen.getByRole('option', { name: /code llama 13b/i }))

      // Verify calculation was called only for final selection (debounced)
      await waitFor(() => {
        expect(vramCalculator.calculateBaseMemory).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle large model lists efficiently', async () => {
      // Create large model list
      const largeModelList = Array.from({ length: 100 }, (_, i) => ({
        ...mockModels[0],
        id: `model-${i}`,
        name: `Test Model ${i}`,
      }))

      vi.mocked(modelService.loadModels).mockResolvedValue(largeModelList)

      const startTime = performance.now()
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select model/i })).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Verify reasonable render time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)

      // Verify virtualization for large lists
      const modelSelector = screen.getByRole('combobox', { name: /select model/i })
      await user.click(modelSelector)

      // Should not render all 100 options at once
      const visibleOptions = screen.getAllByRole('option')
      expect(visibleOptions.length).toBeLessThan(20) // Only visible options rendered
    })
  })
})
