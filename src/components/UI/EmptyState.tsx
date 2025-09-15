import React from 'react'
import { Box, Typography, Button, useTheme, alpha } from '@mui/material'
import {
  TrendingUp as ChartIcon,
  Memory as GPUIcon,
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'

interface EmptyStateProps {
  type: 'chart' | 'results' | 'configure'
  title: string
  description: string
  actionText?: string
  onAction?: () => void
  disabled?: boolean
  showIcon?: boolean
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  disabled = false,
  showIcon = true,
}) => {
  const theme = useTheme()

  const getIcon = () => {
    switch (type) {
      case 'chart':
        return <ChartIcon sx={{ fontSize: 48, color: theme.palette.grey[400] }} />
      case 'results':
        return <GPUIcon sx={{ fontSize: 48, color: theme.palette.grey[400] }} />
      case 'configure':
        return <SettingsIcon sx={{ fontSize: 48, color: theme.palette.grey[400] }} />
      default:
        return <ChartIcon sx={{ fontSize: 48, color: theme.palette.grey[400] }} />
    }
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        bgcolor: alpha(theme.palette.grey[100], 0.5),
        borderRadius: 1,
        border: '1px dashed',
        borderColor: theme.palette.grey[300],
        textAlign: 'center',
        minHeight: 200,
      }}
    >
      {showIcon && getIcon()}

      <Box>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
          {description}
        </Typography>
      </Box>

      {actionText && onAction && (
        <Button
          variant="outlined"
          size="small"
          onClick={onAction}
          disabled={disabled}
          startIcon={<PlayIcon />}
          sx={{
            mt: 1,
            borderColor: theme.palette.grey[400],
            color: theme.palette.grey[600],
            '&:hover': {
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
            },
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  )
}

export default EmptyState
