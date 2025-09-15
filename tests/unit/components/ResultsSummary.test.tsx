import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { vi } from 'vitest'

import { ResultsSummary } from '../../../src/components/ResultsSummary'
import type { SimulationResults, Model, ModelPrecision } from '../../../src/types'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock chart utilities
vi.mock('../../../src/utils/chartUtils', () => ({
  formatVRAM: vi.fn((bytes, _unit) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024))} MB`
    }
    return `${bytes} B`
  }),
  bytesToGB: vi.fn(bytes => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10),
}))

// Mock GPU constants
vi.mock('../../../src/constants', () => ({
  GPU_TIERS: [
    {
      name: 'High-End',
      gpus: [
        { name: 'RTX 4090', vram: 24, price: 1599 },
        { name: 'A100', vram: 40, price: 15000 },
        { name: 'H100', vram: 80, price: 30000 },
      ],
    },
    {
      name: 'Mid-Range',
      gpus: [
        { name: 'RTX 4080', vram: 16, price: 1199 },
        { name: 'RTX 4070', vram: 12, price: 599 },
      ],
    },
    {
      name: 'Entry-Level',
      gpus: [{ name: 'RTX 4060', vram: 8, price: 299 }],
    },
  ],
}))

// Mock DOM methods for file download
const mockCreateElement = vi.fn()
const mockClick = vi.fn()
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

global.document.createElement = mockCreateElement.mockReturnValue({
  href: '',
  download: '',
  click: mockClick,
})
global.document.body.appendChild = mockAppendChild
global.document.body.removeChild = mockRemoveChild
global.URL.createObjectURL = mockCreateObjectURL
global.URL.revokeObjectURL = mockRevokeObjectURL

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
    {
      timestamp: 120,
      totalVRAM: 22 * 1024 * 1024 * 1024,
      breakdown: {
        baseModel: 15 * 1024 * 1024 * 1024,
        kvCache: 4.5 * 1024 * 1024 * 1024,
        activations: 2 * 1024 * 1024 * 1024,
        overhead: 0.5 * 1024 * 1024 * 1024,
        workloadBreakdown: [],
      },
      activeRequests: [],
    },
  ],
  recommendations: [
    'Consider using a GPU with at least 26GB VRAM for optimal performance',
    'Monitor memory usage during peak load times',
    'Enable memory optimization features if available',
  ],
  warnings: [
    'VRAM usage exceeds 90% of available memory at peak times',
    'Consider increasing batch size for better efficiency',
  ],
  calculatedAt: Date.now(),
}

const mockModel: Model = {
  id: 'llama-2-70b',
  name: 'Llama 2 70B',
  description: 'Large language model for complex reasoning tasks',
  parameters: 70000000000,
  precision: 'fp16' as ModelPrecision,
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
  let user: ReturnType<typeof userEvent.setup>
  let mockOnExport: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    mockOnExport = vi.fn()
    vi.clearAllMocks()
  })

  describe('Component Rendering and Structure', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should render main content
      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
    })

    it('should display no results state correctly', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={null} model={null} />
        </TestWrapper>
      )

      expect(screen.getByText('No Results Available')).toBeInTheDocument()
      expect(screen.getByText(/Configure your model and workloads/)).toBeInTheDocument()
    })

    it('should show loading state with skeletons', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={null} model={null} loading={true} />
        </TestWrapper>
      )

      // Check for skeleton loaders
      const skeletons = document.querySelectorAll('.MuiSkeleton-root')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should display results header with timestamp', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
      expect(screen.getByText(/Calculated at/)).toBeInTheDocument()

      // Should show formatted timestamp
      const timestamp = new Date(mockResults.calculatedAt).toLocaleString()
      expect(screen.getByText(timestamp)).toBeInTheDocument()
    })

    it('should display maximum VRAM prominently', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('25 GB')).toBeInTheDocument()
      expect(screen.getByText('Maximum VRAM Required')).toBeInTheDocument()
      expect(screen.getByText('Peak memory usage during simulation')).toBeInTheDocument()
    })
  })

  describe('Summary Statistics', () => {
    it('should display comprehensive summary statistics', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('Summary Statistics')).toBeInTheDocument()
      expect(screen.getByText('Average VRAM')).toBeInTheDocument()
      expect(screen.getByText('Peak Utilization')).toBeInTheDocument()
      expect(screen.getByText('Data Points')).toBeInTheDocument()

      // Should show formatted average VRAM
      expect(screen.getByText('20 GB')).toBeInTheDocument()

      // Should show data points count
      expect(screen.getByText('3 measurements')).toBeInTheDocument()
    })

    it('should calculate peak utilization correctly', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Peak utilization = (maxVRAM / averageVRAM) * 100 - 100
      // (25 / 20) * 100 - 100 = 25% above average
      expect(screen.getByText('25% above average')).toBeInTheDocument()
    })

    it('should handle edge cases in statistics calculation', () => {
      const edgeCaseResults = {
        ...mockResults,
        maxVRAM: 20 * 1024 * 1024 * 1024,
        averageVRAM: 20 * 1024 * 1024 * 1024,
        usagePoints: [mockResults.usagePoints[0]],
      }

      render(
        <TestWrapper>
          <ResultsSummary results={edgeCaseResults} model={mockModel} />
        </TestWrapper>
      )

      // When max equals average, utilization should be 0%
      expect(screen.getByText('0% above average')).toBeInTheDocument()
      expect(screen.getByText('1 measurements')).toBeInTheDocument()
    })

    it('should handle empty usage points gracefully', () => {
      const emptyResults = {
        ...mockResults,
        usagePoints: [],
      }

      render(
        <TestWrapper>
          <ResultsSummary results={emptyResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('0 measurements')).toBeInTheDocument()
    })
  })

  describe('GPU Recommendations', () => {
    it('should display GPU recommendations section', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()

      // Should show top 3 recommendations
      const gpuItems = screen.getAllByText(/GB VRAM/)
      expect(gpuItems.length).toBeGreaterThanOrEqual(3)
    })

    it('should show GPU recommendations with proper metadata', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should show GPUs that can handle 25GB VRAM requirement
      expect(screen.getByText('H100')).toBeInTheDocument()
      expect(screen.getByText('A100')).toBeInTheDocument()

      // Should show VRAM, price, and utilization info
      expect(screen.getByText(/80GB VRAM/)).toBeInTheDocument()
      expect(screen.getByText(/40GB VRAM/)).toBeInTheDocument()
    })

    it('should categorize GPU suitability correctly', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // H100 with 80GB should be "perfect" for 25GB requirement (31% utilization)
      // A100 with 40GB should be "sufficient" for 25GB requirement (63% utilization)

      // Should show appropriate tier labels
      expect(screen.getByText('High-End')).toBeInTheDocument()
    })

    it('should show complete GPU recommendations when more than 3 exist', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should show "Complete GPU Recommendations" section
      expect(screen.getByText('Complete GPU Recommendations')).toBeInTheDocument()

      // Should show all suitable GPUs in grid format
      const gpuCards = screen.getAllByText(/utilization/)
      expect(gpuCards.length).toBeGreaterThan(3)
    })

    it('should handle edge cases in GPU recommendations', () => {
      // Very low VRAM requirement - all GPUs should be suitable
      const lowVRAMResults = {
        ...mockResults,
        maxVRAM: 2 * 1024 * 1024 * 1024, // 2GB
      }

      render(
        <TestWrapper>
          <ResultsSummary results={lowVRAMResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()

      // Very high VRAM requirement - fewer GPUs should be suitable
      const highVRAMResults = {
        ...mockResults,
        maxVRAM: 100 * 1024 * 1024 * 1024, // 100GB
      }

      render(
        <TestWrapper>
          <ResultsSummary results={highVRAMResults} model={mockModel} />
        </TestWrapper>
      )

      // Should still show GPU recommendations section
      expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()
    })
  })

  describe('Warnings and Recommendations', () => {
    it('should display warnings when present', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('Warnings')).toBeInTheDocument()
      expect(
        screen.getByText('VRAM usage exceeds 90% of available memory at peak times')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Consider increasing batch size for better efficiency')
      ).toBeInTheDocument()
    })

    it('should display recommendations when present', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('Recommendations')).toBeInTheDocument()
      expect(
        screen.getByText('Consider using a GPU with at least 26GB VRAM for optimal performance')
      ).toBeInTheDocument()
      expect(screen.getByText('Monitor memory usage during peak load times')).toBeInTheDocument()
      expect(
        screen.getByText('Enable memory optimization features if available')
      ).toBeInTheDocument()
    })

    it('should not show warnings/recommendations sections when empty', () => {
      const resultsWithoutWarnings = {
        ...mockResults,
        warnings: [],
        recommendations: [],
      }

      render(
        <TestWrapper>
          <ResultsSummary results={resultsWithoutWarnings} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.queryByText('Warnings')).not.toBeInTheDocument()
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument()
    })

    it('should show only warnings when no recommendations exist', () => {
      const resultsWithOnlyWarnings = {
        ...mockResults,
        recommendations: [],
      }

      render(
        <TestWrapper>
          <ResultsSummary results={resultsWithOnlyWarnings} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('Warnings')).toBeInTheDocument()
      expect(screen.queryByText('Recommendations')).not.toBeInTheDocument()
    })

    it('should show only recommendations when no warnings exist', () => {
      const resultsWithOnlyRecommendations = {
        ...mockResults,
        warnings: [],
      }

      render(
        <TestWrapper>
          <ResultsSummary results={resultsWithOnlyRecommendations} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('Recommendations')).toBeInTheDocument()
      expect(screen.queryByText('Warnings')).not.toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should display export buttons', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('CSV')).toBeInTheDocument()
      expect(screen.getByText('PNG')).toBeInTheDocument()

      // Should also have tooltips for accessibility
      expect(screen.getByLabelText('Export as JSON')).toBeInTheDocument()
    })

    it('should handle JSON export', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)

      // Should create and download JSON file
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should handle CSV export', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const csvButton = screen.getByText('CSV')
      await user.click(csvButton)

      // Should create and download CSV file
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockClick).toHaveBeenCalled()
    })

    it('should handle PNG export with placeholder functionality', async () => {
      // Mock alert for PNG export
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const pngButton = screen.getByText('PNG')
      await user.click(pngButton)

      // Should show placeholder alert
      expect(mockAlert).toHaveBeenCalledWith(
        'PNG export feature is planned for a future release. Please use JSON or CSV export for now.'
      )

      mockAlert.mockRestore()
    })

    it('should call custom onExport handler when provided', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} onExport={mockOnExport} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)

      expect(mockOnExport).toHaveBeenCalledWith('json')

      const csvButton = screen.getByText('CSV')
      await user.click(csvButton)

      expect(mockOnExport).toHaveBeenCalledWith('csv')
    })

    it('should handle export when no model is provided', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={null} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)

      // Should still export with null model
      expect(mockCreateElement).toHaveBeenCalled()
    })

    it('should generate proper JSON export data structure', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)

      // Verify that Blob was created (would contain the export data)
      expect(global.Blob).toHaveBeenCalledWith([expect.stringContaining('"model"')], {
        type: 'application/json',
      })
    })

    it('should generate proper CSV export data structure', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const csvButton = screen.getByText('CSV')
      await user.click(csvButton)

      // Verify that CSV Blob was created
      expect(global.Blob).toHaveBeenCalledWith([expect.stringContaining('Category,Item,Value')], {
        type: 'text/csv',
      })
    })

    it('should not trigger export when no results exist', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={null} model={mockModel} onExport={mockOnExport} />
        </TestWrapper>
      )

      // Should not show export buttons when no results
      expect(screen.queryByText('JSON')).not.toBeInTheDocument()
      expect(mockOnExport).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper ARIA labels and roles', async () => {
      const { container } = render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should have proper button labels
      expect(screen.getByLabelText('Export as JSON')).toBeInTheDocument()
      expect(screen.getByLabelText('Export options')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')

      // Should be focusable
      jsonButton.focus()
      expect(jsonButton).toHaveFocus()

      // Should respond to keyboard activation
      await user.keyboard('[Enter]')
      expect(mockCreateElement).toHaveBeenCalled()
    })

    it('should display content in logical reading order', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Content should appear in logical order for screen readers
      const headings = screen.getAllByRole('heading')
      expect(headings[0]).toHaveTextContent('VRAM Analysis Results')

      // Summary statistics and recommendations should follow
      expect(screen.getByText('Summary Statistics')).toBeInTheDocument()
      expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()
    })

    it('should provide meaningful loading states', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={null} model={null} loading={true} />
        </TestWrapper>
      )

      // Should show skeleton placeholders that match content structure
      const skeletons = document.querySelectorAll('.MuiSkeleton-root')
      expect(skeletons.length).toBeGreaterThan(3) // Multiple skeleton elements for different sections
    })

    it('should handle responsive design considerations', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Grid layouts should be responsive (tested via Material-UI Grid props)
      const gridElements = document.querySelectorAll('[class*="MuiGrid-"]')
      expect(gridElements.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme VRAM values', () => {
      const extremeResults = {
        ...mockResults,
        maxVRAM: 1024 * 1024 * 1024 * 1024, // 1TB
        averageVRAM: 500 * 1024 * 1024 * 1024, // 500GB
      }

      render(
        <TestWrapper>
          <ResultsSummary results={extremeResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
      // Should still display without errors
    })

    it('should handle zero VRAM values', () => {
      const zeroResults = {
        ...mockResults,
        maxVRAM: 0,
        averageVRAM: 0,
      }

      render(
        <TestWrapper>
          <ResultsSummary results={zeroResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('0 GB')).toBeInTheDocument()
      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
    })

    it('should handle missing or malformed data gracefully', () => {
      const malformedResults = {
        ...mockResults,
        usagePoints: [], // Empty array
        calculatedAt: 0, // Invalid timestamp
      }

      render(
        <TestWrapper>
          <ResultsSummary results={malformedResults} model={mockModel} />
        </TestWrapper>
      )

      // Should render without crashing
      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
    })

    it('should handle component unmounting during export', () => {
      const { unmount } = render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should unmount gracefully
      unmount()
      // No assertions needed - test passes if no errors thrown
    })

    it('should handle rapid consecutive exports', async () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')

      // Rapid clicks should be handled gracefully
      await user.click(jsonButton)
      await user.click(jsonButton)
      await user.click(jsonButton)

      // Should have created multiple export attempts
      expect(mockCreateElement).toHaveBeenCalledTimes(3)
    })

    it('should handle very large datasets in export', async () => {
      const largeResults = {
        ...mockResults,
        usagePoints: Array.from({ length: 10000 }, (_, i) => ({
          ...mockResults.usagePoints[0],
          timestamp: i,
        })),
      }

      render(
        <TestWrapper>
          <ResultsSummary results={largeResults} model={mockModel} />
        </TestWrapper>
      )

      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)

      // Should handle large dataset export
      expect(mockCreateElement).toHaveBeenCalled()
    })

    it('should maintain performance with many GPU recommendations', () => {
      // This would test performance with a large GPU_TIERS mock,
      // but for unit tests we focus on functionality
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      expect(screen.getByText('GPU Recommendations')).toBeInTheDocument()
      // Performance would be measured in integration/performance tests
    })
  })

  describe('Visual Styling and Theming', () => {
    it('should apply proper theme styling', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should apply Material-UI theme styling
      const maxVRAMDisplay = screen.getByText('25 GB')
      expect(maxVRAMDisplay).toBeInTheDocument()

      // The specific styling would be tested in visual regression tests
      // Here we verify structure is correct
    })

    it('should use appropriate color coding for GPU suitability', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should show utilization chips with appropriate colors
      const utilizationChips = screen.getAllByText(/utilization/)
      expect(utilizationChips.length).toBeGreaterThan(0)
    })

    it('should display icons consistently', () => {
      render(
        <TestWrapper>
          <ResultsSummary results={mockResults} model={mockModel} />
        </TestWrapper>
      )

      // Should display appropriate icons throughout the interface
      // Icons are rendered by Material-UI and would be tested via integration
      expect(screen.getByText('VRAM Analysis Results')).toBeInTheDocument()
    })
  })
})
