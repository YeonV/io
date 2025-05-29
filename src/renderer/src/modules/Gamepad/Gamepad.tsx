// src/renderer/src/modules/Gamepad/Gamepad.tsx
import { useEffect, useRef, useState, type FC } from 'react'
import type { ModuleConfig, InputData, Row, ModuleDefaultConfig } from '@shared/types'
import { Box, Typography, Alert } from '@mui/material' // Basic imports
import IoIcon from '@/components/IoIcon/IoIcon' // Assuming path
import DisplayButtons from '@/components/Row/DisplayButtons' // For a simple InputDisplay
import { useGamepads } from 'react-gamepads' // Key hook!

// Import types for this module
import type {
  GamepadInputRowData,
  GamepadInputEventPayload,
  GamepadInputTriggerType
} from './Gamepad.types'
import { useRowActivation } from '@/hooks/useRowActivation' // If needed for per-row actions
import { useMainStore } from '@/store/mainStore' // For dispatching history or other actions
import { GamepadInputEdit } from './components/GamepadInputEdit'

// --- Module Definition ---
export const id = 'gamepad-module' // Unique ID for this module

// If Gamepad module has its own global config (e.g., default deadzone, polling rate)
export interface GamepadModuleCustomConfig {
  // Example: globalDeadzone?: number;
  // Example: alwaysListenInBackground?: boolean; // More complex, main process
}

export const moduleConfig: ModuleConfig<GamepadModuleCustomConfig> = {
  menuLabel: 'Input Device',
  description: 'Trigger actions using connected gamepads (buttons and analog sticks/triggers).',
  inputs: [
    {
      name: 'Gamepad Event',
      icon: 'mdi:gamepad-variant',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ],
  outputs: [], // No outputs defined for this module
  config: {
    enabled: true // Default state for the module's availability
    // Add any default custom config values here
    // globalDeadzone: 0.1,
  }
}

// --- InputEdit Component Placeholder ---
// This will be a complex component, likely in its own file: GamepadInputEdit.tsx
export const InputEdit: FC<{
  input: InputData // data can be partial during config
  onChange: (data: Partial<GamepadInputRowData>) => void
  // We might need to pass down the specific input type ('Gamepad Button Event' vs 'Gamepad Axis Movement')
  // if the UI needs to adapt, or it can infer from existing input.data.triggerType
}> = ({ input, onChange }) => {
  // This component will:
  // 1. Allow selecting a gamepad index (0-3 or 'any').
  // 2. Display "Press any button or move any stick..."
  // 3. Use `useGamepads` hook to monitor inputs.
  // 4. When an event is detected:
  //    - Populate its internal state with detected button/axis, gamepad index.
  //    - Update the UI to show what was detected.
  //    - Offer options (e.g., for button: "Trigger on Press" or "Trigger on Release";
  //      for axis: "Condition (>, <, etc.)", "Threshold").
  // 5. Call `onChange` with the complete GamepadInputRowData.
  // 6. Display your awesome SVG gamepad visualizer.

  //   const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({})
  //   useGamepads((_gamepads) => {
  //     console.log('Detected gamepads:', _gamepads)
  //     return setGamepads(_gamepads)
  //   }) // Hook to get live gamepad data

  //   const currentInputType = input.name // "Gamepad Button Event" or "Gamepad Axis Movement"

  //   //   console.log(
  //   //     'Gamepad Input Edit',
  //   //     {
  //   //       input,
  //   //       currentInputType,
  //   //       gamepads
  //   //     }
  //   //     // Use a custom hook or logic to handle gamepad input detection and state updat
  //   //   )

  return (
    <GamepadInputEdit
      inputData={input.data as GamepadInputRowData} // Cast to our specific type
      onChange={(updatedData: Partial<GamepadInputRowData>) => {
        // Call onChange with the updated data
        onChange(updatedData)
      }}
    />
    // <Box
    //   sx={{
    //     p: 1,
    //     minHeight: 200,
    //     border: '1px dashed grey',
    //     borderRadius: 1,
    //     display: 'flex',
    //     flexDirection: 'column',
    //     alignItems: 'center',
    //     justifyContent: 'center'
    //   }}
    // >
    //   <Typography variant="h6" gutterBottom>
    //     Gamepad Input Configuration
    //   </Typography>
    //   <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    //     (Interactive Editor Coming Soon!)
    //   </Typography>
    //   <Typography variant="caption">Input Type: {currentInputType}</Typography>
    //   <Typography variant="caption">
    //     Selected Gamepad: {input.data.gamepadIndex ?? 'Any (detect first)'}
    //   </Typography>
    //   {currentInputType === 'Gamepad Button Event' && (
    //     <Typography variant="caption">
    //       Button: {input.data.buttonIndex ?? 'Press to assign'}, Event:{' '}
    //       {input.data.triggerType?.replace('button_', '')}{' '}
    //     </Typography>
    //   )}
    //   {currentInputType === 'Gamepad Axis Movement' && (
    //     <Typography variant="caption">
    //       Axis: {input.data.axisIndex ?? 'Move to assign'}, Condition: {input.data.axisCondition},
    //       Threshold: {input.data.axisThreshold}
    //     </Typography>
    //   )}
    //   <Alert severity="info" sx={{ mt: 2 }}>
    //     Connect a gamepad and interact with it. The UI will guide you to map buttons or analog stick
    //     movements.
    //   </Alert>
    //   {/* Placeholder for Gamepad Selection Dropdown */}
    //   {/* Placeholder for "Press button/move stick to assign" UI */}
    //   {/* Placeholder for your SVG Gamepad Visualizer */}
    // </Box>
  )
}

// --- InputDisplay Component ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const data = input.data
  let summary = 'Gamepad: Not Configured'

  if (data.triggerType === 'button_press' || data.triggerType === 'button_release') {
    summary = `Pad ${data.gamepadIndex !== undefined ? data.gamepadIndex + 1 : 'Any'}: Btn ${data.buttonIndex ?? '?'} (${data.triggerType === 'button_press' ? 'Press' : 'Release'})`
  } else if (data.triggerType === 'axis_move') {
    summary = `Pad ${data.gamepadIndex !== undefined ? data.gamepadIndex + 1 : 'Any'}: Axis ${data.axisIndex ?? '?'} ${data.axisCondition || ''} ${data.axisThreshold ?? ''}`
  }

  // Use gamepadNameFilter if available for more specific display
  if (data.gamepadNameFilter) {
    summary += ` (${data.gamepadNameFilter.substring(0, 15)}...)`
  }

  return (
    <DisplayButtons
      data={{ ...input, name: summary }} // Override name with our dynamic summary
      // icon prop is already on input from moduleConfig
    />
  )
}

