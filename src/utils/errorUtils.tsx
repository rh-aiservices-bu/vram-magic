// VRAM Magic: Error Handling Utilities
// Comprehensive error handling, logging, and user-friendly error messages

import React from 'react'

// ============================================================================
// Error Types and Interfaces
// ============================================================================

/**
 * Application error categories for better error handling
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  CALCULATION = 'calculation',
  MODEL_LOADING = 'model_loading',
  NETWORK = 'network',
  COMPONENT = 'component',
  STATE = 'state',
  UNKNOWN = 'unknown',
}

/**
 * Severity levels for errors
 */
export enum ErrorSeverity {
  LOW = 'low', // Warnings, non-critical issues
  MEDIUM = 'medium', // Errors that affect functionality but don't break the app
  HIGH = 'high', // Critical errors that break core functionality
  CRITICAL = 'critical', // Application-breaking errors
}

/**
 * Enhanced error interface with context
 */
export interface AppError {
  id: string
  message: string
  userMessage: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: number
  context?: Record<string, unknown>
  stack?: string
  component?: string
  action?: string
  originalError?: Error
}

/**
 * Error handling result
 */
export interface ErrorHandlingResult {
  shouldShowToUser: boolean
  shouldLog: boolean
  shouldReportToService: boolean
  fallbackAction?: () => void
}

// ============================================================================
// Error Creation and Enhancement
// ============================================================================

/**
 * Create a standardized application error
 * @param message - Technical error message
 * @param userMessage - User-friendly message
 * @param category - Error category
 * @param severity - Error severity
 * @param context - Additional context data
 * @returns Enhanced error object
 */
export function createAppError(
  message: string,
  userMessage: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, unknown>
): AppError {
  return {
    id: generateErrorId(),
    message,
    userMessage,
    category,
    severity,
    timestamp: Date.now(),
    context,
    stack: new Error().stack,
  }
}

/**
 * Enhance an existing Error object with application context
 * @param error - Original error
 * @param category - Error category
 * @param severity - Error severity
 * @param context - Additional context
 * @returns Enhanced application error
 */
export function enhanceError(
  error: Error,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, unknown>
): AppError {
  const userMessage = generateUserFriendlyMessage(error.message, category)

  return {
    id: generateErrorId(),
    message: error.message,
    userMessage,
    category,
    severity,
    timestamp: Date.now(),
    context,
    stack: error.stack,
    originalError: error,
  }
}

/**
 * Generate unique error ID
 * @returns Unique error identifier
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// User-Friendly Message Generation
// ============================================================================

/**
 * Generate user-friendly error messages based on category and technical message
 * @param technicalMessage - Original technical error message
 * @param category - Error category
 * @returns User-friendly message
 */
