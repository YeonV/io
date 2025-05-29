// src/renderer/src/modules/Gamepad/components/GenericPadDisplay.tsx
import type { FC } from 'react'
import { Box, Typography, Grid, Paper, LinearProgress, Tooltip, Stack } from '@mui/material'

interface GenericPadDisplayProps {
  pad: Gamepad | null // The gamepad object from useGamepads
}

const AXIS_DISPLAY_THRESHOLD = 0.05 // Only show significant movement on progress bar for clarity

export const GenericPadDisplay: FC<GenericPadDisplayProps> = ({ pad }) => {
  if (!pad) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          textAlign: 'center',
          minHeight: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="text.secondary">
          No gamepad data available for generic display.
        </Typography>
      </Paper>
    )
  }

  // Helper to normalize axis value for LinearProgress (0 to 100)
  // Assumes axis values are -1 to 1.
  // For -1 to 0 range, map to 0-50. For 0 to 1 range, map to 50-100.
  const normalizeAxisForProgress = (value: number): number => {
    // Option 1: Simple direct mapping for -1 to 1 -> 0 to 100
    // return (value + 1) * 50;

    // Option 2: Show deflection from center (0 is center, -1/1 are full deflection)
    // LinearProgress value is 0-100.
    // If value is 0, progress is 50.
    // If value is 1, progress is 100.
    // If value is -1, progress is 0.
    return value * 50 + 50
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: { xs: 1, sm: 2 }, width: '100%', maxWidth: 450, margin: '0 auto' }}
    >
      <Typography variant="overline" display="block" sx={{ mb: 1.5, textAlign: 'center' }}>
        Generic Gamepad State ({pad.id.substring(0, 25)}...)
      </Typography>

      {/* Buttons Section */}
      {pad.buttons && pad.buttons.length > 0 && (
        <Box mb={2.5}>
          <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 'medium' }}>
            Buttons ({pad.buttons.length}):
          </Typography>
          <Grid container spacing={1}>
            {pad.buttons.map((button, index) => (
              <Grid size={{ xs: 3, sm: 2, md: 1.5 }} key={`btn-${pad.index}-${index}`}>
                {' '}
                {/* Adjust grid sizing as needed */}
                <Tooltip
                  title={`Button ${index}${button.pressed ? ' (Pressed)' : ''} - Value: ${button.value.toFixed(2)}`}
                  placement="top"
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      width: 36,
                      height: 36, // Consistent size
                      borderRadius: '50%', // Circle
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: button.pressed ? 'primary.main' : 'action.hover',
                      color: button.pressed ? 'primary.contrastText' : 'text.primary',
                      border: button.pressed ? '2px solid' : '1px solid',
                      borderColor: button.pressed ? 'primary.dark' : 'divider',
                      transition: 'background-color 0.1s ease, border-color 0.1s ease',
                      cursor: 'default'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                      {index}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Axes Section */}
      {pad.axes && pad.axes.length > 0 && (
        <Box>
          <Typography variant="caption" display="block" sx={{ mb: 1, fontWeight: 'medium' }}>
            Axes ({pad.axes.length}):
          </Typography>
          <Stack spacing={1.5}>
            {pad.axes.map((axisValue, index) => {
              const normalizedValue = normalizeAxisForProgress(axisValue)
              // Determine color based on deflection from center
              let progressColor: 'primary' | 'secondary' | 'inherit' | 'success' | 'error' =
                'primary'
              if (axisValue > AXIS_DISPLAY_THRESHOLD)
                progressColor = 'success' // Positive deflection
              else if (axisValue < -AXIS_DISPLAY_THRESHOLD)
                progressColor = 'error' // Negative deflection
              else progressColor = 'inherit' // Near center

              return (
                <Box key={`axis-${pad.index}-${index}`}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                  >
                    <Typography variant="caption" sx={{ minWidth: 50, textAlign: 'left' }}>
                      Axis {index}:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 500, minWidth: 45, textAlign: 'right' }}
                    >
                      {axisValue.toFixed(3)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={normalizedValue}
                    color={progressColor}
                    sx={{
                      height: 8,
                      borderRadius: 1
                      // Custom styling for the bar if needed
                      // '& .MuiLinearProgress-bar': {
                      //   transition: 'none', // Disable transition for instant feedback if preferred
                      // }
                    }}
                  />
                </Box>
              )
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}

// Default export if this is the main component of its file
// export default GenericPadDisplay;
