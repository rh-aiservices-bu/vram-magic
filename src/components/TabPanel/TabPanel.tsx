import React from 'react'
import { Tabs, Tab, Box, Typography, useTheme, alpha, Paper, Fade } from '@mui/material'
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as IncompleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
  padding?: number
}

interface ConfigurationTabsProps {
  activeTab: number
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void
  modelSelected: boolean
  workloadConfigured: boolean
  simulationConfigured: boolean
  hasErrors: boolean
  children: React.ReactNode[]
}

interface TabConfig {
  label: string
  isComplete: boolean
  hasError: boolean
  description: string
}

// Individual TabPanel component
export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  padding = 3,
  ...other
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`configuration-tabpanel-${index}`}
      aria-labelledby={`configuration-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={300}>
          <Box sx={{ p: padding || 2, overflow: 'visible' }}>{children}</Box>
        </Fade>
      )}
    </div>
  )
}

// Status indicator component
const TabStatusIcon: React.FC<{
  isComplete: boolean
  hasError: boolean
  isActive: boolean
}> = ({ isComplete, hasError, isActive }) => {
  const theme = useTheme()

  if (hasError) {
    return (
      <WarningIcon
        sx={{
          fontSize: 18,
          color: theme.palette.error.main,
          ml: 1,
        }}
      />
    )
  }

  if (isComplete) {
    return (
      <CheckIcon
        sx={{
          fontSize: 18,
          color: theme.palette.success.main,
          ml: 1,
        }}
      />
    )
  }

  return (
    <IncompleteIcon
      sx={{
        fontSize: 18,
        color: isActive ? theme.palette.primary.main : theme.palette.grey[400],
        ml: 1,
      }}
    />
  )
}

// Main ConfigurationTabs component
export const ConfigurationTabs: React.FC<ConfigurationTabsProps> = ({
  activeTab,
  onTabChange,
  modelSelected,
  workloadConfigured,
  simulationConfigured,
  hasErrors,
  children,
}) => {
  const theme = useTheme()

  const tabConfigs: TabConfig[] = [
    {
      label: 'Model',
      isComplete: modelSelected,
      hasError: false,
      description: 'Select LLM model',
    },
    {
      label: 'Workloads',
      isComplete: workloadConfigured,
      hasError: hasErrors,
      description: 'Configure workload mix',
    },
    {
      label: 'Settings',
      isComplete: simulationConfigured,
      hasError: false,
      description: 'Simulation parameters',
    },
  ]

  const a11yProps = (index: number) => ({
    id: `configuration-tab-${index}`,
    'aria-controls': `configuration-tabpanel-${index}`,
  })

  return (
    <Box sx={{ width: '100%' }}>
      {/* Tab Navigation */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(8px)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          aria-label="configuration tabs"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              px: 3,
              py: 2,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {tabConfigs.map((config, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1" component="span">
                      {index + 1}. {config.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {config.description}
                    </Typography>
                  </Box>
                  <TabStatusIcon
                    isComplete={config.isComplete}
                    hasError={config.hasError}
                    isActive={activeTab === index}
                  />
                </Box>
              }
              {...a11yProps(index)}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content Panels */}
      {children.map((child, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          {child}
        </TabPanel>
      ))}
    </Box>
  )
}

export default ConfigurationTabs
