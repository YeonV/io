// src/renderer/src/modules/Gamepad/components/GamepadVisualizer.tsx
import type { FC, MouseEvent } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { Box, Typography, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material'

// import { GamepadSvgXbox } from './GamepadSvgXbox'; // Future
import { GenericPadDisplay } from './GenericPadDisplay' // Our new generic display
import GamepadSvgPs5 from './GamepadSvgPs5'
import GamepadSvgPs3 from './GamepadSvgPs3'
import GamepadSvgPs4 from './GamepadSvgPs4'
import GamepadSvgXbox from './GamepadSvgXbox'

// Define supported visualizer types
type PadVisualizerType = 'auto' | 'ps3' | 'ps4' | 'ps5' | 'xbox' | 'generic' // Add 'xbox', etc. as you create SVGs

interface GamepadVisualizerProps {
  pad: Gamepad | null // The live gamepad object
}

const detectGamepadType = (pad: Gamepad | null): Exclude<PadVisualizerType, 'auto' | 'xbox'> => {
  // Assuming 'xbox' type exists or will soon
  if (!pad || !pad.id) return 'generic'

  const idLower = pad.id.toLowerCase()
  const vendorId = pad.id.match(/Vendor: ([0-9a-fA-F]{4})/)?.[1]?.toLowerCase()
  const productId = pad.id.match(/Product: ([0-9a-fA-F]{4})/)?.[1]?.toLowerCase()

  // PlayStation Controllers
  if (vendorId === '054c') {
    // Sony Vendor ID
    if (idLower.includes('dualsense') || productId === '0ce6') return 'ps5'
    if (idLower.includes('dualshock 4') || productId === '05c4' || productId === '09cc')
      return 'ps4' // Added PS4 detection
    if (idLower.includes('ps3') || productId === '0268') return 'ps3' // Keep PS3 detection
  }

  // More generic check if vendor/product not easily parsed but name is clear
  if (idLower.includes('dualsense wireless controller')) return 'ps5'
  if (
    idLower.includes('dualshock®4 wireless controller') ||
    idLower.includes('ds4 wireless controller')
  )
    return 'ps4' // Added more PS4 name checks

  // Xbox Controllers (Example: You'd add 'xbox' to PadVisualizerType when SVG is ready)
  // For now, they will fall through to generic if not specifically PS3/4/5
  if (vendorId === '045e') {
    // Microsoft Vendor ID
    if (
      productId === '02e0' ||
      productId === '02dd' ||
      productId === '0b05' ||
      productId === '0b12' ||
      idLower.includes('xbox wireless controller') ||
      idLower.includes('xbox one controller')
    ) {
      // return 'xbox'; // When you have an Xbox SVG
      return 'generic' // Fallback for now
    }
  }
  if (idLower.includes('xbox wireless controller') || idLower.includes('xbox one')) {
    // return 'xbox';
    return 'generic'
  }

  // Nintendo Switch Pro Controller (Example)
  if (vendorId === '057e' && productId === '2009' && idLower.includes('wireless gamepad')) {
    // return 'switch_pro'; // When you have a Switch Pro SVG
    return 'generic' // Fallback for now
  }

  // Default to generic if no specific match
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
    { value: 'ps4', label: 'PS4' },
    { value: 'ps3', label: 'PS3' },
    { value: 'xbox', label: 'Xbox' }, // When you have GamepadSvgXbox
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
          minHeight: displayType === 'generic' ? '200px' : '260px', // Adjust based on content
          maxHeight: displayType === 'generic' ? '100%' : '260px', // Adjust based on content
          overflow: 'hidden'
          // border: '1px solid green', // For debugging layout
        }}
      >
        {displayType === 'ps5' && <GamepadSvgPs5 pad={pad} />}
        {displayType === 'ps4' && <GamepadSvgPs4 pad={pad} />}
        {displayType === 'ps3' && <GamepadSvgPs3 pad={pad} />}
        {displayType === 'xbox' && <GamepadSvgXbox pad={pad} />}
        {displayType === 'generic' && <GenericPadDisplay pad={pad} />}
      </Box>
    </Box>
  )
}

export default GamepadVisualizer
