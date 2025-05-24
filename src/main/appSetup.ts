// src/main/appSetup.ts
import { app, nativeTheme } from 'electron'
import { release } from 'os'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import pkg from '../../package.json' with { type: 'json' } // For app UserModelId
import { getMainWindow } from './windowManager' // For focusing on second instance
import { getStore } from './windowManager'
import { USER_THEME_PREFERENCE_KEY } from './ipcManager'

export async function setupNativeTheme() {
  // Call this after electron-store is loaded
  const storeInstance = getStore()
  if (storeInstance) {
    const persistedPreference = storeInstance.get(USER_THEME_PREFERENCE_KEY, 'system') as
      | 'light'
      | 'dark'
      | 'system'
    console.log(
      `[appSetup] Setting initial nativeTheme.themeSource based on persisted preference: ${persistedPreference}`
    )
    nativeTheme.themeSource = persistedPreference
  } else {
    console.warn(
      '[appSetup] electron-store not available during setupNativeTheme. Defaulting nativeTheme.themeSource to "system".'
    )
    nativeTheme.themeSource = 'system' // Fallback
  }
}
/**
 * Performs early application setup tasks.
 * - Disables security warnings.
 * - Disables GPU acceleration on Windows 7.
 * - Sets AppUserModelId for Windows notifications.
 */
export function performEarlyAppSetup(): void {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

  if (release().startsWith('6.1')) {
    // Check for Windows 7
    app.disableHardwareAcceleration()
    console.log('Main (appSetup): Disabled hardware acceleration for Windows 7.')
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId(app.getName()) // Use app.getName() for consistency
    console.log(`Main (appSetup): AppUserModelId set to ${app.getName()}`)
  }
}

/**
 * Enforces a single instance of the application.
 * If another instance is detected, it focuses the existing window and quits the new one.
 */
export function enforceSingleInstanceLock(): void {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    console.log('Main (appSetup): Another instance detected. Quitting this new instance.')
    app.quit()
    process.exit(0) // Ensure process exits quickly
  } else {
    app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
      // Someone tried to run a second instance, we should focus our window.
      const mainWindow = getMainWindow()
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        console.log('Main (appSetup): Focused existing window on second-instance event.')
      }
    })
    console.log('Main (appSetup): Single instance lock acquired.')
  }
}

/**
 * Initializes general Electron app lifecycle events and toolkit utilities.
 * - Sets AppUserModelId via electronApp.
 * - Watches for window shortcuts via optimizer.
 * - Sets up basic window lifecycle handlers.
 * - Sets up an uncaught exception handler.
 */
export function initializeBaseAppLifecycleEvents(): void {
  // Set app user model id for windows
  // Recommended for notifications and taskbar grouping.
  electronApp.setAppUserModelId(`com.${pkg.name || 'ioapp'}`) // Use a consistent ID format
  console.log(`Main (appSetup): electronApp UserModelId set to com.${pkg.name || 'ioapp'}`)

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils#optimizer
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Basic window event handlers
  app.on('window-all-closed', () => {
    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Handle uncaught exceptions globally in the main process
  process.on('uncaughtException', (error: Error) => {
    console.error('Main (appSetup): UNCAUGHT EXCEPTION:', error)
    // TODO: Add more robust error handling here for production (e.g., logging to file, reporting)
    // For now, just log it. Avoid exiting app unless it's truly unrecoverable.
    // Example: if (!error.message?.startsWith('listen EADDRINUSE: address already in use')) { /* report */ }
  })

  console.log('Main (appSetup): Base app lifecycle events initialized.')
}
