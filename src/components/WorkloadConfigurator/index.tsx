// VRAM Magic: WorkloadConfigurator Component
// Drag-and-drop workload configuration with accessibility support

import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Slider,
  IconButton,
  Alert,
  LinearProgress,
  Paper,
  Divider,
  FormControlLabel,
  Switch,
  Button,
  Tooltip,
  useTheme,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material'
import {
  DragIndicator as DragIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  KeyboardArrowUp as UpIcon,
  KeyboardArrowDown as DownIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  GetApp as LoadIcon,
} from '@mui/icons-material'

import { Workload, WorkloadSlot, WorkloadConfiguratorProps, WorkloadCategory } from '../../types'
import { DEFAULT_WORKLOADS, WORKLOAD_CATEGORIES } from '../../data/workloads'
import { WORKLOAD_SLOT_CONSTRAINTS } from '../../constants'
import { hasErrors } from '../../utils/validation'
import { profileService, type WorkloadProfile } from '../../services/profileService'

// ============================================================================
// Drag and Drop Types
// ============================================================================

const DND_TYPES = {
  WORKLOAD: 'workload',
} as const

interface DragItem {
  type: string
  workload: Workload
  sourceType: 'palette' | 'slot'
  sourceIndex?: number
}

// ============================================================================
// Workload Palette Component
// ============================================================================

interface WorkloadCardProps {
  workload: Workload
  isDisabled?: boolean
  onKeyboardSelect?: (workload: Workload) => void
}

const WorkloadCard: React.FC<WorkloadCardProps> = ({
  workload,
  isDisabled = false,
  onKeyboardSelect,
}) => {
  const categoryInfo = WORKLOAD_CATEGORIES[workload.category]

  const [{ isDragging }, drag] = useDrag({
    type: DND_TYPES.WORKLOAD,
    item: (): DragItem => ({
      type: DND_TYPES.WORKLOAD,
      workload,
      sourceType: 'palette',
    }),
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isDisabled,
  })

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && onKeyboardSelect && !isDisabled) {
        event.preventDefault()
        onKeyboardSelect(workload)
      }
    },
    [onKeyboardSelect, workload, isDisabled]
  )

  return (
    <Card
      ref={drag}
      sx={{
        cursor: isDisabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : isDisabled ? 0.6 : 1,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: !isDisabled && !isDragging ? 'translateY(-2px)' : 'none',
          boxShadow: !isDisabled ? 2 : 1,
        },
        borderLeft: `4px solid ${categoryInfo.color}`,
      }}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      aria-label={`Workload: ${workload.name}. ${workload.description}. Category: ${categoryInfo.label}. ${isDisabled ? 'Already in use' : 'Drag to slot or press Enter to add'}`}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2">{workload.icon}</Typography>
          <Typography variant="subtitle2" fontWeight="bold">
            {workload.name}
          </Typography>
          <DragIcon sx={{ ml: 'auto', color: 'text.secondary', fontSize: 18 }} />
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          {workload.description}
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={categoryInfo.label}
            size="small"
            sx={{
              backgroundColor: alpha(categoryInfo.color, 0.1),
              color: categoryInfo.color,
              fontWeight: 'bold',
            }}
          />
          <Chip
            label={`${workload.inputTokens}→${workload.outputTokens} tokens`}
            size="small"
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Workload Slot Component
// ============================================================================

interface WorkloadSlotComponentProps {
  slot: WorkloadSlot
  index: number
  onDrop: (index: number, workload: Workload) => void
  onRemove: (index: number) => void
  onPercentageChange: (index: number, percentage: number) => void
  onActiveChange: (index: number, active: boolean) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  remainingPercentage: number
  totalPercentage: number
  canMoveUp: boolean
  canMoveDown: boolean
}

// Custom Slider Rail Component for Fixed Scale with Visual Regions
interface CustomSliderRailProps {
  currentValue: number
  maxAllowed: number
  categoryColor?: string
}

