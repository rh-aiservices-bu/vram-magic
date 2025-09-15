import React from 'react'
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Button,
  Typography,
  useTheme,
  Grow,
} from '@mui/material'
import {
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'

export interface NotificationAction {
  label: string
  onClick: () => void
  color?: 'primary' | 'secondary' | 'inherit'
  variant?: 'text' | 'outlined' | 'contained'
}

interface NotificationBarProps {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  open?: boolean
  onClose?: () => void
  autoClose?: boolean
  duration?: number
  actions?: NotificationAction[]
  icon?: React.ReactNode
  className?: string
  elevation?: number
  variant?: 'filled' | 'outlined' | 'standard'
}

const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[4],
  transition: theme.transitions.create(['transform', 'opacity'], {
    duration: theme.transitions.duration.standard,
  }),
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[8],
  },
  '& .MuiAlert-icon': {
    fontSize: '1.5rem',
  },
  '& .MuiAlert-action': {
    alignItems: 'flex-start',
    paddingTop: theme.spacing(0.5),
  },
}))

const ActionsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  flexWrap: 'wrap',
}))

const getIcon = (type: NotificationBarProps['type']) => {
  switch (type) {
    case 'success':
      return <SuccessIcon />
    case 'error':
      return <ErrorIcon />
    case 'warning':
      return <WarningIcon />
    case 'info':
      return <InfoIcon />
    default:
      return undefined
  }
}

const NotificationBar: React.FC<NotificationBarProps> = ({
  type,
  title,
  message,
  open = true,
  onClose,
  autoClose = true,
  duration = 6000,
  actions = [],
  icon,
  className,
  elevation = 6,
  variant = 'filled',
}) => {
  const theme = useTheme()
  const [isVisible, setIsVisible] = React.useState(open)

  // Auto close functionality
  React.useEffect(() => {
    if (autoClose && duration > 0 && isVisible) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, isVisible])

  React.useEffect(() => {
    setIsVisible(open)
  }, [open])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, theme.transitions.duration.standard)
  }

  const alertIcon = icon || getIcon(type)

  return (
    <Grow
      in={isVisible}
      timeout={{
        enter: theme.transitions.duration.enteringScreen,
        exit: theme.transitions.duration.leavingScreen,
      }}
      mountOnEnter
      unmountOnExit
    >
      <StyledAlert
        severity={type}
        variant={variant}
        icon={alertIcon}
        className={className}
        elevation={elevation}
        action={
          onClose ? (
            <IconButton
              aria-label="close notification"
              color="inherit"
              size="small"
              onClick={handleClose}
              sx={{
                transition: theme.transitions.create(['transform'], {
                  duration: theme.transitions.duration.shorter,
                }),
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : undefined
        }
        sx={{
          alignItems: 'flex-start',
        }}
      >
        {title && (
          <AlertTitle
            sx={{
              fontWeight: 600,
              marginBottom: title && message ? 1 : 0,
            }}
          >
            {title}
          </AlertTitle>
        )}

        {message && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message}
          </Typography>
        )}

        {actions.length > 0 && (
          <ActionsContainer>
            {actions.map((action, index) => (
              <Button
                key={index}
                size="small"
                color={action.color || 'inherit'}
                variant={action.variant || 'text'}
                onClick={action.onClick}
                sx={{
                  fontWeight: 500,
                  textTransform: 'none',
                  minWidth: 'auto',
                }}
              >
                {action.label}
              </Button>
            ))}
          </ActionsContainer>
        )}
      </StyledAlert>
    </Grow>
  )
}

export default NotificationBar
