// src/renderer/src/modules/Gamepad/components/GamepadVisualizer.tsx
import type { FC, MouseEvent } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper, Alert } from '@mui/material'

// import { GamepadSvgXbox } from './GamepadSvgXbox'; // Future
import { GenericPadDisplay } from './GenericPadDisplay' // Our new generic display
import GamepadSvgPs5 from './GamepadSvgPs5'
import GamepadSvgPs3 from './GamepadSvgPs3'

// Define supported visualizer types
type PadVisualizerType = 'auto' | 'ps3' | 'ps5' | 'generic' // Add 'xbox', etc. as you create SVGs

interface GamepadVisualizerProps {
  pad: Gamepad | null // The live gamepad object
}

const detectGamepadType = (pad: Gamepad | null): Exclude<PadVisualizerType, 'auto'> => {
  if (!pad || !pad.id) return 'generic'

  const idLower = pad.id.toLowerCase()

  // PlayStation Controllers
  if (idLower.includes('dualsense') || pad.id.includes('0ce6')) return 'ps5' // Vendor 054c, Product 0ce6 for DualSense
  if (idLower.includes('dualshock') || idLower.includes('ps3') || pad.id.includes('0268'))
    return 'ps3' // Vendor 054c, Product 0268 for DS3

  // Xbox Controllers (Add more specific vendor/product IDs if known)
  if (
    idLower.includes('xbox wireless controller') ||
    idLower.includes('xbox one') ||
    idLower.includes('02e0') ||
    idLower.includes('0b05')
  )
    return 'generic' // Fallback to generic until Xbox SVG

  // Nintendo Switch Pro Controller
  if (idLower.includes('wireless gamepad') && pad.id.includes('057e') && pad.id.includes('2009'))
    return 'generic' // Fallback

  // Default to generic
  return 'generic'
}

export const GamepadVisualizer: FC<GamepadVisualizerProps> = ({ pad }) => {
  // User's explicit choice from ToggleButtonGroup, defaults to 'auto'
  const [userSelectedType, setUserSelectedType] = useState<PadVisualizerType>('auto')

  // The type that is actually detected from the gamepad data
  const autoDetectedType = useMemo(() => detectGamepadType(pad), [pad])

  // The visualizer type to actually render
  const displayType = useMemo(() => {
    if (userSelectedType === 'auto') {
      return autoDetectedType // Use auto-detected type
    }
    return userSelectedType // User has overridden, use their selection
  }, [userSelectedType, autoDetectedType])

  const handleUserSelectionChange = (
    event: MouseEvent<HTMLElement>,
    newSelection: PadVisualizerType | null
  ) => {
    if (newSelection !== null) {
      setUserSelectedType(newSelection)
    }
  }

  if (!pad || !pad.connected) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mt: 2,
          textAlign: 'center',
          minHeight: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="text.secondary">Gamepad not connected or data unavailable.</Typography>
      </Paper>
    )
  }

  const visualizerOptions: Array<{ value: PadVisualizerType; label: string }> = [
    { value: 'auto', label: `Auto (${autoDetectedType.toUpperCase()})` },
    { value: 'ps5', label: 'PS5' },
    { value: 'ps3', label: 'PS3' },
    // {value: 'xbox', label: 'Xbox'}, // When you have GamepadSvgXbox
    { value: 'generic', label: 'Generic Data' }
  ]

  return (
    <Box
      sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}
    >
      <ToggleButtonGroup
        color="primary"
        value={userSelectedType}
        exclusive
        onChange={handleUserSelectionChange}
        aria-label="Select Gamepad Visualizer Type"
        size="small"
        sx={{ mb: 2.5 }}
      >
        {visualizerOptions.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value} aria-label={opt.label}>
            {opt.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box
        sx={{
          width: '100%',
          maxWidth: displayType === 'generic' ? '450px' : '400px', // Generic might need more width for text
          minHeight: displayType === 'generic' ? '200px' : '240px' // Adjust based on content
          // border: '1px solid green', // For debugging layout
        }}
      >
        {displayType === 'ps5' && <GamepadSvgPs5 pad={pad} />}
        {displayType === 'ps3' && <GamepadSvgPs3 pad={pad} />}
        {/* {displayType === 'xbox' && <GamepadSvgXbox pad={pad} />} */}
        {displayType === 'generic' && <GenericPadDisplay pad={pad} />}
      </Box>
    </Box>
  )
}

export default GamepadVisualizer
