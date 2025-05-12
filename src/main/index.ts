import type { Row } from '../shared/types.js'
import { app, BrowserWindow, shell, ipcMain, nativeTheme, Tray, Menu, Notification } from 'electron'
import { release } from 'os'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import pkg from '../../package.json' with { type: 'json' }
import {
  installExtension,
  REDUX_DEVTOOLS
  // REACT_DEVELOPER_TOOLS
} from 'electron-devtools-installer'
import { setupTitlebar, attachTitlebarToWindow } from 'custom-electron-titlebar/main'
import { globalShortcut } from 'electron/main'

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let store: any = null
const registeredShortcuts = new Set<string>()

function registerGlobalShortcuts() {
  if (!store) {
    console.warn('Electron-store not initialized, cannot register shortcuts.')
    return
  }
  console.log('Attempting to register global shortcuts...')

  // 1. Unregister ALL previously registered shortcuts managed by this app
  //    This is simpler than tracking exact changes.
  console.log('Unregistering existing global shortcuts:', Array.from(registeredShortcuts))
  registeredShortcuts.forEach((accelerator) => {
    globalShortcut.unregister(accelerator)
  })
  registeredShortcuts.clear()

  // 2. Get current rows from store
  const rows: Record<string, Row> | undefined = store.get('rows')
  if (!rows) {
    console.log('No rows found in store.')
    return
  }

  // 3. Filter for keyboard input rows and register them
  Object.values(rows).forEach((row: Row) => {
    if (row.inputModule === 'keyboard-module' && row.input.data.value) {
      const accelerator = row.input.data.value // e.g., "ctrl+alt+y"
      const electronAccelerator = accelerator
        .split('+') // Split into parts
        .map((part) => {
          const lowerPart = part.toLowerCase()
          switch (lowerPart) {
            case 'ctrl':
              return 'Control' // Use 'Control', not 'CommandOrControl' unless needed for Mac only?
            case 'alt':
              return 'Alt'
            case 'shift':
              return 'Shift'
            case 'cmd':
              return 'Command' // Use 'Command' specifically for Mac Meta key
            case 'win':
              return 'Super' // Use 'Super' for Windows key
            case 'meta':
              return process.platform === 'darwin' ? 'Command' : 'Super' // Handle generic 'meta'
            case 'option':
              return 'Alt' // Map Mac 'option' to 'Alt'
            // Add mappings for space, arrow keys etc. if react-hotkeys-hook uses different names
            // case 'space': return 'Space';
            // case 'left': return 'Left';
            // ...
            default:
              return lowerPart.length === 1 ? lowerPart.toUpperCase() : part // Uppercase single chars (A-Z), keep others (F1, etc.)
          }
        })
        .join('+')
      console.log(`Attempting to register: ${electronAccelerator} for row ${row.id}`)

      try {
        const success = globalShortcut.register(electronAccelerator, () => {
          // --- THIS CALLBACK RUNS WHEN SHORTCUT IS PRESSED ---
          console.log(`Global shortcut pressed: ${electronAccelerator}, triggering row: ${row.id}`)
          // Send IPC message to Renderer
          mainWindow?.webContents.send('trigger-row', { id: row.id })
        })

        if (success) {
          console.log(`Successfully registered: ${electronAccelerator}`)
          registeredShortcuts.add(electronAccelerator) // Track successful registration
        } else {
          console.error(
            `Failed to register global shortcut: ${electronAccelerator}. Might be used by OS or another app.`
          )
          // Notify user? Maybe via a notification in renderer?
        }
      } catch (error) {
        console.error(`Error registering global shortcut ${electronAccelerator}:`, error)
      }
    }
  })
  console.log(
    'Finished registering global shortcuts. Currently active:',
    Array.from(registeredShortcuts)
  )
}

// Function to unregister all shortcuts on quit
function unregisterAllGlobalShortcuts() {
  console.log('Unregistering all global shortcuts before quit.')
  globalShortcut.unregisterAll()
  registeredShortcuts.clear()
}

async function loadElectronStore() {
  const { default: Store } = await import('electron-store')
  store = new Store()
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

if (pkg.env.VITRON_CUSTOM_TITLEBAR) setupTitlebar()

const RESOURCES_PATH = app.isPackaged
  ? join(process.resourcesPath, 'resources')
  : join(__dirname, '../../resources')

export function selectAppIcon(): string {
  switch (process.platform) {
    case 'win32':
      return join(RESOURCES_PATH, 'icon.ico')
    case 'darwin':
      return join(RESOURCES_PATH, 'icon.icns')
    default:
      return join(RESOURCES_PATH, 'icon.png')
  }
}

async function createWindow(): Promise<void> {
  await loadElectronStore() // Ensure store is loaded before creating the window

  let windowState = store?.get('windowState', undefined) as Electron.Rectangle | undefined
  if (!pkg.env.VITRON_SAVE_WINDOWSIZE) windowState = undefined

  mainWindow = new BrowserWindow({
    title: 'Vitron',
    show: false,
    autoHideMenuBar: true, // pkg.env.VITRON_CUSTOM_TITLEBAR,
    titleBarStyle: pkg.env.VITRON_CUSTOM_TITLEBAR ? 'hidden' : 'default',
    x: windowState?.x || 0,
    y: windowState?.y || 0,
    width: windowState?.width || 600,
    height: windowState?.height || 850,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    },
    icon: selectAppIcon()
  })

  mainWindow.on('close', () => {
    const windowState = mainWindow?.getBounds()
    if (pkg.env.VITRON_SAVE_WINDOWSIZE) store.set('windowState', windowState)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (pkg.env.VITRON_CUSTOM_TITLEBAR) attachTitlebarToWindow(mainWindow)

  mainWindow?.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow?.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })
}

