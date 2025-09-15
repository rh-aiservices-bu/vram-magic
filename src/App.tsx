import React, { useEffect, useCallback, useState } from 'react'
import { Typography, Box, Grid, Paper, Alert, Button, useMediaQuery, useTheme } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { PlayArrow as PlayIcon } from '@mui/icons-material'

// Theme
import { createVRAMTheme } from './theme'

// Layout Components
import { Layout } from './components/Layout'

// Tab Components
import { ConfigurationTabs } from './components/TabPanel'

// UI Components
import { LoadingSpinner, Toast, EmptyState } from './components/UI'

// Context Providers
import { AppProvider } from './contexts/AppContext'
import { ModelProvider } from './contexts/ModelContext'
import { WorkloadProvider } from './contexts/WorkloadContext'
import { SimulationProvider } from './contexts/SimulationContext'
import { UIProvider } from './contexts/UIContext'

// Components
import ModelSelector from './components/ModelSelector/ModelSelector'
import WorkloadConfigurator from './components/WorkloadConfigurator'
import SimulationControls from './components/SimulationControls'
import VRAMChart from './components/VRAMChart/VRAMChart'
import ResultsSummary from './components/ResultsSummary'

// Hooks and utilities
import { useAppContext } from './hooks/useAppContext'
import { useModelContext } from './hooks/useModelContext'
import { useWorkloadContext } from './hooks/useWorkloadContext'
import { useSimulationContext } from './hooks/useSimulationContext'
import { useUIContext } from './hooks/useUIContext'
import { DEFAULT_WORKLOADS } from './data/workloads'

// Error Boundary Component
import { ErrorBoundary } from './components/ErrorBoundary'

