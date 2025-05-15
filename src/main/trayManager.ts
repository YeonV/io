// src/main/trayManager.ts
import { app, Menu, Tray, Notification, BrowserWindow } from 'electron'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pkg from '../../package.json' with { type: 'json' }

// ES Module equivalent for __dirname for resolving resources
const currentModuleDir = dirname(fileURLToPath(import.meta.url)) // out/main

let tray: Tray | null = null
const NOTIFICATION_TITLE = pkg.productName || 'IO'

function showTestNotification() {
  new Notification({
    title: NOTIFICATION_TITLE,
    body: 'Testing Notification from the Main process'
  }).show()
}

export function createTray(mainWindow: BrowserWindow | null): void {
  if (!mainWindow) {
    console.warn('Main (trayManager): Cannot create tray, mainWindow is null.')
    return
  }
  if (pkg.env.VITRON_TRAY && tray === null) {
    // Use a path relative to the built app structure
    const iconPath = app.isPackaged
      ? join(process.resourcesPath, 'icon.png') // Assuming icon.png in resources for packaged app
      : join(currentModuleDir, '../../resources/icon.png') // Relative from out/main to project_root/resources

    try {
      tray = new Tray(iconPath)
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Show', click: () => mainWindow.show() },
        { label: 'Minimize', click: () => mainWindow.minimize() },
        { label: 'Minimize to tray', click: () => mainWindow.hide() },
        { label: 'Test Notification', click: showTestNotification },
        { type: 'separator' },
        { label: 'DevTools', click: () => mainWindow.webContents.openDevTools() },
        { type: 'separator' },
        {
          label: `Restart ${pkg.productName || 'IO'}`,
          click: () => {
            app.relaunch()
            app.exit()
          }
        },
        { type: 'separator' },
        { label: 'Exit', click: () => app.quit() }
      ])
      tray.setToolTip(pkg.productName || 'IO')
      tray.setContextMenu(contextMenu)
      tray.setIgnoreDoubleClickEvents(true)
      tray.on('click', () => mainWindow.show())
      console.log('Main (trayManager): Tray initialized.')
    } catch (error) {
      console.error('Main (trayManager): Failed to create tray icon at path:', iconPath, error)
    }
  }
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
  console.log('Main (trayManager): Tray destroyed.')
}
