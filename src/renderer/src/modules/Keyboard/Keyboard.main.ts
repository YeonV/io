// src/renderer/src/modules/Keyboard/Keyboard.main.ts
import { globalShortcut } from 'electron'
import type { IOMainModulePart, Row } from '../../../../shared/types'
import { MainModuleDeps } from '../../../../main/moduleLoader'

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

interface KeyboardMainDeps extends MainModuleDeps {}

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
    const { getMainWindow, activeProfileInfo } = deps // Get activeProfileInfo from deps
    const currentMainWindow = getMainWindow()

    console.log(
      `Main (${KEYBOARD_MODULE_ID}): Rows data received. Num rows: ${Object.keys(rows).length}. Active Profile ID: '${activeProfileInfo.id || 'None'}', Included rows in profile: ${activeProfileInfo.includedRowIds?.length ?? 'N/A (No Profile Active)'}`
    )

    registeredShortcuts.forEach((acc) => globalShortcut.unregister(acc))
    registeredShortcuts.clear()

    Object.values(rows).forEach((row: Row) => {
      let isRowActiveForShortcut = row.enabled === undefined ? true : row.enabled // Default to true if undefined

      // If a profile is active (i.e., includedRowIds is an array, even if empty)
      if (activeProfileInfo.includedRowIds !== null) {
        isRowActiveForShortcut =
          isRowActiveForShortcut && activeProfileInfo.includedRowIds.includes(row.id)
      }
      // If activeProfileInfo.includedRowIds is null, it means no profile is active,
      // so only row.enabled matters (which is already in isRowActiveForShortcut).

      if (
        row.inputModule === KEYBOARD_MODULE_ID &&
        isRowActiveForShortcut &&
        row.input.data.value
      ) {
        const originalAccelerator = String(row.input.data.value)
        const electronAccelerator = getElectronAccelerator(originalAccelerator)
        console.log(
          `Main (${KEYBOARD_MODULE_ID}): Attempting to register: ${electronAccelerator} for row ${row.id} (Enabled: ${row.enabled}, ProfileActive: ${activeProfileInfo.id !== null}, InProfile: ${activeProfileInfo.includedRowIds?.includes(row.id) ?? 'N/A'})`
        )
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
