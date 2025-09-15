import React from 'react'
import { Box, CircularProgress, Typography, Backdrop, Paper, Fade } from '@mui/material'
import { styled } from '@mui/material/styles'

// Stable style objects to prevent recreation
const SPINNER_STYLES = {
  animationDuration: '1.4s',
}

const BACKDROP_STYLES = {
  color: '#fff',
  zIndex: (theme: any) => theme.zIndex.modal - 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
}

const MESSAGE_STYLES = {
  textAlign: 'center' as const,
  maxWidth: 300,
  fontWeight: 500,
}

interface LoadingSpinnerProps {
  size?: number | string
  message?: string
  overlay?: boolean
  thickness?: number
  color?: 'primary' | 'secondary' | 'inherit'
  variant?: 'determinate' | 'indeterminate'
  value?: number
  showProgress?: boolean
  className?: string
  center?: boolean
}

const SpinnerContainer = styled(Box)<{ center?: boolean }>(({ theme, center }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: center ? 'center' : 'flex-start',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}))

const OverlayContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  minWidth: 200,
  backdropFilter: 'blur(10px)',
  boxShadow: theme.shadows[8],
  zIndex: theme.zIndex.modal,
}))

const ProgressContainer = styled(Box)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const ProgressText = styled(Typography)(({ theme }) => ({
  position: 'absolute',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: theme.palette.text.secondary,
}))

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  message,
  overlay = false,
  thickness = 3.6,
  color = 'primary',
  variant = 'indeterminate',
  value = 0,
  showProgress = false,
  className,
  center = true,
}) => {
  const spinner = (
    <ProgressContainer>
      <CircularProgress
        size={size}
        thickness={thickness}
        color={color}
        variant={variant}
        value={value}
        sx={SPINNER_STYLES}
      />
      {showProgress && variant === 'determinate' && (
        <ProgressText variant="caption">{`${Math.round(value)}%`}</ProgressText>
      )}
    </ProgressContainer>
  )

  const content = (
    <SpinnerContainer center={center} className={className}>
      {spinner}
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={MESSAGE_STYLES}
        >
          {message}
        </Typography>
      )}
    </SpinnerContainer>
  )

  if (overlay) {
    return (
      <>
        <Backdrop
          open={true}
          sx={BACKDROP_STYLES}
        />
        <Fade in={true} timeout={300}>
          <OverlayContainer elevation={8}>{content}</OverlayContainer>
        </Fade>
      </>
    )
  }

  return (
    <Fade in={true} timeout={300}>
      {content}
    </Fade>
  )
}

export default LoadingSpinner
