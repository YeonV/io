// src/main/moduleLoader.ts
import { ipcMain, type BrowserWindow } from 'electron'
import { getMainWindow, getStore } from './windowManager'
import { mainModuleHandlers } from '../renderer/src/modules/modules.main'
import type { Row } from '../shared/types'

let currentActiveProfileForMain: { id: string | null; includedRowIds: string[] | null } = {
  id: null,
  includedRowIds: null // null means no profile active, empty array means profile active but no rows included
}

export interface MainModuleDeps {
  ipcMain: typeof Electron.ipcMain
  getMainWindow: () => BrowserWindow | null
  getStore: () => any
  // NEW: Pass current profile info
  activeProfileInfo: typeof currentActiveProfileForMain
}

export async function loadAndInitializeAllMainModules(): Promise<void> {
  ipcMain.on(
    'active-profile-changed-for-main',
    (_event, profileData: { activeProfileId: string | null; includedRowIds: string[] | null }) => {
      console.debug(`Main (moduleLoader): Received 'active-profile-changed-for-main'`, profileData)
      currentActiveProfileForMain = {
        id: profileData.activeProfileId,
        includedRowIds: profileData.includedRowIds
      }
      const storeInstance = getStore()
      const currentRows = storeInstance?.get('rows')
      if (currentRows) {
        console.debug('Main (moduleLoader): Profile changed, notifying modules with current rows.')
        notifyMainModulesOnRowsUpdate(currentRows)
      }
    }
  )

  const deps: Omit<MainModuleDeps, 'activeProfileInfo'> = { ipcMain, getMainWindow, getStore }

  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.initialize === 'function' && modulePart.moduleId) {
      try {
        console.debug(
          `Main (moduleLoader): Initializing main part for module ID: ${modulePart.moduleId}`
        )
        await Promise.resolve(
          modulePart.initialize({ ...deps, activeProfileInfo: currentActiveProfileForMain })
        )
      } catch (e) {
        console.error(
          `Main (moduleLoader): Error initializing main part for ${modulePart.moduleId}`,
          e
        )
      }
    } else if (modulePart && modulePart.moduleId) {
      console.debug(
        `Main (moduleLoader): Registered main part for module ID: ${modulePart.moduleId} (no initialize function).`
      )
    } else {
      console.warn(
        `Main (moduleLoader): Encountered an invalid entry in mainModuleHandlers:`,
        modulePart
      )
    }
  }
  console.debug('Main (moduleLoader): Finished initializing main module parts.')
}

export async function cleanupAllMainModules(): Promise<void> {
  console.debug('Main (moduleLoader): Cleaning up all main module parts...')
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.cleanup === 'function') {
      try {
        console.debug(
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
  console.debug('Main (moduleLoader): Notifying main module parts of row update...')
  const deps: MainModuleDeps = {
    ipcMain,
    getMainWindow,
    getStore,
    activeProfileInfo: currentActiveProfileForMain
  }
  for (const modulePart of mainModuleHandlers) {
    if (modulePart && typeof modulePart.onRowsUpdated === 'function') {
      try {
        console.debug(
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
