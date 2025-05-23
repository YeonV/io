// src/main/expressApi.ts
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { app, type BrowserWindow } from 'electron'
import type { ProfileDefinition, Row } from '../shared/types'
import { getStore } from './windowManager'
import { initializeSseEndpoint } from './sseManager'

const currentModuleDir = dirname(fileURLToPath(import.meta.url))

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
    webapp.use(express.json())

    initializeSseEndpoint(webapp)

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

    webapp.get('/api/profiles', async (_req, res) => {
      const storeInstance = getStore() // electron-store
      const profilesData = storeInstance?.get('profiles')
      console.log('Main (expressApi): Profiles data:', profilesData, storeInstance)
      res.json(Object.values(profilesData || {})) // Return array of profiles
    })

    webapp.get('/api/active-profile', async (_req, res) => {
      const storeInstance = getStore()
      const activeProfileId = storeInstance?.get('activeProfileId')
      console.log('Main (expressApi): Active profile ID:', activeProfileId)
      res.json({ activeProfileId: activeProfileId === undefined ? null : activeProfileId })
    })

    webapp.get('/api/rows', async (req: any, res: any) => {
      const storeInstance = getStore()
      const allRowsFromElectronStore: Record<string, Row> = storeInstance?.get('rows') || {}
      const requestedProfileId = req.query.profileId as string | undefined

      if (requestedProfileId && requestedProfileId !== 'none') {
        const profilesMap: Record<string, ProfileDefinition> = storeInstance?.get('profiles') || {}
        const targetProfile = profilesMap[requestedProfileId]
        if (targetProfile && Array.isArray(targetProfile.includedRowIds)) {
          const filteredRows = Object.fromEntries(
            Object.entries(allRowsFromElectronStore).filter(([rowId, _row]) =>
              targetProfile.includedRowIds.includes(rowId)
            )
          )
          return res.json(filteredRows)
        } else {
          return res.json({})
        }
      } else if (requestedProfileId === 'none') {
        const enabledRows = Object.fromEntries(
          Object.entries(allRowsFromElectronStore).filter(([_id, row]) => row.enabled)
        )
        return res.json(enabledRows)
      }
      res.json(allRowsFromElectronStore)
    })

    webapp.post('/api/profiles/activate', express.json(), async (req: any, res: any) => {
      const { profileId } = req.body
      console.log(`Main (expressApi): Received API request to activate profile: ${profileId}`)
      if (!mainWindow) return res.status(500).json({ error: 'Main window not available' })

      mainWindow.webContents.send('ipc-api-set-active-profile', profileId)
      res.json({ success: true, message: `Activation request for profile ${profileId} sent.` })
    })

    webapp.get('/restart', async (_req: any, res: any) => {
      res.json({ message: 'ok' })
      app.relaunch() // 'app' needs to be imported from 'electron' here if not global
      app.exit()
    })

    webapp.post('/api/rows/:rowId/update-display', express.json(), (req, res) => {
      const { rowId } = req.params
      const { icon, label } = req.body // These are strings

      if (!mainWindow) {
        res.status(500).json({ error: 'Main window not available' })
        return
      }

      const updatePayload: { rowId: string; icon?: string; label?: string } = { rowId }
      if (icon !== undefined) updatePayload.icon = icon
      if (label !== undefined) updatePayload.label = label

      if (Object.keys(updatePayload).length > 1) {
        // Ensure there's something to update besides rowId
        console.log(
          `Main (expressApi): IPC 'deck-update-row-display' for row ${rowId}`,
          updatePayload
        )
        mainWindow.webContents.send('deck-update-row-display', updatePayload)
        res.json({ success: true, message: 'Row display update request sent to renderer.' })
      } else {
        res.status(400).json({ error: 'No icon or label provided for update.' })
      }
    })

    // Optional NEW: Endpoint for Deck to backup its full tile overrides (x,y,w,h,colors,variant etc.)
    webapp.post('/api/deck/tile-override', express.json(), async (req, res): Promise<void> => {
      const { profileId, rowId, overrideData } = req.body
      if (!profileId || !rowId || !overrideData) {
        res.status(400).json({ error: 'Missing data for tile override' })
        return
      }
      const storeInstance = getStore()
      if (!storeInstance) {
        res.status(500).json({ error: 'Main store not available' })
        return
      }

      try {
        const allOverrides = storeInstance.get('deckTileOverrides', {}) as Record<
          string,
          Record<string, any>
        >
        if (!allOverrides[profileId]) {
          allOverrides[profileId] = {}
        }
        allOverrides[profileId][rowId] = overrideData
        await storeInstance.set('deckTileOverrides', allOverrides)
        console.log(`Main (expressApi): Saved Deck tile override for ${profileId}/${rowId}`)
        // Optionally broadcast an SSE if other Decks need to know about this backup change
        // broadcastSseUpdateSignal(`deckTileOverride:${profileId}:${rowId}`);
        res.json({ success: true })
        return
      } catch (error) {
        console.error('Main (expressApi): Error saving deck tile override', error)
        res.status(500).json({ error: 'Failed to save deck tile override' })
        return
      }
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
