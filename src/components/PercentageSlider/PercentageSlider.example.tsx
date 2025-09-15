import React, { useState } from 'react'
import { Box, Container, Paper, Typography } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import PercentageSlider from './PercentageSlider'

// Create a basic theme for the example
const theme = createTheme()

/**
 * Example component demonstrating PercentageSlider usage
 * This file shows different configurations and states of the PercentageSlider
 */
const PercentageSliderExample: React.FC = () => {
  const [workload1, setWorkload1] = useState(40)
  const [workload2, setWorkload2] = useState(30)
  const [workload3, setWorkload3] = useState(20)

  // Calculate remaining percentage for each slider
  const remaining1 = 100 - workload2 - workload3
  const remaining2 = 100 - workload1 - workload3
  const remaining3 = 100 - workload1 - workload2

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          PercentageSlider Component Examples
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Workload Distribution (Total: 100%)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Interactive sliders that show real-time validation
          </Typography>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={workload1}
              onChange={setWorkload1}
              remaining={remaining1}
              label="Chat Workload"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={workload2}
              onChange={setWorkload2}
              remaining={remaining2}
              label="RAG Workload"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={workload3}
              onChange={setWorkload3}
              remaining={remaining3}
              label="Code Generation"
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Total: {workload1 + workload2 + workload3}% | Remaining:{' '}
            {100 - workload1 - workload2 - workload3}%
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Error States
          </Typography>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={80}
              onChange={() => {}}
              remaining={30}
              label="Exceeds Remaining"
              // This will show validation error since 80 > 30
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={25}
              onChange={() => {}}
              remaining={75}
              label="Custom Error"
              error="This workload is not available"
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Disabled State
          </Typography>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={50}
              onChange={() => {}}
              remaining={50}
              label="Disabled Slider"
              disabled={true}
            />
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Different Remaining Thresholds
          </Typography>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={85}
              onChange={() => {}}
              remaining={15}
              label="High Usage (Warning Chip)"
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <PercentageSlider
              value={95}
              onChange={() => {}}
              remaining={5}
              label="Very High Usage (Warning Chip)"
            />
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  )
}

export default PercentageSliderExample
