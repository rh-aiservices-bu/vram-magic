// VRAM Magic: VRAMChart Component
// Recharts-based stacked area chart for VRAM usage visualization

import React, { useMemo, useRef, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  TooltipProps,
} from 'recharts'
import { useTheme } from '@mui/material/styles'
import { Paper, Box, Typography, useMediaQuery } from '@mui/material'

import type { VRAMChartProps, VRAMUsagePoint } from '../../types'
import {
  transformVRAMDataForChart,
  getChartMargins,
  getLegendConfig,
  formatVRAM,
  getVRAMComponentColors,
  windowChartData,
} from '../../utils/chartUtils'

// ============================================================================
// Custom Tooltip Component
// ============================================================================

interface CustomTooltipProps extends TooltipProps<number, string> {
  showWorkloadBreakdown?: boolean
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0)

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        maxWidth: 300,
      }}
    >
      <Typography variant="subtitle2" gutterBottom>
        Time: {label}
      </Typography>

      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
        Total VRAM: {formatVRAM(total * 1024 * 1024, 'auto')}
      </Typography>

      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {payload
          .filter(entry => (entry.value || 0) > 0)
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .map((entry, index) => {
            const percentage = total > 0 ? (((entry.value || 0) / total) * 100).toFixed(1) : '0.0'
            return (
              <Box
                key={index}
                component="li"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      bgcolor: entry.color,
                      borderRadius: 0.5,
                      mr: 1,
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {entry.name}:
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', ml: 1 }}
                >
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}>
                    {formatVRAM((entry.value || 0) * 1024 * 1024, 'auto')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {percentage}%
                  </Typography>
                </Box>
              </Box>
            )
          })}
      </Box>
    </Paper>
  )
}

// ============================================================================
// Main VRAMChart Component
// ============================================================================

