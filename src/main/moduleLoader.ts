// src/main/moduleLoader.ts
import { ipcMain, type BrowserWindow } from 'electron'
import { getMainWindow, getStore } from './windowManager.js'
// Path will be from out/main/moduleLoader.js to out/renderer/src/modules/modules.main.js
// This needs to be correct based on your build output structure.
// If Dummy.main.ts was successfully imported with '../../renderer/src/modules/Dummy/Dummy.main.js' from a test loader,
// then this path needs similar thinking.
// Let's assume Vite copies these .main.js files into out/main/renderer-modules/ or similar,
// OR that relative paths from out/main work into out/renderer.
// This is the TRICKIEST part for co-located main files.
// A common approach for electron-vite is that main process files stay in `out/main`
// and renderer files in `out/renderer`. Accessing `out/renderer` from `out/main` is `../renderer/`.
import { mainModuleHandlers } from '../renderer/src/modules/modules.main.js' // <<<< CRITICAL PATH
import type { Row } from '../shared/types.js' // Adjust path if needed

// Define the interface for what main module parts should export (could also be in @shared/types)
export interface IOMainModulePart {
  moduleId: string
  initialize?: (deps: {
    ipcMain: typeof Electron.ipcMain
    getMainWindow: () => BrowserWindow | null
    getStore: () => any
  }) => void | Promise<void>
  onRowsUpdated?: (
    rows: Record<string, Row>,
    deps: {
      ipcMain: typeof Electron.ipcMain
      getMainWindow: () => BrowserWindow | null
      getStore: () => any
    }
  ) => void | Promise<void>
  cleanup?: () => void | Promise<void>
}

export async function loadAndInitializeAllMainModules(): Promise<void> {
  console.log(`Main (moduleLoader): Initializing all main module parts from generated registry...`)
  const deps = { ipcMain, getMainWindow, getStore }

  for (const modulePart of mainModuleHandlers) {
    // Iterates over the imported array
    if (modulePart && modulePart.initialize && typeof modulePart.initialize === 'function') {
      try {
        console.log(
          `Main (moduleLoader): Initializing main part for module ID: ${modulePart.moduleId}`
        )
        await Promise.resolve(modulePart.initialize(deps))
      } catch (e) {
        console.error(
          `Main (moduleLoader): Error initializing main part for ${modulePart.moduleId}`,
          e
        )
      }
    } else if (modulePart && modulePart.moduleId) {
      console.log(
        `Main (moduleLoader): Registered main part for module ID: ${modulePart.moduleId} (no initialize function).`
      )
    } else {
      console.warn(`Main (moduleLoader): Encountered an invalid entry in mainModuleHandlers.`)
    }
  }
  console.log('Main (moduleLoader): Finished initializing main module parts.')
}

export async function cleanupAllMainModules(): Promise<void> {
  console.log('Main (moduleLoader): Cleaning up all main module parts...')
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && modulePart.cleanup && typeof modulePart.cleanup === 'function') {
      try {
        console.log(
          `Main (moduleLoader): Cleaning up main part for module ID: ${modulePart.moduleId}`
        )
        await Promise.resolve(modulePart.cleanup())
      } catch (e) {
        console.error(
          `Main (moduleLoader): Error cleaning up main part for ${modulePart.moduleId}`,
          e
        )
      }
    }
  }
}

export async function notifyMainModulesOnRowsUpdate(rows: Record<string, Row>): Promise<void> {
  // console.log("Main (moduleLoader): Notifying main module parts of row update...");
  const deps = { ipcMain, getMainWindow, getStore }
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && modulePart.onRowsUpdated && typeof modulePart.onRowsUpdated === 'function') {
      try {
        // console.log(`Main (moduleLoader): Notifying ${modulePart.moduleId} of row update.`);
        await Promise.resolve(modulePart.onRowsUpdated(rows, deps))
      } catch (e) {
        console.error(
          `Main (moduleLoader): Error notifying ${modulePart.moduleId} of row update:`,
          e
        )
      }
    }
  }
}
