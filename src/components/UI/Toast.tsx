import React from 'react'
import {
  Snackbar,
  Alert,
  AlertColor,
  Slide,
  Fade,
  Grow,
  useTheme,
  SnackbarOrigin,
  SlideProps,
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'

// Keyframes removed - Material-UI Snackbar handles animations via TransitionComponent

export interface ToastProps {
  id?: string
  open: boolean
  message: string
  severity?: AlertColor
  duration?: number
  position?: SnackbarOrigin
  transition?: 'slide' | 'fade' | 'grow'
  slideDirection?: 'up' | 'down' | 'left' | 'right'
  onClose?: (event?: React.SyntheticEvent | Event, reason?: string) => void
  action?: React.ReactNode
  autoHideDuration?: number
  disableWindowBlurListener?: boolean
  resumeHideDuration?: number
  className?: string
  preventDuplicate?: boolean
  persist?: boolean
  variant?: 'filled' | 'outlined' | 'standard'
  elevation?: number
  iconMapping?: Partial<Record<AlertColor, React.ReactNode>>
}

interface TransitionComponentProps extends TransitionProps {
  children: React.ReactElement
}

// Transition components
const SlideTransition = React.forwardRef<unknown, SlideProps & { slideDirection?: string }>(
  function SlideTransition(props, ref) {
    const { slideDirection = 'up', ...other } = props
    return <Slide direction={slideDirection as SlideProps['direction']} ref={ref} {...other} />
  }
)

const FadeTransition = React.forwardRef<unknown, TransitionComponentProps>(
  function FadeTransition(props, ref) {
    return <Fade ref={ref} {...props} />
  }
)

const GrowTransition = React.forwardRef<unknown, TransitionComponentProps>(
  function GrowTransition(props, ref) {
    return <Grow ref={ref} {...props} />
  }
)

const Toast: React.FC<ToastProps> = ({
  id,
  open,
  message,
  severity = 'info',
  duration = 6000,
  position = { vertical: 'bottom', horizontal: 'right' },
  transition = 'slide',
  slideDirection = 'up',
  onClose,
  action,
  autoHideDuration,
  disableWindowBlurListener = false,
  resumeHideDuration,
  className,
  persist = false,
  variant = 'filled',
  elevation = 6,
  iconMapping,
}) => {
  const theme = useTheme()

  // Local open state to ensure UI closes immediately on timeout or button click
  const [isOpen, setIsOpen] = React.useState(open)

  // Sync with external open prop and id changes
  React.useEffect(() => {
    setIsOpen(open)
  }, [open, id])

  // Calculate effective auto-hide duration
  const effectiveAutoHideDuration = persist ? null : (autoHideDuration ?? duration)

  // Get transition component (memoized to avoid identity changes resetting timers)
  const TransitionComponent = React.useMemo(() => {
    switch (transition) {
      case 'fade':
        return FadeTransition
      case 'grow':
        return GrowTransition
      case 'slide':
      default:
        return React.forwardRef<unknown, TransitionComponentProps>((props, ref) => (
          <SlideTransition ref={ref} {...props} slideDirection={slideDirection} />
        ))
    }
  }, [transition, slideDirection])

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Don't close on clickaway if persist is true
    if (persist && reason === 'clickaway') {
      return
    }

    setIsOpen(false)
    onClose?.(event, reason)
  }

  return (
    <Snackbar
      key={id}
      open={isOpen}
      autoHideDuration={effectiveAutoHideDuration}
      onClose={handleClose}
      anchorOrigin={position}
      TransitionComponent={TransitionComponent}
      disableWindowBlurListener={disableWindowBlurListener}
      resumeHideDuration={resumeHideDuration}
      className={className}
      sx={{
        '& .MuiSnackbar-root': {
          position: 'fixed',
        },
        // Remove broken transform - Material UI Snackbar handles positioning
      }}
    >
      <Alert
        onClose={onClose ? event => handleClose(event, 'closeButtonClick') : undefined}
        severity={severity}
        variant={variant}
        elevation={elevation}
        iconMapping={iconMapping}
        action={action}
        sx={{
          minWidth: 300,
          maxWidth: 500,
          borderRadius: theme.shape.borderRadius * 2,
          boxShadow: theme.shadows[elevation],
          backdropFilter: 'blur(10px)',
          transition: theme.transitions.create(['transform', 'opacity', 'box-shadow'], {
            duration: theme.transitions.duration.standard,
          }),
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: theme.shadows[Math.min(elevation + 4, 24)],
          },
          // Custom styling for different severities in filled variant
          ...(variant === 'filled' && {
            '&.MuiAlert-filledSuccess': {
              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
            },
            '&.MuiAlert-filledError': {
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            },
            '&.MuiAlert-filledWarning': {
              background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
            },
            '&.MuiAlert-filledInfo': {
              background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
            },
          }),
          // Remove custom animation - Snackbar TransitionComponent handles slide animations
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export default Toast
