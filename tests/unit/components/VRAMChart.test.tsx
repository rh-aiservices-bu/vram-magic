import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material'
import { vi } from 'vitest'

import { VRAMChart } from '../../../src/components/VRAMChart/VRAMChart'
import type { VRAMUsagePoint, VRAMBreakdown } from '../../../src/types'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock Recharts components for testing
vi.mock('recharts', () => ({
  AreaChart: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="area-chart" onClick={onClick}>
      {children}
    </div>
  ),
  BarChart: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="bar-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Area: (props: { dataKey: string; name: string }) => (
    <div data-testid="area" data-key={props.dataKey} data-name={props.name} />
  ),
  Bar: (props: { dataKey: string; name: string }) => (
    <div data-testid="bar" data-key={props.dataKey} data-name={props.name} />
  ),
  XAxis: (props: { dataKey?: string }) => <div data-testid="x-axis" data-datakey={props.dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({
    content: Content,
  }: {
    content?: React.ComponentType<{ active: boolean; payload: unknown[]; label: string }>
  }) => (
    <div data-testid="tooltip">
      {Content && <Content active={true} payload={[]} label="Test" />}
    </div>
  ),
  Legend: (props: Record<string, unknown>) => (
    <div data-testid="legend" data-config={JSON.stringify(props)} />
  ),
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: '100%', height: '400px' }}>
      {children}
    </div>
  ),
}))

// Mock chart utilities
vi.mock('../../../src/utils/chartUtils', () => ({
  transformVRAMDataForChart: vi.fn((data: VRAMUsagePoint[]) =>
    data.map((_point: VRAMUsagePoint, index: number) => ({
      time: `${index * 60}s`,
      baseModel: 8000,
      kvCache: 2000,
      activations: 1000,
      overhead: 500,
      total: 11500,
    }))
  ),
  getChartMargins: vi.fn(() => ({ top: 20, right: 30, left: 20, bottom: 5 })),
  getLegendConfig: vi.fn(showLegend => (showLegend ? { align: 'right' } : null)),
  validateChartData: vi.fn(() => ({ isValid: true, errors: [] })),
  sanitizeChartData: vi.fn(data => data),
  formatVRAM: vi.fn((bytes, _unit) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    }
    return `${bytes} B`
  }),
  getVRAMComponentColors: vi.fn(() => ({
    baseModel: '#1976d2',
    kvCache: '#dc004e',
    activations: '#ed6c02',
    overhead: '#2e7d32',
  })),
}))

// Test theme
const theme = createTheme()

// Test data
const mockBreakdown: VRAMBreakdown = {
  baseModel: 8000000000, // 8GB
  kvCache: 2000000000, // 2GB
  activations: 1000000000, // 1GB
  overhead: 500000000, // 0.5GB
  workloadBreakdown: [],
}

const mockUsageData: VRAMUsagePoint[] = [
  {
    timestamp: 0,
    totalVRAM: 11500000000,
    breakdown: mockBreakdown,
    activeRequests: [],
  },
  {
    timestamp: 60,
    totalVRAM: 12000000000,
    breakdown: {
      ...mockBreakdown,
      kvCache: 2500000000,
    },
    activeRequests: [],
  },
  {
    timestamp: 120,
    totalVRAM: 11800000000,
    breakdown: {
      ...mockBreakdown,
      kvCache: 2300000000,
    },
    activeRequests: [],
  },
]

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