export function generateUserFriendlyMessage(
  technicalMessage: string,
  category: ErrorCategory
): string {
  const lowercaseMessage = technicalMessage.toLowerCase()

  switch (category) {
    case ErrorCategory.VALIDATION:
      if (lowercaseMessage.includes('percentage')) {
        return 'Please check that all workload percentages add up to 100%.'
      }
      if (lowercaseMessage.includes('required')) {
        return 'Please fill in all required fields.'
      }
      if (lowercaseMessage.includes('invalid')) {
        return 'Please check your input values and try again.'
      }
      return 'Please check your input and correct any errors.'

    case ErrorCategory.CALCULATION:
      if (lowercaseMessage.includes('vram')) {
        return 'Unable to calculate VRAM requirements. Please check your model and workload configuration.'
      }
      if (lowercaseMessage.includes('overflow')) {
        return 'The calculation result is too large. Try reducing the workload size or concurrent users.'
      }
      return 'Calculation failed. Please verify your settings and try again.'

    case ErrorCategory.MODEL_LOADING:
      if (lowercaseMessage.includes('network') || lowercaseMessage.includes('fetch')) {
        return 'Unable to load model data. Please check your internet connection.'
      }
      if (lowercaseMessage.includes('parse') || lowercaseMessage.includes('json')) {
        return 'Model data is corrupted. Please try refreshing the page.'
      }
      if (lowercaseMessage.includes('not found')) {
        return 'The selected model was not found. Please choose a different model.'
      }
      return 'Failed to load model data. Please try again.'

    case ErrorCategory.NETWORK:
      if (lowercaseMessage.includes('timeout')) {
        return 'Request timed out. Please check your connection and try again.'
      }
      if (lowercaseMessage.includes('offline')) {
        return 'You appear to be offline. Please check your internet connection.'
      }
      return 'Network error occurred. Please check your connection and try again.'

    case ErrorCategory.COMPONENT:
      return 'A component error occurred. Please refresh the page and try again.'

    case ErrorCategory.STATE:
      return 'Application state error. Your changes may not have been saved.'

    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ============================================================================
// Error Handling Strategy
// ============================================================================

/**
 * Determine how to handle an error based on its properties
 * @param error - Application error
 * @returns Error handling strategy
 */
export function getErrorHandlingStrategy(error: AppError): ErrorHandlingResult {
  const strategy: ErrorHandlingResult = {
    shouldShowToUser: true,
    shouldLog: true,
    shouldReportToService: false,
  }

  // Adjust strategy based on severity
  switch (error.severity) {
    case ErrorSeverity.LOW:
      strategy.shouldShowToUser = false
      strategy.shouldReportToService = false
      break

    case ErrorSeverity.MEDIUM:
      strategy.shouldShowToUser = true
      strategy.shouldReportToService = false
      break

    case ErrorSeverity.HIGH:
      strategy.shouldShowToUser = true
      strategy.shouldReportToService = true
      break

    case ErrorSeverity.CRITICAL:
      strategy.shouldShowToUser = true
      strategy.shouldReportToService = true
      strategy.fallbackAction = () => {
        // Could implement page reload or fallback UI
        console.warn('Critical error occurred, consider implementing fallback')
      }
      break
  }

  // Special handling for certain categories
  if (error.category === ErrorCategory.NETWORK) {
    strategy.shouldReportToService = false // Don't report network issues
  }

  return strategy
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Structured error logging with context
 * @param error - Application error to log
 * @param additionalContext - Extra context to include
 */
export function logError(error: AppError, additionalContext?: Record<string, unknown>): void {
  const logContext = {
    errorId: error.id,
    category: error.category,
    severity: error.severity,
    timestamp: new Date(error.timestamp).toISOString(),
    component: error.component,
    action: error.action,
    ...error.context,
    ...additionalContext,
  }

  // Use appropriate console method based on severity
  switch (error.severity) {
    case ErrorSeverity.LOW:
      console.warn('VRAM Magic Warning:', error.message, logContext)
      break

    case ErrorSeverity.MEDIUM:
      console.error('VRAM Magic Error:', error.message, logContext)
      break

    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      console.error('VRAM Magic Critical Error:', error.message, logContext)
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
      break
  }
}

/**
 * Log performance warnings
 * @param message - Warning message
 * @param context - Performance context
 */
export function logPerformanceWarning(message: string, context: Record<string, unknown>): void {
  console.warn('VRAM Magic Performance Warning:', message, context)
}

// ============================================================================
// React Error Boundary Components
// ============================================================================

/**
 * Error boundary state interface
 */
interface ErrorBoundaryState {
  hasError: boolean
  error?: AppError
}

/**
 * Error boundary props interface
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: AppError; retry: () => void }>
  onError?: (error: AppError) => void
  category?: ErrorCategory
}

/**
 * Generic error boundary component
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = enhanceError(error, ErrorCategory.COMPONENT, ErrorSeverity.HIGH)

    return {
      hasError: true,
      error: appError,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = enhanceError(
      error,
      this.props.category || ErrorCategory.COMPONENT,
      ErrorSeverity.HIGH,
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      }
    )

    logError(appError)

    if (this.props.onError) {
      this.props.onError(appError)
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} retry={this.retry} />
      }

      // Default fallback UI
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error.userMessage}</p>
          <button onClick={this.retry} style={{ marginTop: '10px' }}>
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// Error Recovery Utilities
// ============================================================================

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in milliseconds
 * @returns Promise that resolves with the function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        break
      }

      const delay = initialDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw enhanceError(lastError!, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, {
    attempts: maxRetries + 1,
  })
}

/**
 * Safe execution wrapper that catches and handles errors
 * @param fn - Function to execute safely
 * @param fallback - Fallback value if function fails
 * @param onError - Error handler
 * @returns Function result or fallback value
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T,
  onError?: (error: AppError) => void
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const appError = enhanceError(error as Error)
    logError(appError)

    if (onError) {
      onError(appError)
    }

    return fallback
  }
}

// ============================================================================
// Error Reporting (for future implementation)
// ============================================================================

/**
 * Report error to external service (placeholder for future implementation)
 * @param error - Application error to report
 */
export function reportError(error: AppError): void {
  // This would integrate with an error reporting service like Sentry
  console.log('Error reported:', error.id)
}
