// VRAM Magic: SimulationControls Component
// Form controls for simulation parameters with time period, users, and request patterns

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  FormHelperText,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  IconButton,
  InputAdornment,
  SelectChangeEvent,
} from '@mui/material'
import {
  PlayArrow as PlayIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material'

// Import types and validation
import type { SimulationConfig, SimulationControlsProps, ValidationError } from '../../types'
import { TimeUnit, RequestPattern, ModelPrecision } from '../../types'
import {
  validateSimulationPeriod,
  hasErrors,
  hasWarnings,
  getErrorsForField,
  formatValidationMessage,
} from '../../utils/validation'
import { SIMULATION_CONSTRAINTS, DEFAULT_SIMULATION_CONFIG } from '../../constants'

// Time unit conversion factors to seconds
const TIME_UNIT_MULTIPLIERS = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
} as const

// Request pattern descriptions for tooltips
const REQUEST_PATTERN_DESCRIPTIONS = {
  uniform: 'Consistent request load throughout the simulation period',
  front_loaded: 'Higher request volume at the beginning, tapering off',
  back_loaded: 'Lower initial volume, increasing towards the end',
  bell_curve: 'Peak request volume in the middle of the simulation',
  steady: 'Steady and consistent request pattern',
  burst: 'Periodic bursts of high request volume',
  variable: 'Variable request pattern with fluctuations',
} as const

// Helper function to convert duration to seconds
const convertToSeconds = (duration: number, unit: TimeUnit): number => {
  return duration * TIME_UNIT_MULTIPLIERS[unit]
}

// Helper function to convert seconds to appropriate unit
const convertFromSeconds = (seconds: number, unit: TimeUnit): number => {
  return Math.round((seconds / TIME_UNIT_MULTIPLIERS[unit]) * 100) / 100
}

