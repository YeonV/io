// In shared/types.ts or a new Keyboard.types.ts
export interface KeyboardOutputData {
  shortcut: string // e.g., "MediaPlayPause", "Ctrl+Alt+Delete", "Shift+A"
  // Potentially add options like 'delayBetweenKeys' if sending a sequence
}
