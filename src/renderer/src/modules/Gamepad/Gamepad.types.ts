// src/renderer/src/modules/Gamepad/Gamepad.types.ts
export interface GamepadInputData {
  gamepadIndex?: number; // To identify which gamepad (e.g., from navigator.getGamepads())
  buttonId?: string | number; // To identify the button (e.g., its index, or a mapped name)
  buttonName?: string; // User-friendly name of the button, e.g., "Button A", "Left Bumper"
  gamepadName?: string; // User-friendly name of the gamepad, e.g., "Xbox Controller"
}

// Add other types as they become necessary
