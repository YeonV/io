export function getElectronAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => {
      const lowerPart = part.toLowerCase()
      switch (lowerPart) {
        case 'ctrl':
          return 'Control'
        case 'alt':
          return 'Alt'
        case 'shift':
          return 'Shift'
        case 'cmd':
          return 'Command'
        case 'win':
          return 'Super'
        case 'meta':
          return process.platform === 'darwin' ? 'Command' : 'Super'
        case 'option':
          return 'Alt'
        default:
          return lowerPart.length === 1 ? lowerPart.toUpperCase() : part
      }
    })
    .join('+')
}

export function parseShortcutForRobotJS(shortcutString: string): {
  key: string
  modifiers: string[]
} {
  const parts = shortcutString.toLowerCase().split('+')
  const robotModifiers: string[] = []
  let robotKey: string = ''

  const modifierMap: Record<string, string> = {
    ctrl: 'control',
    alt: 'alt',
    shift: 'shift',
    cmd: 'command', // Mac command
    win: 'win', // Windows key (robotjs might use 'super' or OS specific)
    super: 'super', // Generic super key
    meta: process.platform === 'darwin' ? 'command' : 'super', // Map meta appropriately
    option: 'alt'
  }

  for (const part of parts) {
    if (modifierMap[part]) {
      robotModifiers.push(modifierMap[part])
    } else {
      // This assumes the last non-modifier is the key.
      // Might need adjustment for complex shortcuts or if order isn't guaranteed.
      robotKey = part
    }
  }

  // Handle common media keys - RobotJS has specific names for these
  switch (robotKey) {
    case 'mediaplaypause':
      robotKey = 'audio_play'
      break
    case 'medianexttrack':
      robotKey = 'audio_next'
      break
    case 'mediaprevioustrack':
      robotKey = 'audio_prev'
      break
    case 'mediavolumemute':
      robotKey = 'audio_mute'
      break
    case 'mediavolumeup':
      robotKey = 'audio_vol_up'
      break
    case 'mediavolumedown':
      robotKey = 'audio_vol_down'
      break
    // Add more special key mappings as needed
  }

  // If no actual key was found (e.g., "ctrl+shift"), it's problematic.
  // For now, assume a key is always present if it's not just modifiers.
  if (!robotKey && parts.length > 0 && !modifierMap[parts[parts.length - 1]]) {
    robotKey = parts[parts.length - 1]
  }

  return { key: robotKey, modifiers: robotModifiers }
}
