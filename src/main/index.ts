import type { Row } from '../shared/types.js'
import { app, BrowserWindow, shell, ipcMain, nativeTheme, Tray, Menu, Notification } from 'electron'
import { release } from 'os'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import pkg from '../../package.json' with { type: 'json' }
import { installExtension, REDUX_DEVTOOLS } from 'electron-devtools-installer'
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

  console.log('Unregistering existing global shortcuts:', Array.from(registeredShortcuts))
  registeredShortcuts.forEach((accelerator) => {
    globalShortcut.unregister(accelerator)
  })
  registeredShortcuts.clear()

  const rows: Record<string, Row> | undefined = store.get('rows')
  if (!rows) {
    console.log('No rows found in store.')
    return
  }

  Object.values(rows).forEach((row: Row) => {
    if (row.inputModule === 'keyboard-module' && row.input.data.value) {
      const accelerator = row.input.data.value
      const electronAccelerator = accelerator
        .split('+')
        .map((part) => {
          const lowerPart = part.toLowerCase()
          switch (lowerPart) {
            case 'ctrl':
              return 'Control'
            case 'alt':
              return 'Alt'
            case 'shift':
              return 'Shift'
            case 'cmd':
              return 'Command'
            case 'win':
              return 'Super'
            case 'meta':
              return process.platform === 'darwin' ? 'Command' : 'Super'
            case 'option':
              return 'Alt'

            default:
              return lowerPart.length === 1 ? lowerPart.toUpperCase() : part
          }
        })
        .join('+')
      console.log(`Attempting to register: ${electronAccelerator} for row ${row.id}`)

      try {
        const success = globalShortcut.register(electronAccelerator, () => {
          console.log(`Global shortcut pressed: ${electronAccelerator}, triggering row: ${row.id}`)
          mainWindow?.webContents.send('trigger-row', { id: row.id })
        })

        if (success) {
          console.log(`Successfully registered: ${electronAccelerator}`)
          registeredShortcuts.add(electronAccelerator)
        } else {
          console.error(
            `Failed to register global shortcut: ${electronAccelerator}. Might be used by OS or another app.`
          )
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
  await loadElectronStore()

  let windowState = store?.get('windowState', undefined) as Electron.Rectangle | undefined
  if (!pkg.env.VITRON_SAVE_WINDOWSIZE) windowState = undefined

  mainWindow = new BrowserWindow({
    title: 'Vitron',
    show: false,
    autoHideMenuBar: true,
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
    webapp.get('/restart', async (_req: any, res: any) => {
      res.json({ message: 'ok' })
      app.relaunch()
      app.exit()
    })

    webapp.use('/', express.static(join(__dirname, '../renderer')))
    webapp.use('/deck', express.static(join(__dirname, '../renderer')))

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

ipcMain.on('set', async (_event, arg) => {
  const key = arg[0]
  const value = arg[1]
  console.log(`IPC 'set' received for key: ${key}`)
  await store.set(key, value)

  if (key === 'rows') {
    console.log("Rows updated via IPC 'set', re-registering global shortcuts.")
    registerGlobalShortcuts()
  }
})

ipcMain.on('get', async (event, arg) => {
  const res = await store.get(arg)
  event.sender.send('get', res)
})
const wemore = await import('wemore')
const emulatedDevices: Record<string, { instance: any; port: number; friendlyName: string }> = {}
let nextPort = 9001

function findNextAvailablePort(startPort: number): number {
  let port = startPort
  const usedPorts = Object.values(emulatedDevices).map((d) => d.port)
  while (usedPorts.includes(port)) {
    port++
    if (port > startPort + 100) {
      console.error('Could not find an available port after 100 attempts!')
      throw new Error('Port allocation failed')
    }
  }
  return port
}

function stopEmulation(deviceName: string) {
  if (emulatedDevices[deviceName]) {
    try {
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

  const devicesToRemove = currentDeviceNames.filter((name) => !desiredDeviceNames.includes(name))
  devicesToRemove.forEach((name) => {
    stopEmulation(name)
  })

  desiredDeviceNames.forEach((friendlyName) => {
    if (!emulatedDevices[friendlyName]) {
      try {
        const port = findNextAvailablePort(nextPort)
        nextPort = port + 1

        console.log(`Attempting to emulate ${friendlyName} on port ${port}`)
        const device = wemore.Emulate({ friendlyName: friendlyName, port: port })

        device.on('listening', function () {
          console.log(`${friendlyName} emulated successfully on port ${port}`)
          emulatedDevices[friendlyName] = {
            instance: device,
            port: port,
            friendlyName: friendlyName
          }
        })

        device.on('error', function (err: any) {
          console.error(`Error for ${friendlyName} on port ${port}:`, err)
          delete emulatedDevices[friendlyName]
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
    }
  })
  event.returnValue = `[ipcMain] Emulation status updated. Active: ${Object.keys(emulatedDevices).join(', ')}`
})

process.on('uncaughtException', function (error) {
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
  app.relaunch()
  app.exit()
})
