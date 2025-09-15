import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelSelector } from './ModelSelector'
import { Model, ModelPrecision } from '../../types'

// Simple smoke test to verify the component renders
describe('ModelSelector Component', () => {
  const mockModels: Model[] = [
    {
      id: 'test-model',
      name: 'Test Model',
      description: 'A test model for validation',
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
        releaseDate: '2023-01-01',
        organization: 'Test Org',
        license: 'MIT',
        tags: ['test'],
      },
    },
  ]

  it('renders without crashing', () => {
    render(<ModelSelector models={mockModels} selectedModel={null} onModelSelect={() => {}} />)

    expect(screen.getByLabelText(/select model/i)).toBeInTheDocument()
  })

  it('shows helper text with model count', () => {
    render(<ModelSelector models={mockModels} selectedModel={null} onModelSelect={() => {}} />)

    expect(screen.getByText(/1 models available/i)).toBeInTheDocument()
  })

  it('displays error message when provided', () => {
    render(
      <ModelSelector
        models={mockModels}
        selectedModel={null}
        onModelSelect={() => {}}
        error="Test error message"
      />
    )

    // Should display error in both helper text and alert
    expect(screen.getAllByText(/test error message/i)).toHaveLength(2)
  })
})
