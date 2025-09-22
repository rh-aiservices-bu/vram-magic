// VRAM Magic: Results Summary Component
// Displays VRAM calculation results with GPU recommendations and export options

import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  ButtonGroup,
  Skeleton,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton,
  Paper,
  useTheme,
} from '@mui/material'
import {
  Memory as MemoryIcon,
  GetApp as DownloadIcon,
  Assessment as StatsIcon,
  Computer as GPUIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Share as ShareIcon,
} from '@mui/icons-material'

import type { ResultsSummaryProps, SimulationResults, Model, ExportFormat } from '../../types'
import { formatVRAM, bytesToGB } from '../../utils/chartUtils'
import { GPU_TIERS } from '../../constants'

// ============================================================================
// GPU Recommendation Logic
// ============================================================================

interface GPURecommendation {
  name: string
  vram: number
  price: number
  tier: string
  suitability: 'perfect' | 'sufficient' | 'tight' | 'insufficient'
  utilizationPercentage: number
}

function getGPURecommendations(maxVRAMGB: number): GPURecommendation[] {
  const recommendations: GPURecommendation[] = []

  GPU_TIERS.forEach(tier => {
    tier.gpus.forEach(gpu => {
      const utilizationPercentage = Math.round((maxVRAMGB / gpu.vram) * 100)
      let suitability: GPURecommendation['suitability']

      if (utilizationPercentage <= 60) {
        suitability = 'perfect'
      } else if (utilizationPercentage <= 80) {
        suitability = 'sufficient'
      } else if (utilizationPercentage <= 95) {
        suitability = 'tight'
      } else {
        suitability = 'insufficient'
      }

      recommendations.push({
        name: gpu.name,
        vram: gpu.vram,
        price: gpu.price,
        tier: tier.name,
        suitability,
        utilizationPercentage,
      })
    })
  })

  // Sort by suitability first, then by price
  return recommendations
    .filter(rec => rec.suitability !== 'insufficient')
    .sort((a, b) => {
      const suitabilityOrder = { perfect: 0, sufficient: 1, tight: 2, insufficient: 3 }
      const suitabilityDiff = suitabilityOrder[a.suitability] - suitabilityOrder[b.suitability]
      if (suitabilityDiff !== 0) return suitabilityDiff
      return a.price - b.price
    })
    .slice(0, 6) // Show top 6 recommendations
}

function getSuitabilityColor(suitability: GPURecommendation['suitability']) {
  switch (suitability) {
    case 'perfect':
      return 'success'
    case 'sufficient':
      return 'primary'
    case 'tight':
      return 'warning'
    case 'insufficient':
      return 'error'
    default:
      return 'default'
  }
}

function getSuitabilityIcon(suitability: GPURecommendation['suitability']) {
  switch (suitability) {
    case 'perfect':
      return <CheckIcon />
    case 'sufficient':
      return <InfoIcon />
    case 'tight':
      return <WarningIcon />
    case 'insufficient':
      return <WarningIcon />
    default:
      return <InfoIcon />
  }
}

// ============================================================================
// Export Functionality
// ============================================================================

