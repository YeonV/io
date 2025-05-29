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
  const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({})
  useGamepads((_gamepads) => setGamepads(_gamepads)) // Hook to get live gamepad data from react-gamepads

  const allRows = useMainStore((state) => state.rows)
  const activeProfileId = useMainStore((state) => state.activeProfileId) // To respect profiles
  const profiles = useMainStore((state) => state.profiles)
  // addRowHistoryEntry could be called here if needed for a different type of log

  // Store previous button states to detect press/release
  const prevButtonStatesRef = useRef<Record<number, boolean[]>>({})
  // Store previous axis states to detect significant changes or threshold crossing
  const prevAxisStatesRef = useRef<Record<number, number[]>>({})

  useEffect(() => {
    const activeRows = Object.values(allRows).filter((row) => {
      if (row.inputModule !== id || !row.enabled) return false
      if (activeProfileId && profiles[activeProfileId]) {
        return profiles[activeProfileId].includedRowIds.includes(row.id)
      }
      return true // No profile active or profile not found, consider row active if enabled
    })

    const gamepadInputRows = activeRows.filter(
      (row) => row.inputModule === id && row.input.data
    ) as Row[] // Assert type for row.input.data

    if (gamepadInputRows.length === 0) return // No gamepad rows to process

    Object.values(gamepads).forEach((gamepad) => {
      if (!gamepad || !gamepad.connected) return

      const padIndex = gamepad.index

      // Initialize refs if not present
      if (!prevButtonStatesRef.current[padIndex]) {
        prevButtonStatesRef.current[padIndex] = Array(gamepad.buttons.length).fill(false)
      }
      if (!prevAxisStatesRef.current[padIndex]) {
        prevAxisStatesRef.current[padIndex] = [...gamepad.axes] // Store initial axis values
      }

      const currentButtonStates = gamepad.buttons.map((b) => b.pressed)
      const previousButtonStates = prevButtonStatesRef.current[padIndex]
      const currentAxesStates = gamepad.axes
      const previousAxesStates = prevAxisStatesRef.current[padIndex]

      gamepadInputRows.forEach((row) => {
        const config = row.input.data

        // Check if this row is for this specific gamepad or "any"
        if (config.gamepadIndex !== undefined && config.gamepadIndex !== padIndex) {
          return // Row is configured for a different gamepad index
        }

        const eventPayload: Partial<GamepadInputEventPayload> = {
          // Build payload progressively
          gamepadIndex: padIndex,
          gamepadId: gamepad.id,
          timestamp: gamepad.timestamp || Date.now() // Use gamepad timestamp if available
        }
        let shouldTrigger = false

        if (
          (config.triggerType === 'button_press' || config.triggerType === 'button_release') &&
          config.buttonIndex !== undefined
        ) {
          const btnIdx = config.buttonIndex
          if (btnIdx < currentButtonStates.length) {
            const isPressed = currentButtonStates[btnIdx]
            const wasPressed = previousButtonStates[btnIdx]

            eventPayload.buttonIndex = btnIdx
            eventPayload.buttonPressed = isPressed

            if (config.triggerType === 'button_press' && isPressed && !wasPressed) {
              shouldTrigger = true
            } else if (config.triggerType === 'button_release' && !isPressed && wasPressed) {
              shouldTrigger = true
            }
          }
        } else if (
          config.triggerType === 'axis_move' &&
          config.axisIndex !== undefined &&
          config.axisCondition &&
          config.axisThreshold !== undefined
        ) {
          const axisIdx = config.axisIndex
          if (axisIdx < currentAxesStates.length) {
            const currentValue = currentAxesStates[axisIdx]
            const prevValue = previousAxesStates[axisIdx] // For detecting change across threshold
            eventPayload.axisIndex = axisIdx
            eventPayload.axisValue = currentValue

            const threshold = config.axisThreshold
            switch (config.axisCondition) {
              case 'greater_than':
                if (currentValue > threshold && prevValue <= threshold) shouldTrigger = true
                break
              case 'less_than':
                if (currentValue < threshold && prevValue >= threshold) shouldTrigger = true
                break
              case 'equals': // Exact equality with floats is tricky, use with caution
                if (currentValue === threshold && prevValue !== threshold) shouldTrigger = true
                break
              case 'deadzone_exit':
                if (Math.abs(currentValue) > threshold && Math.abs(prevValue) <= threshold)
                  shouldTrigger = true
                break
            }
          }
        }

        if (shouldTrigger) {
          console.log(`[Gamepad] Triggering Row ${row.id} for Pad ${padIndex}`, eventPayload)
          window.dispatchEvent(
            new CustomEvent('io_input', {
              detail: {
                rowId: row.id,
                payload: {
                  ...eventPayload,
                  triggerType: config.triggerType // Ensure triggerType from config is in final payload
                } as GamepadInputEventPayload // Assert full type
              }
            })
          )
        }
      })

      // Update previous states for next frame
      prevButtonStatesRef.current[padIndex] = currentButtonStates
      prevAxisStatesRef.current[padIndex] = [...currentAxesStates] // Store a copy
    })
  }, [gamepads, allRows, activeProfileId, profiles]) // Dependencies

  return null // Global actions hook doesn't render anything
}
