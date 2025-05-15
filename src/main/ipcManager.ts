// src/main/ipcManager.ts
import { ipcMain, nativeTheme, app, type BrowserWindow } from 'electron'
import { getStore, getMainWindow } from './windowManager.js'
import { notifyMainModulesOnRowsUpdate } from './moduleLoader.js' // To trigger module updates
import type { Row } from '../shared/types.js' // Import Row

export function initializeBaseIpcHandlers(): void {
  // Renamed to reflect its new role
  console.log('Main (ipcManager): Initializing Base IPC Handlers...')
  const storeInstance = getStore()

  if (!storeInstance) {
    console.error('Main (ipcManager): Store not available for IPC init. Base handlers not set.')
    return
  }

  ipcMain.on('ping', () => console.log('Main (ipcManager): pong'))

  ipcMain.on('set', async (_event, arg: [string, any]) => {
    const key = arg[0]
    const value = arg[1]
    // console.log(`Main (ipcManager) 'set': key: ${key}, value:`, value); // Can be verbose
    console.log(`Main (ipcManager) 'set': key: ${key}`)
    await storeInstance.set(key, value)

    if (key === 'rows') {
      console.log("Main (ipcManager): 'rows' key updated in store, notifying modules.")
      // Ensure 'value' here is the complete rows object
      const currentRows = value as Record<string, Row> // Cast if sure about the structure
      if (currentRows) {
        await notifyMainModulesOnRowsUpdate(currentRows)
      } else {
        // If value is null/undefined after a delete all rows, pass empty object
        await notifyMainModulesOnRowsUpdate({})
        console.warn(
          "Main (ipcManager): 'rows' key updated but value was null/undefined, notifying with empty rows."
        )
      }
    }
  })

  ipcMain.on('get', async (event, arg) => {
    const res = await storeInstance.get(arg)
    event.sender.send('get', res)
  })

  // Dark Mode & App Control Handlers (These are app-generic, not module-specific)
  ipcMain.on('get-darkmode', (event) => {
    event.returnValue = nativeTheme.shouldUseDarkColors ? 'yes' : 'no'
  })

  ipcMain.on('toggle-darkmode', (event) => {
    const currentMainWindow = getMainWindow()
    const newTheme = nativeTheme.themeSource === 'dark' ? 'light' : 'dark'
    nativeTheme.themeSource = newTheme
    event.returnValue = newTheme === 'dark'
    currentMainWindow?.reload()
  })

  ipcMain.on('restart-app', () => {
    app.relaunch()
    app.exit()
  })

  console.log(
    'Main (ipcManager): Base IPC Handlers (ping, set, get, theme, app control) initialized.'
  )
  // Module-specific IPCs (Alexa, Shell) are now initialized by their respective *.main.ts files via moduleLoader.
}
