import React, { Component, ReactNode } from 'react'
import { Alert, Box, Button } from '@mui/material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p={2}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={this.handleReset}>
                Try Again
              </Button>
            }
          >
            {this.props.componentName} encountered an error.
            {this.state.error?.message && (
              <Box mt={1} fontSize="0.875rem">
                {this.state.error.message}
              </Box>
            )}
          </Alert>
        </Box>
      )
    }

    return this.props.children
  }
}
