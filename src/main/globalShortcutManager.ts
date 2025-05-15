// src/main/globalShortcutManager.ts
import { globalShortcut } from 'electron'
import type { Row } from '../shared/types.js'
import { getStore, getMainWindow } from './windowManager.js' // Assuming getters are now in windowManager

const registeredShortcuts = new Set<string>()

function getElectronAccelerator(accelerator: string): string {
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

export function registerGlobalShortcutsForRows(): void {
  const storeInstance = getStore()
  const currentMainWindow = getMainWindow()

  if (!storeInstance) {
    console.warn('Main (shortcutManager): Store not initialized, cannot register shortcuts.')
    return
  }
  if (!currentMainWindow) {
    console.warn(
      'Main (shortcutManager): Main window not available, cannot send IPC for shortcuts.'
    )
    // We can still register, but they won't trigger renderer if window is gone
  }

  console.log('Main (shortcutManager): Attempting to register global shortcuts...')

  registeredShortcuts.forEach((acc) => globalShortcut.unregister(acc))
  registeredShortcuts.clear()

  const rows: Record<string, Row> | undefined = storeInstance.get('rows')
  if (!rows) {
    console.log('Main (shortcutManager): No rows found for shortcuts.')
    return
  }

  Object.values(rows).forEach((row: Row) => {
    if (row.inputModule === 'keyboard-module' && row.input.data.value) {
      const electronAccelerator = getElectronAccelerator(row.input.data.value)
      console.log(`Main (shortcutManager): Registering: ${electronAccelerator} for row ${row.id}`)
      try {
        const success = globalShortcut.register(electronAccelerator, () => {
          console.log(
            `Main (shortcutManager): Global shortcut pressed: ${electronAccelerator}, for row: ${row.id}`
          )
          currentMainWindow?.webContents.send('trigger-row', { id: row.id })
        })
        if (success) registeredShortcuts.add(electronAccelerator)
        else console.error(`Main (shortcutManager): Failed to register: ${electronAccelerator}.`)
      } catch (error) {
        console.error(`Main (shortcutManager): Error registering ${electronAccelerator}:`, error)
      }
    }
  })
  console.log(
    'Main (shortcutManager): Finished. Active shortcuts:',
    Array.from(registeredShortcuts)
  )
}

export function unregisterAllGlobalShortcutsApp(): void {
  console.log('Main (shortcutManager): Unregistering all global shortcuts.')
  globalShortcut.unregisterAll()
  registeredShortcuts.clear()
}