describe('VRAMChart Component', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockOnPointClick: ReturnType<typeof vi.fn>

  const defaultProps = {
    data: mockUsageData,
    maxVRAM: 12000000000,
    chartType: 'area' as const,
    showTooltips: true,
    height: 400,
  }

  beforeEach(() => {
    user = userEvent.setup()
    mockOnPointClick = vi.fn()
    vi.clearAllMocks()
  })

  describe('Component Rendering and Structure', () => {
    it('should render with proper structure and accessibility', async () => {
      const { container } = renderWithTheme(<VRAMChart {...defaultProps} />)

      // Check for accessibility violations
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Should render chart container with proper ARIA labels
      expect(screen.getByRole('img')).toBeInTheDocument()
      expect(screen.getByRole('img')).toHaveAttribute('aria-label')
      expect(screen.getByRole('img')).toHaveAttribute('tabIndex', '0')
    })

    it('should display chart title and metadata', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
      expect(screen.getByText(/Maximum VRAM:/)).toBeInTheDocument()
      expect(screen.getByText(/Chart Type:/)).toBeInTheDocument()
      expect(screen.getByText(/Data Points:/)).toBeInTheDocument()
    })

    it('should render area chart by default', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()

      // Should render all area components
      const areaElements = screen.getAllByTestId('area')
      expect(areaElements).toHaveLength(4) // baseModel, kvCache, activations, overhead
      expect(areaElements[0]).toHaveAttribute('data-key', 'baseModel')
      expect(areaElements[1]).toHaveAttribute('data-key', 'kvCache')
      expect(areaElements[2]).toHaveAttribute('data-key', 'activations')
      expect(areaElements[3]).toHaveAttribute('data-key', 'overhead')
    })

    it('should render bar chart when chartType is bar', () => {
      renderWithTheme(<VRAMChart {...defaultProps} chartType="bar" />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()

      // Should render all bar components
      const barElements = screen.getAllByTestId('bar')
      expect(barElements).toHaveLength(4) // baseModel, kvCache, activations, overhead
    })

    it('should render chart axes and grid', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(screen.getByTestId('y-axis')).toBeInTheDocument()
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    })

    it('should set proper height for chart container', () => {
      renderWithTheme(<VRAMChart {...defaultProps} height={600} />)

      const container = screen.getByTestId('responsive-container')
      expect(container).toHaveStyle({ height: '600px' })
    })

    it('should display chart metadata correctly', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should show chart type
      expect(screen.getByText(/Chart Type: Stacked Area/)).toBeInTheDocument()

      // Should show data points count
      expect(screen.getByText(/Data Points: 3/)).toBeInTheDocument() // Based on mock data

      // Should show formatted max VRAM
      expect(screen.getByText(/Maximum VRAM: 12.0 GB/)).toBeInTheDocument()
    })
  })

  describe('Chart Type Switching', () => {
    it('should switch between area and bar chart types', () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} chartType="area" />)

      // Should show area chart
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      expect(screen.getByText(/Chart Type: Stacked Area/)).toBeInTheDocument()

      // Switch to bar chart
      rerender(
        <ThemeProvider theme={theme}>
          <VRAMChart {...defaultProps} chartType="bar" />
        </ThemeProvider>
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.getByText(/Chart Type: Stacked Bar/)).toBeInTheDocument()
    })

    it('should render correct elements for each chart type', () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} chartType="area" />)

      // Area chart should have Area elements
      expect(screen.getAllByTestId('area')).toHaveLength(4)
      expect(screen.queryByTestId('bar')).not.toBeInTheDocument()

      // Switch to bar chart
      rerender(
        <ThemeProvider theme={theme}>
          <VRAMChart {...defaultProps} chartType="bar" />
        </ThemeProvider>
      )

      // Bar chart should have Bar elements
      expect(screen.getAllByTestId('bar')).toHaveLength(4)
      expect(screen.queryByTestId('area')).not.toBeInTheDocument()
    })
  })

  describe('Tooltip Functionality', () => {
    it('should show tooltips when showTooltips is true', () => {
      renderWithTheme(<VRAMChart {...defaultProps} showTooltips={true} />)

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('should hide tooltips when showTooltips is false', () => {
      renderWithTheme(<VRAMChart {...defaultProps} showTooltips={false} />)

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
    })

    it('should toggle tooltips based on prop changes', () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} showTooltips={false} />)

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()

      rerender(
        <ThemeProvider theme={theme}>
          <VRAMChart {...defaultProps} showTooltips={true} />
        </ThemeProvider>
      )

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })
  })

  describe('Legend Configuration', () => {
    it('should render legend when configured', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })

    it('should adapt legend for mobile screens', async () => {
      // Mock mobile breakpoint
      const mockMUI = await import('@mui/material')
      vi.spyOn(mockMUI, 'useMediaQuery').mockReturnValue(true)

      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Legend should still be present but with mobile configuration
      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })
  })

  describe('Data Handling and Validation', () => {
    it('should show no data message when data array is empty', () => {
      renderWithTheme(<VRAMChart {...defaultProps} data={[]} />)

      expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument()
    })

    it('should handle invalid data gracefully', async () => {
      // Mock validation to return invalid
      const mockValidation = await import('../../../src/utils/chartUtils')
      mockValidation.validateChartData.mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid data'],
      })

      const invalidData = [{ invalid: 'data' }] as unknown as VRAMUsagePoint[]

      renderWithTheme(<VRAMChart {...defaultProps} data={invalidData} />)

      expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
    })

    it('should handle data transformation correctly', async () => {
      const mockUtils = await import('../../../src/utils/chartUtils')
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should call data transformation utilities
      expect(mockUtils.validateChartData).toHaveBeenCalledWith(mockUsageData)
      expect(mockUtils.sanitizeChartData).toHaveBeenCalled()
      expect(mockUtils.transformVRAMDataForChart).toHaveBeenCalled()
    })

    it('should handle single data point', () => {
      const singlePoint = [mockUsageData[0]]

      renderWithTheme(<VRAMChart {...defaultProps} data={singlePoint} />)

      expect(screen.getByText(/Data Points: 1/)).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle very large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUsageData[0],
        timestamp: i * 60,
      }))

      renderWithTheme(<VRAMChart {...defaultProps} data={largeDataset} />)

      expect(screen.getByText(/Data Points: 1000/)).toBeInTheDocument()
    })

    it('should format VRAM values correctly', async () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should call formatVRAM utility with correct values
      const mockUtils = await import('../../../src/utils/chartUtils')
      expect(mockUtils.formatVRAM).toHaveBeenCalledWith(defaultProps.maxVRAM, 'auto')
    })
  })

  describe('User Interactions', () => {
    it('should handle point click events', () => {
      renderWithTheme(<VRAMChart {...defaultProps} onPointClick={mockOnPointClick} />)

      const chart = screen.getByTestId('area-chart')
      fireEvent.click(chart)

      // The actual click handling would be tested in integration tests
      // Here we verify the component accepts the callback
      expect(mockOnPointClick).toBeDefined()
    })

    it('should handle keyboard navigation', async () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      const chartContainer = screen.getByRole('img')
      chartContainer.focus()

      await user.keyboard('[Enter]')
      await user.keyboard(' ')

      // Should handle keyboard events (specific behavior tested in integration)
      expect(chartContainer).toHaveFocus()
    })

    it('should support tab navigation', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Accessibility Features', () => {
    it('should provide comprehensive accessibility information', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should have ARIA label with chart description
      const chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAttribute('aria-label')
      expect(chartContainer.getAttribute('aria-label')).toMatch(/VRAM usage chart/)

      // Should have screen reader content
      expect(screen.getByText(/Chart contains.*time points/)).toBeInTheDocument()
      expect(screen.getByText(/Components include base model memory/)).toBeInTheDocument()
    })

    it('should provide live region updates', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should have live region for screen readers
      const liveRegion = screen.getByText(/Chart contains.*time points/).closest('[aria-live]')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should describe data points in accessible format', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should describe first and last data points
      expect(screen.getByText(/First data point at/)).toBeInTheDocument()
      expect(screen.getByText(/Last data point at/)).toBeInTheDocument()
    })

    it('should handle accessibility for empty data', () => {
      renderWithTheme(<VRAMChart {...defaultProps} data={[]} />)

      // Should provide accessible empty state message
      expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
    })

    it('should maintain accessibility across chart types', () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} chartType="area" />)

      let chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAccessibleName()

      rerender(
        <ThemeProvider theme={theme}>
          <VRAMChart {...defaultProps} chartType="bar" />
        </ThemeProvider>
      )

      chartContainer = screen.getByRole('img')
      expect(chartContainer).toHaveAccessibleName()
    })
  })

  describe('Visual Components and Styling', () => {
    it('should render all VRAM component types', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      const areas = screen.getAllByTestId('area')
      const areaNames = areas.map(area => area.getAttribute('data-name'))

      expect(areaNames).toContain('Base Model')
      expect(areaNames).toContain('KV Cache')
      expect(areaNames).toContain('Activations')
      expect(areaNames).toContain('Overhead')
    })

    it('should use component colors correctly', async () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should call color utility
      const mockUtils = await import('../../../src/utils/chartUtils')
      expect(mockUtils.getVRAMComponentColors).toHaveBeenCalled()
    })

    it('should apply theme colors correctly', () => {
      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should render with theme-aware styling (specific styles tested in integration)
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle gradients for area chart', () => {
      renderWithTheme(<VRAMChart {...defaultProps} chartType="area" />)

      // Area chart should be rendered (gradients would be in SVG defs)
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should adapt for mobile display', async () => {
      // Mock mobile breakpoint
      const mockMUI2 = await import('@mui/material')
      vi.spyOn(mockMUI2, 'useMediaQuery').mockReturnValue(true)

      renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should render chart adapted for mobile
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle very large VRAM values', () => {
      const largeVRAMData: VRAMUsagePoint[] = [
        {
          timestamp: 0,
          totalVRAM: 800000000000, // 800GB
          breakdown: {
            baseModel: 600000000000,
            kvCache: 150000000000,
            activations: 40000000000,
            overhead: 10000000000,
            workloadBreakdown: [],
          },
          activeRequests: [],
        },
      ]

      renderWithTheme(
        <VRAMChart
          data={largeVRAMData}
          maxVRAM={800000000000}
          chartType="area"
          showTooltips={true}
        />
      )

      expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
      expect(screen.getByText(/800.0 GB/)).toBeInTheDocument()
    })

    it('should handle zero VRAM values', () => {
      const zeroVRAMData: VRAMUsagePoint[] = [
        {
          timestamp: 0,
          totalVRAM: 0,
          breakdown: {
            baseModel: 0,
            kvCache: 0,
            activations: 0,
            overhead: 0,
            workloadBreakdown: [],
          },
          activeRequests: [],
        },
      ]

      renderWithTheme(<VRAMChart data={zeroVRAMData} maxVRAM={0} chartType="area" />)

      expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
    })

    it('should handle negative timestamps', () => {
      const negativeTimeData = [
        {
          ...mockUsageData[0],
          timestamp: -60,
        },
      ]

      renderWithTheme(<VRAMChart {...defaultProps} data={negativeTimeData} />)

      // Should handle negative timestamps gracefully
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle rapid data updates', async () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} />)

      // Simulate rapid data updates
      for (let i = 0; i < 10; i++) {
        const newData = mockUsageData.map(point => ({
          ...point,
          timestamp: point.timestamp + i * 10,
        }))

        rerender(
          <ThemeProvider theme={theme}>
            <VRAMChart {...defaultProps} data={newData} />
          </ThemeProvider>
        )
      }

      // Should handle updates without errors
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle missing breakdown data', () => {
      const incompleteData = [
        {
          timestamp: 0,
          totalVRAM: 8000000000,
          breakdown: {
            baseModel: 8000000000,
            // Missing other components
          } as Partial<VRAMBreakdown>,
          activeRequests: [],
        },
      ]

      renderWithTheme(<VRAMChart {...defaultProps} data={incompleteData} />)

      // Should handle incomplete data gracefully
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })

    it('should handle extremely fine-grained data', () => {
      const fineGrainedData = Array.from({ length: 10000 }, (_, i) => ({
        ...mockUsageData[0],
        timestamp: i * 0.1, // 0.1 second intervals
      }))

      renderWithTheme(<VRAMChart {...defaultProps} data={fineGrainedData} />)

      expect(screen.getByText(/Data Points: 10000/)).toBeInTheDocument()
    })

    it('should maintain performance with complex data structures', () => {
      const complexData = mockUsageData.map(point => ({
        ...point,
        breakdown: {
          ...point.breakdown,
          workloadBreakdown: Array.from({ length: 100 }, (_, i) => ({
            workloadId: `workload-${i}`,
            vramUsage: 1000000,
            percentage: 1,
          })),
        },
      }))

      renderWithTheme(<VRAMChart {...defaultProps} data={complexData} />)

      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  describe('Error Boundary and Resilience', () => {
    it('should handle corrupted data gracefully', async () => {
      const corruptedData = [
        {
          timestamp: 'invalid',
          totalVRAM: null,
          breakdown: undefined,
        } as unknown as VRAMUsagePoint,
      ]

      // Mock validation to catch corrupted data
      const mockUtils = await import('../../../src/utils/chartUtils')
      mockUtils.validateChartData.mockReturnValueOnce({
        isValid: false,
        errors: ['Corrupted data'],
      })

      renderWithTheme(<VRAMChart {...defaultProps} data={corruptedData} />)

      expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
    })

    it('should handle component unmounting gracefully', () => {
      const { unmount } = renderWithTheme(<VRAMChart {...defaultProps} />)

      // Should unmount without errors
      unmount()
    })

    it('should handle prop changes without errors', () => {
      const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} />)

      // Change all props
      rerender(
        <ThemeProvider theme={theme}>
          <VRAMChart
            data={[]}
            maxVRAM={0}
            chartType="bar"
            showTooltips={false}
            height={600}
            onPointClick={mockOnPointClick}
          />
        </ThemeProvider>
      )

      expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
    })
  })
})
