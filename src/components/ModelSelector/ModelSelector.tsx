import React, { useMemo, useState } from 'react'
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  Paper,
  ListItem,
  Divider,
  Alert,
  Skeleton,
} from '@mui/material'
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Category as CategoryIcon,
  Business as OrganizationIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'

// Import types from the centralized type definitions
import { Model, ModelSelectorProps, ModelPrecision, PRECISION_BYTES } from '../../types'

// ============================================================================
// Styled Components
// ============================================================================

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1, 0),
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    borderColor: theme.palette.primary.main,
  },
}))

const ModelDetailsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}))

const PrecisionChip = styled(Chip)<{ precision: ModelPrecision }>(({ theme, precision }) => {
  const getColor = (prec: ModelPrecision) => {
    switch (prec) {
      case ModelPrecision.FP32:
        return theme.palette.error.main
      case ModelPrecision.FP16:
        return theme.palette.warning.main
      case ModelPrecision.INT8:
        return theme.palette.success.main
      case ModelPrecision.INT4:
        return theme.palette.info.main
      default:
        return theme.palette.grey[500]
    }
  }

  return {
    backgroundColor: getColor(precision),
    color: theme.palette.getContrastText(getColor(precision)),
    fontWeight: 'bold',
    fontSize: '0.75rem',
    height: '24px',
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats parameter count into readable format (B for billions, M for millions)
 */
const formatParameters = (params: number): string => {
  if (params >= 1e9) {
    return `${(params / 1e9).toFixed(1)}B`
  } else if (params >= 1e6) {
    return `${(params / 1e6).toFixed(1)}M`
  } else if (params >= 1e3) {
    return `${(params / 1e3).toFixed(1)}K`
  }
  return params.toString()
}

/**
 * Calculates estimated VRAM in GB for a model
 */
const calculateEstimatedVRAM = (model: Model): number => {
  const precisionBytes = PRECISION_BYTES[model.precision]
  const baseVRAM = (model.parameters * precisionBytes * 1.2) / (1024 * 1024 * 1024) // Convert to GB
  return baseVRAM
}

/**
 * Creates option label for accessibility and search
 */
const createOptionLabel = (model: Model): string => {
  const params = formatParameters(model.parameters)
  const vram = calculateEstimatedVRAM(model).toFixed(1)
  return `${model.name} - ${params} parameters, ${model.precision.toUpperCase()}, ~${vram}GB VRAM, by ${model.metadata.organization}`
}

/**
 * Filters models based on search text
 */
const filterOptions = (options: Model[], { inputValue }: { inputValue: string }): Model[] => {
  const searchText = inputValue.toLowerCase().trim()

  if (!searchText) {
    return options
  }

  return options.filter(model => {
    const searchTargets = [
      model.name.toLowerCase(),
      model.description.toLowerCase(),
      model.metadata.organization.toLowerCase(),
      model.precision.toLowerCase(),
      formatParameters(model.parameters).toLowerCase(),
      ...model.metadata.tags.map(tag => tag.toLowerCase()),
    ]

    return searchTargets.some(target => target.includes(searchText))
  })
}

// ============================================================================
// Custom Option Component
// ============================================================================

interface ModelOptionProps {
  model: Model
  selected: boolean
}

const ModelOption: React.FC<ModelOptionProps> = ({ model, selected }) => {
  const estimatedVRAM = calculateEstimatedVRAM(model)
  const parameterCount = formatParameters(model.parameters)

  return (
    <StyledPaper
      elevation={selected ? 2 : 0}
      sx={{
        margin: 0,
        backgroundColor: selected ? 'action.selected' : 'background.paper',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography
            variant="subtitle1"
            fontWeight="medium"
            sx={{
              color: selected ? 'primary.main' : 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {model.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {model.description}
          </Typography>

          <ModelDetailsBox>
            <Box display="flex" alignItems="center" gap={0.5}>
              <MemoryIcon fontSize="small" />
              <span>{parameterCount} params</span>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Box display="flex" alignItems="center" gap={0.5}>
              <SpeedIcon fontSize="small" />
              <span>~{estimatedVRAM.toFixed(1)}GB</span>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Box display="flex" alignItems="center" gap={0.5}>
              <OrganizationIcon fontSize="small" />
              <span>{model.metadata.organization}</span>
            </Box>
          </ModelDetailsBox>

          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
            <PrecisionChip
              precision={model.precision}
              label={model.precision.toUpperCase()}
              size="small"
            />
            {model.metadata.tags.slice(0, 3).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            ))}
            {model.metadata.tags.length > 3 && (
              <Chip
                label={`+${model.metadata.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: '20px' }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </StyledPaper>
  )
}

// ============================================================================
// Main ModelSelector Component
// ============================================================================

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
  disabled = false,
  error,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Memoize sorted models for performance
  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      // Sort by parameters (descending), then by name
      if (a.parameters !== b.parameters) {
        return b.parameters - a.parameters
      }
      return a.name.localeCompare(b.name)
    })
  }, [models])

  // Handle selection change
  const handleChange = (_: React.SyntheticEvent, newValue: Model | null) => {
    if (newValue && newValue !== selectedModel) {
      onModelSelect(newValue)
    }
  }

  // Handle input change for search
  const handleInputChange = (_: React.SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue)
  }

  // Create accessible announcement for screen readers
  const announceSelection = (model: Model | null) => {
    if (model) {
      const vram = calculateEstimatedVRAM(model).toFixed(1)
      const params = formatParameters(model.parameters)
      return `${model.name} selected. ${params} parameters, ${model.precision.toUpperCase()} precision, estimated ${vram} gigabytes VRAM required.`
    }
    return 'No model selected'
  }

  return (
    <Box>
      <Autocomplete
        id="model-selector"
        options={sortedModels}
        value={selectedModel}
        onChange={handleChange}
        onInputChange={handleInputChange}
        inputValue={inputValue}
        getOptionLabel={option => (typeof option === 'string' ? option : option.name)}
        filterOptions={filterOptions}
        disabled={disabled || models.length === 0}
        open={isOpen}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={params => (
          <TextField
            {...params}
            label="Select Model"
            placeholder="Search models by name, organization, or tags..."
            error={!!error}
            helperText={error || `${models.length} models available`}
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, mr: 0.5 }}>
                  <CategoryIcon color="action" fontSize="small" />
                </Box>
              ),
            }}
            inputProps={{
              ...params.inputProps,
              'aria-label': 'Select model for VRAM calculation',
              'aria-describedby': error ? 'model-selector-error' : 'model-selector-helper',
              'data-testid': 'model-selector-input',
            }}
          />
        )}
        renderOption={(props, option, state) => (
          <ListItem
            {...props}
            key={option.id}
            sx={{
              flexDirection: 'column',
              alignItems: 'stretch',
              padding: 0.5,
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-focused': {
                backgroundColor: 'action.focus',
              },
            }}
            aria-label={createOptionLabel(option)}
          >
            <ModelOption model={option} selected={state.selected} />
          </ListItem>
        )}
        PaperComponent={({ children, ...props }) => (
          <Paper
            {...props}
            elevation={8}
            sx={{
              mt: 1,
              maxHeight: 400,
              overflow: 'auto',
              '& .MuiAutocomplete-listbox': {
                padding: 1,
                '& .MuiAutocomplete-option': {
                  padding: 0,
                },
              },
            }}
          >
            {children}
          </Paper>
        )}
        loading={models.length === 0 && !disabled}
        loadingText={
          <Box display="flex" alignItems="center" gap={2} p={2}>
            <Skeleton variant="rectangular" width={40} height={40} />
            <Box flex={1}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
        }
        noOptionsText={
          models.length === 0
            ? 'No models available. Please check your connection and try again.'
            : 'No models match your search. Try different keywords.'
        }
        sx={{
          '& .MuiAutocomplete-popupIndicator': {
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-in-out',
          },
        }}
        // Accessibility enhancements
        ListboxProps={{
          'aria-label': 'Available models list',
          role: 'listbox',
        }}
      />

      {/* Screen reader announcement for selection */}
      <Box
        component="div"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          left: -10000,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        {selectedModel && announceSelection(selectedModel)}
      </Box>

      {/* Additional error display */}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }} icon={<InfoIcon />} id="model-selector-error">
          {error}
        </Alert>
      )}

      {/* Show additional information about selected model */}
      {selectedModel && !error && (
        <Box sx={{ mt: 2 }}>
          <Alert
            severity="info"
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              border: '1px solid rgba(25, 118, 210, 0.2)',
            }}
          >
            <Typography variant="body2">
              <strong>{selectedModel.name}</strong> requires approximately{' '}
              <strong>{calculateEstimatedVRAM(selectedModel).toFixed(1)} GB</strong> of VRAM (
              {formatParameters(selectedModel.parameters)} parameters in{' '}
              {selectedModel.precision.toUpperCase()} precision)
            </Typography>
          </Alert>
        </Box>
      )}
    </Box>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedModelSelector = React.memo(ModelSelector, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.error === nextProps.error &&
    prevProps.selectedModel?.id === nextProps.selectedModel?.id &&
    prevProps.models.length === nextProps.models.length &&
    prevProps.onModelSelect === nextProps.onModelSelect
  )
})

export default MemoizedModelSelector
