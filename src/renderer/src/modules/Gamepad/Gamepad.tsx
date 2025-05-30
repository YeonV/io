// src/renderer/src/modules/Gamepad/Gamepad.tsx
import type { GamepadInputRowData, GamepadInputEventPayload } from './Gamepad.types'
import type { ModuleConfig, InputData, Row } from '@shared/types'
import { useEffect, useRef, useState, type FC } from 'react'
import { useGamepads } from 'react-gamepads'
import { useMainStore } from '@/store/mainStore'
import { GamepadInputEdit } from './components/GamepadInputEdit'
import DisplayButtons from '@/components/Row/DisplayButtons'

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
  outputs: [],
  config: {
    enabled: true
    // Add any default custom config values here
    // globalDeadzone: 0.1,
  }
}

// --- InputEdit Component Placeholder ---
export const InputEdit: FC<{
  input: InputData
  onChange: (data: Partial<GamepadInputRowData>) => void
}> = ({ input, onChange }) => {
  return (
    <GamepadInputEdit
      inputData={input.data as GamepadInputRowData}
      onChange={(updatedData: Partial<GamepadInputRowData>) => {
        onChange(updatedData)
      }}
    />
  )
}

// --- InputDisplay Component ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const data = input.data
  let summary: string | string[] = 'Gamepad: Not Configured'

  if (data.triggerType === 'button_press' || data.triggerType === 'button_release') {
    summary = [
      `Button ${data.buttonIndex ?? '?'}`,
      `${data.triggerType === 'button_press' ? 'Press' : 'Release'}`
    ]
  } else if (data.triggerType === 'axis_move') {
    summary = `Axis ${data.axisIndex ?? '?'} ${data.axisCondition || ''} ${data.axisThreshold ?? ''}`
  }

  return (
    <DisplayButtons
      data={{ ...input, name: `Gamepad ${data.gamepadIndex + 1 || '?'}`, data: { text: summary } }}
    />
  )
}

// --- useInputActions Hook (or useGlobalActions) ---
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
      prevButtonStatesRef.current = {}
      prevAxisStatesRef.current = {}
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