export const VRAMChart: React.FC<VRAMChartProps> = ({
  data,
  maxVRAM,
  chartType = 'area',
  showTooltips = true,
  height = 400,
  onPointClick,
}) => {
  const theme = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Type guard function for VRAMUsagePoint
  const isVRAMUsagePoint = (data: unknown): data is VRAMUsagePoint => {
    if (!data || typeof data !== 'object') return false
    const point = data as Record<string, unknown>

    // Check basic structure
    if (typeof point.timestamp !== 'number' || typeof point.totalVRAM !== 'number') {
      return false
    }

    // Check breakdown exists and is an object
    if (!point.breakdown || typeof point.breakdown !== 'object' || point.breakdown === null) {
      return false
    }

    const breakdown = point.breakdown as Record<string, unknown>
    return (
      typeof breakdown.baseModel === 'number' &&
      typeof breakdown.kvCache === 'number' &&
      typeof breakdown.activations === 'number' &&
      typeof breakdown.overhead === 'number'
    )
  }

  // Validate and transform data with type safety
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) {
      console.warn('Chart data must be an array')
      return []
    }

    if (data.length === 0) {
      return []
    }

    // Filter and validate data points
    const validatedData = data.filter(isVRAMUsagePoint)

    if (validatedData.length === 0) {
      console.warn('No valid VRAMUsagePoint data found')
      return []
    }

    if (validatedData.length < data.length) {
      console.warn(`Filtered out ${data.length - validatedData.length} invalid data points`)
    }

    // Apply windowing for large datasets to improve performance
    const windowedData = windowChartData(validatedData, 1000)

    if (windowedData.length < validatedData.length) {
      console.info(
        `Windowed chart data from ${validatedData.length} to ${windowedData.length} points for performance`
      )
    }

    return transformVRAMDataForChart(windowedData)
  }, [data])

  // Generate component colors
  const componentColors = useMemo(() => getVRAMComponentColors(), [])

  // Chart configuration
  const margins = useMemo(() => getChartMargins(chartType), [chartType])
  const legendConfig = useMemo(() => getLegendConfig(!isMobile), [isMobile])

  // Handle point clicks for accessibility
  const handlePointClick = useCallback(
    (_entry: unknown, index: number) => {
      if (onPointClick && data[index]) {
        onPointClick(data[index])
      }
    },
    [onPointClick, data]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // Focus handling for chart elements would be implemented here
      // This is a placeholder for full keyboard navigation
    }
  }, [])

  // Render chart based on type
  const renderChart = () => {
    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={margins} onClick={handlePointClick}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.6} />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={{ stroke: theme.palette.divider }}
          />
          <YAxis
            label={{
              value: 'VRAM (MB)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: theme.palette.text.secondary },
            }}
            tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
            axisLine={{ stroke: theme.palette.divider }}
            tickLine={{ stroke: theme.palette.divider }}
          />
          {showTooltips && (
            <Tooltip content={<CustomTooltip />} cursor={{ fill: theme.palette.action.hover }} />
          )}
          {legendConfig && <Legend {...legendConfig} />}

          <Bar
            dataKey="baseModel"
            stackId="vram"
            fill={componentColors.baseModel}
            name="Base Model"
          />
          <Bar dataKey="kvCache" stackId="vram" fill={componentColors.kvCache} name="KV Cache" />
          <Bar
            dataKey="activations"
            stackId="vram"
            fill={componentColors.activations}
            name="Activations"
          />
          <Bar dataKey="overhead" stackId="vram" fill={componentColors.overhead} name="Overhead" />
        </BarChart>
      )
    }

    // Default to area chart
    return (
      <AreaChart data={chartData} margin={margins} onClick={handlePointClick}>
        <defs>
          {/* Gradients for better visual appeal */}
          <linearGradient id="baseModelGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={componentColors.baseModel} stopOpacity={0.8} />
            <stop offset="95%" stopColor={componentColors.baseModel} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="kvCacheGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={componentColors.kvCache} stopOpacity={0.8} />
            <stop offset="95%" stopColor={componentColors.kvCache} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="activationsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={componentColors.activations} stopOpacity={0.8} />
            <stop offset="95%" stopColor={componentColors.activations} stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="overheadGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={componentColors.overhead} stopOpacity={0.8} />
            <stop offset="95%" stopColor={componentColors.overhead} stopOpacity={0.3} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} opacity={0.6} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={{ stroke: theme.palette.divider }}
        />
        <YAxis
          label={{
            value: 'VRAM (MB)',
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: theme.palette.text.secondary },
          }}
          tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={{ stroke: theme.palette.divider }}
        />
        {showTooltips && (
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: theme.palette.primary.main, strokeWidth: 1 }}
          />
        )}
        {legendConfig && <Legend {...legendConfig} />}

        <Area
          type="monotone"
          dataKey="baseModel"
          stackId="1"
          stroke={componentColors.baseModel}
          fill="url(#baseModelGradient)"
          name="Base Model"
        />
        <Area
          type="monotone"
          dataKey="kvCache"
          stackId="1"
          stroke={componentColors.kvCache}
          fill="url(#kvCacheGradient)"
          name="KV Cache"
        />
        <Area
          type="monotone"
          dataKey="activations"
          stackId="1"
          stroke={componentColors.activations}
          fill="url(#activationsGradient)"
          name="Activations"
        />
        <Area
          type="monotone"
          dataKey="overhead"
          stackId="1"
          stroke={componentColors.overhead}
          fill="url(#overheadGradient)"
          name="Overhead"
        />
      </AreaChart>
    )
  }

  if (chartData.length === 0) {
    return (
      <Paper
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No data available for chart visualization
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      ref={chartRef}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
      }}
      role="img"
      aria-label={`VRAM usage chart showing ${chartData.length} data points with maximum VRAM of ${formatVRAM(maxVRAM, 'auto')}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          VRAM Usage Over Time
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Maximum VRAM: {formatVRAM(maxVRAM, 'auto')} | Chart Type:{' '}
          {chartType === 'area' ? 'Stacked Area' : 'Stacked Bar'} | Data Points: {chartData.length}
        </Typography>
      </Box>

      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>

      {/* Screen reader accessible summary */}
      <Box
        component="div"
        sx={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
        aria-live="polite"
      >
        <Typography component="p">
          Chart contains {chartData.length} time points showing VRAM usage breakdown. Components
          include base model memory, KV cache, activations, and overhead. Maximum total VRAM usage
          is {formatVRAM(maxVRAM, 'auto')}.
          {chartData.length > 0 &&
            ` First data point at ${chartData[0].time} shows ${formatVRAM(chartData[0].total * 1024 * 1024, 'auto')} total usage.`}
          {chartData.length > 1 &&
            ` Last data point at ${chartData[chartData.length - 1].time} shows ${formatVRAM(chartData[chartData.length - 1].total * 1024 * 1024, 'auto')} total usage.`}
        </Typography>
      </Box>
    </Paper>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedVRAMChart = React.memo(VRAMChart, (prevProps, nextProps) => {
  return (
    prevProps.chartType === nextProps.chartType &&
    prevProps.showTooltips === nextProps.showTooltips &&
    prevProps.height === nextProps.height &&
    prevProps.maxVRAM === nextProps.maxVRAM &&
    prevProps.data.length === nextProps.data.length &&
    // For data array, check if first and last items are the same (optimization)
    (prevProps.data.length === 0 ||
      (prevProps.data[0]?.timestamp === nextProps.data[0]?.timestamp &&
        prevProps.data[prevProps.data.length - 1]?.timestamp ===
          nextProps.data[nextProps.data.length - 1]?.timestamp))
  )
})

export default MemoizedVRAMChart
