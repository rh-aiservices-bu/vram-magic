// VRAM Magic: VRAMChart Component Tests
// Test suite for VRAMChart component functionality

import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

import { VRAMChart } from './VRAMChart'
import type { VRAMUsagePoint, VRAMBreakdown } from '../../types'

// Mock Recharts components for testing
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
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
]

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

describe('VRAMChart Component', () => {
  const defaultProps = {
    data: mockUsageData,
    maxVRAM: 12000000000,
    chartType: 'area' as const,
    showTooltips: true,
    height: 400,
  }

  it('renders chart container with proper ARIA labels', () => {
    renderWithTheme(<VRAMChart {...defaultProps} />)

    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute('aria-label')
    expect(screen.getByRole('img')).toHaveAttribute('tabIndex', '0')
  })

  it('displays chart title and metadata', () => {
    renderWithTheme(<VRAMChart {...defaultProps} />)

    expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
    expect(screen.getByText(/Maximum VRAM:/)).toBeInTheDocument()
    expect(screen.getByText(/Chart Type:/)).toBeInTheDocument()
    expect(screen.getByText(/Data Points:/)).toBeInTheDocument()
  })

  it('renders area chart by default', () => {
    renderWithTheme(<VRAMChart {...defaultProps} />)

    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('renders bar chart when chartType is bar', () => {
    renderWithTheme(<VRAMChart {...defaultProps} chartType="bar" />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('shows no data message when data array is empty', () => {
    renderWithTheme(<VRAMChart {...defaultProps} data={[]} />)

    expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
  })

  it('includes accessibility features', () => {
    renderWithTheme(<VRAMChart {...defaultProps} />)

    // Check for screen reader content
    expect(screen.getByText(/Chart contains.*time points/)).toBeInTheDocument()
    expect(screen.getByText(/Components include base model memory/)).toBeInTheDocument()
  })

  it('handles point click callback', () => {
    const onPointClick = vi.fn()
    renderWithTheme(<VRAMChart {...defaultProps} onPointClick={onPointClick} />)

    // Component should be rendered with click handler (actual click testing would require more complex setup)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('respects showTooltips prop', () => {
    const { rerender } = renderWithTheme(<VRAMChart {...defaultProps} showTooltips={false} />)

    // Tooltip should not be rendered when showTooltips is false
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()

    // Re-render with tooltips enabled
    rerender(
      <ThemeProvider theme={theme}>
        <VRAMChart {...defaultProps} showTooltips={true} />
      </ThemeProvider>
    )

    // Now tooltip should be present
    expect(screen.getByTestId('tooltip')).toBeInTheDocument()
  })

  it('handles invalid data gracefully', () => {
    const invalidData = [
      { timestamp: NaN, totalVRAM: 0, breakdown: mockBreakdown, activeRequests: [] },
    ] as VRAMUsagePoint[]

    renderWithTheme(<VRAMChart {...defaultProps} data={invalidData} />)

    // Should show no data message for invalid data
    expect(screen.getByText('No data available for chart visualization')).toBeInTheDocument()
  })

  it('formats VRAM values correctly in accessibility content', () => {
    renderWithTheme(<VRAMChart {...defaultProps} />)

    // Check that VRAM values are formatted with units
    const accessibilityText = screen.getByText(/Maximum total VRAM usage is/)
    expect(accessibilityText.textContent).toMatch(/GB|MB/)
  })
})

describe('VRAMChart Component Edge Cases', () => {
  it('handles very large VRAM values', () => {
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
      <VRAMChart data={largeVRAMData} maxVRAM={800000000000} chartType="area" showTooltips={true} />
    )

    expect(screen.getByText('VRAM Usage Over Time')).toBeInTheDocument()
  })

  it('handles single data point', () => {
    const singlePoint = [mockUsageData[0]]

    renderWithTheme(
      <VRAMChart
        data={singlePoint}
        maxVRAM={singlePoint[0].totalVRAM}
        chartType="area"
        showTooltips={true}
      />
    )

    expect(screen.getByText(/Data Points: 1/)).toBeInTheDocument()
  })
})
