import React from 'react'
import { Box, LinearProgress, Typography, IconButton, Paper, Chip, Fade } from '@mui/material'
import { Cancel as CancelIcon, Timer as TimerIcon, Speed as SpeedIcon } from '@mui/icons-material'
import { styled } from '@mui/material/styles'

interface ProgressIndicatorProps {
  value?: number
  buffer?: number
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query'
  color?: 'primary' | 'secondary' | 'inherit'
  size?: 'small' | 'medium' | 'large'
  label?: string
  showPercentage?: boolean
  showTimeRemaining?: boolean
  timeRemaining?: number
  showSpeed?: boolean
  speed?: string
  onCancel?: () => void
  cancelable?: boolean
  className?: string
  elevation?: number
  rounded?: boolean
}

const ProgressContainer = styled(Paper)<{
  elevation: number
  rounded: boolean
}>(({ theme, elevation, rounded }) => ({
  padding: theme.spacing(2),
  borderRadius: rounded ? theme.shape.borderRadius * 2 : theme.shape.borderRadius,
  transition: theme.transitions.create(['box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    boxShadow: theme.shadows[Math.min(elevation + 2, 24)],
  },
}))

const ProgressHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(1),
}))

const ProgressContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}))

const StyledLinearProgress = styled(LinearProgress)<{
  size: 'small' | 'medium' | 'large'
}>(({ theme, size }) => {
  const heights = {
    small: 4,
    medium: 6,
    large: 8,
  }

  return {
    height: heights[size],
    borderRadius: heights[size] / 2,
    backgroundColor:
      theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
    '& .MuiLinearProgress-bar': {
      borderRadius: heights[size] / 2,
      transition: theme.transitions.create(['transform', 'background-color'], {
        duration: theme.transitions.duration.standard,
      }),
    },
  }
})

const MetricsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'center',
  flexWrap: 'wrap',
  marginTop: theme.spacing(1),
}))

const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value = 0,
  buffer,
  variant = 'determinate',
  color = 'primary',
  size = 'medium',
  label,
  showPercentage = true,
  showTimeRemaining = false,
  timeRemaining,
  showSpeed = false,
  speed,
  onCancel,
  cancelable = false,
  className,
  elevation = 2,
  rounded = true,
}) => {
  const displayValue = Math.round(value)
  const isComplete = variant === 'determinate' && value >= 100

  return (
    <Fade in={true} timeout={300}>
      <ProgressContainer elevation={elevation} rounded={rounded} className={className}>
        {(label || cancelable) && (
          <ProgressHeader>
            {label && (
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 500,
                  color: isComplete ? 'success.main' : 'text.primary',
                }}
              >
                {label}
              </Typography>
            )}

            {cancelable && onCancel && (
              <IconButton
                size="small"
                onClick={onCancel}
                aria-label="Cancel operation"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'error.main',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            )}
          </ProgressHeader>
        )}

        <ProgressContent>
          <Box sx={{ position: 'relative' }}>
            <StyledLinearProgress
              variant={variant}
              value={value}
              valueBuffer={buffer}
              color={isComplete ? 'success' : color}
              size={size}
            />

            {showPercentage && variant === 'determinate' && (
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  right: 0,
                  top: -24,
                  fontWeight: 600,
                  color: isComplete ? 'success.main' : 'text.secondary',
                }}
              >
                {displayValue}%
              </Typography>
            )}
          </Box>

          {(showTimeRemaining || showSpeed) && (
            <MetricsContainer>
              {showTimeRemaining && timeRemaining !== undefined && timeRemaining > 0 && (
                <Chip
                  icon={<TimerIcon />}
                  label={`${formatTime(timeRemaining)} remaining`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}

              {showSpeed && speed && (
                <Chip
                  icon={<SpeedIcon />}
                  label={speed}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{
                    fontSize: '0.75rem',
                    '& .MuiChip-icon': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              )}
            </MetricsContainer>
          )}
        </ProgressContent>
      </ProgressContainer>
    </Fade>
  )
}

export default ProgressIndicator
