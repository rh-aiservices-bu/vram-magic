// VRAM Magic: Performance Optimization Utilities
// Comprehensive performance optimization tools for React components and calculations

import React, {
  useCallback,
  useRef,
  useEffect,
  useMemo,
  memo,
  ComponentType,
  useState,
} from 'react'
import type {
  Model,
  WorkloadSlot,
  VRAMBreakdown,
  VRAMUsagePoint,
  SimulationPeriod,
  ModelPrecision,
} from '../types'
import { PERFORMANCE } from '../constants'

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Custom memoization cache with LRU eviction and size limits
 */
class MemoCache<K, V> {
  private cache = new Map<string, { value: V; lastAccessed: number }>()
  private readonly maxSize: number

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const stringKey = this.keyToString(key)
    const entry = this.cache.get(stringKey)

    if (entry) {
      entry.lastAccessed = Date.now()
      return entry.value
    }

    return undefined
  }

  set(key: K, value: V): void {
    const stringKey = this.keyToString(key)

    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(stringKey, {
      value,
      lastAccessed: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  private keyToString(key: K): string {
    if (typeof key === 'string' || typeof key === 'number') {
      return String(key)
    }
    return JSON.stringify(key)
  }

  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Create a memoized function with custom cache
 * @param fn - Function to memoize
 * @param maxCacheSize - Maximum cache size (default: 1000)
 * @param keyGenerator - Custom key generator function
 * @returns Memoized function with cache management
 */
export function createMemoizedFunction<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  maxCacheSize = 1000,
  keyGenerator?: (...args: TArgs) => string
) {
  const cache = new MemoCache<string, TReturn>(maxCacheSize)

  const memoized = (...args: TArgs): TReturn => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    const cachedResult = cache.get(key)
    if (cachedResult !== undefined) {
      return cachedResult
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }

  // Add cache management methods
  const memoizedWithCache = memoized as typeof memoized & {
    clearCache: () => void
    getCacheSize: () => number
  }

  memoizedWithCache.clearCache = () => cache.clear()
  memoizedWithCache.getCacheSize = () => cache.size()

  return memoizedWithCache
}

/**
 * Memoized VRAM calculation for expensive operations
 * Optimized key generation for model and workload combinations
 */
export const memoizedVRAMCalculation = createMemoizedFunction(
  (
    model: Model,
    _workloadSlots: WorkloadSlot[], // Unused but needed for cache key generation
    sequenceLength: number,
    batchSize: number,
    precision: ModelPrecision
  ): VRAMBreakdown => {
    // Import and use actual VRAM calculation functions
    const {
      calculateBaseMemory,
      calculateKVCache,
      calculateActivations,
    } = require('../services/vramCalculator')

    const baseModel = calculateBaseMemory(model, precision)
    const kvCache = calculateKVCache(model, sequenceLength, batchSize, precision)
    const activations = calculateActivations(model, sequenceLength, batchSize, precision)
    const overhead = Math.ceil((baseModel + kvCache) * 0.1)
    const total = baseModel + kvCache + activations + overhead

    return {
      baseModel,
      kvCache,
      activations,
      overhead,
      total,
      workloadBreakdown: [], // Empty for now, would be populated by actual workload analysis
    }
  },
  500, // Smaller cache for complex calculations
  (model, workloadSlots, sequenceLength, batchSize, precision) => {
    // Optimized key generation
    const activeSlots = workloadSlots.filter(slot => slot.isActive)
    const workloadSignature = activeSlots
      .map(slot => `${slot.workload?.id || 'empty'}:${slot.percentage}`)
      .sort()
      .join('|')

    return `${model.id}:${workloadSignature}:${sequenceLength}:${batchSize}:${precision}`
  }
)

/**
 * Memoized simulation results for time-based calculations
 */
export const memoizedSimulationResults = createMemoizedFunction(
  (model: Model, workloadSlots: WorkloadSlot[], period: SimulationPeriod): VRAMUsagePoint[] => {
    // Import and use actual simulation function
    const { simulateUsageOverTime } = require('../services/vramCalculator')

    const activeSlots = workloadSlots.filter(slot => slot.isActive)
    if (activeSlots.length === 0) {
      return []
    }

    return simulateUsageOverTime(model, activeSlots, period)
  },
  100, // Smaller cache for simulation results
  (model, workloadSlots, period) => {
    const activeSlots = workloadSlots.filter(slot => slot.isActive)
    const workloadSignature = activeSlots
      .map(slot => `${slot.workload?.id || 'empty'}:${slot.percentage}`)
      .sort()
      .join('|')

    return `sim:${model.id}:${workloadSignature}:${period.durationSeconds}:${period.totalUsers}:${period.requestPattern}`
  }
)

// ============================================================================
// React Component Optimization
// ============================================================================

/**
 * Enhanced React.memo with deep comparison for complex props
 * @param Component - React component to memoize
 * @param customCompare - Custom comparison function
 * @returns Memoized component
 */
export function createMemoizedComponent<P = Record<string, unknown>>(
  Component: ComponentType<P>,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) {
  const defaultCompare = (prevProps: P, nextProps: P): boolean => {
    const prevKeys = Object.keys(prevProps as Record<string, unknown>)
    const nextKeys = Object.keys(nextProps as Record<string, unknown>)

    if (prevKeys.length !== nextKeys.length) {
      return false
    }

    for (const key of prevKeys) {
      const prevValue = (prevProps as Record<string, unknown>)[key]
      const nextValue = (nextProps as Record<string, unknown>)[key]

      // Deep comparison for arrays and objects
      if (Array.isArray(prevValue) && Array.isArray(nextValue)) {
        if (prevValue.length !== nextValue.length) return false
        for (let i = 0; i < prevValue.length; i++) {
          if (JSON.stringify(prevValue[i]) !== JSON.stringify(nextValue[i])) {
            return false
          }
        }
      } else if (typeof prevValue === 'object' && typeof nextValue === 'object') {
        if (prevValue !== null && nextValue !== null) {
          if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
            return false
          }
        } else if (prevValue !== nextValue) {
          return false
        }
      } else if (prevValue !== nextValue) {
        return false
      }
    }

    return true
  }

  return memo(Component, customCompare || defaultCompare)
}

/**
 * Optimized component wrapper for frequently re-rendering components
 * Includes shallow prop comparison and callback memoization
 */
export function withPerformanceOptimization<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  options: {
    memoizeCallbacks?: boolean
    shallowCompare?: boolean
    displayName?: string
  } = {}
) {
  const { memoizeCallbacks = true, shallowCompare = false, displayName } = options

  const OptimizedComponent = (props: P) => {
    // Memoize callback props to prevent unnecessary re-renders
    const optimizedProps = useMemo(() => {
      if (!memoizeCallbacks) return props

      const newProps = { ...props }

      // Find and memoize function props
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'function') {
          // Note: useCallback dependencies intentionally simplified
          ;(newProps as Record<string, unknown>)[key] = useCallback(value, [value])
        }
      }

      return newProps
    }, [props])

    return React.createElement(Component, optimizedProps)
  }

  OptimizedComponent.displayName =
    displayName || `Optimized(${Component.displayName || Component.name})`

  const compareFunction = shallowCompare
    ? undefined
    : (prevProps: P, nextProps: P) => JSON.stringify(prevProps) === JSON.stringify(nextProps)

  return memo(OptimizedComponent, compareFunction)
}

