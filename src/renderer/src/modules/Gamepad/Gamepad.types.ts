// src/renderer/src/modules/Gamepad/Gamepad.types.ts

// Type of trigger the user wants to configure
export type GamepadInputTriggerType =
  | 'button_press' // Trigger when a button is initially pressed down
  | 'button_release' // Trigger when a button is released
  | 'axis_move' // Trigger when an axis value meets a condition

// Condition for axis movement
export type GamepadAxisCondition =
  | 'greater_than' // Axis value > threshold
  | 'less_than' // Axis value < threshold
  | 'equals' // Axis value == threshold (use with caution due to float precision)
  | 'deadzone_exit' // Axis value moves OUTSIDE a deadzone (e.g. |value| > threshold)

export interface GamepadInputRowData {
  gamepadIndex?: number // Index of the gamepad (0-3, or undefined for "any" if we support that)
  triggerType: GamepadInputTriggerType

  // For 'button_press' and 'button_release'
  buttonIndex?: number // Index of the button (0-16+)

  // For 'axis_move'
  axisIndex?: number // Index of the axis (0-3+)
  axisCondition?: GamepadAxisCondition
  axisThreshold?: number // Value between -1.0 and 1.0 (typically)
  // For 'deadzone_exit', this is the deadzone radius (e.g., 0.1 means |value| > 0.1)

  // Optional: For user's reference in UI or if multiple gamepads of same type connected
  gamepadNameFilter?: string // E.g., "Xbox Controller", "Wireless Controller" - to help select if multiple
  // This might be set when user first assigns from a specific gamepad.

  // Display name generated from the above, used in InputDisplay
  // This could be generated on the fly in InputDisplay, or stored here for consistency if complex.
  // For now, let's assume InputDisplay will generate it.
  // configuredInputName?: string;
}

// Payload that this input module will dispatch with the 'io_input' event
export interface GamepadInputEventPayload {
  gamepadIndex: number
  gamepadId: string // The ID string from the Gamepad API

  triggerType: GamepadInputTriggerType

  buttonIndex?: number
  buttonPressed?: boolean // True if it's a press, false if it's a release (for button events)

  axisIndex?: number
  axisValue?: number // Current value of the axis that triggered

  timestamp: number
}

// Props for the SVG components if we make them generic
export interface GamepadVisualizerProps {
  gamepad: Gamepad | null // Gamepad object from browser API or react-gamepads
  // Potentially props to highlight specific buttons/axes during mapping
  highlightButton?: number | null
  highlightAxis?: number | null
}
