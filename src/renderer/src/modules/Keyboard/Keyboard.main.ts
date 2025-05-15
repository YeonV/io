// src/renderer/src/modules/Keyboard/Keyboard.main.ts
import { globalShortcut, type BrowserWindow } from 'electron' // Added BrowserWindow for deps type
import type { IOMainModulePart, Row } from '../../../../shared/types.js' // Path from Keyboard.main.ts to shared

const KEYBOARD_MODULE_ID = 'keyboard-module'
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

interface KeyboardMainDeps {
  ipcMain: typeof Electron.ipcMain // Not used by keyboard, but part of IOMainModulePart
  getMainWindow: () => BrowserWindow | null
  getStore: () => any
}

const keyboardMainModule: IOMainModulePart = {
  moduleId: KEYBOARD_MODULE_ID,

  initialize: (deps: KeyboardMainDeps) => {
    console.log(`Main (${KEYBOARD_MODULE_ID}): Initializing.`)
    const storeInstance = deps.getStore()
    if (storeInstance) {
      const rows = storeInstance.get('rows')
      if (rows && Object.keys(rows).length > 0) {
        console.log(`Main (${KEYBOARD_MODULE_ID}): Found initial rows, calling onRowsUpdated.`)
        keyboardMainModule.onRowsUpdated?.(rows, deps)
      } else {
        console.log(`Main (${KEYBOARD_MODULE_ID}): No rows in store during init or store is empty.`)
      }
    } else {
      console.warn(`Main (${KEYBOARD_MODULE_ID}): Store not available during init.`)
    }
  },

  onRowsUpdated: (rows: Record<string, Row>, deps: KeyboardMainDeps) => {
    const { getMainWindow } = deps
    const currentMainWindow = getMainWindow()

    console.log(
      `Main (${KEYBOARD_MODULE_ID}): Rows data received, re-registering shortcuts. Number of rows: ${Object.keys(rows).length}`
    )

    registeredShortcuts.forEach((acc) => globalShortcut.unregister(acc))
    registeredShortcuts.clear()

    Object.values(rows).forEach((row: Row) => {
      if (row.inputModule === KEYBOARD_MODULE_ID && row.input.data.value) {
        const originalAccelerator = String(row.input.data.value) // Ensure it's a string
        const electronAccelerator = getElectronAccelerator(originalAccelerator)
        // console.log(`Main (${KEYBOARD_MODULE_ID}): Attempting to register: ${electronAccelerator} for row ${row.id}`);
        try {
          const success = globalShortcut.register(electronAccelerator, () => {
            console.log(
              `Main (${KEYBOARD_MODULE_ID}): Shortcut pressed: ${electronAccelerator}, for row: ${row.id}`
            )
            currentMainWindow?.webContents.send('trigger-row', { id: row.id })
          })
          if (success) {
            registeredShortcuts.add(electronAccelerator)
          } else {
            console.error(
              `Main (${KEYBOARD_MODULE_ID}): Failed to register: ${electronAccelerator}. (In use or invalid)`
            )
          }
        } catch (error) {
          console.error(
            `Main (${KEYBOARD_MODULE_ID}): Error registering ${electronAccelerator}:`,
            error
          )
        }
      }
    })
    console.log(
      `Main (${KEYBOARD_MODULE_ID}): Finished registering. Active shortcuts:`,
      Array.from(registeredShortcuts)
    )
  },

  cleanup: () => {
    console.log(`Main (${KEYBOARD_MODULE_ID}): Unregistering its global shortcuts.`)
    registeredShortcuts.forEach((acc) => globalShortcut.unregister(acc))
    registeredShortcuts.clear()
  }
}

export default keyboardMainModule