// --- useInputActions Hook (or useGlobalActions) ---
// This will contain the core logic for listening to gamepads and dispatching io_input
// For now, a placeholder. We'll need to decide if it's per-row or global.
// Given multiple rows can listen to different buttons/axes on different gamepads,
// a useGlobalActions that iterates through all "Gamepad Input" rows seems most efficient.
export const useGlobalActions = () => {
  const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({}) // Use Gamepad or GamepadInstance
  useGamepads((_gamepads: Record<number, Gamepad>) => setGamepads(_gamepads))

  const allRows = useMainStore((state) => state.rows)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const profiles = useMainStore((state) => state.profiles)
  // const addRowHistoryEntry = useMainStore((state) => state.addRowHistoryEntry); // If you want to log raw gamepad events here

  // Store previous button states { [padIndex]: boolean[] }
  const prevButtonStatesRef = useRef<Record<number, readonly boolean[]>>({})
  // Store previous axis states { [padIndex]: readonly number[] }
  const prevAxisStatesRef = useRef<Record<number, readonly number[]>>({})

  useEffect(() => {
    // Filter for active rows configured for this gamepad module
    const activeIoRows = Object.values(allRows).filter((row) => {
      if (row.inputModule !== id || !row.enabled) return false
      if (activeProfileId && profiles[activeProfileId]) {
        return profiles[activeProfileId].includedRowIds.includes(row.id)
      }
      return true
    })

    const gamepadInputRows = activeIoRows.filter(
      (row) => row.input.data // Ensure data exists
    ) as Array<Row> // Assert type for row.input.data

    if (gamepadInputRows.length === 0) {
      // Clean up refs if no rows are listening to prevent stale data if rows are re-added
      // prevButtonStatesRef.current = {};
      // prevAxisStatesRef.current = {};
      return
    }

    // Process each connected gamepad
    Object.values(gamepads).forEach((gamepad) => {
      if (!gamepad || !gamepad.connected) {
        // If a gamepad disconnects, clear its previous state from refs
        if (prevButtonStatesRef.current[gamepad.index])
          delete prevButtonStatesRef.current[gamepad.index]
        if (prevAxisStatesRef.current[gamepad.index])
          delete prevAxisStatesRef.current[gamepad.index]
        return
      }

      const padIndex = gamepad.index
      const currentButtons = gamepad.buttons.map((b) => b.pressed)
      const currentAxes = [...gamepad.axes] // Important: make a copy for comparison

      // Initialize or get previous states for this specific gamepad
      if (!prevButtonStatesRef.current[padIndex]) {
        prevButtonStatesRef.current[padIndex] = Array(currentButtons.length).fill(false)
      }
      if (!prevAxisStatesRef.current[padIndex]) {
        prevAxisStatesRef.current[padIndex] = Array(currentAxes.length).fill(0) // Init axes to 0
      }

      const previousButtons = prevButtonStatesRef.current[padIndex]
      const previousAxes = prevAxisStatesRef.current[padIndex]

      // Check each configured IO row against this gamepad's current state
      gamepadInputRows.forEach((row) => {
        const config = row.input.data // This is GamepadInputRowData

        // Match gamepad index:
        // Row configured for "Any Gamepad" (config.gamepadIndex is undefined)
        // OR Row configured for this specific gamepad (config.gamepadIndex === padIndex)
        if (config.gamepadIndex !== undefined && config.gamepadIndex !== padIndex) {
          return // This row isn't interested in this particular gamepad
        }

        let shouldTrigger = false
        const eventPayloadBase: Omit<GamepadInputEventPayload, 'triggerType'> = {
          // Base payload
          gamepadIndex: padIndex,
          gamepadId: gamepad.id,
          timestamp: gamepad.timestamp || Date.now()
        }
        let specificEventPayload: Partial<
          Pick<
            GamepadInputEventPayload,
            'buttonIndex' | 'buttonPressed' | 'axisIndex' | 'axisValue'
          >
        > = {}

        // --- Button Event Logic ---
        if (
          (config.triggerType === 'button_press' || config.triggerType === 'button_release') &&
          config.buttonIndex !== undefined
        ) {
          const btnIdx = config.buttonIndex
          if (btnIdx >= 0 && btnIdx < currentButtons.length) {
            // Bounds check
            const isPressed = currentButtons[btnIdx]
            const wasPressed = previousButtons[btnIdx]

            specificEventPayload = { buttonIndex: btnIdx, buttonPressed: isPressed }

            if (config.triggerType === 'button_press' && isPressed && !wasPressed) {
              shouldTrigger = true
            } else if (config.triggerType === 'button_release' && !isPressed && wasPressed) {
              shouldTrigger = true
            }
          }
        }
        // --- Axis Event Logic ---
        else if (
          config.triggerType === 'axis_move' &&
          config.axisIndex !== undefined &&
          config.axisCondition &&
          config.axisThreshold !== undefined
        ) {
          const axisIdx = config.axisIndex
          if (axisIdx >= 0 && axisIdx < currentAxes.length) {
            // Bounds check
            const currentValue = currentAxes[axisIdx]
            const prevValue = previousAxes[axisIdx]
            const threshold = config.axisThreshold

            specificEventPayload = { axisIndex: axisIdx, axisValue: currentValue }

            switch (config.axisCondition) {
              case 'greater_than':
                // Trigger only when crossing the threshold from below or equal
                if (currentValue > threshold && prevValue <= threshold) shouldTrigger = true
                break
              case 'less_than':
                // Trigger only when crossing the threshold from above or equal
                if (currentValue < threshold && prevValue >= threshold) shouldTrigger = true
                break
              case 'equals':
                // Trigger if current value is at threshold and previous was not (or different way)
                // This is tricky with float precision. Better to use a small range.
                // For simplicity, let's say it triggers if it just became equal.
                if (
                  Math.abs(currentValue - threshold) < 0.01 &&
                  Math.abs(prevValue - threshold) >= 0.01
                )
                  shouldTrigger = true
                break
              case 'deadzone_exit':
                // Trigger if it moves from inside the deadzone to outside
                if (Math.abs(currentValue) > threshold && Math.abs(prevValue) <= threshold)
                  shouldTrigger = true
                break
            }
          }
        }

        if (shouldTrigger) {
          const finalPayload: GamepadInputEventPayload = {
            ...eventPayloadBase,
            ...specificEventPayload, // Add button/axis specific parts
            triggerType: config.triggerType // The type of event that matched from config
          } as GamepadInputEventPayload // Assert to full type

          // console.log(`[Gamepad] IO_INPUT Triggering Row ${row.id} for Pad ${padIndex}`, finalPayload);
          window.dispatchEvent(
            new CustomEvent('io_input', {
              detail: {
                rowId: row.id,
                payload: finalPayload
              }
            })
          )
        }
      })

      // Update previous states for this gamepad for the next frame's comparison
      prevButtonStatesRef.current[padIndex] = currentButtons // Already a new array from .map()
      prevAxisStatesRef.current[padIndex] = currentAxes // Was already a copy
    })
  }, [gamepads, allRows, activeProfileId, profiles]) // Key dependencies

  return null
}