const NOTIFICATION_TITLE = 'Vitron - by Blade'
const NOTIFICATION_BODY = 'Testing Notification from the Main process'

function showNotification() {
  new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

  if (!app.isPackaged) {
    await installExtension([REDUX_DEVTOOLS])
  }

  if (pkg.env.VITRON_TRAY && tray === null) {
    const icon = join(__dirname, '../../resources/icon.png')
    tray = new Tray(icon)

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click: () => mainWindow?.show() },
      { label: 'Minimize', click: () => mainWindow?.minimize() },
      { label: 'Minimize to tray', click: () => mainWindow?.hide() },
      { label: 'Test Notification', click: () => showNotification() },
      { label: 'separator', type: 'separator' },
      { label: 'Dev', click: () => mainWindow?.webContents.openDevTools() },
      { label: 'separator', type: 'separator' },
      {
        label: 'Restart io',
        click: () => {
          app.relaunch()
          app.exit()
        }
      },
      { label: 'separator', type: 'separator' },
      { label: 'Exit', click: () => app.quit() }
    ])
    tray.setToolTip('io by Blade')
    tray.setContextMenu(contextMenu)
    tray.setIgnoreDoubleClickEvents(true)
    tray.on('click', () => mainWindow?.show())
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  await createWindow()

  app.on('second-instance', () => {
    if (mainWindow) {
      // Focus on the main mainWindowdow if the user tried to open another
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  registerGlobalShortcuts()

  mainWindow?.webContents.once('did-finish-load', async function () {
    const express = await import('express')
    const webapp = express.default() // create express webapp
    const cors = await import('cors')

    webapp.use(cors.default())
    webapp.get('/rows', async (req: any, res: any) => {
      const rows: Record<string, Row> = await store.get('rows')
      // const filteredRows = Object.values(rows).filter(
      //   (row) => row.inputModule === 'keyboard-module'
      // )

      // console.log(
      //   'yz',
      //   filteredRows.map((r) => [
      //     r.input.data.value.replaceAll('ctrl', 'Control', 'alt', 'Alt'),
      //     r.output
      //   ])
      // )
      // globalShortcut.register('Alt+CommandOrControl+A', () => {
      //   fetch('http://192.168.1.170/win&A=~-20')
      // })
      // globalShortcut.register('Alt+CommandOrControl+S', () => {
      //   fetch('http://192.168.1.170/win&A=~20')
      // })
      if (req.query && req.query.id && req.query.update) {
        mainWindow?.webContents.send('update-row', {
          id: req.query.id,
          icon: decodeURIComponent(req.query.icon),
          label: decodeURIComponent(req.query.label),
          settings: {
            buttonColor: decodeURIComponent(req.query.buttonColor),
            iconColor: decodeURIComponent(req.query.iconColor),
            textColor: decodeURIComponent(req.query.textColor),
            variant: decodeURIComponent(req.query.variant)
          }
        })
        res.json(req.query)
      } else if (req.query && req.query.id) {
        mainWindow?.webContents.send('trigger-row', { id: req.query.id })
        res.json(req.query)
      } else {
        res.json(rows)
      }
    })
    webapp.get('/restart', async (req: any, res: any) => {
      res.json({ message: 'ok' })
      app.relaunch()
      app.exit()
    })

    // add middleware
    console.log('eyy', join(__dirname, '../renderer'))
    webapp.use('/', express.static(join(__dirname, '../renderer')))
    webapp.use('/deck', express.static(join(__dirname, '../renderer')))

    // start express server on port 1337
    webapp.listen(1337, () => {
      console.log('server started on port 1337')
    })
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  unregisterAllGlobalShortcuts()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('set', async (event, arg) => {
  const key = arg[0]
  const value = arg[1]
  console.log(`IPC 'set' received for key: ${key}`) // Add logging
  await store.set(key, value)

  // If the 'rows' key was updated, re-register shortcuts
  if (key === 'rows') {
    console.log("Rows updated via IPC 'set', re-registering global shortcuts.")
    registerGlobalShortcuts() // Re-run registration logic
  }
})

ipcMain.on('get', async (event, arg) => {
  const res = await store.get(arg)
  event.sender.send('get', res)
})
const wemore = await import('wemore')
const device = null as any
const emulatedDevices: Record<string, { instance: any; port: number; friendlyName: string }> = {}
let nextPort = 9001

function findNextAvailablePort(startPort: number): number {
  let port = startPort
  const usedPorts = Object.values(emulatedDevices).map((d) => d.port)
  while (usedPorts.includes(port)) {
    port++
    // Add a safety break?
    if (port > startPort + 100) {
      console.error('Could not find an available port after 100 attempts!')
      throw new Error('Port allocation failed')
    }
  }
  return port
}

// Function to stop and remove a specific emulated device
function stopEmulation(deviceName: string) {
  if (emulatedDevices[deviceName]) {
    try {
      // Wemore doesn't seem to have an explicit stop/close method in examples.
      // We might rely on garbage collection or look deeper into its API.
      // For now, just remove it from our tracking.
      console.log(
        `Stopping emulation tracking for ${deviceName} on port ${emulatedDevices[deviceName].port}`
      )
    } catch (err) {
      console.error(`Error stopping device ${deviceName}:`, err)
    }
    delete emulatedDevices[deviceName]
  }
}

ipcMain.on('emulate-alexa-devices', (event, desiredDeviceNames: string[]) => {
  console.log('IPC emulate-alexa-devices received. Desired:', desiredDeviceNames)

  const currentDeviceNames = Object.keys(emulatedDevices)

  // 1. Stop devices that are no longer desired
  const devicesToRemove = currentDeviceNames.filter((name) => !desiredDeviceNames.includes(name))
  devicesToRemove.forEach((name) => {
    stopEmulation(name)
  })

  // 2. Start new devices or update existing ones (if needed, though usually just start new)
  desiredDeviceNames.forEach((friendlyName) => {
    if (!emulatedDevices[friendlyName]) {
      // Device doesn't exist, create it
      try {
        const port = findNextAvailablePort(nextPort)
        nextPort = port + 1 // Increment for the next potential device

        console.log(`Attempting to emulate ${friendlyName} on port ${port}`)
        const device = wemore.Emulate({ friendlyName: friendlyName, port: port })

        device.on('listening', function () {
          console.log(`${friendlyName} emulated successfully on port ${port}`)
          // Store the instance and its details
          emulatedDevices[friendlyName] = {
            instance: device,
            port: port,
            friendlyName: friendlyName
          }
        })

        device.on('error', function (err: any) {
          console.error(`Error for ${friendlyName} on port ${port}:`, err)
          // Attempt cleanup if it failed to listen
          delete emulatedDevices[friendlyName] // Remove from tracking if error occurs early
          // Potentially try next port? Or just log error.
        })

        device.on('on', function (_self: any, _sender: any) {
          console.log(`WEMORE EVENT: ${friendlyName} received ON state. Timestamp: ${Date.now()}`)
          mainWindow?.webContents.send('alexa-device', { device: friendlyName, state: 'on' })
        })

        device.on('off', function (_self: any, _sender: any) {
          console.log(`WEMORE EVENT: ${friendlyName} received OFF state. Timestamp: ${Date.now()}`)
          mainWindow?.webContents.send('alexa-device', { device: friendlyName, state: 'off' })
        })
      } catch (error) {
        console.error(`Failed to start emulation for ${friendlyName}:`, error)
      }
    } else {
      console.log(`${friendlyName} is already being emulated.`)
      // Potentially update existing device if needed? Wemore API might not support easy updates.
    }
  })

  // Return status (sendSync requires a return value)
  event.returnValue = `[ipcMain] Emulation status updated. Active: ${Object.keys(emulatedDevices).join(', ')}`
})

process.on('uncaughtException', function (error) {
  // Handle the error
  if (!error.message.startsWith('listen EADDRINUSE: address already in use')) console.log(error)
})

ipcMain.on('run-shell', async (event, arg) => {
  const { exec } = await import('child_process')
  exec(arg, (error: any, stdout: any, stderr: any) => {
    if (error) {
      console.log(`error: ${error.message}`)
      return
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`)
      return
    }
    mainWindow?.webContents.send('run-shell-answer', { result: stdout })
    console.log(`stdout: ${stdout}`)
  })
  event.returnValue = `[ipcMain] "${arg}" received synchronously.`
})
ipcMain.on('ping-pong', async (event, arg) => {
  event.sender.send('ping-pong', `[ipcMain] "${arg}" received asynchronously.`)
})

ipcMain.on('ping-pong-sync', (event, arg) => {
  event.returnValue = `[ipcMain] "${arg}" received synchronously.`
})

ipcMain.on('get-darkmode', (event) => {
  event.returnValue = nativeTheme.shouldUseDarkColors ? 'yes' : 'no'
})

ipcMain.on('toggle-darkmode', (event) => {
  const res =
    nativeTheme.themeSource === 'system'
      ? nativeTheme.shouldUseDarkColors
        ? 'light'
        : 'dark'
      : nativeTheme.themeSource === 'dark'
        ? 'light'
        : 'dark'
  event.returnValue = res === 'dark'
  nativeTheme.themeSource = res
  mainWindow?.reload()
})
ipcMain.on('restart-app', (_event) => {
  // mainWindow?.reload()
  app.relaunch()
  app.exit()
})
