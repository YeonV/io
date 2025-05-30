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
  const [gamepads, setGamepads] = useState<Record<number, Gamepad>>({})
  useGamepads((_gamepads: Record<number, Gamepad>) => setGamepads(_gamepads))

  const allRows = useMainStore((state) => state.rows)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const profiles = useMainStore((state) => state.profiles)

  const prevButtonStatesRef = useRef<Record<number, readonly boolean[]>>({})
  const prevAxisStatesRef = useRef<Record<number, readonly number[]>>({})

  useEffect(() => {
    const activeIoRows = Object.values(allRows).filter((row) => {
      if (row.inputModule !== id || !row.enabled) return false
      if (activeProfileId && profiles[activeProfileId]) {
        return profiles[activeProfileId].includedRowIds.includes(row.id)
      }
      return true
    })

    const gamepadInputRows = activeIoRows.filter((row) => row.input.data) as Array<Row> // Assert type for row.input.data

    if (gamepadInputRows.length === 0) {
      prevButtonStatesRef.current = {} // Clear refs if no rows are listening
      prevAxisStatesRef.current = {}
      return
    }

    // For rows configured for "Any Gamepad", we need to track if they've been triggered
    // in this frame to avoid multiple triggers from different gamepads for the same row.
    const triggeredForAnyGamepadInThisFrame: Record<string, boolean> = {}

    Object.values(gamepads).forEach((connectedGamepad) => {
      if (!connectedGamepad || !connectedGamepad.connected) {
        if (prevButtonStatesRef.current[connectedGamepad.index])
          delete prevButtonStatesRef.current[connectedGamepad.index]
        if (prevAxisStatesRef.current[connectedGamepad.index])
          delete prevAxisStatesRef.current[connectedGamepad.index]
        return
      }

      const livePadIndex = connectedGamepad.index
      const currentButtons = connectedGamepad.buttons.map((b) => b.pressed)
      const currentAxes = [...connectedGamepad.axes]

      if (!prevButtonStatesRef.current[livePadIndex]) {
        prevButtonStatesRef.current[livePadIndex] = Array(currentButtons.length).fill(false)
      }
      if (!prevAxisStatesRef.current[livePadIndex]) {
        prevAxisStatesRef.current[livePadIndex] = Array(currentAxes.length).fill(0)
      }

      const previousButtons = prevButtonStatesRef.current[livePadIndex]
      const previousAxes = prevAxisStatesRef.current[livePadIndex]

      gamepadInputRows.forEach((row) => {
        const config = row.input.data // GamepadInputRowData
        let shouldUseThisGamepad = false

        if (config.gamepadNameFilter) {
          // Priority 1: Match by specific Gamepad ID
          if (connectedGamepad.id === config.gamepadNameFilter) {
            shouldUseThisGamepad = true
          }
        } else if (config.gamepadIndex === undefined) {
          // Priority 2: Row is for "Any Gamepad"
          // Only trigger once per frame for "Any Gamepad" rows, even if multiple pads meet criteria
          if (!triggeredForAnyGamepadInThisFrame[row.id]) {
            shouldUseThisGamepad = true
            // We will mark it as triggered later if a button/axis condition actually met
          }
        } else if (config.gamepadIndex === livePadIndex) {
          // Priority 3: Fallback to stored index (less reliable)
          // This case is for rows configured before gamepadNameFilter was introduced, or if ID match failed.
          // It's good to log a warning if this path is taken often, encouraging re-configuration.
          console.warn(
            `[Gamepad] Row ${row.id} is matching on gamepadIndex ${livePadIndex} as fallback. Consider re-saving its config to capture gamepad ID.`
          )
          shouldUseThisGamepad = true
        }

        if (!shouldUseThisGamepad) {
          return // This row isn't interested in this physical gamepad in this iteration
        }

        let eventDidOccur = false // Flag if any configured event on this pad for this row happened
        const eventPayloadBase: Omit<GamepadInputEventPayload, 'triggerType'> = {
          gamepadIndex: livePadIndex,
          gamepadId: connectedGamepad.id,
          timestamp: connectedGamepad.timestamp || Date.now()
        }
        let specificEventPayload: Partial<
          Pick<
            GamepadInputEventPayload,
            'buttonIndex' | 'buttonPressed' | 'axisIndex' | 'axisValue'
          >
        > = {}

        // Button Event Logic
        if (
          (config.triggerType === 'button_press' || config.triggerType === 'button_release') &&
          config.buttonIndex !== undefined
        ) {
          const btnIdx = config.buttonIndex
          if (btnIdx >= 0 && btnIdx < currentButtons.length) {
            const isPressed = currentButtons[btnIdx]
            const wasPressed = previousButtons[btnIdx]
            specificEventPayload = { buttonIndex: btnIdx, buttonPressed: isPressed }
            if (config.triggerType === 'button_press' && isPressed && !wasPressed)
              eventDidOccur = true
            else if (config.triggerType === 'button_release' && !isPressed && wasPressed)
              eventDidOccur = true
          }
        }
        // Axis Event Logic
        else if (
          config.triggerType === 'axis_move' &&
          config.axisIndex !== undefined &&
          config.axisCondition &&
          config.axisThreshold !== undefined
        ) {
          const axisIdx = config.axisIndex
          if (axisIdx >= 0 && axisIdx < currentAxes.length) {
            const currentValue = currentAxes[axisIdx]
            const prevValue = previousAxes[axisIdx]
            const threshold = config.axisThreshold
            specificEventPayload = { axisIndex: axisIdx, axisValue: currentValue }
            switch (config.axisCondition) {
              case 'greater_than':
                if (currentValue > threshold && prevValue <= threshold) eventDidOccur = true
                break
              case 'less_than':
                if (currentValue < threshold && prevValue >= threshold) eventDidOccur = true
                break
              case 'equals':
                if (
                  Math.abs(currentValue - threshold) < 0.01 &&
                  Math.abs(prevValue - threshold) >= 0.01
                )
                  eventDidOccur = true
                break
              case 'deadzone_exit':
                if (Math.abs(currentValue) > threshold && Math.abs(prevValue) <= threshold)
                  eventDidOccur = true
                break
            }
          }
        }

        if (eventDidOccur) {
          // If this row was for "Any Gamepad", mark it as triggered for this frame
          if (config.gamepadIndex === undefined) {
            triggeredForAnyGamepadInThisFrame[row.id] = true
          }

          const finalPayload: GamepadInputEventPayload = {
            ...eventPayloadBase,
            ...specificEventPayload,
            triggerType: config.triggerType
          } as GamepadInputEventPayload

          window.dispatchEvent(
            new CustomEvent('io_input', { detail: { rowId: row.id, payload: finalPayload } })
          )
        }
      })

      // Update previous states for this physical gamepad AFTER checking all rows against it
      prevButtonStatesRef.current[livePadIndex] = currentButtons
      prevAxisStatesRef.current[livePadIndex] = currentAxes
    })
  }, [gamepads, allRows, activeProfileId, profiles])

  return null
}
