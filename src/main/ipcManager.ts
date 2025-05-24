// src/main/ipcManager.ts
import { ipcMain, nativeTheme, app } from 'electron'
import { getStore, getMainWindow } from './windowManager' // getStore() returns electron-store instance
import { notifyMainModulesOnRowsUpdate } from './moduleLoader'
import type { Row } from '../shared/types'
import { broadcastSseUpdateSignal } from './sseManager'

export const USER_THEME_PREFERENCE_KEY = 'userThemePreference'
export const CLOSE_BUTTON_BEHAVIOR_KEY = 'closeButtonBehavior'

export function initializeBaseIpcHandlers(): void {
  console.log('Main (ipcManager): Initializing Base IPC Handlers...')
  const storeInstance = getStore() // electron-store

  if (!storeInstance) {
    console.error('Main (ipcManager): electron-store not available. Base handlers not fully set.')
    // return; // Allow other handlers to still be set if possible
  }

  // --- Existing IPC Handlers (ping, set, get, app control, dev tools) ---
  ipcMain.on('ping', () => console.log('Main (ipcManager): pong'))

  ipcMain.on('set', async (_event, arg: [string, any]) => {
    const key = arg[0]
    const value = arg[1]
    // console.log(`Main (ipcManager) 'set': key: ${key}`); // Can be spammy
    if (storeInstance) await storeInstance.set(key, value)
    else console.warn(`[ipcManager] electron-store not available for 'set' key: ${key}`)

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
    const res = storeInstance ? await storeInstance.get(arg) : undefined
    event.sender.send('get', res)
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
    /* ... dev:clear-electron-store ... */
  }

  // --- NEW/REVISED THEME IPC HANDLERS ---
  ipcMain.on('get-initial-theme-info', (event) => {
    const persistedPreference = storeInstance?.get(USER_THEME_PREFERENCE_KEY, 'system') as
      | 'light'
      | 'dark'
      | 'system'
    event.returnValue = {
      userPreference: persistedPreference, // User's last choice ('light', 'dark', 'system')
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors // Current actual OS/Electron theme state
    }
  })

  ipcMain.on('set-app-theme-preference', (_event, themePreference: 'light' | 'dark' | 'system') => {
    console.log(`[ipcManager] Received 'set-app-theme-preference': ${themePreference}`)
    if (['light', 'dark', 'system'].includes(themePreference)) {
      nativeTheme.themeSource = themePreference // This triggers nativeTheme.on('updated')
      if (storeInstance) {
        storeInstance.set(USER_THEME_PREFERENCE_KEY, themePreference)
        console.log(`[ipcManager] Persisted theme preference: ${themePreference}`)
      } else {
        console.warn('[ipcManager] electron-store not available to persist theme preference.')
      }
      // The nativeTheme.on('updated') handler below will notify renderer and preload
    } else {
      console.warn(`[ipcManager] Invalid theme preference received: ${themePreference}`)
    }
  })
  ipcMain.handle('get-close-button-behavior', () => {
    if (!storeInstance) {
      console.warn('[ipcManager] electron-store not available for get-close-button-behavior.')
      return 'minimize' // Default if store not ready
    }
    // Default to 'minimize' if not set
    return storeInstance.get(CLOSE_BUTTON_BEHAVIOR_KEY, 'minimize') as 'minimize' | 'quit'
  })

  ipcMain.handle('set-close-button-behavior', (_event, behavior: 'minimize' | 'quit') => {
    if (!storeInstance) {
      console.error('[ipcManager] electron-store not available for set-close-button-behavior.')
      return { success: false, error: 'Storage not available.' }
    }
    if (behavior === 'minimize' || behavior === 'quit') {
      try {
        storeInstance.set(CLOSE_BUTTON_BEHAVIOR_KEY, behavior)
        console.log(`[ipcManager] Close button behavior set to: ${behavior}`)
        // Optionally, notify the windowManager or main app logic if immediate action is needed,
        // but typically this is read when the close event actually happens.
        return { success: true, newBehavior: behavior }
      } catch (error) {
        console.error('[ipcManager] Failed to set close button behavior:', error)
        return { success: false, error: (error as Error).message }
      }
    } else {
      console.warn(`[ipcManager] Invalid close button behavior received: ${behavior}`)
      return { success: false, error: 'Invalid behavior value.' }
    }
  })
  ipcMain.handle('get-login-item-settings', () => {
    // app.getLoginItemSettings() returns an object like:
    // { openAtLogin: boolean, openAsHidden: boolean (macOS only), ... }
    return app.getLoginItemSettings() // <<< THIS LINE
  })

  ipcMain.handle(
    'set-login-item-settings',
    (_event, settingsArg: { openAtLogin: boolean; openAsHidden?: boolean }) => {
      try {
        // Get current settings to preserve other options like path, args if they exist
        const currentSettings = app.getLoginItemSettings()
        const newSettingsOptions = {
          ...currentSettings, // Preserve existing settings like 'path' and 'args'
          openAtLogin: settingsArg.openAtLogin,
          // Only set openAsHidden if provided, otherwise let Electron use its default or existing
          ...(settingsArg.openAsHidden !== undefined && { openAsHidden: settingsArg.openAsHidden })
        }

        // On Windows, if setting openAtLogin: true, you often need to provide the path and args.
        // Electron usually handles this if you set it initially. If it becomes an issue, ensure these are set.
        if (process.platform === 'win32' && newSettingsOptions.openAtLogin) {
          // Always set the path explicitly on Windows
          ;(newSettingsOptions as any).path = app.getPath('exe')
          // (newSettingsOptions as any).args = ['--opened-at-login']; // Example arg
        }

        app.setLoginItemSettings(newSettingsOptions)
        const confirmedSettings = app.getLoginItemSettings() // Get the actual applied settings
        console.log(
          '[ipcManager] Login item settings updated. New actual settings:',
          confirmedSettings
        )
        return { success: true, newSettings: confirmedSettings }
      } catch (error) {
        console.error('[ipcManager] Failed to set login item settings:', error)
        return {
          success: false,
          error: (error as Error).message,
          newSettings: app.getLoginItemSettings()
        }
      }
    }
  )

  // --- Native Theme Update Listener ---
  nativeTheme.on('updated', () => {
    console.log(
      `[ipcManager] nativeTheme.on('updated') fired. shouldUseDarkColors: ${nativeTheme.shouldUseDarkColors}`
    )
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Notify Renderer (App.tsx) for MUI theme update
      mainWindow.webContents.send('system-theme-changed-in-main', {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors
      })
      // Notify Preload (specifically for title bar)
      mainWindow.webContents.send('update-titlebar-theme', {
        isDark: nativeTheme.shouldUseDarkColors
      })
    }
  })

  console.log('Main (ipcManager): Base IPC Handlers initialized.')
}
