import React from 'react'
import { Box, Slider, Typography, FormHelperText, Stack, Chip } from '@mui/material'
import { styled } from '@mui/material/styles'
import { PercentageSliderProps } from '../../types'

// Styled components for consistent theming
const StyledSlider = styled(Slider, {
  shouldForwardProp: prop => prop !== 'hasError',
})<{ hasError?: boolean }>(({ theme, hasError }) => ({
  color: hasError ? theme.palette.error.main : theme.palette.primary.main,
  height: 8,
  '& .MuiSlider-track': {
    border: 'none',
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    backgroundColor: '#fff',
    border: `2px solid ${hasError ? theme.palette.error.main : theme.palette.primary.main}`,
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0px 0px 0px 8px ${
        hasError ? theme.palette.error.main + '1a' : theme.palette.primary.main + '1a'
      }`,
    },
  },
  '& .MuiSlider-valueLabel': {
    lineHeight: 1.2,
    fontSize: 12,
    background: 'unset',
    padding: 0,
    width: 32,
    height: 32,
    borderRadius: '50% 50% 50% 0',
    backgroundColor: hasError ? theme.palette.error.main : theme.palette.primary.main,
    transformOrigin: 'bottom left',
    transform: 'translate(50%, -100%) rotate(-45deg) scale(0)',
    '&:before': { display: 'none' },
    '&.MuiSlider-valueLabelOpen': {
      transform: 'translate(50%, -100%) rotate(-45deg) scale(1)',
    },
    '& > *': {
      transform: 'rotate(45deg)',
    },
  },
}))

const PercentageSlider: React.FC<PercentageSliderProps> = ({
  value,
  onChange,
  remaining,
  label,
  disabled = false,
  error,
}) => {
  // Calculate if the current value exceeds remaining percentage
  const exceedsRemaining = value > remaining
  const hasError = Boolean(error) || exceedsRemaining

  // Generate validation error message
  const validationError = exceedsRemaining
    ? `Cannot exceed remaining percentage (${remaining}%)`
    : error

  // Format value display
  const formatValue = (val: number) => `${val}%`

  // Handle slider change with validation
  const handleChange = (_event: Event, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue
    // Allow values up to 100% but provide validation feedback
    onChange(val)
  }

  // Color scheme based on validation state
  const chipColor = hasError ? 'error' : remaining <= 10 ? 'warning' : 'success'

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      {/* Label and remaining percentage indicator */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography
          variant="body2"
          fontWeight="medium"
          color={hasError ? 'error' : 'text.primary'}
          id={`${label.replace(/\s+/g, '-').toLowerCase()}-slider-label`}
        >
          {label}
        </Typography>
        <Chip
          label={`${remaining}% remaining`}
          size="small"
          color={chipColor}
          variant="outlined"
          sx={{ fontSize: '0.75rem', height: 20 }}
        />
      </Stack>

      {/* Current value display */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Current Value
        </Typography>
        <Typography variant="body2" fontWeight="medium" color={hasError ? 'error' : 'primary'}>
          {formatValue(value)}
        </Typography>
      </Box>

      {/* Main slider component */}
      <StyledSlider
        value={value}
        onChange={handleChange}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        hasError={hasError}
        valueLabelDisplay="auto"
        valueLabelFormat={formatValue}
        aria-labelledby={`${label.replace(/\s+/g, '-').toLowerCase()}-slider-label`}
        aria-describedby={
          hasError ? `${label.replace(/\s+/g, '-').toLowerCase()}-helper-text` : undefined
        }
        sx={{
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      />

      {/* Percentage scale markers */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          0%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          25%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          50%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          75%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          100%
        </Typography>
      </Box>

      {/* Error/validation message */}
      {hasError && (
        <FormHelperText
          error
          id={`${label.replace(/\s+/g, '-').toLowerCase()}-helper-text`}
          sx={{ mt: 1 }}
        >
          {validationError}
        </FormHelperText>
      )}

      {/* Accessibility: Screen reader information */}
      <Box
        sx={{
          position: 'absolute',
          left: -10000,
          top: 'auto',
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        <div role="status" aria-live="polite" aria-atomic="true">
          {`${label} slider: ${value} percent. ${remaining} percent remaining. ${hasError ? `Error: ${validationError}` : 'Valid'}`}
        </div>
      </Box>
    </Box>
  )
}

export default PercentageSlider
