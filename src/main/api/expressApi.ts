// src/main/api/expressApi.ts
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { type BrowserWindow, ipcMain } from 'electron'
import { getStore } from '../windowManager'
import { initializeSseEndpoint } from '../sseManager'
import { setupCoreRoutes } from './coreRoutes'
import { setupHomeAssistantRoutes } from './homeAssistantRoutes'

const currentModuleDir = dirname(fileURLToPath(import.meta.url))
const rendererBuildPath = join(currentModuleDir, '../renderer')

export async function startExpressApi(mainWindow: BrowserWindow | null): Promise<void> {
  if (!mainWindow) {
    console.error('Main (expressApi): Cannot start Express API, mainWindow is null.')
    return
  }
  const storeInstance = getStore()
  if (!storeInstance) {
    console.error('Main (expressApi): Cannot start Express API, store is null.')
    return
  }

  try {
    const express = (await import('express')).default
    const cors = (await import('cors')).default
    const webapp = express()

    webapp.use(cors())
    webapp.use(express.json())

    initializeSseEndpoint(webapp)

    setupCoreRoutes(webapp, storeInstance, mainWindow)
    setupHomeAssistantRoutes(webapp, storeInstance, ipcMain) // Pass ipcMain

    webapp.use('/', express.static(rendererBuildPath))
    webapp.use('/deck', express.static(rendererBuildPath))
    webapp.use('/integrations', express.static(rendererBuildPath))
    // webapp.get('/integrations/:integrationName', (_req: any, res: any) => {
    //   // Always serve the main index.html. React Router will handle the specific integration.
    //   res.sendFile(join(rendererBuildPath, 'index.html'))
    // })
    webapp.listen(1337, () => {
      console.log('Main (expressApi): Express server started on port 1337')
    })
  } catch (e: any) {
    console.error('Main (expressApi): Failed to start Express server', e.message, e.stack)
  }
}
