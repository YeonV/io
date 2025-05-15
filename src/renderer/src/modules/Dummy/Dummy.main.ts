// src/renderer/src/modules/Dummy/Dummy.main.ts
import { ipcMain, type BrowserWindow } from 'electron' // Main process import

// Define an interface for the dependencies this main part might need
interface MainInitDeps {
  ipcMain: typeof Electron.ipcMain
  getMainWindow: () => BrowserWindow | null
  // getStore: () => any; // If needed
}

export const moduleId = 'dummy-module' // Match renderer module ID

export function initialize(deps: MainInitDeps): void {
  // Try to use a renderer util - THIS WILL LIKELY BE A PROBLEM
  // log.info1(`Dummy.main.ts: Initializing IPC for ${moduleId}`);
  console.log(`Dummy.main.ts: Initializing IPC for ${moduleId}`)

  deps.ipcMain.on('dummy-ping', (event, message) => {
    console.log(`Dummy.main.ts received sync ping: ${message}`)
    event.returnValue = 'Pong from Dummy Main (Sync)'
  })

  deps.ipcMain.handle('dummy-async-ping', async (_event, message) => {
    console.log(`Dummy.main.ts received async ping: ${message}`)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate async work
    return 'Pong from Dummy Main (Async)'
  })
}

export function cleanup(): void {
  console.log(`Dummy.main.ts: Cleaning up IPC for ${moduleId}`)
  ipcMain.removeHandler('dummy-async-ping')
  // For 'on', you need to store the listener function to remove it correctly,
  // or use removeAllListeners('dummy-ping'). For this test, we'll skip removal of 'on'.
}

// This structure matches a simplified IOMainModule concept
// export default { moduleId, initialize, cleanup }; // Optional default export
