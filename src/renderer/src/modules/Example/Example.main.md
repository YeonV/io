```ts
// src/renderer/src/modules/Example/Example.main.ts

import { type IpcMain, type BrowserWindow, ipcMain } from 'electron'
// Path to shared types will differ based on actual location of this .main.ts file
// Assuming co-location for this example:
import type { IOMainModulePart, Row } from '../../../../shared/types.js'
import type { MainModuleDeps } from '../../../../main/moduleLoader.js' // Adjust path

const id = 'example-module' // Must match id from Example.tsx

// This object will be the default export
const exampleMainModule: IOMainModulePart = {
  moduleId: id,

  initialize: (deps: MainModuleDeps) => {
    const { ipcMain, getMainWindow, getStore } = deps
    console.log(`Main (${id}): Initializing main process part.`)

    // Example: Listen for an IPC message from this module's renderer part
    const exampleActionHandler = async (_event: Electron.IpcMainInvokeEvent, args: any) => {
      console.log(`Main (${id}): Received 'example-module-do-action' IPC with args:`, args)
      // Access store if needed: const allRows = getStore()?.get('rows');
      // Access window: getMainWindow()?.flashFrame(true);
      // Perform some Node.js / Electron main process specific task
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate async work
      return { success: true, message: `Action processed in main for command: ${args.command}` }
    }
    ipcMain.handle('example-module-do-action', exampleActionHandler)

    // Initial setup based on rows if needed (e.g., if this module managed global resources based on row config)
    const currentRows = getStore()?.get('rows')
    if (currentRows) {
      exampleMainModule.onRowsUpdated?.(currentRows, deps)
    }
  },

  onRowsUpdated: (rows: Record<string, Row>, deps: MainModuleDeps) => {
    // This function is called by moduleLoader whenever 'rows' are updated in electron-store
    // AND when the active profile changes (because moduleLoader passes current rows then too).
    // Useful if your main-side logic needs to adapt to the current set of active rows
    // (e.g., Keyboard.main.ts uses this to update global shortcuts).
    const { activeProfileInfo } = deps
    console.log(
      `Main (${id}): Rows or Profile updated. Total rows: ${Object.keys(rows).length}. Active Profile: ${activeProfileInfo.id || 'None'}`
    )

    Object.values(rows).forEach((row) => {
      let isRowConsideredActive = row.enabled === undefined ? true : row.enabled
      if (activeProfileInfo.includedRowIds !== null) {
        isRowConsideredActive =
          isRowConsideredActive && activeProfileInfo.includedRowIds.includes(row.id)
      }
      // If you module is not iniitialized, you will get an error here for id.
      // it will be auto-fixed on the next yarn dev. alternatively, you can run yarn sync-modules
      if (row.inputModule === id && isRowConsideredActive) {
        // console.log(`Main (${id}): Row ${row.id} is active and uses this module as input.`);
      }
      if (row.outputModule === id && isRowConsideredActive) {
        // console.log(`Main (${id}): Row ${row.id} is active and uses this module as output.`);
      }
    })
  },

  cleanup: () => {
    console.log(`Main (${id}): Cleaning up main process part.`)
    ipcMain.removeHandler('example-module-do-action')
  }
}

export default exampleMainModule
```