// ============================================================================
// Lazy Loading Utilities
// ============================================================================

/**
 * Create a lazy-loaded component with loading fallback
 * @param importFn - Dynamic import function
 * @param fallback - Loading fallback component
 * @returns Lazy component with error boundary
 */
export function createLazyComponent<P extends Record<string, unknown> = Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ComponentType
) {
  const LazyComponent = React.lazy(importFn)

  const LazyWrapper = (props: P) => {
    const fallbackElement = fallback
      ? React.createElement(fallback)
      : React.createElement('div', null, 'Loading...')

    // Type assertion is safe because LazyComponent will resolve to ComponentType<P>
    const Component = LazyComponent as unknown as React.ComponentType<P>

    return (
      <React.Suspense fallback={fallbackElement}>
        <Component {...(props as P & React.Attributes)} />
      </React.Suspense>
    )
  }

  LazyWrapper.displayName = 'LazyWrapper'
  return LazyWrapper
}

/**
 * Preload a lazy component to improve perceived performance
 * @param importFn - Dynamic import function
 * @returns Promise that resolves when component is loaded
 */
export function preloadComponent(
  importFn: () => Promise<{ default: ComponentType<unknown> }>
): Promise<void> {
  return importFn().then(() => {
    // Component is now loaded and cached
  })
}

/**
 * Batch preload multiple components
 * @param importFns - Array of dynamic import functions
 * @returns Promise that resolves when all components are loaded
 */
