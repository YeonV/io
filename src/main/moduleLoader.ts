// src/main/moduleLoader.ts
import { ipcMain, type BrowserWindow } from 'electron'
import { getMainWindow, getStore } from './windowManager.js'
import { mainModuleHandlers } from '../renderer/src/modules/modules.main.js' // Path from out/main to out/renderer
import type { IOMainModulePart, Row } from '../shared/types.js'

export async function loadAndInitializeAllMainModules(): Promise<void> {
  console.log(
    `Main (moduleLoader): Initializing main module parts from generated renderer registry...`
  )
  const deps = { ipcMain, getMainWindow, getStore }

  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.initialize === 'function' && modulePart.moduleId) {
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
      console.warn(
        `Main (moduleLoader): Encountered an invalid entry in mainModuleHandlers:`,
        modulePart
      )
    }
  }
  console.log('Main (moduleLoader): Finished initializing main module parts.')
}

export async function cleanupAllMainModules(): Promise<void> {
  console.log('Main (moduleLoader): Cleaning up all main module parts...')
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.cleanup === 'function') {
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
  console.log('Main (moduleLoader): Notifying main module parts of row update...')
  const deps = { ipcMain, getMainWindow, getStore }
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.onRowsUpdated === 'function') {
      try {
        console.log(
          `Main (moduleLoader): Notifying ${modulePart.moduleId} of row update. Row count: ${Object.keys(rows).length}`
        )
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
