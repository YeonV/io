// src/main/expressApi.ts
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { app, type BrowserWindow } from 'electron'
import type { Row } from '../shared/types.js'
import { getStore } from './windowManager.js' // For store access

const currentModuleDir = dirname(fileURLToPath(import.meta.url)) // out/main

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
    const express = await import('express')
    const webapp = express.default()
    const cors = await import('cors')

    webapp.use(cors.default())

    webapp.get('/rows', async (req: any, res: any) => {
      const rowsFromStore: Record<string, Row> | undefined = storeInstance.get('rows')
      if (req.query && req.query.id && req.query.update) {
        mainWindow.webContents.send('update-row', {
          id: req.query.id,
          icon: decodeURIComponent(req.query.icon || ''),
          label: decodeURIComponent(req.query.label || ''),
          settings: {
            buttonColor: decodeURIComponent(req.query.buttonColor || ''),
            iconColor: decodeURIComponent(req.query.iconColor || ''),
            textColor: decodeURIComponent(req.query.textColor || ''),
            variant: decodeURIComponent(req.query.variant || '')
          }
        })
        res.json(req.query)
      } else if (req.query && req.query.id) {
        mainWindow.webContents.send('trigger-row', { id: req.query.id })
        res.json(req.query)
      } else {
        res.json(rowsFromStore || {})
      }
    })

    webapp.get('/restart', async (_req: any, res: any) => {
      res.json({ message: 'ok' })
      app.relaunch() // 'app' needs to be imported from 'electron' here if not global
      app.exit()
    })

    // Serve static files for Deck UI
    // Ensure paths are correct relative to 'out/main' where this script runs
    webapp.use('/', express.static(join(currentModuleDir, '../renderer'))) // Serves main app (if needed by Deck)
    webapp.use('/deck', express.static(join(currentModuleDir, '../renderer'))) // Serves Deck (assumes Deck is part of main renderer build)

    webapp.listen(1337, () => {
      console.log('Main (expressApi): Express server started on port 1337')
    })
  } catch (e) {
    console.error('Main (expressApi): Failed to start Express server', e)
  }
}
