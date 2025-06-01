// src/main/integrationLoader.ts
import { ipcMain } from 'electron'
import { getMainWindow, getStore } from './windowManager'
import { broadcastSseEvent } from './sseManager' // Import it here
import {
  // initializeHomeAssistantIntegration,
  cleanupHomeAssistantIntegration
} from '../renderer/src/integrations/HomeAssistant/HomeAssistant.main' // We'll create this next
import { mainIntegrationHandlers } from '../renderer/src/integrations/integrations.main'

// Define a common structure for dependencies an integration might need
export interface MainIntegrationDeps {
  ipcMain: typeof Electron.ipcMain
  getMainWindow: () => Electron.BrowserWindow | null
  getStore: () => any // ElectronStore instance
  broadcastSseEvent: (eventData: { type: string; payload: any }) => void
}

// In the future, this could be an array of integration handlers like mainModuleHandlers
// For now, we directly call Home Assistant's functions

export async function loadAndInitializeAllMainIntegrations(): Promise<void> {
  console.debug('Main (integrationLoader): Loading and initializing all integrations...')

  const deps: MainIntegrationDeps = {
    ipcMain,
    getMainWindow,
    getStore,
    broadcastSseEvent
  }
  for (const integrationPart of mainIntegrationHandlers) {
    if (integrationPart && typeof integrationPart.initialize === 'function') {
      try {
        console.debug(
          `Main (integrationLoader): Initializing main part for integration ID: ${integrationPart.integrationId}`
        )
        await Promise.resolve(integrationPart.initialize(deps))
      } catch (e) {
        console.error('Main (integrationLoader): Error initializing Home Assistant integration', e)
      }
    }
  }

  // try {
  //   console.debug('Main (integrationLoader): Initializing Home Assistant integration...')
  //   await initializeHomeAssistantIntegration(deps)
  //   console.debug('Main (integrationLoader): Home Assistant integration initialized.')
  // } catch (e) {
  //   console.error('Main (integrationLoader): Error initializing Home Assistant integration', e)
  // }

  console.debug('Main (integrationLoader): Finished initializing main integration parts.')
}

export async function cleanupAllMainIntegrations(): Promise<void> {
  console.debug('Main (integrationLoader): Cleaning up all main integration parts...')

  try {
    console.debug('Main (integrationLoader): Cleaning up Home Assistant integration...')
    await cleanupHomeAssistantIntegration()
    console.debug('Main (integrationLoader): Home Assistant integration cleaned up.')
  } catch (e) {
    console.error('Main (integrationLoader): Error cleaning up Home Assistant integration', e)
  }
}

// This function could be used if an integration needs to react to row updates,
// similar to moduleLoader. Not strictly needed for HA V1 if registration is manual.
// export async function notifyMainIntegrationsOnRowsUpdate(rows: Record<string, Row>): Promise<void> {
//   // ...
// }
