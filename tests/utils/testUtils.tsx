import React from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// Import actual contexts
import { AppProvider } from '../../src/contexts/AppContext'
import { ModelProvider } from '../../src/contexts/ModelContext'
import { WorkloadProvider } from '../../src/contexts/WorkloadContext'
import { SimulationProvider } from '../../src/contexts/SimulationContext'
import { UIProvider } from '../../src/contexts/UIContext'

// Import theme
import { createVRAMTheme } from '../../src/theme'

// Re-export utility functions from testHelpers
// eslint-disable-next-line react-refresh/only-export-components
export * from './testHelpers'

// Test wrapper with all providers
interface TestWrapperProps {
  children: React.ReactNode
  darkMode?: boolean
}

export const TestWrapper: React.FC<TestWrapperProps> = ({ children, darkMode = false }) => {
  const theme = createVRAMTheme(darkMode ? 'dark' : 'light')

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <DndProvider backend={HTML5Backend}>
        <AppProvider>
          <UIProvider>
            <ModelProvider>
              <WorkloadProvider>
                <SimulationProvider>{children}</SimulationProvider>
              </WorkloadProvider>
            </ModelProvider>
          </UIProvider>
        </AppProvider>
      </DndProvider>
    </ThemeProvider>
  )
}

// Custom render function moved to renderHelpers.ts

// Error boundary for testing error states
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Test Error Boundary</h2>
          <p>{this.state.error?.message}</p>
        </div>
      )
    }

    return this.props.children
  }
}

// Component exports only - non-component exports moved to exports.ts