export function preloadComponents(
  importFns: (() => Promise<{ default: ComponentType<unknown> }>)[]
): Promise<void> {
  return Promise.all(importFns.map(preloadComponent)).then(() => {
    // All components are loaded
  })
}

/**
 * Conditional lazy loading based on viewport intersection
 * @param importFn - Dynamic import function
 * @param options - Intersection observer options
 * @returns Hook for lazy loading with visibility detection
 */
export function useLazyComponentOnVisible<
  P extends Record<string, unknown> = Record<string, unknown>,
>(importFn: () => Promise<{ default: ComponentType<P> }>, options: IntersectionObserverInit = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const [LazyComponent, setLazyComponent] = useState<ComponentType<P> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
          importFn().then(({ default: Component }) => {
            setLazyComponent(() => Component)
          })
        }
      },
      { threshold: 0.1, ...options }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [importFn, isVisible, options])

  return { ref, LazyComponent, isVisible }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Performance measurement utilities
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>()
  private measurements = new Map<string, number[]>()

  /**
   * Start measuring a performance metric
   * @param name - Measurement name
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  /**
   * End measurement and record duration
   * @param name - Measurement name
   * @returns Duration in milliseconds
   */
  measure(name: string): number | null {
    const startTime = this.marks.get(name)
    if (startTime === undefined) {
      console.warn(`Performance mark '${name}' not found`)
      return null
    }

    const duration = performance.now() - startTime

    if (!this.measurements.has(name)) {
      this.measurements.set(name, [])
    }
    this.measurements.get(name)!.push(duration)

    this.marks.delete(name)
    return duration
  }

  /**
   * Get performance statistics for a measurement
   * @param name - Measurement name
   * @returns Performance statistics
   */
  getStats(name: string): {
    count: number
    average: number
    min: number
    max: number
    latest: number
  } | null {
    const measurements = this.measurements.get(name)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const count = measurements.length
    const sum = measurements.reduce((a, b) => a + b, 0)
    const average = sum / count
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)
    const latest = measurements[measurements.length - 1]

    return { count, average, min, max, latest }
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.marks.clear()
    this.measurements.clear()
  }

  /**
   * Get all measurement names
   */
  getAllMeasurements(): string[] {
    return Array.from(this.measurements.keys())
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * React hook for measuring component render performance
 * @param componentName - Name of the component being measured
 * @returns Performance measurement functions
 */
export function usePerformanceMeasurement(componentName: string) {
  const renderStartRef = useRef<number>()

  useEffect(() => {
    // Measure render time on each render
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current
      performanceMonitor.mark(`${componentName}-render-end`)

      // Log slow renders in development
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })

  // Mark render start
  renderStartRef.current = performance.now()
  performanceMonitor.mark(`${componentName}-render-start`)

  const measureInteraction = useCallback(
    (interactionName: string) => {
      performanceMonitor.mark(`${componentName}-${interactionName}`)

      return () => {
        const duration = performanceMonitor.measure(`${componentName}-${interactionName}`)

        // Log slow interactions in development
        if (duration && duration > 100) {
          console.warn(
            `Slow interaction in ${componentName}.${interactionName}: ${duration.toFixed(2)}ms`
          )
        }

        return duration
      }
    },
    [componentName]
  )

  const getComponentStats = useCallback(() => {
    return performanceMonitor.getStats(`${componentName}-render-end`)
  }, [componentName])

  return {
    measureInteraction,
    getComponentStats,
    performanceMonitor,
  }
}

// ============================================================================
// Bundle Analysis Utilities
// ============================================================================

/**
 * Analyze bundle size and component loading
 */
export class BundleAnalyzer {
  private componentSizes = new Map<string, number>()
  private loadTimes = new Map<string, number>()

  /**
   * Record component bundle size
   * @param componentName - Component name
   * @param sizeBytes - Size in bytes
   */
  recordComponentSize(componentName: string, sizeBytes: number): void {
    this.componentSizes.set(componentName, sizeBytes)
  }

  /**
   * Record component load time
   * @param componentName - Component name
   * @param loadTimeMs - Load time in milliseconds
   */
  recordLoadTime(componentName: string, loadTimeMs: number): void {
    this.loadTimes.set(componentName, loadTimeMs)
  }

  /**
   * Get bundle analysis report
   * @returns Bundle analysis data
   */
  getReport(): {
    totalSize: number
    componentCount: number
    largestComponents: Array<{ name: string; size: number }>
    slowestLoads: Array<{ name: string; loadTime: number }>
  } {
    const totalSize = Array.from(this.componentSizes.values()).reduce((sum, size) => sum + size, 0)
    const componentCount = this.componentSizes.size

    const largestComponents = Array.from(this.componentSizes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, size]) => ({ name, size }))

    const slowestLoads = Array.from(this.loadTimes.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, loadTime]) => ({ name, loadTime }))

    return {
      totalSize,
      componentCount,
      largestComponents,
      slowestLoads,
    }
  }

  /**
   * Check if bundle size exceeds recommended limits
   * @returns Warning messages for oversized components
   */
  getWarnings(): string[] {
    const warnings: string[] = []
    const MAX_COMPONENT_SIZE = 500 * 1024 // 500KB
    const MAX_TOTAL_SIZE = 5 * 1024 * 1024 // 5MB

    for (const [name, size] of this.componentSizes.entries()) {
      if (size > MAX_COMPONENT_SIZE) {
        warnings.push(`Component '${name}' is large: ${(size / 1024).toFixed(1)}KB`)
      }
    }

    const totalSize = Array.from(this.componentSizes.values()).reduce((sum, size) => sum + size, 0)
    if (totalSize > MAX_TOTAL_SIZE) {
      warnings.push(`Total bundle size is large: ${(totalSize / 1024 / 1024).toFixed(1)}MB`)
    }

    return warnings
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer()

/**
 * Higher-order component to measure component loading performance
 * @param Component - React component to wrap
 * @param componentName - Name for performance tracking
 * @returns Wrapped component with performance measurement
 */
export function withLoadTimeTracking<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  componentName: string
): ComponentType<P> {
  const TrackedComponent = (props: P) => {
    useEffect(() => {
      const loadStart = performance.now()

      return () => {
        const loadTime = performance.now() - loadStart
        bundleAnalyzer.recordLoadTime(componentName, loadTime)
      }
    }, [])

    return React.createElement(Component, props)
  }

  TrackedComponent.displayName = `LoadTimeTracked(${componentName})`
  return TrackedComponent
}

