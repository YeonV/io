// src/renderer/src/modules/Keyboard/Keyboard.main.ts
import { globalShortcut, ipcMain } from 'electron'
import type { IOMainModulePart, Row } from '../../../../shared/types'
import { MainModuleDeps } from '../../../../main/moduleLoader'
import robot from 'robotjs'
import { getElectronAccelerator, parseShortcutForRobotJS } from './Keyboard.helper'

const KEYBOARD_MODULE_ID = 'keyboard-module'
const registeredShortcuts = new Set<string>()

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

    ipcMain.on('keyboard-press-keys', (_event, args: { shortcut: string }) => {
      const { shortcut } = args
      if (!shortcut) {
        console.warn(
          `Main (${KEYBOARD_MODULE_ID}): Received 'keyboard-press-keys' with no shortcut.`
        )
        return
      }

      console.log(`Main (${KEYBOARD_MODULE_ID}): Received IPC to press keys: "${shortcut}"`)
      const { key, modifiers } = parseShortcutForRobotJS(shortcut)

      if (key) {
        try {
          console.debug(
            `Main (${KEYBOARD_MODULE_ID}): RobotJS tapping key: '${key}' with modifiers: [${modifiers.join(', ')}]`
          )
          robot.keyTap(key, modifiers)
        } catch (e) {
          console.error(`Main (${KEYBOARD_MODULE_ID}): RobotJS error tapping key:`, e)
        }
      } else if (modifiers.length > 0) {
        // Handle modifier-only "presses" if needed, though typically a key is tapped.
        // For example, hold down modifiers, then release. RobotJS supports keyToggle.
        console.warn(
          `Main (${KEYBOARD_MODULE_ID}): Shortcut "${shortcut}" parsed to modifiers only, no specific key to tap.`
        )
      } else {
        console.warn(
          `Main (${KEYBOARD_MODULE_ID}): Could not parse shortcut "${shortcut}" for RobotJS.`
        )
      }
    })
    console.log(`Main (${KEYBOARD_MODULE_ID}): IPC listener for 'keyboard-press-keys' initialized.`)
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
