// src/main/api/homeAssistantRoutes.ts
import type { Express } from 'express'
import type { IpcMain } from 'electron'
import type Store from 'electron-store'

export function setupHomeAssistantRoutes(
  webapp: Express,
  storeInstance: Store,
  ipcMain: IpcMain // Pass ipcMain for emitting events
): void {
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
      res.json({ success: true, message: 'Action emitted: connect-mqtt' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
  webapp.post(`${haBaseApi}/action-disconnect-mqtt`, async (_req: any, res: any) => {
    try {
      ipcMain.emit('ha-disconnect-mqtt', {} as Electron.IpcMainEvent)
      res.json({ success: true, message: 'Action emitted: disconnect-mqtt' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
  webapp.post(`${haBaseApi}/action-register-device`, async (_req: any, res: any) => {
    try {
      ipcMain.emit('ha-register-device-web', {} as Electron.IpcMainEvent) // Using your -web suffixed channel
      res.json({ success: true, message: 'Action emitted: register-device' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
  webapp.post(`${haBaseApi}/action-unregister-device`, async (_req: any, res: any) => {
    try {
      ipcMain.emit('ha-unregister-device', {} as Electron.IpcMainEvent)
      res.json({ success: true, message: 'Action emitted: unregister-device' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
  webapp.post(`${haBaseApi}/action-expose-row`, async (req: any, res: any) => {
    const { rowId } = req.body
    if (!rowId) return res.status(400).json({ error: 'Missing rowId' })
    try {
      ipcMain.emit('ha-expose-row', {} as Electron.IpcMainEvent, rowId)
      res.json({ success: true, message: 'Action emitted: expose-row' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
  webapp.post(`${haBaseApi}/action-unexpose-row`, async (req: any, res: any) => {
    const { rowId } = req.body
    if (!rowId) return res.status(400).json({ error: 'Missing rowId' })
    try {
      ipcMain.emit('ha-unexpose-row', {} as Electron.IpcMainEvent, rowId)
      res.json({ success: true, message: 'Action emitted: unexpose-row' })
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
}