// Main Application Layout Component
function AppLayout() {
  const { dispatch } = useAppContext()
  const {
    models,
    selectedModel,
    loadModels,
    isLoading: modelsLoading,
    selectModel,
  } = useModelContext()
  const { workloads, workloadSlots, profiles, validation, updateSlots } = useWorkloadContext()
  const {
    results,
    config,
    canExecute,
    isCalculating,
    updateConfig,
    executeSimulation,
    exportResults,
  } = useSimulationContext()
  const { isLoading, error, notifications, clearError, removeNotification, isDarkMode } =
    useUIContext()

  // Tab state
  const [activeTab, setActiveTab] = useState(0)

  // Create dynamic theme based on UI preferences
  const muiTheme = React.useMemo(() => {
    return createVRAMTheme(isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Responsive breakpoints
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  // Stable object references for Toast props and sx styles
  const toastPosition = React.useMemo(
    () => ({ vertical: 'bottom' as const, horizontal: 'right' as const }),
    []
  )

  // Memoized sx objects to prevent style recreation
  const sxStyles = React.useMemo(
    () => ({
      errorAlert: { mb: 3 },
      paperWithMargin: { p: 3, mb: 3 },
      paperOnly: { p: 3 },
      centerPaper: { p: 3, mb: 3, textAlign: 'center' },
    }),
    []
  )

  // Tab change handler
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }, [])

  // Memoized event handlers to prevent recreation on every render
  const handleModelSelect = useCallback(
    (model: any) => {
      selectModel(model)
      dispatch({ type: 'SET_SELECTED_MODEL', payload: model })
      // Auto-advance to next tab if model is selected and not on last tab
      if (model && activeTab === 0) {
        setActiveTab(1)
      }
    },
    [selectModel, dispatch, activeTab]
  )

  const handleSlotsChange = useCallback(
    (slots: any) => {
      updateSlots(slots)
      dispatch({ type: 'UPDATE_WORKLOAD_SLOTS', payload: slots })
    },
    [updateSlots, dispatch]
  )

  const handleProfileSelect = useCallback(
    (profile: any) => {
      dispatch({ type: 'SELECT_PROFILE', payload: profile })
    },
    [dispatch]
  )

  const handleConfigChange = useCallback(
    (config: any) => {
      updateConfig(config)
    },
    [updateConfig]
  )

  const handleCalculateClick = useCallback(() => {
    if (selectedModel) {
      executeSimulation(selectedModel, workloadSlots)
    }
  }, [selectedModel, executeSimulation, workloadSlots])

  const handleExport = useCallback(
    (format: any) => {
      if (format === 'json' || format === 'csv') {
        exportResults(format)
      }
      // TODO: Implement PNG export
    },
    [exportResults]
  )

  const handleNotificationClose = useCallback(
    (notificationId: string) => {
      return () => removeNotification(notificationId)
    },
    [removeNotification]
  )

  // Load initial data on mount
  useEffect(() => {
    const initializeApp = async () => {
      if (models.length === 0 && !modelsLoading) {
        await loadModels()
      }
    }

    initializeApp()
  }, []) // Only run once on mount - the condition check inside prevents redundant loads

  // Global loading state
  const showGlobalLoading = isLoading || modelsLoading || isCalculating

  // Memoize loading message to prevent string recreation
  const loadingMessage = React.useMemo(() => {
    if (isCalculating) return 'Running simulation...'
    if (modelsLoading) return 'Loading models...'
    return 'Loading...'
  }, [isCalculating, modelsLoading])

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />

      {/* Global Loading Overlay */}
      {showGlobalLoading && <LoadingSpinner overlay size={60} message={loadingMessage} />}

      <Layout maxWidth="xl" showFooter={true}>
        {/* Page Title */}
        <Box mb={3}>
          <Typography variant="h4" component="h2" gutterBottom>
            Configuration & Results
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure your model and workloads to calculate VRAM requirements
          </Typography>
        </Box>

        {/* Global Error Alert */}
        {error && (
          <Alert severity="error" onClose={clearError} sx={sxStyles.errorAlert}>
            {error}
          </Alert>
        )}

        {/* New Tab-Based Layout */}
        <Grid
          container
          spacing={isMobile ? 2 : 3}
          sx={{
            minHeight: isMobile ? 'auto' : 'calc(100vh - 300px)',
            mb: 4, // Ensure space for footer
          }}
        >
          {/* Left Column - Configuration Tabs */}
          <Grid item xs={12} md={8} lg={7} sx={{ order: isMobile ? 2 : 1 }}>
            <Paper
              elevation={2}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: isMobile ? 'auto' : 500,
              }}
            >
              <ConfigurationTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                modelSelected={!!selectedModel}
                workloadConfigured={validation.hasActiveSlots}
                simulationConfigured={canExecute}
                hasErrors={validation.errors.length > 0}
              >
                {/* Tab 1: Model Selection */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Select Model
                  </Typography>
                  <ErrorBoundary componentName="ModelSelector">
                    <ModelSelector
                      models={models}
                      selectedModel={selectedModel}
                      onModelSelect={handleModelSelect}
                      disabled={modelsLoading}
                      error={undefined}
                    />
                  </ErrorBoundary>
                </Box>

                {/* Tab 2: Workload Configuration */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Configure Workloads
                  </Typography>
                  <ErrorBoundary componentName="WorkloadConfigurator">
                    <WorkloadConfigurator
                      workloads={workloads.length > 0 ? workloads : DEFAULT_WORKLOADS}
                      workloadSlots={workloadSlots}
                      onSlotsChange={handleSlotsChange}
                      onProfileSelect={handleProfileSelect}
                      profiles={profiles}
                      disabled={!selectedModel}
                      errors={validation.errors}
                    />
                  </ErrorBoundary>
                </Box>

                {/* Tab 3: Simulation Controls */}
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                    Simulation Settings
                  </Typography>
                  <ErrorBoundary componentName="SimulationControls">
                    <SimulationControls
                      config={config}
                      onChange={handleConfigChange}
                      onCalculate={handleCalculateClick}
                      isCalculating={isCalculating}
                      disabled={!canExecute}
                    />
                  </ErrorBoundary>
                </Box>
              </ConfigurationTabs>
            </Paper>
          </Grid>

          {/* Right Column - Persistent Results Panel */}
          <Grid item xs={12} md={4} lg={5} sx={{ order: isMobile ? 1 : 2 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: isMobile ? 3 : 0,
                position: isMobile ? 'static' : 'sticky',
                top: isMobile ? 'auto' : 24,
                alignSelf: 'flex-start',
              }}
            >
              {/* Run Simulation Button - Always Visible */}
              <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size={isMobile ? 'medium' : 'large'}
                  onClick={handleCalculateClick}
                  disabled={!canExecute || isCalculating}
                  startIcon={<PlayIcon />}
                  sx={{
                    minWidth: isMobile ? 160 : 180,
                    fontSize: isMobile ? '1rem' : '1.1rem',
                    py: isMobile ? 1 : 1.5,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {isCalculating ? 'Running...' : 'Run Simulation'}
                </Button>
              </Paper>

              {/* VRAM Chart */}
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  minHeight: isMobile ? 250 : 350,
                  maxHeight: isMobile ? 'none' : 450,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  VRAM Usage Over Time
                </Typography>
                {results && results.usagePoints.length > 0 ? (
                  <ErrorBoundary componentName="VRAMChart">
                    <VRAMChart
                      data={results.usagePoints}
                      maxVRAM={selectedModel?.vramRequirements?.baseVRAM || 0}
                      chartType="area"
                      showTooltips={true}
                      height={isMobile ? 200 : 300}
                    />
                  </ErrorBoundary>
                ) : (
                  <EmptyState
                    type="chart"
                    title="VRAM Chart Preview"
                    description={
                      !selectedModel
                        ? 'Select a model from the Model tab to begin analysis'
                        : !validation.hasActiveSlots
                          ? 'Configure workload slots in the Workloads tab'
                          : !canExecute
                            ? 'Complete simulation settings to proceed'
                            : 'Configuration complete! Click Run Simulation to see VRAM usage patterns'
                    }
                    actionText={canExecute ? 'Run Simulation' : undefined}
                    onAction={canExecute ? handleCalculateClick : undefined}
                    disabled={!canExecute || isCalculating}
                  />
                )}
              </Paper>

              {/* Results Summary */}
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Results Summary
                </Typography>
                {results ? (
                  <ErrorBoundary componentName="ResultsSummary">
                    <ResultsSummary
                      results={results}
                      model={selectedModel}
                      onExport={handleExport}
                      loading={isCalculating}
                    />
                  </ErrorBoundary>
                ) : (
                  <EmptyState
                    type="results"
                    title="Results Summary"
                    description="Run a simulation to see detailed VRAM analysis, peak usage, and GPU recommendations tailored to your workload configuration"
                    actionText={canExecute ? 'Run Simulation' : undefined}
                    onAction={canExecute ? handleCalculateClick : undefined}
                    disabled={!canExecute || isCalculating}
                    showIcon={false}
                  />
                )}
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Layout>

      {/* Global Notifications */}
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          id={notification.id}
          open={true}
          message={notification.message}
          severity={notification.type}
          duration={notification.autoClose !== false ? 5000 : undefined}
          persist={notification.autoClose === false}
          onClose={handleNotificationClose(notification.id)}
          position={toastPosition}
          transition="slide"
          slideDirection="up"
        />
      ))}
    </ThemeProvider>
  )
}

// Root App Component with Provider Hierarchy
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <UIProvider>
          <ModelProvider>
            <WorkloadProvider>
              <SimulationProvider>
                <AppLayout />
              </SimulationProvider>
            </WorkloadProvider>
          </ModelProvider>
        </UIProvider>
      </AppProvider>
    </ErrorBoundary>
  )
}

export default App
