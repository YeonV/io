// src/renderer/src/modules/Gamepad/GamepadInputEdit.tsx
import type { FC } from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
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
  ListItemText,
  Button, // Added Button
  ToggleButtonGroup,
  ToggleButton, // For Press/Release and Axis Condition
  TextField
} from '@mui/material'
import { useGamepads } from 'react-gamepads' // Assuming Gamepad is the native type
import type { GamepadInputRowData, GamepadAxisCondition } from '../Gamepad.types'
import IoIcon from '@/components/IoIcon/IoIcon'
import GamepadVisualizer from './GamepadVisualizer' // Your awesome visualizer
import { Replay as ResetIcon } from '@mui/icons-material' // For reset button

interface GamepadInputEditProps {
  inputData: Partial<GamepadInputRowData>
  onChange: (updatedData: Partial<GamepadInputRowData>) => void
}

const ANY_GAMEPAD_INDEX = -1
const AXIS_CAPTURE_THRESHOLD = 0.3 // How much an axis must move from center to be captured
const AXIS_REST_THRESHOLD = 0.1 // Consider axes below this to be at rest

export const GamepadInputEdit: FC<GamepadInputEditProps> = ({ inputData, onChange }) => {
  const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({})
  useGamepads((_gamepads) => setGamepads(_gamepads))

  const [selectedGamepadDisplayIndex, setSelectedGamepadDisplayIndex] = useState<string>(
    inputData.gamepadIndex !== undefined
      ? String(inputData.gamepadIndex)
      : String(ANY_GAMEPAD_INDEX)
  )

  // State to manage if an input has been "captured" and we are now configuring its specifics
  const [isInputCaptured, setIsInputCaptured] = useState(!!inputData.triggerType) // True if editing existing config

  const [captureInstruction, setCaptureInstruction] = useState(
    'Press any button or move any stick/trigger on the selected gamepad to assign.'
  )
  const [detectedInputInfo, setDetectedInputInfo] = useState<string | null>(null) // E.g. "Button 5 Pressed"

  // Refs to store previous states for the *currently selected and active* gamepad for capture
  const prevButtonsForCaptureRef = useRef<readonly boolean[] | null>(null)
  const prevAxesForCaptureRef = useRef<readonly number[] | null>(null)

  const connectedGamepadsArray = useMemo(() => {
    return Object.values(gamepads).filter((gp) => gp && gp.connected)
  }, [gamepads])
  const resetCaptureAndConfig = (keepGamepadSelection: boolean = false) => {
    setIsInputCaptured(false)
    setDetectedInputInfo(null)
    setCaptureInstruction(
      'Press any button or move any stick/trigger on the selected gamepad to assign.'
    )
    onChange({
      // Preserve gamepadIndex and gamepadNameFilter if keepGamepadSelection is true
      gamepadIndex: keepGamepadSelection ? inputData.gamepadIndex : undefined,
      gamepadNameFilter: keepGamepadSelection ? inputData.gamepadNameFilter : undefined,
      triggerType: undefined,
      buttonIndex: undefined,
      axisIndex: undefined,
      axisCondition: undefined,
      axisThreshold: 0.5 // Default threshold
    })
    prevButtonsForCaptureRef.current = null // Reset previous states for capture
    prevAxesForCaptureRef.current = null
  }

  const handleGamepadSelectionChange = (event: SelectChangeEvent<string>) => {
    const selectedVal = event.target.value
    setSelectedGamepadDisplayIndex(selectedVal)
    const newGamepadIndex = parseInt(selectedVal, 10)
    let newGamepadNameFilter: string | undefined = undefined
    if (newGamepadIndex !== ANY_GAMEPAD_INDEX && gamepads[newGamepadIndex]) {
      newGamepadNameFilter = gamepads[newGamepadIndex].id
    }
    // When gamepad selection changes, always reset capture and full config
    resetCaptureAndConfig()
    // Then set the new gamepad index/name
    onChange({
      gamepadIndex: newGamepadIndex === ANY_GAMEPAD_INDEX ? undefined : newGamepadIndex,
      gamepadNameFilter: newGamepadNameFilter
    })
  }

  // Effect for "Press/Move to Assign" logic
  useEffect(() => {
    if (isInputCaptured || connectedGamepadsArray.length === 0) {
      // If input is already captured and being configured, or no gamepads, don't try to capture new.
      if (connectedGamepadsArray.length === 0) setCaptureInstruction('No gamepads connected.')
      return
    }

    const targetIndex =
      selectedGamepadDisplayIndex === String(ANY_GAMEPAD_INDEX)
        ? undefined // "Any" mode: check all connected gamepads
        : parseInt(selectedGamepadDisplayIndex, 10)

    const gamepadsToMonitor =
      targetIndex !== undefined && gamepads[targetIndex]
        ? [gamepads[targetIndex]]
        : targetIndex === undefined
          ? connectedGamepadsArray
          : []

    for (const gamepad of gamepadsToMonitor) {
      if (!gamepad || !gamepad.connected) continue

      const padIdx = gamepad.index

      // Initialize or update previous states for this specific gamepad
      const currentButtons = gamepad.buttons.map((b) => b.pressed)
      const currentAxes = [...gamepad.axes] // Make a copy

      if (
        !prevButtonsForCaptureRef.current ||
        prevButtonsForCaptureRef.current.length !== currentButtons.length
      ) {
        prevButtonsForCaptureRef.current = currentButtons // Initialize
      }
      if (
        !prevAxesForCaptureRef.current ||
        prevAxesForCaptureRef.current.length !== currentAxes.length
      ) {
        prevAxesForCaptureRef.current = currentAxes // Initialize
      }

      // Check for button press
      for (let i = 0; i < currentButtons.length; i++) {
        if (currentButtons[i] && !prevButtonsForCaptureRef.current[i]) {
          setDetectedInputInfo(`Button ${i} on "${gamepad.id}"`)
          setCaptureInstruction(`Button ${i} captured! Configure trigger type:`)
          onChange({
            gamepadIndex: padIdx,
            gamepadNameFilter: gamepad.id,
            triggerType: 'button_press', // Default to press
            buttonIndex: i,
            // Clear axis config
            axisIndex: undefined,
            axisCondition: undefined,
            axisThreshold: undefined
          })
          setIsInputCaptured(true)
          prevButtonsForCaptureRef.current = null // Stop further capture until reset
          prevAxesForCaptureRef.current = null
          return // Captured one input, exit loop and effect
        }
      }

      // Check for significant axis movement (moved out of deadzone)
      for (let i = 0; i < currentAxes.length; i++) {
        if (
          Math.abs(currentAxes[i]) > AXIS_CAPTURE_THRESHOLD &&
          Math.abs(prevAxesForCaptureRef.current[i]) <= AXIS_REST_THRESHOLD
        ) {
          setDetectedInputInfo(`Axis ${i} on "${gamepad.id}" (Value: ${currentAxes[i].toFixed(2)})`)
          setCaptureInstruction(`Axis ${i} captured! Configure trigger condition:`)
          onChange({
            gamepadIndex: padIdx,
            gamepadNameFilter: gamepad.id,
            triggerType: 'axis_move',
            axisIndex: i,
            axisCondition: 'greater_than', // Default condition
            axisThreshold: 0.5, // Default threshold
            // Clear button config
            buttonIndex: undefined
          })
          setIsInputCaptured(true)
          prevButtonsForCaptureRef.current = null
          prevAxesForCaptureRef.current = null
          return // Captured one input
        }
      }
      // Update previous states for next frame if no capture
      prevButtonsForCaptureRef.current = currentButtons
      prevAxesForCaptureRef.current = currentAxes
    }
  }, [gamepads, selectedGamepadDisplayIndex, isInputCaptured, onChange, connectedGamepadsArray])

  // Effect to set capture instruction if inputData is already partially filled (e.g. editing existing row)
  useEffect(() => {
    if (inputData.triggerType && inputData.gamepadNameFilter) {
      setIsInputCaptured(true)
      if (inputData.triggerType === 'button_press' || inputData.triggerType === 'button_release') {
        setDetectedInputInfo(`Button ${inputData.buttonIndex} on "${inputData.gamepadNameFilter}"`)
        setCaptureInstruction(`Configuring Button ${inputData.buttonIndex}. Select trigger type:`)
      } else if (inputData.triggerType === 'axis_move') {
        setDetectedInputInfo(`Axis ${inputData.axisIndex} on "${inputData.gamepadNameFilter}"`)
        setCaptureInstruction(
          `Configuring Axis ${inputData.axisIndex}. Select condition & threshold:`
        )
      }
    } else {
      setIsInputCaptured(false) // Ensure it's false if no triggerType
    }
  }, [
    inputData.triggerType,
    inputData.buttonIndex,
    inputData.axisIndex,
    inputData.gamepadNameFilter
  ])

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
      <Typography variant="h6" sx={{ textAlign: 'center', mb: 0 }}>
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

      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
          {captureInstruction}
        </Typography>
        {detectedInputInfo &&
          !isInputCaptured && ( // Show only if still in capture mode
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
              {detectedInputInfo}
            </Typography>
          )}
      </Paper>

      {isInputCaptured && ( // Button to re-capture / change assigned input
        <Button
          onClick={() => resetCaptureAndConfig(true)}
          variant="outlined"
          size="small"
          startIcon={<ResetIcon />}
          sx={{ alignSelf: 'center' }}
        >
          Change Assigned Button/Axis
        </Button>
      )}

      {currentlySelectedGamepadForVisualizer && (
        <GamepadVisualizer pad={currentlySelectedGamepadForVisualizer} />
      )}

      {/* --- Conditional UI for configuring after capture --- */}
      {isInputCaptured &&
        (inputData.triggerType === 'button_press' || inputData.triggerType === 'button_release') &&
        inputData.buttonIndex !== undefined && (
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configure Button {inputData.buttonIndex} on{' '}
              {inputData.gamepadNameFilter || `Pad ${inputData.gamepadIndex}`}
            </Typography>
            <ToggleButtonGroup
              value={inputData.triggerType}
              exclusive
              size="small"
              onChange={(_e, newTriggerType) => {
                if (newTriggerType)
                  onChange({ triggerType: newTriggerType as 'button_press' | 'button_release' })
              }}
              aria-label="Button trigger type"
            >
              <ToggleButton value="button_press">Trigger on Press</ToggleButton>
              <ToggleButton value="button_release">Trigger on Release</ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        )}

      {isInputCaptured &&
        inputData.triggerType === 'axis_move' &&
        inputData.axisIndex !== undefined && (
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Configure Axis {inputData.axisIndex} on{' '}
              {inputData.gamepadNameFilter || `Pad ${inputData.gamepadIndex}`}
            </Typography>
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Condition</InputLabel>
                <Select
                  value={inputData.axisCondition || 'greater_than'}
                  label="Condition"
                  onChange={(e) =>
                    onChange({ axisCondition: e.target.value as GamepadAxisCondition })
                  }
                >
                  <MenuItem value="greater_than">Moves Greater Than (&gt;)</MenuItem>
                  <MenuItem value="less_than">Moves Less Than (&lt;)</MenuItem>
                  <MenuItem value="deadzone_exit">Exits Deadzone (|value| &gt;)</MenuItem>
                  {/* <MenuItem value="equals">Equals (exact)</MenuItem> */}
                </Select>
              </FormControl>
              <TextField
                label="Threshold (0.0 to 1.0)"
                type="number"
                size="small"
                value={inputData.axisThreshold ?? 0.5}
                onChange={(e) => onChange({ axisThreshold: parseFloat(e.target.value) || 0.5 })}
                inputProps={{ step: 0.05, min: 0, max: 1 }}
                fullWidth
              />
            </Stack>
          </Paper>
        )}

      {connectedGamepadsArray.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Please connect a gamepad to configure this input.
        </Alert>
      )}
    </Stack>
  )
}