// ============================================================================
// Debouncing and Throttling Utilities
// ============================================================================

/**
 * Debounce hook for expensive operations
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies array
 * @returns Debounced function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = PERFORMANCE.DEBOUNCE_DELAY,
  dependencies: React.DependencyList = []
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay, ...dependencies]
  )
}

/**
 * Throttle hook for high-frequency events
 * @param callback - Function to throttle
 * @param delay - Throttle delay in milliseconds
 * @param dependencies - Dependencies array
 * @returns Throttled function
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = PERFORMANCE.THROTTLE_DELAY,
  dependencies: React.DependencyList = []
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()

      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(
          () => {
            lastCallRef.current = Date.now()
            callback(...args)
          },
          delay - (now - lastCallRef.current)
        )
      }
    }) as T,
    [callback, delay, ...dependencies]
  )
}

/**
 * Memory usage monitoring hook
 * @param componentName - Component name for tracking
 * @returns Memory usage information
 */
export function useMemoryMonitoring(componentName: string) {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null>(null)

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (
          performance as {
            memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
          }
        ).memory
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        })

        // Warn about high memory usage
        const memoryUsageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
        if (memoryUsageRatio > PERFORMANCE.MEMORY_WARNING_THRESHOLD) {
          console.warn(
            `High memory usage in ${componentName}: ${(memoryUsageRatio * 100).toFixed(1)}%`
          )
        }
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [componentName])

  return memoryInfo
}

// ============================================================================
// Export All Performance Utilities
// ============================================================================

export default {
  // Memoization
  MemoCache,
  createMemoizedFunction,
  memoizedVRAMCalculation,
  memoizedSimulationResults,

  // Component Optimization
  createMemoizedComponent,
  withPerformanceOptimization,

  // Lazy Loading
  createLazyComponent,
  preloadComponent,
  preloadComponents,
  useLazyComponentOnVisible,

  // Performance Monitoring
  PerformanceMonitor,
  performanceMonitor,
  usePerformanceMeasurement,

  // Bundle Analysis
  BundleAnalyzer,
  bundleAnalyzer,
  withLoadTimeTracking,

  // Utilities
  useDebouncedCallback,
  useThrottledCallback,
  useMemoryMonitoring,
}
