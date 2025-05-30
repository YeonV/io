// src/renderer/src/modules/Gamepad/components/GamepadInputEdit.tsx
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
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material'
import { useGamepads } from 'react-gamepads'
import type { GamepadInputRowData, GamepadAxisCondition } from '../Gamepad.types'
import IoIcon from '@/components/IoIcon/IoIcon'
import GamepadVisualizer from './GamepadVisualizer'
import { Replay as ResetIcon } from '@mui/icons-material'

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
  const [isInputCaptured, setIsInputCaptured] = useState(!!inputData.triggerType)
  const [captureInstruction, setCaptureInstruction] = useState(
    'Press any button or move any stick/trigger on the selected gamepad to assign.'
  )

  const prevButtonsForCaptureRef = useRef<readonly boolean[] | null>(null)
  const prevAxesForCaptureRef = useRef<readonly number[] | null>(null)
  const connectedGamepadsArray = useMemo(() => {
    return Object.values(gamepads).filter((gp) => gp && gp.connected)
  }, [gamepads])

  const resetCaptureAndConfig = (keepGamepadSelection: boolean = false) => {
    setIsInputCaptured(false)
    setCaptureInstruction(
      'Press any button or move any stick/trigger on the selected gamepad to assign.'
    )
    const baseUpdate: Partial<GamepadInputRowData> = {
      triggerType: undefined,
      buttonIndex: undefined,
      axisIndex: undefined,
      axisCondition: undefined,
      axisThreshold: 0.5
    }
    if (keepGamepadSelection) {
      baseUpdate.gamepadIndex = inputData.gamepadIndex
      baseUpdate.gamepadNameFilter = inputData.gamepadNameFilter
    } else {
      baseUpdate.gamepadIndex = undefined
      baseUpdate.gamepadNameFilter = undefined
      // setSelectedGamepadDisplayIndex(String(ANY_GAMEPAD_INDEX)) // Also reset dropdown if not keeping selection
    }
    onChange(baseUpdate)
    prevButtonsForCaptureRef.current = null
    prevAxesForCaptureRef.current = null
  }

  const handleGamepadSelectionChange = (event: SelectChangeEvent<string>) => {
    console.log(`[GamepadInputEdit] Gamepad selection changed to index: ${event.target.value}`)
    const selectedVal = event.target.value
    setSelectedGamepadDisplayIndex(selectedVal)
    const newGamepadIndex = parseInt(selectedVal, 10)
    let newGamepadNameFilter: string | undefined = undefined
    if (newGamepadIndex !== ANY_GAMEPAD_INDEX && gamepads[newGamepadIndex]) {
      newGamepadNameFilter = gamepads[newGamepadIndex].id
    }
    resetCaptureAndConfig()
    onChange({
      gamepadIndex: newGamepadIndex === ANY_GAMEPAD_INDEX ? undefined : newGamepadIndex,
      gamepadNameFilter: newGamepadNameFilter
    })
  }

  useEffect(() => {
    // "Press/Move to Assign" logic
    if (isInputCaptured || connectedGamepadsArray.length === 0) {
      if (connectedGamepadsArray.length === 0)
        setCaptureInstruction('No gamepads connected. Please connect a gamepad.')
      return
    }
    const targetIndex =
      selectedGamepadDisplayIndex === String(ANY_GAMEPAD_INDEX)
        ? undefined
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
      const currentButtons = gamepad.buttons.map((b) => b.pressed)
      const currentAxes = [...gamepad.axes]
      if (
        !prevButtonsForCaptureRef.current ||
        prevButtonsForCaptureRef.current.length !== currentButtons.length
      )
        prevButtonsForCaptureRef.current = currentButtons
      if (
        !prevAxesForCaptureRef.current ||
        prevAxesForCaptureRef.current.length !== currentAxes.length
      )
        prevAxesForCaptureRef.current = currentAxes

      for (let i = 0; i < currentButtons.length; i++) {
        if (currentButtons[i] && !prevButtonsForCaptureRef.current[i]) {
          onChange({
            gamepadIndex: padIdx,
            gamepadNameFilter: gamepad.id,
            triggerType: 'button_press',
            buttonIndex: i,
            axisIndex: undefined,
            axisCondition: undefined,
            axisThreshold: undefined
          })
          setCaptureInstruction(`Button ${i} captured! Select trigger type:`)
          setIsInputCaptured(true)
          prevButtonsForCaptureRef.current = null
          prevAxesForCaptureRef.current = null
          return
        }
      }
      for (let i = 0; i < currentAxes.length; i++) {
        if (
          Math.abs(currentAxes[i]) > AXIS_CAPTURE_THRESHOLD &&
          Math.abs(prevAxesForCaptureRef.current![i]) <= AXIS_REST_THRESHOLD
        ) {
          onChange({
            gamepadIndex: padIdx,
            gamepadNameFilter: gamepad.id,
            triggerType: 'axis_move',
            axisIndex: i,
            axisCondition: 'greater_than',
            axisThreshold: 0.5,
            buttonIndex: undefined
          })
          setCaptureInstruction(`Axis ${i} captured! Configure condition & threshold:`)
          setIsInputCaptured(true)
          prevButtonsForCaptureRef.current = null
          prevAxesForCaptureRef.current = null
          return
        }
      }
      prevButtonsForCaptureRef.current = currentButtons
      prevAxesForCaptureRef.current = currentAxes
    }
  }, [gamepads, selectedGamepadDisplayIndex, isInputCaptured, onChange, connectedGamepadsArray])

  // Effect to set UI state if editing an existing row with populated inputData
  useEffect(() => {
    if (inputData.triggerType && inputData.gamepadNameFilter) {
      setIsInputCaptured(true)
      if (inputData.triggerType === 'button_press' || inputData.triggerType === 'button_release') {
        setCaptureInstruction(
          `Configuring Button ${inputData.buttonIndex} on "${inputData.gamepadNameFilter.substring(0, 20)}...". Select trigger type:`
        )
      } else if (inputData.triggerType === 'axis_move') {
        setCaptureInstruction(
          `Configuring Axis ${inputData.axisIndex} on "${inputData.gamepadNameFilter.substring(0, 20)}...". Select condition & threshold:`
        )
      }
    } else if (!inputData.triggerType) {
      // Ensure capture mode if no triggerType
      setIsInputCaptured(false)
      setCaptureInstruction(
        'Press any button or move any stick/trigger on the selected gamepad to assign.'
      )
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
    setSelectedGamepadDisplayIndex(
      connectedGamepadsArray.length > 0
        ? String(connectedGamepadsArray[0].index)
        : String(ANY_GAMEPAD_INDEX)
    )
    return connectedGamepadsArray.length > 0 ? connectedGamepadsArray[0] : null
  }, [selectedGamepadDisplayIndex, gamepads, connectedGamepadsArray])

  const getCapturedInputName = () => {
    if (!isInputCaptured || !inputData) return 'Input'
    if (inputData.triggerType === 'button_press' || inputData.triggerType === 'button_release')
      return `Button ${inputData.buttonIndex}`
    if (inputData.triggerType === 'axis_move') return `Axis ${inputData.axisIndex}`
    return 'Input'
  }

  return (
    <Stack spacing={2} sx={{ p: 0, pt: 0.5 }}>
      {/* --- Gamepad Selection & Visualizer --- */}

      <FormControl fullWidth size="small">
        <InputLabel id="gamepad-select-label">Target Gamepad</InputLabel>
        <Select
          labelId="gamepad-select-label"
          label="Target Gamepad"
          size="medium"
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
      {currentlySelectedGamepadForVisualizer && (
        <Paper variant="outlined" sx={{ p: 0, borderRadius: 1.5 }}>
          <GamepadVisualizer pad={currentlySelectedGamepadForVisualizer} />
        </Paper>
      )}

      {/* --- Capture Instruction / Configuration Area --- */}
      {!isInputCaptured ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderStyle: 'dashed'
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
            {captureInstruction}
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Captured: {getCapturedInputName()} on{' '}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
              >
                {inputData.gamepadNameFilter?.substring(0, 30) || `Pad ${inputData.gamepadIndex}`}
              </Typography>
            </Typography>
            <Tooltip title="Clear current assignment and re-capture">
              <IconButton onClick={() => resetCaptureAndConfig(true)} size="small">
                <ResetIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 2 }} />

          {/* Conditional UI for configuring after capture */}
          {(inputData.triggerType === 'button_press' ||
            inputData.triggerType === 'button_release') &&
            inputData.buttonIndex !== undefined && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                  Trigger on:
                </Typography>
                <ToggleButtonGroup
                  value={inputData.triggerType}
                  exclusive
                  fullWidth
                  size="small"
                  onChange={(_e, newTriggerType) => {
                    if (newTriggerType)
                      onChange({ triggerType: newTriggerType as 'button_press' | 'button_release' })
                  }}
                >
                  <ToggleButton value="button_press">Button Press</ToggleButton>
                  <ToggleButton value="button_release">Button Release</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

          {inputData.triggerType === 'axis_move' && inputData.axisIndex !== undefined && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Trigger when axis value is:
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
                    <MenuItem value="greater_than">Greater Than (&gt;)</MenuItem>
                    <MenuItem value="less_than">Less Than (&lt;)</MenuItem>
                    <MenuItem value="deadzone_exit">Outside Deadzone (|value| &gt;)</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Threshold (0.0 to 1.0)"
                  type="number"
                  size="small"
                  value={inputData.axisThreshold ?? 0.5}
                  onChange={(e) =>
                    onChange({
                      axisThreshold: Math.max(0, Math.min(1, parseFloat(e.target.value))) || 0.5
                    })
                  }
                  inputProps={{ step: 0.05, min: 0, max: 1 }}
                  fullWidth
                />
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      {connectedGamepadsArray.length === 0 &&
        !isInputCaptured /* Only show if not already configuring a captured input */ && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Please connect a gamepad to configure this input.
          </Alert>
        )}
    </Stack>
  )
}
