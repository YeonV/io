// src/main/api/coreRoutes.ts
import type { Express } from 'express'
import { app, type BrowserWindow } from 'electron'
import type Store from 'electron-store'
import type { ProfileDefinition, Row } from '../../shared/types'

export function setupCoreRoutes(
  webapp: Express,
  storeInstance: Store,
  mainWindow: BrowserWindow | null
): void {
  webapp.get('/rows', async (req: any, res: any) => {
    const rowsFromStore = storeInstance.get('rows') as Record<string, Row> | undefined
    if (req.query && req.query.id && req.query.update) {
      mainWindow?.webContents.send('update-row', {
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
      mainWindow?.webContents.send('trigger-row', { id: req.query.id })
      res.json(req.query)
    } else {
      res.json(rowsFromStore || {})
    }
  })

  webapp.get('/api/profiles', async (_req, res) => {
    const profilesData = storeInstance?.get('profiles')
    console.log('Main (coreRoutes): Profiles data:', profilesData)
    res.json(Object.values(profilesData || {}))
  })

  webapp.get('/api/active-profile', async (_req, res) => {
    const activeProfileId = storeInstance?.get('activeProfileId')
    console.log('Main (coreRoutes): Active profile ID:', activeProfileId)
    res.json({ activeProfileId: activeProfileId === undefined ? null : activeProfileId })
  })

  webapp.get('/api/rows', async (req: any, res: any) => {
    const allRowsFromElectronStore: Record<string, Row> =
      (storeInstance?.get('rows') as Record<string, Row>) || ({} as Record<string, Row>)
    const requestedProfileId = req.query.profileId as string | undefined
    if (requestedProfileId && requestedProfileId !== 'none') {
      const profilesMap: Record<string, ProfileDefinition> =
        (storeInstance?.get('profiles') as Record<string, ProfileDefinition>) ||
        ({} as Record<string, ProfileDefinition>)
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

  webapp.post('/api/profiles/activate', async (req: any, res: any) => {
    // Removed express.json() middleware here, apply globally
    const { profileId } = req.body
    console.log(`Main (coreRoutes): Received API request to activate profile: ${profileId}`)
    if (!mainWindow) return res.status(500).json({ error: 'Main window not available' })
    mainWindow.webContents.send('ipc-api-set-active-profile', profileId)
    res.json({ success: true, message: `Activation request for profile ${profileId} sent.` })
  })

  webapp.get('/restart', async (_req: any, res: any) => {
    res.json({ message: 'ok' })
    app.relaunch() // app needs to be imported from 'electron' if not already available
    app.exit()
  })

  webapp.post('/api/rows/:rowId/update-display', (req: any, res: any) => {
    // Removed express.json()
    const { rowId } = req.params
    const { icon, label } = req.body
    if (!mainWindow) {
      res.status(500).json({ error: 'Main window not available' })
      return
    }
    const updatePayload: { rowId: string; icon?: string; label?: string } = { rowId }
    if (icon !== undefined) updatePayload.icon = icon
    if (label !== undefined) updatePayload.label = label
    if (Object.keys(updatePayload).length > 1) {
      console.log(
        `Main (coreRoutes): IPC 'deck-update-row-display' for row ${rowId}`,
        updatePayload
      )
      mainWindow.webContents.send('deck-update-row-display', updatePayload)
      res.json({ success: true, message: 'Row display update request sent to renderer.' })
    } else {
      res.status(400).json({ error: 'No icon or label provided for update.' })
    }
  })

  webapp.post('/api/deck/tile-override', async (req: any, res: any): Promise<void> => {
    // Removed express.json()
    const { profileId, rowId, overrideData } = req.body
    if (!profileId || !rowId || !overrideData) {
      res.status(400).json({ error: 'Missing data for tile override' })
      return
    }
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
      await storeInstance.set('deckTileOverrides', allOverrides) // Assuming set can be awaited if electron-store supports it
      console.log(`Main (coreRoutes): Saved Deck tile override for ${profileId}/${rowId}`)
      res.json({ success: true })
    } catch (error) {
      console.error('Main (coreRoutes): Error saving deck tile override', error)
      res.status(500).json({ error: 'Failed to save deck tile override' })
    }
  })
}
