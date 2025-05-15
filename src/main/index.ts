// src/main/index.ts
import { app, BrowserWindow } from 'electron' // Minimal Electron imports

// Import setup and manager functions
import {
  performEarlyAppSetup,
  enforceSingleInstanceLock,
  initializeBaseAppLifecycleEvents
} from './appSetup.js'
import { createMainWindow, getMainWindow, loadElectronStore } from './windowManager.js'
import { createTray, destroyTray } from './trayManager.js'
import {
  registerGlobalShortcutsForRows,
  unregisterAllGlobalShortcutsApp
} from './globalShortcutManager.js'
import { initializeIpcHandlers } from './ipcManager.js'
import { startExpressApi } from './expressApi.js'
import { installDevTools } from './devtools.js'
import iconAsset from '../../resources/icon.png?asset'

// --- 1. Perform VERY Early Setup (before app ready) ---
performEarlyAppSetup() // Handles env vars, GPU accel
enforceSingleInstanceLock() // Handles single instance lock & 'second-instance' event

// --- 2. Main Application Flow (after app is ready) ---
app.whenReady().then(async () => {
  initializeBaseAppLifecycleEvents() // Handles electronApp.setAppUserModelId, optimizer, uncaught exceptions etc.

  await loadElectronStore()
  const mainWindowInstance = await createMainWindow(iconAsset)

  if (mainWindowInstance) {
    await installDevTools()
    createTray(mainWindowInstance)
    initializeIpcHandlers() // This will internally use getMainWindow() and getStore()
    registerGlobalShortcutsForRows()

    mainWindowInstance.webContents.once('did-finish-load', () => {
      console.log("Main (index.ts): Renderer 'did-finish-load'. Starting Express API.")
      startExpressApi(mainWindowInstance)
      mainWindowInstance.webContents.send(
        'main-process-message',
        `Renderer loaded: ${new Date().toLocaleString()}`
      )
    })
  } else {
    console.error('Main (index.ts): CRITICAL - Failed to create main window. App will exit.')
    app.quit()
  }

  // Handle app activation (e.g., clicking dock icon on macOS when no windows are open)
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = await createMainWindow(iconAsset)
      if (newWindow) {
        createTray(newWindow) // Re-initialize tray if it depends on the window
        // registerGlobalShortcutsForRows(); // Re-register if necessary
      }
    } else {
      getMainWindow()?.show() // Or focus existing window
      getMainWindow()?.focus()
    }
  })
})

// --- 3. App Quitting Logic ---
app.on('will-quit', () => {
  unregisterAllGlobalShortcutsApp()
  destroyTray()
  console.log('Main (index.ts): App is about to quit.')
})
