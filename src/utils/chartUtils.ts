// VRAM Magic: Chart Utilities
// Utilities for Recharts configuration and data transformation

import type { VRAMUsagePoint, VRAMBreakdown, WorkloadSlot, Workload } from '../types'
import { CHART_COLORS, WORKLOAD_COLORS } from '../constants'

// ============================================================================
// Chart Data Transformation
// ============================================================================

/**
 * Transform VRAM usage points for stacked area chart
 * @param usagePoints - Array of VRAM usage points
 * @returns Transformed data suitable for Recharts
 */
export function transformVRAMDataForChart(usagePoints: VRAMUsagePoint[]): Array<{
  timestamp: number
  time: string
  baseModel: number
  kvCache: number
  activations: number
  overhead: number
  total: number
}> {
  return usagePoints.map(point => ({
    timestamp: point.timestamp,
    time: formatTimestamp(point.timestamp),
    baseModel: bytesToMB(point.breakdown.baseModel),
    kvCache: bytesToMB(point.breakdown.kvCache),
    activations: bytesToMB(point.breakdown.activations),
    overhead: bytesToMB(point.breakdown.overhead),
    total: bytesToMB(point.totalVRAM),
  }))
}

/**
 * Transform workload data for pie chart
 * @param workloadSlots - Active workload slots
 * @returns Data suitable for Recharts pie chart
 */
export function transformWorkloadDataForPieChart(workloadSlots: WorkloadSlot[]): Array<{
  name: string
  value: number
  color: string
  category: string
}> {
  return workloadSlots
    .filter(slot => slot.isActive && slot.workload && slot.percentage > 0)
    .map(slot => ({
      name: slot.workload!.name,
      value: slot.percentage,
      color: WORKLOAD_COLORS[slot.workload!.category],
      category: slot.workload!.category,
    }))
}

/**
 * Transform VRAM breakdown for horizontal bar chart
 * @param breakdown - VRAM breakdown data
 * @returns Data suitable for horizontal bar chart
 */
export function transformBreakdownForBarChart(breakdown: VRAMBreakdown): Array<{
  component: string
  vram: number
  color: string
  percentage: number
}> {
  const total = breakdown.baseModel + breakdown.kvCache + breakdown.activations + breakdown.overhead

  return [
    {
      component: 'Base Model',
      vram: bytesToMB(breakdown.baseModel),
      color: CHART_COLORS.baseModel,
      percentage: Math.round((breakdown.baseModel / total) * 100),
    },
    {
      component: 'KV Cache',
      vram: bytesToMB(breakdown.kvCache),
      color: CHART_COLORS.kvCache,
      percentage: Math.round((breakdown.kvCache / total) * 100),
    },
    {
      component: 'Activations',
      vram: bytesToMB(breakdown.activations),
      color: CHART_COLORS.activations,
      percentage: Math.round((breakdown.activations / total) * 100),
    },
    {
      component: 'Overhead',
      vram: bytesToMB(breakdown.overhead),
      color: CHART_COLORS.overhead,
      percentage: Math.round((breakdown.overhead / total) * 100),
    },
  ]
}

// ============================================================================
// Color Management
// ============================================================================

/**
 * Generate color palette for workload types
 * @param workloads - Array of workloads
 * @returns Object mapping workload IDs to colors
 */
export function generateWorkloadColorPalette(workloads: Workload[]): Record<string, string> {
  const palette: Record<string, string> = {}

  workloads.forEach(workload => {
    palette[workload.id] = WORKLOAD_COLORS[workload.category]
  })

  return palette
}

/**
 * Get chart colors for VRAM components
 * @returns Color mapping for VRAM components
 */
export function getVRAMComponentColors(): Record<string, string> {
  return {
    baseModel: CHART_COLORS.baseModel,
    kvCache: CHART_COLORS.kvCache,
    activations: CHART_COLORS.activations,
    overhead: CHART_COLORS.overhead,
  }
}

/**
 * Generate gradient colors for chart areas
 * @param baseColor - Base color in hex format
 * @returns Gradient definition for Recharts
 */
