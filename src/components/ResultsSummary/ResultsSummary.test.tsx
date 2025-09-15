// VRAM Magic: ResultsSummary Component Tests
// Test suite for the ResultsSummary component

import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import '@testing-library/jest-dom'

import { ResultsSummary } from './index'
import type { SimulationResults, Model, ModelPrecision } from '../../types'

// Mock theme for testing
const theme = createTheme()

// Test wrapper with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
)

// Mock simulation results
const mockResults: SimulationResults = {
  maxVRAM: 25 * 1024 * 1024 * 1024, // 25GB in bytes
  averageVRAM: 20 * 1024 * 1024 * 1024, // 20GB in bytes
  usagePoints: [
    {
      timestamp: 0,
      totalVRAM: 20 * 1024 * 1024 * 1024,
      breakdown: {
        baseModel: 15 * 1024 * 1024 * 1024,
        kvCache: 3 * 1024 * 1024 * 1024,
        activations: 1.5 * 1024 * 1024 * 1024,
        overhead: 0.5 * 1024 * 1024 * 1024,
        workloadBreakdown: [],
      },
      activeRequests: [],
    },
    {
      timestamp: 60,
      totalVRAM: 25 * 1024 * 1024 * 1024,
      breakdown: {
        baseModel: 15 * 1024 * 1024 * 1024,
        kvCache: 6 * 1024 * 1024 * 1024,
        activations: 3 * 1024 * 1024 * 1024,
        overhead: 1 * 1024 * 1024 * 1024,
        workloadBreakdown: [],
      },
      activeRequests: [],
    },
  ],
  recommendations: [
    'Consider using a GPU with at least 26GB VRAM for optimal performance',
    'Monitor memory usage during peak load times',
  ],
  warnings: ['VRAM usage exceeds 90% of available memory at peak times'],
  calculatedAt: Date.now(),
}

const mockModel: Model = {
  id: 'llama-2-70b',
  name: 'Llama 2 70B',
  description: 'Large language model',
  parameters: 70000000000,
  precision: ModelPrecision.FP16,
  architecture: {
    layers: 80,
    hiddenSize: 8192,
    attentionHeads: 64,
    vocabularySize: 32000,
    maxSequenceLength: 4096,
  },
  vramRequirements: {
    baseVRAM: 15 * 1024 * 1024 * 1024,
    kvCacheCoefficient: 1.2,
    activationMultiplier: 4,
    overheadFactor: 0.1,
  },
  performance: [],
  metadata: {
    releaseDate: '2023-07-01',
    organization: 'Meta',
    license: 'Custom',
    tags: ['language-model', 'chat'],
  },
}

describe('ResultsSummary Component', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={null} model={null} />
      </TestWrapper>
    )
    expect(screen.getByText('No Results Available')).toBeInTheDocument()
  })

  it('shows loading state correctly', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={null} model={null} loading={true} />
      </TestWrapper>
    )
    // Check for skeleton loaders
    expect(document.querySelector('.MuiSkeleton-root')).toBeInTheDocument()
  })

  it('displays simulation results with VRAM information', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={mockResults} model={mockModel} />
      </TestWrapper>
    )

    expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
    expect(screen.getByText('25 GB')).toBeInTheDocument() // Max VRAM
    expect(screen.getByText('Maximum VRAM Required')).toBeInTheDocument()
  })

  it('shows GPU recommendations', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={mockResults} model={mockModel} />
      </TestWrapper>
    )

    expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()
    // Should show some GPU models with VRAM >= 25GB
    expect(screen.getAllByText('A100')).toHaveLength(2) // One in top 3 recommendations, one in complete list
    expect(screen.getAllByText('H100')).toHaveLength(2)
  })

  it('displays warnings and recommendations', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={mockResults} model={mockModel} />
      </TestWrapper>
    )

    expect(screen.getByText('Warnings')).toBeInTheDocument()
    expect(
      screen.getByText('VRAM usage exceeds 90% of available memory at peak times')
    ).toBeInTheDocument()

    expect(screen.getByText('Recommendations')).toBeInTheDocument()
    expect(
      screen.getByText('Consider using a GPU with at least 26GB VRAM for optimal performance')
    ).toBeInTheDocument()
  })

  it('includes export buttons', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={mockResults} model={mockModel} />
      </TestWrapper>
    )

    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('PNG')).toBeInTheDocument()
  })

  it('shows summary statistics', () => {
    render(
      <TestWrapper>
        <ResultsSummary results={mockResults} model={mockModel} />
      </TestWrapper>
    )

    expect(screen.getByText('Summary Statistics')).toBeInTheDocument()
    expect(screen.getByText('Average VRAM')).toBeInTheDocument()
    expect(screen.getByText('Peak Utilization')).toBeInTheDocument()
    expect(screen.getByText('Data Points')).toBeInTheDocument()
  })
})

export default {}
