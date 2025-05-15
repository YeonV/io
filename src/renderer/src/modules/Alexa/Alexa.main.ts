// src/main/modules/alexa.main.ts
import type { IpcMain, BrowserWindow } from 'electron'

// Define the interface for the dependencies this main part will receive
interface AlexaMainInitDeps {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
  // getStore?: () => any; // Not currently needed by Alexa main logic
}

// Module-specific state for Alexa emulation
const emulatedAlexaDevices: Record<string, { instance: any; port: number; friendlyName: string }> =
  {}
let nextAlexaPort = 9001 // Starting port for emulated devices

function findNextAvailableAlexaPort(startPort: number): number {
  let port = startPort
  const usedPorts = Object.values(emulatedAlexaDevices).map((d) => d.port)
  while (usedPorts.includes(port)) {
    port++
    if (port > startPort + 100) {
      // Safety break
      // mainLog.error("Could not find an available port for Alexa emulation after 100 attempts!");
      console.error(
        'Main (AlexaHandler): Could not find an available port for Alexa emulation after 100 attempts!'
      )
      throw new Error('Alexa port allocation failed')
    }
  }
  return port
}

function stopEmulationForDevice(deviceName: string) {
  const deviceEntry = emulatedAlexaDevices[deviceName]
  if (deviceEntry) {
    // mainLog.info(`Stopping emulation tracking for ${deviceName} on port ${deviceEntry.port}`);
    console.log(
      `Main (AlexaHandler): Stopping emulation tracking for ${deviceName} on port ${deviceEntry.port}`
    )
    // If wemore instance has a .stop() or .close() method, call it here:
    // deviceEntry.instance.stop?.(); // Example
    delete emulatedAlexaDevices[deviceName]
  }
}

// This function will be called by the mainModuleLoader
export function initialize(deps: AlexaMainInitDeps): void {
  const { ipcMain, getMainWindow } = deps
  // mainLog.info(`Initializing Alexa main process handler...`);
  console.log(`Main (AlexaHandler): Initializing Alexa main process handler...`)

  ipcMain.on('emulate-alexa-devices', async (event, desiredDeviceNames: string[]) => {
    // Using dynamic import for wemore as it's a larger dependency
    const wemore = (await import('wemore')).default // Access default export if needed

    // mainLog.info('IPC emulate-alexa-devices received. Desired:', desiredDeviceNames);
    console.log(
      'Main (AlexaHandler): IPC emulate-alexa-devices received. Desired:',
      desiredDeviceNames
    )

    const currentMainWindow = getMainWindow()
    if (!currentMainWindow) {
      // mainLog.error("Cannot emulate Alexa devices, main window not available.");
      console.error('Main (AlexaHandler): Cannot emulate Alexa devices, main window not available.')
      if (event.sender) {
        // Check if called via sendSync or invoke
        // For sendSync, event.returnValue must be set.
        // For invoke, this handler should be ipcMain.handle and return a Promise.
        // Since we changed renderer to use ipcRenderer.send, event.returnValue is not strictly needed
        // but setting it doesn't hurt if a sendSync call was still made.
        event.returnValue = 'Error: Main window not available for Alexa emulation.'
      }
      return
    }

    const currentEmulatedNames = Object.keys(emulatedAlexaDevices)

    // Stop devices that are no longer desired
    currentEmulatedNames
      .filter((name) => !desiredDeviceNames.includes(name))
      .forEach(stopEmulationForDevice)

    // Start new devices
    for (const friendlyName of desiredDeviceNames) {
      if (!emulatedAlexaDevices[friendlyName]) {
        try {
          const port = findNextAvailableAlexaPort(nextAlexaPort)
          nextAlexaPort = port + 1

          // mainLog.info(`Attempting to emulate ${friendlyName} on port ${port}`);
          console.log(`Main (AlexaHandler): Attempting to emulate ${friendlyName} on port ${port}`)
          const device = wemore.Emulate({ friendlyName: friendlyName, port: port })

          device.on('listening', () => {
            // mainLog.info(`${friendlyName} emulated successfully on port ${port}`);
            console.log(
              `Main (AlexaHandler): ${friendlyName} emulated successfully on port ${port}`
            )
            emulatedAlexaDevices[friendlyName] = {
              instance: device,
              port: port,
              friendlyName: friendlyName
            }
          })

          device.on('error', (err: any) => {
            // mainLog.error(`Error for Alexa device ${friendlyName} on port ${port}:`, err.message);
            console.error(
              `Main (AlexaHandler): Error for Alexa device ${friendlyName} on port ${port}:`,
              err.message
            )
            delete emulatedAlexaDevices[friendlyName] // Clean up failed attempt
          })

          device.on('on', () => {
            // mainLog.info(`WEMORE EVENT: ${friendlyName} received ON state.`);
            console.log(`Main (AlexaHandler): WEMORE EVENT: ${friendlyName} received ON state.`)
            currentMainWindow.webContents.send('alexa-device', {
              device: friendlyName,
              state: 'on'
            })
          })

          device.on('off', () => {
            // mainLog.info(`WEMORE EVENT: ${friendlyName} received OFF state.`);
            console.log(`Main (AlexaHandler): WEMORE EVENT: ${friendlyName} received OFF state.`)
            currentMainWindow.webContents.send('alexa-device', {
              device: friendlyName,
              state: 'off'
            })
          })
        } catch (error) {
          // mainLog.error(`Failed to start emulation for ${friendlyName}:`, error);
          console.error(
            `Main (AlexaHandler): Failed to start emulation for ${friendlyName}:`,
            error
          )
        }
      } else {
        // mainLog.info(`${friendlyName} is already being emulated.`);
        console.log(`Main (AlexaHandler): ${friendlyName} is already being emulated.`)
      }
    }
    // For sendSync, event.returnValue must be set.
    // If renderer uses ipcRenderer.send(), this isn't strictly needed for the renderer to proceed.
    if (event.sender) {
      // Check if called via sendSync or invoke to set returnValue
      event.returnValue = `[Main AlexaHandler] Emulation status updated. Active: ${Object.keys(emulatedAlexaDevices).join(', ')}`
    }
  })
  // mainLog.info("Alexa IPC handler ('emulate-alexa-devices') initialized.");
  console.log("Main (AlexaHandler): Alexa IPC handler ('emulate-alexa-devices') initialized.")
}

export function cleanup(): void {
  // mainLog.info("Cleaning up Alexa main process handler (stopping all emulations).");
  console.log(
    'Main (AlexaHandler): Cleaning up Alexa main process handler (stopping all emulations).'
  )
  Object.keys(emulatedAlexaDevices).forEach(stopEmulationForDevice)
}

// To match the IOMainModule structure for the loader
export const moduleId = 'alexa-module'

// Default export for simpler import in loader if preferred
export default {
  moduleId,
  initialize,
  cleanup
}