// Helper function to determine best display unit for duration
const getBestTimeUnit = (seconds: number): TimeUnit => {
  if (seconds >= 86400) return TimeUnit.DAYS
  if (seconds >= 3600) return TimeUnit.HOURS
  if (seconds >= 60) return TimeUnit.MINUTES
  return TimeUnit.SECONDS
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  config,
  onChange,
  onCalculate,
  isCalculating = false,
  disabled = false,
}) => {
  // Local state for form values - initialize with proper conversion
  const initialTimeUnit = getBestTimeUnit(config.period.duration)
  const [duration, setDuration] = useState(
    convertFromSeconds(config.period.duration, initialTimeUnit)
  )
  const [timeUnit, setTimeUnit] = useState<TimeUnit>(initialTimeUnit)
  const [concurrentUsers, setConcurrentUsers] = useState(config.period.concurrentUsers)
  const [requestPattern, setRequestPattern] = useState<RequestPattern>(config.period.requestPattern)
  const [granularity, setGranularity] = useState(config.period.granularity)

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  // Memoized calculations to prevent recreation
  const durationInSeconds = React.useMemo(
    () => convertToSeconds(duration, timeUnit),
    [duration, timeUnit]
  )

  const durationLocaleString = React.useMemo(
    () => durationInSeconds.toLocaleString(),
    [durationInSeconds]
  )

  const maxUsersString = React.useMemo(
    () => SIMULATION_CONSTRAINTS.MAX_USERS.toLocaleString(),
    []
  )

  // Validate current form state
  const validateCurrentForm = useCallback(() => {
    const simulationPeriod = {
      duration: durationInSeconds,
      timeUnit: 'seconds' as TimeUnit, // Always validate in seconds
      concurrentUsers,
      requestPattern,
      granularity,
    }

    return validateSimulationPeriod(simulationPeriod)
  }, [durationInSeconds, concurrentUsers, requestPattern, granularity])

  // Store onChange in a ref to avoid dependency issues
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // Update parent when form changes - single validation point
  useEffect(() => {
    const errors = validateSimulationPeriod({
      duration: durationInSeconds,
      timeUnit: 'seconds' as TimeUnit, // Always validate in seconds
      concurrentUsers,
      requestPattern,
      granularity,
    })

    setValidationErrors(errors)

    if (!hasErrors(errors)) {
      const updatedConfig: SimulationConfig = {
        period: {
          duration: durationInSeconds,
          timeUnit: TimeUnit.SECONDS, // Store in seconds for consistency
          concurrentUsers,
          requestPattern,
          granularity,
          durationSeconds: durationInSeconds,
          precision: ModelPrecision.FP16, // Default precision
        },
        isValid: true,
        errors: [],
      }
      onChangeRef.current(updatedConfig)
    } else {
      const updatedConfig: SimulationConfig = {
        period: {
          duration: durationInSeconds,
          timeUnit: TimeUnit.SECONDS,
          concurrentUsers,
          requestPattern,
          granularity,
          durationSeconds: durationInSeconds,
          precision: ModelPrecision.FP16,
        },
        isValid: false,
        errors,
      }
      onChangeRef.current(updatedConfig)
    }
  }, [
    durationInSeconds,
    concurrentUsers,
    requestPattern,
    granularity,
    // Removed onChange from deps to prevent circular dependency
  ])

  // Removed circular sync with external config to prevent refresh loops
  // The component is now the source of truth for its form values

  // Event handlers
  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value) || 0
    setDuration(value)
  }

  const handleTimeUnitChange = (event: SelectChangeEvent<TimeUnit>) => {
    const newUnit = event.target.value as TimeUnit
    // Convert current duration to new unit
    const durationInSeconds = convertToSeconds(duration, timeUnit)
    const newDuration = convertFromSeconds(durationInSeconds, newUnit)
    setDuration(newDuration)
    setTimeUnit(newUnit)
  }

  const handleConcurrentUsersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0
    setConcurrentUsers(value)
  }

  const handleRequestPatternChange = (event: SelectChangeEvent<RequestPattern>) => {
    setRequestPattern(event.target.value as RequestPattern)
  }

  const handleGranularityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 1
    setGranularity(value)
  }

  const handleCalculate = () => {
    const errors = validateCurrentForm()
    if (!hasErrors(errors)) {
      onCalculate()
    }
  }

  const handleReset = () => {
    setDuration(
      convertFromSeconds(DEFAULT_SIMULATION_CONFIG.duration, DEFAULT_SIMULATION_CONFIG.timeUnit)
    )
    setTimeUnit(DEFAULT_SIMULATION_CONFIG.timeUnit)
    setConcurrentUsers(DEFAULT_SIMULATION_CONFIG.concurrentUsers)
    setRequestPattern(DEFAULT_SIMULATION_CONFIG.requestPattern)
    setGranularity(DEFAULT_SIMULATION_CONFIG.granularity)
  }

  // Get field-specific errors
  const getDurationErrors = () => getErrorsForField(validationErrors, 'duration')
  const getUsersErrors = () => getErrorsForField(validationErrors, 'concurrentUsers')
  const getGranularityErrors = () => getErrorsForField(validationErrors, 'granularity')

  const hasFormErrors = hasErrors(validationErrors)
  const hasFormWarnings = hasWarnings(validationErrors)

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <ScheduleIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2">
          Simulation Parameters
        </Typography>
        <Tooltip title="Configure simulation time period, concurrent users, and request distribution pattern">
          <IconButton size="small" sx={{ ml: 1 }} aria-label="Simulation parameters info">
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Validation Alerts */}
      {hasFormErrors && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div">
            Please fix the following errors:
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {validationErrors
                .filter(error => error.severity === 'error')
                .map((error, index) => (
                  <li key={index}>{formatValidationMessage(error)}</li>
                ))}
            </ul>
          </Typography>
        </Alert>
      )}

      {hasFormWarnings && !hasFormErrors && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div">
            Warnings:
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {validationErrors
                .filter(error => error.severity === 'warning')
                .map((error, index) => (
                  <li key={index}>{formatValidationMessage(error)}</li>
                ))}
            </ul>
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Time Period Section */}
        <Grid item xs={12} md={6}>
          <Box mb={2}>
            <Typography variant="subtitle2" gutterBottom>
              Time Period
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={7}>
                <TextField
                  fullWidth
                  label="Duration"
                  type="number"
                  value={duration}
                  onChange={handleDurationChange}
                  disabled={disabled}
                  error={getDurationErrors().length > 0}
                  helperText={
                    getDurationErrors().length > 0
                      ? getDurationErrors()[0].message
                      : 'Simulation duration'
                  }
                  inputProps={{
                    min: timeUnit === 'seconds' ? SIMULATION_CONSTRAINTS.MIN_DURATION : 1,
                    max:
                      timeUnit === 'days'
                        ? Math.floor(SIMULATION_CONSTRAINTS.MAX_DURATION / 86400)
                        : undefined,
                    step: timeUnit === 'seconds' ? 1 : 0.1,
                    'aria-label': 'Simulation duration',
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ScheduleIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={5}>
                <FormControl fullWidth disabled={disabled}>
                  <InputLabel id="time-unit-label">Unit</InputLabel>
                  <Select
                    labelId="time-unit-label"
                    value={timeUnit}
                    label="Unit"
                    onChange={handleTimeUnitChange}
                    aria-label="Time unit"
                  >
                    <MenuItem value={TimeUnit.SECONDS}>Seconds</MenuItem>
                    <MenuItem value={TimeUnit.MINUTES}>Minutes</MenuItem>
                    <MenuItem value={TimeUnit.HOURS}>Hours</MenuItem>
                    <MenuItem value={TimeUnit.DAYS}>Days</MenuItem>
                  </Select>
                  <FormHelperText sx={{ minHeight: '1.25rem', lineHeight: '1.25rem' }}>
                    {durationLocaleString} seconds total
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Concurrent Users Section */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Concurrent Users"
            type="number"
            value={concurrentUsers}
            onChange={handleConcurrentUsersChange}
            disabled={disabled}
            error={getUsersErrors().length > 0}
            helperText={
              getUsersErrors().length > 0
                ? getUsersErrors()[0].message
                : `Max ${maxUsersString} users`
            }
            inputProps={{
              min: SIMULATION_CONSTRAINTS.MIN_USERS,
              max: SIMULATION_CONSTRAINTS.MAX_USERS,
              step: 1,
              'aria-label': 'Number of concurrent users',
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PeopleIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Request Pattern Section */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth disabled={disabled}>
            <InputLabel id="request-pattern-label">Request Pattern</InputLabel>
            <Select
              labelId="request-pattern-label"
              value={requestPattern}
              label="Request Pattern"
              onChange={handleRequestPatternChange}
              aria-label="Request distribution pattern"
              startAdornment={
                <InputAdornment position="start">
                  <TrendingUpIcon color="action" />
                </InputAdornment>
              }
            >
              <MenuItem value={RequestPattern.UNIFORM}>Uniform</MenuItem>
              <MenuItem value={RequestPattern.FRONT_LOADED}>Front-loaded</MenuItem>
              <MenuItem value={RequestPattern.BACK_LOADED}>Back-loaded</MenuItem>
              <MenuItem value={RequestPattern.BELL_CURVE}>Bell Curve</MenuItem>
              <MenuItem value={RequestPattern.STEADY}>Steady</MenuItem>
              <MenuItem value={RequestPattern.BURST}>Burst</MenuItem>
              <MenuItem value={RequestPattern.VARIABLE}>Variable</MenuItem>
            </Select>
            <FormHelperText sx={{ minHeight: '1.25rem', lineHeight: '1.25rem' }}>
              {REQUEST_PATTERN_DESCRIPTIONS[requestPattern]}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* Granularity Section */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Granularity (seconds)"
            type="number"
            value={granularity}
            onChange={handleGranularityChange}
            disabled={disabled}
            error={getGranularityErrors().length > 0}
            helperText={
              getGranularityErrors().length > 0
                ? getGranularityErrors()[0].message
                : 'Data point interval for chart'
            }
            inputProps={{
              min: SIMULATION_CONSTRAINTS.MIN_GRANULARITY,
              max: Math.min(
                SIMULATION_CONSTRAINTS.MAX_GRANULARITY,
                durationInSeconds
              ),
              step: 1,
              'aria-label': 'Simulation granularity in seconds',
            }}
          />
        </Grid>
      </Grid>

      {/* Status Chips */}
      <Box mt={2} mb={2}>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            size="small"
            label={`${durationLocaleString}s`}
            color="primary"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${concurrentUsers} users`}
            color="secondary"
            variant="outlined"
          />
          <Chip
            size="small"
            label={requestPattern.replace('_', '-')}
            color="info"
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${Math.ceil(durationInSeconds / granularity)} data points`}
            color="default"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
        <Button variant="outlined" onClick={handleReset} disabled={disabled || isCalculating}>
          Reset to Defaults
        </Button>

        <Button
          variant="contained"
          onClick={handleCalculate}
          disabled={disabled || hasFormErrors || isCalculating}
          startIcon={isCalculating ? <CircularProgress size={20} /> : <PlayIcon />}
          size="large"
          aria-label={isCalculating ? 'Running simulation' : 'Run VRAM simulation'}
        >
          {isCalculating ? 'Running Simulation...' : 'Run Simulation'}
        </Button>
      </Box>

      {/* Performance Warning */}
      {durationInSeconds / granularity > 1000 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Large simulations with fine granularity may take longer to calculate and display. Consider
          increasing granularity for better performance.
        </Alert>
      )}
    </Paper>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedSimulationControls = React.memo(SimulationControls, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.isCalculating === nextProps.isCalculating &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onCalculate === nextProps.onCalculate &&
    // Deep comparison of config since it's an object
    JSON.stringify(prevProps.config) === JSON.stringify(nextProps.config)
  )
})

export default MemoizedSimulationControls
