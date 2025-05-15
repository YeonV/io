// src/main/ipcManager.ts
import { ipcMain, nativeTheme, app } from 'electron'
import { getStore, getMainWindow } from './windowManager.js' // For store and window access
import { registerGlobalShortcutsForRows } from './globalShortcutManager.js' // To re-register on 'set' rows

// Module-specific imports will go here or in separate files
// import wemore from 'wemore' // Dynamic import for Alexa

// Alexa-specific state (can be moved to a dedicated alexaHandler.ts later)
const emulatedAlexaDevices: Record<string, { instance: any; port: number; friendlyName: string }> =
  {}
let nextAlexaPort = 9001

function findNextAvailableAlexaPort(startPort: number): number {
  let port = startPort
  const usedPorts = Object.values(emulatedAlexaDevices).map((d) => d.port)
  while (usedPorts.includes(port)) {
    port++
    if (port > startPort + 100) throw new Error('Alexa port allocation failed')
  }
  return port
}
function stopAlexaEmulation(deviceName: string) {
  if (emulatedAlexaDevices[deviceName]) {
    // wemore doesn't have an explicit stop, just remove from tracking.
    // The underlying server might eventually timeout or be garbage collected.
    console.log(`Main (ipcManager): Stopping Alexa emulation tracking for ${deviceName}`)
    delete emulatedAlexaDevices[deviceName]
  }
}

export function initializeIpcHandlers(): void {
  console.log('Main (ipcManager): Initializing IPC Handlers...')
  const currentMainWindow = getMainWindow() // Get instance for use in handlers
  const storeInstance = getStore()

  if (!currentMainWindow || !storeInstance) {
    console.error(
      'Main (ipcManager): Cannot initialize IPC handlers, main window or store not available.'
    )
    return
  }

  // --- Base IPC Handlers ---
  ipcMain.on('ping', () => console.log('Main (ipcManager): pong from renderer'))

  ipcMain.on('set', async (_event, arg) => {
    const key = arg[0]
    const value = arg[1]
    console.log(`Main (ipcManager) 'set': key: ${key}`)
    await storeInstance.set(key, value)
    if (key === 'rows') {
      console.log('Main (ipcManager): Rows updated, re-registering global shortcuts.')
      registerGlobalShortcutsForRows()
    }
  })

  ipcMain.on('get', async (event, arg) => {
    const res = await storeInstance.get(arg)
    event.sender.send('get', res)
  })

  // --- Module-Specific IPC Handlers ---
  // Alexa
  ipcMain.on('emulate-alexa-devices', async (event, desiredDeviceNames: string[]) => {
    const wemore = await import('wemore') // Ensure wemore is loaded
    console.log('Main (ipcManager) emulate-alexa-devices. Desired:', desiredDeviceNames)
    const currentDeviceNames = Object.keys(emulatedAlexaDevices)
    currentDeviceNames
      .filter((name) => !desiredDeviceNames.includes(name))
      .forEach(stopAlexaEmulation)

    desiredDeviceNames.forEach((friendlyName) => {
      if (!emulatedAlexaDevices[friendlyName]) {
        try {
          const port = findNextAvailableAlexaPort(nextAlexaPort)
          nextAlexaPort = port + 1
          const device = wemore.Emulate({ friendlyName, port })
          device.on('listening', () => {
            emulatedAlexaDevices[friendlyName] = { instance: device, port, friendlyName }
            console.log(`Main (ipcManager): Alexa ${friendlyName} emulated on port ${port}`)
          })
          device.on('error', (err: any) => {
            console.error(`Main (ipcManager): Alexa Error for ${friendlyName}:${port}:`, err)
            delete emulatedAlexaDevices[friendlyName]
          })
          device.on('on', () =>
            currentMainWindow.webContents.send('alexa-device', {
              device: friendlyName,
              state: 'on'
            })
          )
          device.on('off', () =>
            currentMainWindow.webContents.send('alexa-device', {
              device: friendlyName,
              state: 'off'
            })
          )
        } catch (e) {
          console.error(
            `Main (ipcManager): Failed to start Alexa emulation for ${friendlyName}:`,
            e
          )
        }
      }
    })
    event.returnValue = `Emulation status updated. Active: ${Object.keys(emulatedAlexaDevices).join(', ')}`
  })

  // Shell
  ipcMain.on('run-shell', async (event, arg) => {
    const { exec } = await import('child_process')
    exec(arg, (error, stdout, stderr) => {
      if (error) {
        console.log(`Main (ipcManager) Shell error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`Main (ipcManager) Shell stderr: ${stderr}`)
        return
      }
      currentMainWindow.webContents.send('run-shell-answer', { result: stdout })
    })
    event.returnValue = `Shell command "${arg}" received.`
  })

  // Dark Mode & App Control
  ipcMain.on('get-darkmode', (event) => {
    event.returnValue = nativeTheme.shouldUseDarkColors ? 'yes' : 'no'
  })
  ipcMain.on('toggle-darkmode', (event) => {
    const newTheme = nativeTheme.themeSource === 'dark' ? 'light' : 'dark'
    nativeTheme.themeSource = newTheme
    event.returnValue = newTheme === 'dark'
    currentMainWindow.reload()
  })
  ipcMain.on('restart-app', () => {
    app.relaunch()
    app.exit()
  })

  console.log('Main (ipcManager): All IPC Handlers initialized.')
}
