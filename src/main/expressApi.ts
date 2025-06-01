// src/main/expressApi.ts
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { app, type BrowserWindow, ipcMain } from 'electron'
import type { ProfileDefinition, Row } from '../shared/types'
import { getStore } from './windowManager'
import { initializeSseEndpoint } from './sseManager'

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
      const store = getStore()
      const profilesData = store?.get('profiles')
      console.log('Main (expressApi): Profiles data:', profilesData, store)
      res.json(Object.values(profilesData || {}))
    })

    webapp.get('/api/active-profile', async (_req, res) => {
      const store = getStore()
      const activeProfileId = store?.get('activeProfileId')
      console.log('Main (expressApi): Active profile ID:', activeProfileId)
      res.json({ activeProfileId: activeProfileId === undefined ? null : activeProfileId })
    })

    webapp.get('/api/rows', async (req: any, res: any) => {
      const store = getStore()
      const allRowsFromElectronStore: Record<string, Row> = store?.get('rows') || {}
      const requestedProfileId = req.query.profileId as string | undefined
      if (requestedProfileId && requestedProfileId !== 'none') {
        const profilesMap: Record<string, ProfileDefinition> = store?.get('profiles') || {}
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
      app.relaunch()
      app.exit()
    })

    webapp.post('/api/rows/:rowId/update-display', express.json(), (req, res) => {
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
          `Main (expressApi): IPC 'deck-update-row-display' for row ${rowId}`,
          updatePayload
        )
        mainWindow.webContents.send('deck-update-row-display', updatePayload)
        res.json({ success: true, message: 'Row display update request sent to renderer.' })
      } else {
        res.status(400).json({ error: 'No icon or label provided for update.' })
      }
    })

    webapp.post('/api/deck/tile-override', express.json(), async (req, res): Promise<void> => {
      const { profileId, rowId, overrideData } = req.body
      if (!profileId || !rowId || !overrideData) {
        res.status(400).json({ error: 'Missing data for tile override' })
        return
      }
      const store = getStore()
      if (!store) {
        res.status(500).json({ error: 'Main store not available' })
        return
      }
      try {
        const allOverrides = store.get('deckTileOverrides', {}) as Record<
          string,
          Record<string, any>
        >
        if (!allOverrides[profileId]) {
          allOverrides[profileId] = {}
        }
        allOverrides[profileId][rowId] = overrideData
        await store.set('deckTileOverrides', allOverrides)
        console.log(`Main (expressApi): Saved Deck tile override for ${profileId}/${rowId}`)
        res.json({ success: true })
      } catch (error) {
        console.error('Main (expressApi): Error saving deck tile override', error)
        res.status(500).json({ error: 'Failed to save deck tile override' })
      }
    })

    const haBaseApi = '/api/integrations/home-assistant'

    webapp.get(`${haBaseApi}/config`, async (_req, res) => {
      try {
        const haConfigObject = storeInstance.get('integrationsHomeAssistantConfig')
        if (haConfigObject) {
          res.json(haConfigObject)
        } else {
          res.status(404).json({ error: 'Home Assistant config not found.' })
        }
      } catch (error: any) {
        res.status(500).json({ error: 'Failed to get HA config', details: error.message })
      }
    })

    webapp.post(`${haBaseApi}/config`, async (req: any, res: any) => {
      try {
        const newInnerConfig = req.body
        if (!newInnerConfig || typeof newInnerConfig.enabled === 'undefined') {
          return res.status(400).json({ error: 'Invalid config payload.' })
        }
        ipcMain.emit('update-home-assistant-config', {} as Electron.IpcMainEvent, newInnerConfig)
        res.json({ success: true, message: 'HA Config update event emitted.' })
      } catch (error: any) {
        res.status(500).json({ error: 'Failed to update HA config', details: error.message })
      }
    })

    webapp.get(`${haBaseApi}/status`, async (_req, res) => {
      try {
        const mqttConnected = storeInstance.get('integrations.homeAssistant.mqttConnected', false)
        const haRegistered = storeInstance.get('integrations.homeAssistant.haRegistered', false)
        res.json({ mqttConnected, haRegistered })
      } catch (error: any) {
        res.status(500).json({ error: 'Failed to get HA statuses', details: error.message })
      }
    })

    webapp.post(`${haBaseApi}/action-connect-mqtt`, async (_req: any, res: any) => {
      try {
        ipcMain.emit('ha-connect-mqtt', {} as Electron.IpcMainEvent)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })
    webapp.post(`${haBaseApi}/action-disconnect-mqtt`, async (_req: any, res: any) => {
      try {
        ipcMain.emit('ha-disconnect-mqtt', {} as Electron.IpcMainEvent)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })
    webapp.post(`${haBaseApi}/action-register-device`, async (_req: any, res: any) => {
      try {
        ipcMain.emit('ha-register-device', {} as Electron.IpcMainEvent)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })
    webapp.post(`${haBaseApi}/action-unregister-device`, async (_req: any, res: any) => {
      try {
        ipcMain.emit('ha-unregister-device', {} as Electron.IpcMainEvent)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })
    webapp.post(`${haBaseApi}/action-expose-row`, async (req: any, res: any) => {
      const { rowId } = req.body
      if (!rowId) return res.status(400).json({ error: 'Missing rowId' })
      try {
        ipcMain.emit('ha-expose-row', {} as Electron.IpcMainEvent, rowId)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })
    webapp.post(`${haBaseApi}/action-unexpose-row`, async (req: any, res: any) => {
      const { rowId } = req.body
      if (!rowId) return res.status(400).json({ error: 'Missing rowId' })
      try {
        ipcMain.emit('ha-unexpose-row', {} as Electron.IpcMainEvent, rowId)
        res.json({ success: true, message: 'Action emitted' })
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message })
      }
    })

    webapp.use('/', express.static(rendererBuildPath))
    webapp.use('/deck', express.static(rendererBuildPath))
    webapp.use('/integrations', express.static(rendererBuildPath))
    webapp.get('/integrations/:integrationName', (_req: any, res: any) => {
      // Always serve the main index.html. React Router will handle the specific integration.
      res.sendFile(join(rendererBuildPath, 'index.html'))
    })
    webapp.listen(1337, () => {
      console.log('Main (expressApi): Express server started on port 1337')
    })
  } catch (e: any) {
    console.error('Main (expressApi): Failed to start Express server', e.message, e.stack)
  }
}
