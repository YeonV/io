// src/renderer/src/modules/Gamepad/GamepadInputEdit.tsx
import type { FC } from 'react'
import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Alert,
  type SelectChangeEvent,
  ListItemText
} from '@mui/material'
import { useGamepads } from 'react-gamepads'
import type { GamepadInputRowData } from '../Gamepad.types'
import IoIcon from '@/components/IoIcon/IoIcon' // For icons in select
import GamepadSvgPs3 from './GamepadSvgPs3'
import GamepadSvgPs5 from './GamepadSvgPs5'
import GamepadVisualizer from './GamepadVisualizer'

interface GamepadInputEditProps {
  // input.data might be partial initially or when switching types
  inputData: Partial<GamepadInputRowData>
  onChange: (updatedData: Partial<GamepadInputRowData>) => void
}

const ANY_GAMEPAD_INDEX = -1 // Special value for "Any Connected Gamepad"

export const GamepadInputEdit: FC<GamepadInputEditProps> = ({ inputData, onChange }) => {
  const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({})
  useGamepads((_gamepads) => setGamepads(_gamepads))

  // Local state for the selected gamepad index from the dropdown
  // Initialize from inputData.gamepadIndex or default to "Any"
  const [selectedGamepadDisplayIndex, setSelectedGamepadDisplayIndex] = useState<string>(
    inputData.gamepadIndex !== undefined
      ? String(inputData.gamepadIndex)
      : String(ANY_GAMEPAD_INDEX)
  )

  // State for the "capture mode"
  const [captureInstruction, setCaptureInstruction] = useState(
    'Press any button or move any stick/trigger on the selected gamepad to assign.'
  )
  const [detectedInput, setDetectedInput] = useState<string | null>(null)

  const connectedGamepadsArray = useMemo(() => {
    return Object.values(gamepads).filter((gp) => gp && gp.connected)
  }, [gamepads])

  const handleGamepadSelectionChange = (event: SelectChangeEvent<string>) => {
    const selectedVal = event.target.value
    setSelectedGamepadDisplayIndex(selectedVal)

    const newGamepadIndex = parseInt(selectedVal, 10)
    let newGamepadNameFilter: string | undefined = undefined

    if (newGamepadIndex !== ANY_GAMEPAD_INDEX && gamepads[newGamepadIndex]) {
      newGamepadNameFilter = gamepads[newGamepadIndex].id
    }

    onChange({
      ...inputData, // Preserve other settings like triggerType, buttonIndex etc.
      gamepadIndex: newGamepadIndex === ANY_GAMEPAD_INDEX ? undefined : newGamepadIndex,
      gamepadNameFilter: newGamepadNameFilter,
      // When gamepad selection changes, reset specific button/axis config
      // as it likely pertains to the previously selected (or any) gamepad.
      triggerType: undefined,
      buttonIndex: undefined,
      axisIndex: undefined,
      axisCondition: undefined,
      axisThreshold: undefined
    })
    setDetectedInput(null) // Clear previous detection
    setCaptureInstruction(
      'Press any button or move any stick/trigger on the selected gamepad to assign.'
    )
  }

  // This useEffect will be the core of the "Press to Assign" logic
  useEffect(() => {
    if (connectedGamepadsArray.length === 0) {
      setCaptureInstruction('No gamepads connected. Please connect a gamepad.')
      return
    }

    const targetGamepadIndex =
      selectedGamepadDisplayIndex === String(ANY_GAMEPAD_INDEX)
        ? undefined // Listen to all if "Any" is selected
        : parseInt(selectedGamepadDisplayIndex, 10)

    // Iterate through gamepads to listen for the first event
    // (This part will get more complex to detect first press/move after selection)
    // For now, it's just a placeholder for the capture logic.

    // Example: if a specific gamepad is selected and it has an event
    if (targetGamepadIndex !== undefined && gamepads[targetGamepadIndex]) {
      const gp = gamepads[targetGamepadIndex]
      //   console.log(`gp: ${gp}`)
      // TODO: Implement robust first-event detection logic here
      // - Store previous states of buttons/axes for this gamepad.
      // - On change, compare to find the *first* button pressed or *first* significant axis move.
      // - Once detected:
      //    - setDetectedInput(`Button ${X} pressed` or `Axis ${Y} moved`);
      //    - Update inputData with type ('button_press', 'axis_move'), index.
      //    - Change captureInstruction to "Configure details for [detected input] below."
      //    - Show UI for press/release choice or axis condition/threshold.
    } else if (targetGamepadIndex === undefined && connectedGamepadsArray.length > 0) {
      // "Any Gamepad" mode - listen to first event from any connected gamepad
      // Similar logic to above but iterate all connectedGamepadsArray
    }
  }, [gamepads, selectedGamepadDisplayIndex, onChange, inputData, connectedGamepadsArray])

  const currentlySelectedGamepadForVisualizer = useMemo(() => {
    const idx = parseInt(selectedGamepadDisplayIndex, 10)
    if (idx !== ANY_GAMEPAD_INDEX && gamepads[idx]) {
      return gamepads[idx]
    }
    // If "Any" is selected, maybe show first connected for visualizer, or none
    return connectedGamepadsArray.length > 0 ? connectedGamepadsArray[0] : null
  }, [selectedGamepadDisplayIndex, gamepads, connectedGamepadsArray])

  return (
    <Stack spacing={2.5} sx={{ p: 1 }}>
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 1 }}>
        Gamepad Input Setup
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel id="gamepad-select-label">Target Gamepad</InputLabel>
        <Select
          labelId="gamepad-select-label"
          label="Target Gamepad"
          value={selectedGamepadDisplayIndex}
          sx={{ maxWidth: '100%' }}
          onChange={handleGamepadSelectionChange}
          renderValue={(selectedIndex) => {
            if (selectedIndex === String(ANY_GAMEPAD_INDEX)) return <em>Any Connected Gamepad</em>
            const gp = gamepads[parseInt(selectedIndex, 10)]
            return gp ? (
              <Typography variant="body2" noWrap>
                {gp.id}
              </Typography>
            ) : (
              <em>Unknown Gamepad</em>
            )
          }}
        >
          <MenuItem value={String(ANY_GAMEPAD_INDEX)}>
            <IoIcon name="mdi:gamepad-variant-outline" style={{ marginRight: 8, opacity: 0.7 }} />
            <em>Any Connected Gamepad</em>
          </MenuItem>
          {connectedGamepadsArray.map((gp) => (
            <MenuItem key={gp.index} value={String(gp.index)}>
              <IoIcon name="mdi:gamepad-variant" style={{ marginRight: 8 }} />
              <ListItemText primary={gp.id} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }} />
            </MenuItem>
          ))}
          {connectedGamepadsArray.length === 0 && (
            <MenuItem value="" disabled>
              No gamepads connected
            </MenuItem>
          )}
        </Select>
      </FormControl>

      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', mt: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
          {captureInstruction}
        </Typography>
        {detectedInput && (
          <Typography variant="subtitle2" color="primary.main" sx={{ mt: 1 }}>
            {detectedInput}
          </Typography>
        )}
      </Paper>

      {/* Your Awesome SVG Gamepad Visualizer will go here */}
      {currentlySelectedGamepadForVisualizer && (
        <GamepadVisualizer pad={currentlySelectedGamepadForVisualizer} />
      )}

      {/* Conditional UI based on detected input type (button or axis) */}
      {inputData.triggerType === 'button_press' || inputData.triggerType === 'button_release' ? (
        <Box>
          <Typography variant="subtitle2">
            Button {inputData.buttonIndex} on Pad {inputData.gamepadIndex}:
          </Typography>
          {/* Radio group for "Press" vs "Release" */}
          {/* onChange here updates inputData.triggerType */}
        </Box>
      ) : null}

      {inputData.triggerType === 'axis_move' ? (
        <Box>
          <Typography variant="subtitle2">
            Axis {inputData.axisIndex} on Pad {inputData.gamepadIndex}:
          </Typography>
          {/* Select for axisCondition, TextField for axisThreshold */}
          {/* onChange here updates inputData.axisCondition and inputData.axisThreshold */}
        </Box>
      ) : null}

      {connectedGamepadsArray.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Please connect a gamepad to configure this input.
        </Alert>
      )}
    </Stack>
  )
}

// Default export if this is the main component of the file
// export default GamepadInputEdit;
