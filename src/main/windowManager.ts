// src/main/windowManager.ts
import { join } from 'path'
import { app, BrowserWindow, shell } from 'electron'
import pkg from '../../package.json' with { type: 'json' } // Ensure your tsconfig.node.json allows this if "type": "module"
import { attachTitlebarToWindow, setupTitlebar } from 'custom-electron-titlebar/main'
import { is } from '@electron-toolkit/utils'

let _store: any = null // Internal variable for the electron-store instance
let _mainWindow: BrowserWindow | null = null // <<< CORRECTED: Must be 'let' to be reassigned

export async function loadElectronStore(): Promise<void> {
  if (_store) {
    console.log('Main (windowManager): Electron-store already loaded.')
    return
  }
  const { default: Store } = await import('electron-store')
  _store = new Store()
  console.log('Main (windowManager): Electron-store loaded.')
}

export function getStore(): any {
  if (!_store) {
    // This might happen if getStore is called before loadElectronStore in app.whenReady
    // Consider making loadElectronStore ensure it's called, or handle this more gracefully.
    console.warn('Main (windowManager): Store accessed before it was loaded!')
  }
  return _store
}

export function getMainWindow(): BrowserWindow | null {
  return _mainWindow
}

// RESOURCES_PATH should ideally be defined once, perhaps in a shared constants file or main index.
// For now, keeping it here as it's primarily used by selectAppIcon.
const RESOURCES_PATH = app.isPackaged
  ? join(process.resourcesPath, 'resources')
  : join(__dirname, '../../resources') // __dirname in out/main points to out/main

export function selectAppIcon(): string {
  // This function can be simplified if the `iconPath` passed to `createMainWindow`
  // from the Vite asset import (`?asset`) works reliably on all platforms.
  // Electron usually handles PNGs well for window icons.
  // This is more useful if you need specific .ico/.icns for other purposes.
  switch (process.platform) {
    case 'win32':
      return join(RESOURCES_PATH, 'icon.ico')
    case 'darwin':
      return join(RESOURCES_PATH, 'icon.icns')
    default:
      return join(RESOURCES_PATH, 'icon.png') // Default to PNG
  }
}

export async function createMainWindow(iconPath: string): Promise<BrowserWindow | null> {
  if (!_store) {
    console.log('Main (createMainWindow): Store not loaded, loading now...')
    await loadElectronStore() // Ensure store is loaded
  }

  if (pkg.env.VITRON_CUSTOM_TITLEBAR) {
    setupTitlebar() // Call this before BrowserWindow creation
  }

  let windowState = _store?.get('windowState', undefined) as Electron.Rectangle | undefined
  if (!pkg.env.VITRON_SAVE_WINDOWSIZE) windowState = undefined

  _mainWindow = new BrowserWindow({
    // Assign to the 'let' variable
    title: pkg.productName || 'IO',
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: pkg.env.VITRON_CUSTOM_TITLEBAR ? 'hidden' : 'default',
    x: windowState?.x,
    y: windowState?.y,
    width: windowState?.width || 900,
    height: windowState?.height || 670,
    icon: iconPath, // Use the asset path passed in
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'), // Relative from out/main/
      sandbox: false, // Be aware of security implications if true
      contextIsolation: true // Recommended for security
      // nodeIntegration: false, // Default and recommended
      // enableRemoteModule: false, // Default and recommended
    }
  })

  _mainWindow.on('close', () => {
    if (!_mainWindow) return // Should not happen if event fires
    const currentWindowState = _mainWindow.getBounds()
    if (pkg.env.VITRON_SAVE_WINDOWSIZE && _store) {
      _store.set('windowState', currentWindowState)
    }
  })

  _mainWindow.on('ready-to-show', () => {
    _mainWindow?.show()
  })

  if (pkg.env.VITRON_CUSTOM_TITLEBAR && _mainWindow) {
    attachTitlebarToWindow(_mainWindow)
  }

  _mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Load the renderer content
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log(`Main (createMainWindow): Loading dev URL: ${process.env['ELECTRON_RENDERER_URL']}`)
    _mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    const indexPath = join(__dirname, '../renderer/index.html') // Relative from out/main/
    console.log(`Main (createMainWindow): Loading file: ${indexPath}`)
    _mainWindow.loadFile(indexPath)
  }

  _mainWindow.webContents.on('did-finish-load', () => {
    _mainWindow?.webContents.send(
      'main-process-message',
      `Renderer loaded at: ${new Date().toLocaleString()}`
    )
  })

  console.log('Main (createMainWindow): Window created.')
  return _mainWindow
}
