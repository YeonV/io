// src/main/index.ts
import { app, BrowserWindow } from 'electron'

import {
  performEarlyAppSetup,
  enforceSingleInstanceLock,
  initializeBaseAppLifecycleEvents
} from './appSetup'
import { createMainWindow, getMainWindow, loadElectronStore } from './windowManager'
import { createTray, destroyTray } from './trayManager'
// initializeIpcHandlers now only handles base IPCs like set/get, theme, app control
import { initializeBaseIpcHandlers } from './ipcManager'
import { startExpressApi } from './expressApi'
import { installDevTools } from './devtools'
// @ts-ignore
import iconAsset from '../../resources/icon.png?asset'

// Import the dynamic module loader for main process parts
import {
  loadAndInitializeAllMainModules,
  cleanupAllMainModules
  // notifyMainModulesOnRowsUpdate is called by ipcManager's 'set' handler
} from './moduleLoader'

performEarlyAppSetup()
enforceSingleInstanceLock()

app.whenReady().then(async () => {
  initializeBaseAppLifecycleEvents()

  await loadElectronStore()
  const mainWindowInstance = await createMainWindow(iconAsset)

  if (mainWindowInstance) {
    await installDevTools()
    createTray(mainWindowInstance)

    initializeBaseIpcHandlers() // Initialize base IPC (ping, set, get, theme, app control)
    // The 'set' handler will call notifyMainModulesOnRowsUpdate

    await loadAndInitializeAllMainModules() // This loads and initializes Keyboard.main, Alexa.main, Shell.main etc.

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

  app.on('activate', async () => {
    const currentMainWindow = getMainWindow()
    if (currentMainWindow) {
      currentMainWindow.show()
      currentMainWindow.focus()
    } else if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = await createMainWindow(iconAsset)
      if (newWindow) {
        createTray(newWindow)
        // Re-initialize main modules as they might depend on window/store which are fresh
        // Or ensure their internal logic correctly uses getMainWindow/getStore for fresh instances
        await loadAndInitializeAllMainModules()
      }
    }
  })
})

app.on('will-quit', async () => {
  await cleanupAllMainModules() // Calls cleanup on keyboard.main, alexa.main, etc.
  destroyTray()
  console.log('Main (index.ts): App is about to quit.')
})