const CustomSliderRail: React.FC<CustomSliderRailProps> = ({
  currentValue,
  maxAllowed,
  categoryColor,
}) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'absolute',
        width: '100%',
        height: 6,
        borderRadius: 3,
        backgroundColor: 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* Allocated region (0 to currentValue) - Blue showing amount already set */}
      {currentValue > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            width: `${currentValue}%`,
            height: '100%',
            backgroundColor: categoryColor ? alpha(categoryColor, 0.6) : theme.palette.primary.main,
            borderRadius: currentValue === 100 ? '3px' : '3px 0 0 3px',
          }}
        />
      )}

      {/* Available region (currentValue to maxAllowed) - Green showing potential remaining amount */}
      {currentValue < maxAllowed && (
        <Box
          sx={{
            position: 'absolute',
            left: `${currentValue}%`,
            width: `${maxAllowed - currentValue}%`,
            height: '100%',
            backgroundColor: alpha(theme.palette.success.light, 0.3),
            borderRadius:
              currentValue === 0 && maxAllowed === 100
                ? '3px'
                : currentValue === 0
                  ? '3px 0 0 3px'
                  : maxAllowed === 100
                    ? '0 3px 3px 0'
                    : 'none',
          }}
        />
      )}

      {/* Blocked region (maxAllowed to 100) - Dark grey showing where user cannot go */}
      {maxAllowed < 100 && (
        <Box
          sx={{
            position: 'absolute',
            left: `${maxAllowed}%`,
            width: `${100 - maxAllowed}%`,
            height: '100%',
            backgroundColor: alpha(theme.palette.grey[800], 0.5),
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
    </Box>
  )
}

const WorkloadSlotComponent: React.FC<WorkloadSlotComponentProps> = ({
  slot,
  index,
  onDrop,
  onRemove,
  onPercentageChange,
  onActiveChange,
  onMoveUp,
  onMoveDown,
  remainingPercentage,
  totalPercentage,
  canMoveUp,
  canMoveDown,
}) => {
  const theme = useTheme()

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DND_TYPES.WORKLOAD,
    drop: (item: DragItem) => {
      onDrop(index, item.workload)
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const categoryInfo = slot.workload ? WORKLOAD_CATEGORIES[slot.workload.category] : null

  // Fixed scale slider logic: always 0-100%, but limit where user can drag
  const maxAllowed =
    totalPercentage >= 100
      ? slot.percentage // Can only decrease when at 100%
      : Math.min(100, slot.percentage + remainingPercentage)

  const isSliderBlocked = totalPercentage >= 100 && maxAllowed === slot.percentage

  return (
    <Paper
      ref={drop}
      sx={{
        p: 2,
        minHeight: 120,
        border: `2px dashed ${
          isOver && canDrop ? theme.palette.primary.main : theme.palette.divider
        }`,
        backgroundColor:
          isOver && canDrop
            ? alpha(theme.palette.primary.main, 0.05)
            : slot.workload
              ? alpha(categoryInfo?.color || theme.palette.grey[500], 0.05)
              : 'transparent',
        transition: 'all 0.2s ease',
      }}
      role="region"
      aria-label={`Workload slot ${index + 1}${slot.workload ? `: ${slot.workload.name}` : ': Empty'}`}
    >
      <Box display="flex" alignItems="center" justifyContent="between" mb={1}>
        <Typography variant="h6" color="text.secondary">
          Slot {index + 1}
        </Typography>

        {slot.workload && (
          <Box display="flex" gap={0.5}>
            <Tooltip title="Move up">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onMoveUp(index)}
                  disabled={!canMoveUp}
                  aria-label={`Move slot ${index + 1} up`}
                >
                  <UpIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  onClick={() => onMoveDown(index)}
                  disabled={!canMoveDown}
                  aria-label={`Move slot ${index + 1} down`}
                >
                  <DownIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Remove workload">
              <IconButton
                size="small"
                onClick={() => onRemove(index)}
                aria-label={`Remove workload from slot ${index + 1}`}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {slot.workload ? (
        <Box>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="body2">{slot.workload.icon}</Typography>
            <Typography variant="subtitle1" fontWeight="bold">
              {slot.workload.name}
            </Typography>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap" sx={{ ml: 2 }}>
            <Chip
              label={categoryInfo?.label || 'Unknown'}
              size="small"
              sx={{
                backgroundColor: alpha(categoryInfo?.color || theme.palette.grey[500], 0.1),
                color: categoryInfo?.color || theme.palette.grey[500],
              }}
            />
            <Chip
              label={`${slot.workload.inputTokens}→${slot.workload.outputTokens} tokens`}
              size="small"
              variant="outlined"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={slot.isActive}
                  onChange={e => onActiveChange(index, e.target.checked)}
                  color="primary"
                />
              }
              label="Active in simulation"
            />
          </Box>

          {slot.isActive && (
            <Box mt={2}>
              <Box mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Percentage: {slot.percentage}%
                </Typography>
              </Box>

              {isSliderBlocked && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1 }}>
                  Total at 100% - can only decrease
                </Typography>
              )}

              <Box sx={{ position: 'relative', pt: 1, px: 1, overflow: 'visible' }}>
                <Slider
                  value={slot.percentage}
                  onChange={(_, value) => {
                    const clampedValue = Math.min(value as number, maxAllowed)
                    onPercentageChange(index, clampedValue)
                  }}
                  min={0}
                  max={100}
                  step={1}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: maxAllowed, label: `${maxAllowed}%` },
                    { value: 100, label: '100%' },
                  ]}
                  components={{
                    Rail: () => (
                      <CustomSliderRail
                        currentValue={slot.percentage}
                        maxAllowed={maxAllowed}
                        categoryColor={categoryInfo?.color}
                      />
                    ),
                  }}
                  sx={{
                    color: 'transparent',
                    mx: 0,
                    '& .MuiSlider-root': {
                      padding: '13px 0',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: isSliderBlocked
                        ? theme.palette.warning.main
                        : categoryInfo?.color || theme.palette.primary.main,
                      borderColor: isSliderBlocked
                        ? theme.palette.warning.main
                        : categoryInfo?.color || theme.palette.primary.main,
                      '&:hover': {
                        boxShadow: `0px 0px 0px 8px ${alpha(
                          isSliderBlocked
                            ? theme.palette.warning.main
                            : categoryInfo?.color || theme.palette.primary.main,
                          0.16
                        )}`,
                      },
                    },
                    '& .MuiSlider-track': { display: 'none' },
                    '& .MuiSlider-rail': { display: 'none' },
                    '& .MuiSlider-mark': { display: 'none' }, // 🚀 Fixes stray grey line
                    '& .MuiSlider-markLabel': {
                      fontSize: '0.75rem',
                      color: theme.palette.text.secondary,
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
          color="text.secondary"
        >
          <AddIcon sx={{ fontSize: 32, mb: 1 }} />
          <Typography variant="body2" textAlign="center">
            {isOver && canDrop
              ? 'Drop workload here'
              : 'Drag a workload here or use keyboard controls'}
          </Typography>
        </Box>
      )}
    </Paper>
  )
}

// ============================================================================
// Main WorkloadConfigurator Component
// ============================================================================

const WorkloadConfigurator: React.FC<WorkloadConfiguratorProps> = ({
  workloads = DEFAULT_WORKLOADS,
  workloadSlots,
  onSlotsChange,
  disabled = false,
  errors = [],
}) => {
  const theme = useTheme()
  const [keyboardMode, setKeyboardMode] = useState(false)

  // Profile management state
  const [profiles, setProfiles] = useState<WorkloadProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [profileToDelete, setProfileToDelete] = useState<string>('')
  const [profileToDuplicate, setProfileToDuplicate] = useState<string>('')
  const [newProfileName, setNewProfileName] = useState('')
  const [newProfileDescription, setNewProfileDescription] = useState('')
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)

  // Calculate derived state with memoization for performance
  const activeSlots = useMemo(
    () => workloadSlots.filter(slot => slot.isActive && slot.workload),
    [workloadSlots]
  )

  const { totalPercentage, remainingPercentage } = useMemo(() => {
    const total = activeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
    return {
      totalPercentage: total,
      remainingPercentage: WORKLOAD_SLOT_CONSTRAINTS.TOTAL_PERCENTAGE - total,
    }
  }, [activeSlots])

  const usedWorkloadIds = useMemo(
    () => new Set(workloadSlots.map(slot => slot.workload?.id).filter(Boolean)),
    [workloadSlots]
  )

  // Validation - use errors from props (already validated in WorkloadContext)
  const allErrors = errors
  const hasValidationErrors = hasErrors(allErrors)

  // Load profiles on component mount
  useEffect(() => {
    const result = profileService.loadProfiles()
    if (result.success && result.data) {
      setProfiles(result.data)
    } else if (result.error) {
      setSnackbarMessage(`Failed to load profiles: ${result.error}`)
      setSnackbarOpen(true)
    }
  }, [])

  // ============================================================================
  // Profile Management Handlers
  // ============================================================================

  const handleProfileSelect = useCallback(
    (profileId: string) => {
      const profile = profiles.find(p => p.id === profileId)
      if (profile && onSlotsChange) {
        setSelectedProfileId(profileId)
        onSlotsChange(profile.workloadSlots)
        setSnackbarMessage(`Loaded profile: ${profile.name}`)
        setSnackbarOpen(true)
      }
    },
    [profiles, onSlotsChange]
  )

  const handleSaveProfile = useCallback(() => {
    if (!newProfileName.trim()) return

    const profileId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newProfile = {
      id: profileId,
      name: newProfileName.trim(),
      description:
        newProfileDescription.trim() ||
        `Custom profile created on ${new Date().toLocaleDateString()}`,
      category: 'custom',
      workloadSlots: [...workloadSlots],
      tags: ['custom'],
      useCase: 'Custom workload configuration',
      targetAudience: ['general'],
      isCustom: true,
    }

    const result = profileService.saveProfile(newProfile)
    if (result.success && result.data) {
      setProfiles(prev => [...prev, result.data!])
      setSelectedProfileId(result.data.id)
      setSnackbarMessage(`Profile saved: ${result.data.name}`)
      setSnackbarOpen(true)
      setSaveDialogOpen(false)
      setNewProfileName('')
      setNewProfileDescription('')
    } else if (result.error) {
      setSnackbarMessage(`Failed to save profile: ${result.error}`)
      setSnackbarOpen(true)
    }
  }, [newProfileName, newProfileDescription, workloadSlots])

  const handleDeleteProfile = useCallback(() => {
    if (!profileToDelete) return

    const result = profileService.deleteProfile(profileToDelete)
    if (result.success) {
      setProfiles(prev => prev.filter(p => p.id !== profileToDelete))
      if (selectedProfileId === profileToDelete) {
        setSelectedProfileId('')
      }
      const deletedProfile = profiles.find(p => p.id === profileToDelete)
      setSnackbarMessage(`Profile deleted: ${deletedProfile?.name || 'Profile'}`)
      setSnackbarOpen(true)
    } else if (result.error) {
      setSnackbarMessage(`Failed to delete profile: ${result.error}`)
      setSnackbarOpen(true)
    }

    setDeleteDialogOpen(false)
    setProfileToDelete('')
  }, [profileToDelete, profiles, selectedProfileId])

  const handleDuplicateProfile = useCallback(() => {
    if (!profileToDuplicate || !newProfileName.trim()) return

    const result = profileService.duplicateProfile(profileToDuplicate, newProfileName.trim())
    if (result.success && result.data) {
      setProfiles(prev => [...prev, result.data!])
      setSelectedProfileId(result.data.id)
      setSnackbarMessage(`Profile duplicated: ${result.data.name}`)
      setSnackbarOpen(true)
      setDuplicateDialogOpen(false)
      setNewProfileName('')
      setProfileToDuplicate('')
    } else if (result.error) {
      setSnackbarMessage(`Failed to duplicate profile: ${result.error}`)
      setSnackbarOpen(true)
    }
  }, [profileToDuplicate, newProfileName])

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDrop = useCallback(
    (slotIndex: number, workload: Workload) => {
      const newSlots = [...workloadSlots]
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        workload,
        isActive: true,
        percentage: Math.max(1, Math.min(remainingPercentage || 20, 20)), // Ensure minimum 1%
      }
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange, remainingPercentage]
  )

  const handleRemove = useCallback(
    (slotIndex: number) => {
      const newSlots = [...workloadSlots]
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        workload: null,
        isActive: false,
        percentage: 0,
      }
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange]
  )

  const handlePercentageChange = useCallback(
    (slotIndex: number, percentage: number) => {
      const newSlots = [...workloadSlots]

      // Calculate what the new total would be
      const otherSlotsTotal = workloadSlots
        .filter((_, index) => index !== slotIndex)
        .reduce((sum, slot) => sum + slot.percentage, 0)
      const proposedTotal = otherSlotsTotal + percentage

      // Only allow the change if it doesn't exceed 100%
      const finalPercentage = proposedTotal > 100 ? Math.max(0, 100 - otherSlotsTotal) : percentage

      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        percentage: finalPercentage,
      }
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange]
  )

  const handleActiveChange = useCallback(
    (slotIndex: number, active: boolean) => {
      const newSlots = [...workloadSlots]
      newSlots[slotIndex] = {
        ...newSlots[slotIndex],
        isActive: active,
        percentage: active ? Math.max(newSlots[slotIndex].percentage, 1) : 0,
      }
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange]
  )

  const handleMoveUp = useCallback(
    (slotIndex: number) => {
      if (slotIndex === 0) return
      const newSlots = [...workloadSlots]
      ;[newSlots[slotIndex], newSlots[slotIndex - 1]] = [
        newSlots[slotIndex - 1],
        newSlots[slotIndex],
      ]
      // Update order properties (1-based indexing: array index + 1)
      newSlots[slotIndex].order = slotIndex + 1
      newSlots[slotIndex - 1].order = slotIndex
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange]
  )

  const handleMoveDown = useCallback(
    (slotIndex: number) => {
      if (slotIndex === workloadSlots.length - 1) return
      const newSlots = [...workloadSlots]
      ;[newSlots[slotIndex], newSlots[slotIndex + 1]] = [
        newSlots[slotIndex + 1],
        newSlots[slotIndex],
      ]
      // Update order properties (1-based indexing: array index + 1)
      newSlots[slotIndex].order = slotIndex + 1
      newSlots[slotIndex + 1].order = slotIndex + 2
      onSlotsChange(newSlots)
    },
    [workloadSlots, onSlotsChange]
  )

  const handleKeyboardSelect = useCallback(
    (workload: Workload) => {
      // Find first empty slot
      const emptySlotIndex = workloadSlots.findIndex(slot => !slot.workload)
      if (emptySlotIndex !== -1) {
        handleDrop(emptySlotIndex, workload)
      }
    },
    [workloadSlots, handleDrop]
  )

  const handleClearAll = useCallback(() => {
    const newSlots = workloadSlots.map(slot => ({
      ...slot,
      workload: null,
      isActive: false,
      percentage: 0,
    }))
    onSlotsChange(newSlots)
  }, [workloadSlots, onSlotsChange])

  // Group workloads by category for better organization
  const workloadsByCategory = React.useMemo(() => {
    const grouped: Record<WorkloadCategory, Workload[]> = {
      [WorkloadCategory.CHAT]: [],
      [WorkloadCategory.RAG]: [],
      [WorkloadCategory.CODING]: [],
      [WorkloadCategory.CREATIVE]: [],
      [WorkloadCategory.ANALYSIS]: [],
      [WorkloadCategory.CUSTOM]: [],
    }

    workloads.forEach(workload => {
      grouped[workload.category].push(workload)
    })

    return grouped
  }, [workloads])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            Workload Configuration
          </Typography>

          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch checked={keyboardMode} onChange={e => setKeyboardMode(e.target.checked)} />
              }
              label="Keyboard Mode"
            />

            <Button
              variant="outlined"
              onClick={handleClearAll}
              disabled={disabled || activeSlots.length === 0}
              startIcon={<ClearIcon />}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        {/* Profile Management */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Profile Management
          </Typography>

          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Load Profile</InputLabel>
              <Select
                value={selectedProfileId}
                label="Load Profile"
                onChange={e => handleProfileSelect(e.target.value)}
                startAdornment={<LoadIcon />}
              >
                <MenuItem value="">
                  <em>Select a profile...</em>
                </MenuItem>
                {profiles.map(profile => (
                  <MenuItem key={profile.id} value={profile.id}>
                    <Box display="flex" flexDirection="column" alignItems="flex-start">
                      <Typography variant="body2" fontWeight="medium">
                        {profile.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {profile.category} • {profile.workloadSlots.filter(s => s.isActive).length}{' '}
                        slots
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialogOpen(true)}
              size="small"
            >
              Save Current
            </Button>

            {selectedProfileId && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<DuplicateIcon />}
                  onClick={() => {
                    setProfileToDuplicate(selectedProfileId)
                    setDuplicateDialogOpen(true)
                  }}
                  size="small"
                >
                  Duplicate
                </Button>

                {profiles.find(p => p.id === selectedProfileId)?.isCustom && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setProfileToDelete(selectedProfileId)
                      setDeleteDialogOpen(true)
                    }}
                    size="small"
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
          </Box>

          {selectedProfileId && (
            <Box mt={2}>
              <Typography variant="body2" color="text.secondary">
                {profiles.find(p => p.id === selectedProfileId)?.description}
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Progress and Validation */}
        <Box mb={3}>
          <Box display="flex" justifyContent="between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Total Allocation: {totalPercentage}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Remaining: {remainingPercentage}%
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={totalPercentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.grey[300], 0.3),
              '& .MuiLinearProgress-bar': {
                backgroundColor:
                  totalPercentage === 100
                    ? theme.palette.success.main
                    : totalPercentage > 100
                      ? theme.palette.error.main
                      : theme.palette.primary.main,
              },
            }}
          />

          {hasValidationErrors && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuration Issues:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {allErrors
                  .filter(e => e.severity === 'error')
                  .map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
              </ul>
            </Alert>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Workload Slots */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Workload Slots
            </Typography>

            <Grid container spacing={2}>
              {workloadSlots.map((slot, index) => (
                <Grid item xs={12} sm={6} key={slot.id}>
                  <WorkloadSlotComponent
                    slot={slot}
                    index={index}
                    onDrop={handleDrop}
                    onRemove={handleRemove}
                    onPercentageChange={handlePercentageChange}
                    onActiveChange={handleActiveChange}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    remainingPercentage={remainingPercentage}
                    totalPercentage={totalPercentage}
                    canMoveUp={index > 0}
                    canMoveDown={index < workloadSlots.length - 1}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Workload Palette */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Available Workloads
            </Typography>

            {keyboardMode && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Keyboard mode: Use Tab to navigate, Enter/Space to add workloads to the first empty
                slot.
              </Alert>
            )}

            <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
              {Object.entries(workloadsByCategory).map(([category, categoryWorkloads]) => {
                if (categoryWorkloads.length === 0) return null

                const categoryInfo = WORKLOAD_CATEGORIES[category as WorkloadCategory]

                return (
                  <Box key={category} mb={3}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ color: categoryInfo.color, mb: 1 }}
                    >
                      {categoryInfo.label}
                    </Typography>

                    <Grid container spacing={1} sx={{ pr: 1 }}>
                      {categoryWorkloads.map(workload => (
                        <Grid item xs={12} key={workload.id}>
                          <WorkloadCard
                            workload={workload}
                            isDisabled={disabled || usedWorkloadIds.has(workload.id)}
                            onKeyboardSelect={keyboardMode ? handleKeyboardSelect : undefined}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )
              })}
            </Box>
          </Grid>
        </Grid>

        {/* Instructions */}
        <Box mt={4}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            <strong>Instructions:</strong> Drag workloads from the palette to the slots, or use
            keyboard mode for accessibility. Adjust percentages to total 100%. Active workloads will
            be included in the simulation.
          </Typography>
        </Box>
      </Box>

      {/* Save Profile Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Save Profile</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Profile Name"
            fullWidth
            value={newProfileName}
            onChange={e => setNewProfileName(e.target.value)}
            placeholder="Enter profile name..."
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={newProfileDescription}
            onChange={e => setNewProfileDescription(e.target.value)}
            placeholder="Describe this workload configuration..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained" disabled={!newProfileName.trim()}>
            Save Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Profile Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the profile "
            {profiles.find(p => p.id === profileToDelete)?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Profile Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Duplicate Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creating a copy of "{profiles.find(p => p.id === profileToDuplicate)?.name}"
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="New Profile Name"
            fullWidth
            value={newProfileName}
            onChange={e => setNewProfileName(e.target.value)}
            placeholder="Enter name for the copy..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDuplicateProfile}
            variant="contained"
            disabled={!newProfileName.trim()}
          >
            Create Copy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </DndProvider>
  )
}

// Memoize component to prevent unnecessary re-renders
const MemoizedWorkloadConfigurator = React.memo(WorkloadConfigurator, (prevProps, nextProps) => {
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.workloads.length === nextProps.workloads.length &&
    prevProps.workloadSlots.length === nextProps.workloadSlots.length &&
    prevProps.profiles.length === nextProps.profiles.length &&
    prevProps.errors.length === nextProps.errors.length &&
    prevProps.onSlotsChange === nextProps.onSlotsChange &&
    prevProps.onProfileSelect === nextProps.onProfileSelect &&
    // Deep comparison of workloadSlots is needed since they contain objects
    JSON.stringify(prevProps.workloadSlots) === JSON.stringify(nextProps.workloadSlots)
  )
})

export default MemoizedWorkloadConfigurator
