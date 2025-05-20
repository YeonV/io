// src/main/ipcManager.ts
import { ipcMain, nativeTheme, app } from 'electron'
import { getStore, getMainWindow } from './windowManager'
import { notifyMainModulesOnRowsUpdate } from './moduleLoader'
import type { Row } from '../shared/types'
import { broadcastSseUpdateSignal } from './sseManager'

export function initializeBaseIpcHandlers(): void {
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
    console.log(`Main (ipcManager) 'set': key: ${key}`)
    await storeInstance.set(key, value)

    if (key === 'rows') {
      console.log("Main (ipcManager): 'rows' key updated in store, notifying modules.")
      const currentRows = value as Record<string, Row>
      if (currentRows) {
        await notifyMainModulesOnRowsUpdate(currentRows)
      } else {
        await notifyMainModulesOnRowsUpdate({})
        console.warn(
          "Main (ipcManager): 'rows' key updated but value was null/undefined, notifying with empty rows."
        )
      }
    }

    if (key === 'rows' || key === 'profiles' || key === 'activeProfileId') {
      broadcastSseUpdateSignal(key)
    }
  })

  ipcMain.on('get', async (event, arg) => {
    const res = await storeInstance.get(arg)
    event.sender.send('get', res)
  })

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

  ipcMain.handle('get-main-store-state', () => {
    const storeInstance = getStore()
    return {
      profiles: storeInstance.get('profiles') || {},
      activeProfileId: storeInstance.get('activeProfileId') || null,
      rows: storeInstance.get('rows') || {}
    }
  })

  if (process.env.NODE_ENV === 'development') {
    ipcMain.handle('dev:clear-electron-store', async () => {
      console.warn('[MAIN DEV] Received request to clear electron-store.')
      const storeInstance = getStore()
      if (storeInstance && typeof storeInstance.clear === 'function') {
        try {
          storeInstance.clear() // Clears all data in electron-store
          console.log('[MAIN DEV] electron-store cleared successfully.')
          return true
        } catch (e) {
          console.error('[MAIN DEV] Error clearing electron-store:', e)
          return false
        }
      } else {
        console.error('[MAIN DEV] electron-store instance or .clear() method not available.')
        return false
      }
    })
    console.log("[MAIN DEV] 'dev:clear-electron-store' IPC handler initialized.")
  }

  console.log(
    'Main (ipcManager): Base IPC Handlers (ping, set, get, theme, app control) initialized.'
  )
}