export function generateGradientId(componentName: string): string {
  return `gradient-${componentName.toLowerCase().replace(/\s+/g, '-')}`
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format timestamp for chart display
 * @param timestamp - Timestamp in seconds
 * @returns Formatted time string
 */
export function formatTimestamp(timestamp: number): string {
  if (timestamp < 60) {
    return `${timestamp}s`
  } else if (timestamp < 3600) {
    const minutes = Math.floor(timestamp / 60)
    const seconds = timestamp % 60
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(timestamp / 3600)
    const minutes = Math.floor((timestamp % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

/**
 * Format VRAM value for display
 * @param bytes - VRAM in bytes
 * @param unit - Display unit ('MB', 'GB', 'auto')
 * @returns Formatted VRAM string
 */
export function formatVRAM(bytes: number, unit: 'MB' | 'GB' | 'auto' = 'auto'): string {
  if (unit === 'MB' || (unit === 'auto' && bytes < 1024 ** 3)) {
    return `${bytesToMB(bytes).toLocaleString()} MB`
  } else {
    return `${bytesToGB(bytes)} GB`
  }
}

/**
 * Convert bytes to MB for chart display
 * @param bytes - Value in bytes
 * @returns Value in MB, rounded to 1 decimal place
 */
export function bytesToMB(bytes: number): number {
  return Math.round((bytes / 1024 ** 2) * 10) / 10
}

/**
 * Convert bytes to GB for chart display
 * @param bytes - Value in bytes
 * @returns Value in GB, rounded to 2 decimal places
 */
export function bytesToGB(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 100) / 100
}

// ============================================================================
// Chart Configuration Helpers
// ============================================================================

/**
 * Generate tooltip formatter for VRAM charts
 * @param unit - Display unit for values
 * @returns Tooltip formatter function
 */
export function createVRAMTooltipFormatter(unit: 'MB' | 'GB' = 'MB') {
  return (value: number, name: string) => {
    const formattedValue = unit === 'MB' ? `${value} MB` : `${(value / 1024).toFixed(2)} GB`
    const componentName = name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    return [formattedValue, componentName]
  }
}

/**
 * Generate label formatter for time-based charts
 * @returns Label formatter function
 */
export function createTimeTooltipLabelFormatter() {
  return (timestamp: number) => `Time: ${formatTimestamp(timestamp)}`
}

/**
 * Get chart margins for different chart types
 * @param chartType - Type of chart
 * @returns Margin configuration
 */
export function getChartMargins(chartType: 'area' | 'bar' | 'pie' | 'line') {
  const margins = {
    area: { top: 20, right: 30, left: 20, bottom: 20 },
    bar: { top: 20, right: 30, left: 60, bottom: 20 },
    pie: { top: 20, right: 20, left: 20, bottom: 20 },
    line: { top: 20, right: 30, left: 20, bottom: 20 },
  }

  return margins[chartType]
}

/**
 * Generate legend configuration
 * @param showLegend - Whether to show legend
 * @returns Legend configuration for Recharts
 */
export function getLegendConfig(showLegend: boolean = true) {
  if (!showLegend) {
    return false
  }

  return {
    verticalAlign: 'bottom' as const,
    height: 36,
    iconType: 'rect' as const,
    wrapperStyle: {
      paddingTop: '20px',
    },
  }
}

/**
 * Generate responsive chart dimensions
 * @param containerWidth - Container width
 * @param aspectRatio - Desired aspect ratio (width/height)
 * @returns Chart dimensions
 */
export function getResponsiveChartSize(containerWidth: number, aspectRatio: number = 2) {
  const width = Math.min(containerWidth, 800) // Max width of 800px
  const height = Math.max(width / aspectRatio, 300) // Min height of 300px

  return { width, height }
}

// ============================================================================
// Chart Data Validation
// ============================================================================

/**
 * Validate chart data before rendering
 * @param data - Chart data array
 * @returns Validation result
 */
export function validateChartData(data: unknown[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!Array.isArray(data)) {
    errors.push('Chart data must be an array')
    return { isValid: false, errors }
  }

  if (data.length === 0) {
    errors.push('Chart data cannot be empty')
    return { isValid: false, errors }
  }

  // Check for required fields in data points
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const point = data[i]
    if (typeof point !== 'object' || point === null) {
      errors.push(`Data point at index ${i} must be an object`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Filter out invalid data points
 * @param data - Raw chart data
 * @returns Cleaned data array
 */
export function sanitizeChartData<T extends Record<string, unknown>>(data: T[]): T[] {
  return data.filter(point => {
    // Remove points with null/undefined values for critical fields
    const hasValidTimestamp = typeof point.timestamp === 'number' && !isNaN(point.timestamp)
    // Use fallback for Object.values compatibility
    const pointValues = Object.keys(point).map(key => point[key])
    const hasValidValues = pointValues.some(
      value => typeof value === 'number' && !isNaN(value) && value >= 0
    )

    return hasValidTimestamp && hasValidValues
  })
}

/**
 * Window chart data for large datasets to improve performance
 * @param data - Array of VRAM usage points
 * @param maxPoints - Maximum number of points to display (default: 1000)
 * @returns Windowed data array with evenly distributed points
 */
export function windowChartData(
  data: VRAMUsagePoint[],
  maxPoints: number = 1000
): VRAMUsagePoint[] {
  if (data.length <= maxPoints) return data

  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, index) => index % step === 0)
}