function exportToJSON(results: SimulationResults, model: Model | null) {
  const exportData = {
    timestamp: new Date().toISOString(),
    model: model
      ? {
          name: model.name,
          parameters: model.parameters,
          precision: model.precision,
        }
      : null,
    results: {
      maxVRAM: results.maxVRAM,
      averageVRAM: results.averageVRAM,
      recommendations: results.recommendations,
      warnings: results.warnings,
      calculatedAt: results.calculatedAt,
    },
    gpuRecommendations: getGPURecommendations(bytesToGB(results.maxVRAM)),
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vram-analysis-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportToCSV(results: SimulationResults, model: Model | null) {
  const gpuRecommendations = getGPURecommendations(bytesToGB(results.maxVRAM))

  let csv = 'Category,Item,Value\n'
  csv += `Model,Name,${model?.name || 'N/A'}\n`
  csv += `Model,Parameters,${model?.parameters.toLocaleString() || 'N/A'}\n`
  csv += `Model,Precision,${model?.precision || 'N/A'}\n`
  csv += `Results,Max VRAM (MB),${Math.round(results.maxVRAM / 1024 / 1024)}\n`
  csv += `Results,Average VRAM (MB),${Math.round(results.averageVRAM / 1024 / 1024)}\n`
  csv += `Results,Max VRAM (GB),${bytesToGB(results.maxVRAM)}\n`
  csv += `Results,Average VRAM (GB),${bytesToGB(results.averageVRAM)}\n`

  csv += '\nGPU Recommendations\n'
  csv += 'GPU Name,VRAM (GB),Price (USD),Tier,Suitability,Utilization (%)\n'
  gpuRecommendations.forEach(gpu => {
    csv += `${gpu.name},${gpu.vram},${gpu.price},${gpu.tier},${gpu.suitability},${gpu.utilizationPercentage}\n`
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `vram-analysis-${Date.now()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function exportToPNG() {
  // For PNG export, we would typically capture the chart/summary as an image
  // This would require additional libraries like html2canvas
  // For now, we'll show an alert indicating the feature is planned
  alert(
    'PNG export feature is planned for a future release. Please use JSON or CSV export for now.'
  )
}

// ============================================================================
// Results Summary Component
// ============================================================================

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  results,
  model,
  onExport,
  loading = false,
}) => {
  const theme = useTheme()
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const gpuRecommendations = useMemo(() => {
    if (!results) return []
    return getGPURecommendations(bytesToGB(results.maxVRAM))
  }, [results])

  const summaryStats = useMemo(() => {
    if (!results) return null

    const maxVRAMGB = bytesToGB(results.maxVRAM)
    const averageVRAMGB = bytesToGB(results.averageVRAM)
    const peakUtilization = Math.round((results.maxVRAM / results.averageVRAM) * 100) - 100

    return {
      maxVRAMGB,
      averageVRAMGB,
      peakUtilization,
      dataPoints: results.usagePoints.length,
      timeSpan:
        results.usagePoints.length > 0
          ? results.usagePoints[results.usagePoints.length - 1].timestamp
          : 0,
    }
  }, [results])

  // Extract simulation metadata for GQA information
  const simulationResults = useMemo(() => {
    if (!results?.usagePoints?.length) return null

    // Find first non-empty usage point with metadata
    const pointWithMetadata = results.usagePoints.find(
      point =>
        point.breakdown && typeof point.breakdown === 'object' && 'metadata' in point.breakdown
    )

    if (!pointWithMetadata) return null

    return (pointWithMetadata.breakdown as any).metadata || null
  }, [results])

  const handleExport = (format: ExportFormat) => {
    if (!results) return

    if (onExport) {
      onExport(format)
    } else {
      // Default export implementations
      switch (format) {
        case 'json':
          exportToJSON(results, model)
          break
        case 'csv':
          exportToCSV(results, model)
          break
        case 'png':
          exportToPNG()
          break
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            <Skeleton width="60%" />
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    )
  }

  if (!results) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="h6">No Results Available</Typography>
            <Typography variant="body2">
              Configure your model and workloads, then run a simulation to see VRAM usage results
              and GPU recommendations.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        {/* Header with Export Options */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}
        >
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <StatsIcon color="primary" />
              VRAM Analysis Results
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Calculated at {new Date(results.calculatedAt).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={showDebugInfo ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              Debug
            </Button>
            <ButtonGroup variant="outlined" size="small" aria-label="Export options">
              <Tooltip title="Export as JSON">
                <IconButton onClick={() => handleExport('json')} aria-label="Export as JSON">
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
              <Button onClick={() => handleExport('json')} startIcon={<DownloadIcon />}>
                JSON
              </Button>
              <Button onClick={() => handleExport('csv')} startIcon={<DownloadIcon />}>
                CSV
              </Button>
              <Button onClick={() => handleExport('png')} startIcon={<ShareIcon />}>
                PNG
              </Button>
            </ButtonGroup>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Maximum VRAM Display - Prominent */}
          <Grid item xs={12}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.main}05)`,
                border: `1px solid ${theme.palette.primary.main}30`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MemoryIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h3" component="div" color="primary.main" fontWeight="bold">
                    {formatVRAM(results.maxVRAM, 'auto')}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Maximum VRAM Required
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Peak memory usage during simulation
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* GQA Optimization Information */}
          {simulationResults && simulationResults.isGQA && (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mt: 2 }}>
                <AlertTitle>GQA Optimization Active</AlertTitle>
                <Typography variant="body2">
                  This model uses Grouped Query Attention with a{' '}
                  {simulationResults.gqaCompressionRatio?.toFixed(1)}x compression ratio on KV-cache
                  memory. This significantly reduces VRAM requirements compared to standard
                  attention.
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  KV Heads: {simulationResults.kvHeads} | Attention Heads:{' '}
                  {simulationResults.attentionHeads}
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Debug Information */}
          {showDebugInfo && simulationResults && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6">Debug Information</Typography>
                  <Button size="small" onClick={() => setShowDebugInfo(false)}>
                    Hide
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" display="block">
                      Effective Tokens: {simulationResults.effectiveTokens}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Actual Tokens: {simulationResults.actualTokens}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Block Size: {model?.vllmOptimizations?.blockSize || 16} tokens
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" display="block">
                      Memory Pool Overhead:{' '}
                      {((model?.vllmOptimizations?.memoryPoolOverhead || 0.15) * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" display="block">
                      Activation Multiplier: 1.5x (inference)
                    </Typography>
                    <Typography variant="caption" display="block">
                      Precision: {simulationResults.precision}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Add Concurrency Analysis Section */}
          {results.simulationPeriod &&
            (results.simulationPeriod.derivedPeakConcurrency ||
              results.simulationPeriod.derivedAverageConcurrency) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Concurrency Analysis
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="primary.main" fontWeight="bold">
                          {results.simulationPeriod?.derivedPeakConcurrency || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Peak Concurrent Requests
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="secondary.main" fontWeight="bold">
                          {results.simulationPeriod?.derivedAverageConcurrency || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Average Concurrent Requests
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="info.main" fontWeight="bold">
                          {results.simulationPeriod?.totalUsers || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total Users in System
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Box textAlign="center">
                        <Typography variant="h4" color="warning.main" fontWeight="bold">
                          {results.simulationPeriod?.maxThinkTime || 'N/A'}s
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Maximum Think Time
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Concurrency Efficiency:</strong>{' '}
                      {results.simulationPeriod?.derivedPeakConcurrency &&
                      results.simulationPeriod?.totalUsers
                        ? `${Math.round((results.simulationPeriod.derivedPeakConcurrency / results.simulationPeriod.totalUsers) * 100)}%`
                        : 'N/A'}{' '}
                      of users active simultaneously at peak
                    </Typography>
                  </Alert>
                </Paper>
              </Grid>
            )}

          {/* Summary Statistics */}
          {summaryStats && (
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <StatsIcon color="primary" />
                    Summary Statistics
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Average VRAM"
                        secondary={formatVRAM(results.averageVRAM, 'auto')}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Peak Utilization"
                        secondary={`${summaryStats.peakUtilization}% above average`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Data Points"
                        secondary={`${summaryStats.dataPoints.toLocaleString()} measurements`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* GPU Recommendations */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <GPUIcon color="primary" />
                  GPU Recommendations
                </Typography>
                <List dense>
                  {gpuRecommendations.slice(0, 3).map(gpu => (
                    <ListItem key={gpu.name}>
                      <ListItemIcon>{getSuitabilityIcon(gpu.suitability)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Typography variant="body2" fontWeight="medium" component="span">
                              {gpu.name}
                            </Typography>
                            <Chip label={gpu.tier} size="small" variant="outlined" />
                          </span>
                        }
                        secondary={`${gpu.vram}GB VRAM • $${gpu.price.toLocaleString()} • ${gpu.utilizationPercentage}% utilization`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Warnings and Recommendations */}
          {(results.warnings.length > 0 || results.recommendations.length > 0) && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {results.warnings.length > 0 && (
                  <Alert severity="warning" icon={<WarningIcon />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Warnings
                    </Typography>
                    <List dense>
                      {results.warnings.map((warning, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={warning} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                )}

                {results.recommendations.length > 0 && (
                  <Alert severity="info" icon={<InfoIcon />}>
                    <Typography variant="subtitle2" gutterBottom>
                      Recommendations
                    </Typography>
                    <List dense>
                      {results.recommendations.map((recommendation, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={recommendation} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                )}
              </Box>
            </Grid>
          )}

          {/* Complete GPU Recommendations Table */}
          {gpuRecommendations.length > 3 && (
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Complete GPU Recommendations
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    {gpuRecommendations.map(gpu => (
                      <Grid item xs={12} sm={6} md={4} key={gpu.name}>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {gpu.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {gpu.tier} • {gpu.vram}GB VRAM
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ${gpu.price.toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 2 }}>
                            <Chip
                              label={`${gpu.utilizationPercentage}% utilization`}
                              size="small"
                              color={getSuitabilityColor(gpu.suitability)}
                              variant="filled"
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedResultsSummary = React.memo(ResultsSummary, (prevProps, nextProps) => {
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.model?.id === nextProps.model?.id &&
    prevProps.onExport === nextProps.onExport &&
    prevProps.results?.calculatedAt === nextProps.results?.calculatedAt &&
    prevProps.results?.maxVRAM === nextProps.results?.maxVRAM
  )
})

export default MemoizedResultsSummary
