// src/renderer/src/integrations/HomeAssistant/HomeAssistant.main.ts
import type { MainIntegrationDeps } from '../../../../main/integrationLoader'
import type { Row } from '../../../../shared/types'
import Store from 'electron-store'
import mqtt from 'mqtt'
import pkg from '../../../../../package.json' with { type: 'json' }

export interface integrationsState {
  // This interface definition is fine here as per your structure
  homeAssistant: {
    config: {
      enabled: boolean
      mqttHost?: string
      mqttPort?: number
      mqttUsername?: string
      mqttPassword?: string
      discoveryPrefix?: string
      deviceName?: string
      ioInstanceId?: string
    }
    mqttConnected: boolean
    haRegistered: boolean
  }
  setHomeAssistantConfig: (config: integrationsState['homeAssistant']['config']) => void
}

let mqttClient: mqtt.MqttClient | null = null
let currentDeps: MainIntegrationDeps | null = null
let currentHaConfig: integrationsState['homeAssistant']['config'] | null = null
let isHaRegisteredWithMqtt = false

const MQTT_RECONNECT_PERIOD = 5000
const MQTT_CONNECT_TIMEOUT = 10000

function getHaConfigFromStore(store: Store): integrationsState['homeAssistant']['config'] | null {
  const mainStoreTyped = store as Store<
    Record<string, any> & {
      integrationsHomeAssistantConfig?: integrationsState['homeAssistant']['config']
    }
  >
  return mainStoreTyped.get('integrationsHomeAssistantConfig') || null
}

export async function initializeHomeAssistantIntegration(deps: MainIntegrationDeps): Promise<void> {
  console.log('HA Main: Initializing...')
  currentDeps = deps
  const store = deps.getStore()
  currentHaConfig = getHaConfigFromStore(store)

  if (currentHaConfig?.enabled && currentHaConfig.mqttHost && currentHaConfig.ioInstanceId) {
    connectToMqtt()
  } else {
    console.log('HA Main: Not enabled or core config missing. Standing by.')
  }

  deps.ipcMain.on(
    'update-home-assistant-config',
    (_event, newConfig: integrationsState['homeAssistant']['config']) => {
      console.log('HA Main: Config update from renderer.', newConfig)
      const oldConfig = { ...currentHaConfig }
      currentHaConfig = newConfig
      deps.getStore().set('integrationsHomeAssistantConfig', currentHaConfig) // Persist immediately

      if (newConfig.ioInstanceId && newConfig.ioInstanceId !== oldConfig?.ioInstanceId) {
        // No specific action needed here if mainStore handles persistence, but good to note
      }

      if (!newConfig.enabled) {
        if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
        disconnectFromMqtt()
      } else if (
        newConfig.enabled &&
        (newConfig.mqttHost !== oldConfig?.mqttHost ||
          newConfig.mqttPort !== oldConfig?.mqttPort ||
          newConfig.mqttUsername !== oldConfig?.mqttUsername ||
          newConfig.mqttPassword !== oldConfig?.mqttPassword ||
          !mqttClient ||
          (!mqttClient.connected && !mqttClient.reconnecting))
      ) {
        if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
        disconnectFromMqtt()
        if (newConfig.mqttHost && newConfig.ioInstanceId) connectToMqtt()
      }
    }
  )

  deps.ipcMain.handle('ha-connect-mqtt', async () => {
    if (!currentHaConfig?.mqttHost || !currentHaConfig?.ioInstanceId) {
      return { success: false, error: 'MQTT host or IO Instance ID missing.' }
    }
    if (mqttClient?.connected) return { success: true, message: 'Already connected.' }
    connectToMqtt()
    return { success: true }
  })

  deps.ipcMain.handle('ha-disconnect-mqtt', async () => {
    if (isHaRegisteredWithMqtt) await unregisterDeviceAndEntitiesInternalLogic()
    disconnectFromMqtt()
    return { success: true }
  })

  deps.ipcMain.handle('ha-register-device', () => registerDeviceAndEntities())
  deps.ipcMain.handle('ha-unregister-device', () => unregisterDeviceAndEntitiesInternalLogic())

  deps.ipcMain.handle('get-ha-statuses', async () => {
    const store = deps.getStore()
    return {
      mqttConnected: store.get('integrations.homeAssistant.mqttConnected', false),
      haRegistered: store.get('integrations.homeAssistant.haRegistered', false)
    }
  })
}

function connectToMqtt() {
  if (!currentDeps || !currentHaConfig?.mqttHost || !currentHaConfig?.ioInstanceId) {
    setConnectionStatusInStoreAndNotifyRenderer(false)
    return
  }
  if (mqttClient && (mqttClient.connected || mqttClient.reconnecting)) return

  console.log(`HA Main: Connecting to ${currentHaConfig.mqttHost}:${currentHaConfig.mqttPort}`)
  setConnectionStatusInStoreAndNotifyRenderer(false)

  const options: mqtt.IClientOptions = {
    host: currentHaConfig.mqttHost,
    port: currentHaConfig.mqttPort,
    protocol: 'mqtt',
    clientId: `io-hub-${currentHaConfig.ioInstanceId.substring(0, 8)}`,
    reconnectPeriod: MQTT_RECONNECT_PERIOD,
    connectTimeout: MQTT_CONNECT_TIMEOUT,
    clean: true
  }
  if (currentHaConfig.mqttUsername) options.username = currentHaConfig.mqttUsername
  if (currentHaConfig.mqttPassword) options.password = currentHaConfig.mqttPassword

  mqttClient = mqtt.connect(options)

  mqttClient.on('connect', () => {
    console.log('HA Main: MQTT Connected!')
    setConnectionStatusInStoreAndNotifyRenderer(true)
    if (isHaRegisteredWithMqtt) subscribeToExistingRowCommandTopics()
  })
  mqttClient.on('reconnect', () => {
    console.log('HA Main: MQTT Reconnecting...')
    setConnectionStatusInStoreAndNotifyRenderer(false)
  })
  mqttClient.on('error', (error) => console.error('HA Main: MQTT Error:', error.message))
  mqttClient.on('close', () => {
    console.log('HA Main: MQTT Closed.')
    setConnectionStatusInStoreAndNotifyRenderer(false)
  })
  mqttClient.on('offline', () => {
    console.log('HA Main: MQTT Offline.')
    setConnectionStatusInStoreAndNotifyRenderer(false)
  })
  mqttClient.on('message', handleMqttMessage)
}

function disconnectFromMqtt() {
  if (mqttClient) {
    mqttClient.end(true, () => console.log('HA Main: MQTT client ended.'))
    mqttClient = null
  }
  setConnectionStatusInStoreAndNotifyRenderer(false)
  setRegistrationStatusInStoreAndNotifyRenderer(false) // Assume unregistration on disconnect
  isHaRegisteredWithMqtt = false
}

function setConnectionStatusInStoreAndNotifyRenderer(isConnected: boolean) {
  currentDeps?.getStore().set('integrations.homeAssistant.mqttConnected', isConnected)
  currentDeps?.getMainWindow()?.webContents.send('ha-mqtt-connection-status-updated', isConnected)
}

function setRegistrationStatusInStoreAndNotifyRenderer(isRegistered: boolean) {
  currentDeps?.getStore().set('integrations.homeAssistant.haRegistered', isRegistered)
  currentDeps?.getMainWindow()?.webContents.send('ha-registration-status-updated', isRegistered)
}

function getDeviceConfigForHa(): any {
  if (!currentHaConfig || !currentHaConfig.ioInstanceId) {
    console.error('HA Main: ioInstanceId missing for HA device config.')
    return null
  }
  let configUrlString = `http://localhost:1337/integrations/home-assistant`
  try {
    const tempUrl = new URL(currentHaConfig.mqttHost || 'http://localhost')
    tempUrl.port = '1337'
    tempUrl.pathname = '/integrations/home-assistant'
    configUrlString = tempUrl.toString()
  } catch (e) {
    /* Use default */
  }

  return {
    identifiers: [`io_hub_${currentHaConfig.ioInstanceId}`], // This is the device's own unique ID
    name: currentHaConfig.deviceName || 'IO Hub',
    model: 'IO Automation Hub',
    manufacturer: 'YeonV/Blade',
    sw_version: pkg.version,
    configuration_url: configUrlString
  }
}

async function registerDeviceAndEntities(): Promise<{ success: boolean; error?: string }> {
  if (!mqttClient?.connected) return { success: false, error: 'MQTT client not connected.' }
  if (!currentHaConfig || !currentDeps || !currentHaConfig.ioInstanceId) {
    return { success: false, error: 'HA configuration or ioInstanceId missing.' }
  }

  const store = currentDeps.getStore()
  const rows = store.get('rows', {}) as Record<string, Row>
  const discoveryPrefix = currentHaConfig.discoveryPrefix || 'homeassistant'
  const deviceConfigPayload = getDeviceConfigForHa() // The device object for the JSON payload

  if (!deviceConfigPayload) return { success: false, error: 'Failed to generate HA device config.' }

  console.log('HA Main: Registering IO device with Home Assistant...')
  for (const rowId in rows) {
    const row = rows[rowId]
    if (!row?.output) continue

    // CORRECTED object_id: Directly use sanitized rowId as the object_id for the entity
    const sanitizedRowId = rowId.replace(/-/g, '_')
    const object_id = `io_row_${sanitizedRowId}` // Example: io_row_abc123_def456

    const configTopic = `${discoveryPrefix}/switch/${object_id}/config`
    const baseEntityTopic = `${discoveryPrefix}/switch/${object_id}` // For cmd_t, stat_t

    const friendlyName =
      row.output.label ||
      row.output.settings?.label ||
      row.output.data?.text ||
      (typeof row.output.data?.originalFileName === 'string'
        ? row.output.data.originalFileName.replace(/\.(mp3|wav|ogg|aac|m4a|flac)$/i, '')
        : '') ||
      row.output.name ||
      `IO Row ${rowId.substring(0, 4)}`

    const switchConfigPayload = {
      '~': baseEntityTopic, // Base topic for this entity
      name: friendlyName,
      // unique_id for HA: ensure it's globally unique. Prepending device identifier is good.
      unique_id: `${deviceConfigPayload.identifiers[0]}_${object_id}`,
      cmd_t: '~/set',
      stat_t: '~/state',
      payload_on: 'ON',
      payload_off: 'OFF',
      state_on: 'ON',
      state_off: 'OFF',
      optimistic: true,
      device: deviceConfigPayload, // Link to the main IO device
      // YOUR ICON LOGIC:
      icon:
        row.output.icon && row.output.icon.startsWith('mdi:')
          ? row.output.icon
          : 'mdi:flash-triangle-outline'
    }

    mqttClient.publish(configTopic, JSON.stringify(switchConfigPayload), { retain: true, qos: 1 })
    mqttClient.subscribe(`${baseEntityTopic}/set`, (err) => {
      if (err) console.error(`HA Main: Failed to subscribe to ${baseEntityTopic}/set`, err)
    })
    mqttClient.publish(`${baseEntityTopic}/state`, 'OFF', { retain: true, qos: 1 })
  }

  isHaRegisteredWithMqtt = true
  setRegistrationStatusInStoreAndNotifyRenderer(true)
  console.log('HA Main: Device and entities registration published.')
  return { success: true }
}

async function unregisterDeviceAndEntitiesInternalLogic(): Promise<{
  success: boolean
  error?: string
}> {
  if (!currentHaConfig || !currentDeps || !currentHaConfig.ioInstanceId) {
    return { success: false, error: 'HA config or ioInstanceId missing for unregistration.' }
  }

  const clientToUse = mqttClient // Prefer existing client, even if not connected, for publishing empty retained
  if (!clientToUse && !currentHaConfig.mqttHost) {
    console.warn('HA Main: No MQTT client and no host to create temp one for unregistration.')
    setRegistrationStatusInStoreAndNotifyRenderer(false)
    isHaRegisteredWithMqtt = false
    return { success: true, error: 'No MQTT client for unregistration.' }
  }

  let tempClient: mqtt.MqttClient | null = null
  if (!clientToUse) {
    // Create a temp client if main one doesn't exist
    const opts: mqtt.IClientOptions = {
      host: currentHaConfig.mqttHost,
      port: currentHaConfig.mqttPort,
      clientId: `io-hub-unregister-${Date.now()}`
    }
    if (currentHaConfig.mqttUsername) opts.username = currentHaConfig.mqttUsername
    if (currentHaConfig.mqttPassword) opts.password = currentHaConfig.mqttPassword
    tempClient = mqtt.connect(opts)
    tempClient.on('error', (e) => console.warn('HA Main: Temp unregister client error', e.message))
    console.log('HA Main: Using temporary client for unregistration messages.')
  }
  const effectiveClient = clientToUse || tempClient
  if (!effectiveClient) {
    // Should not happen if host is present
    setRegistrationStatusInStoreAndNotifyRenderer(false)
    isHaRegisteredWithMqtt = false
    return { success: false, error: 'Could not establish any client for unregistration.' }
  }

  console.log('HA Main: Unregistering IO device from Home Assistant...')
  const store = currentDeps.getStore()
  const rows = store.get('rows', {}) as Record<string, Row>
  const discoveryPrefix = currentHaConfig.discoveryPrefix || 'homeassistant'

  for (const rowId in rows) {
    const row = rows[rowId]
    if (!row) continue

    const sanitizedRowId = rowId.replace(/-/g, '_')
    const object_id = `io_row_${sanitizedRowId}`
    const configTopic = `${discoveryPrefix}/switch/${object_id}/config`
    const baseEntityTopic = `${discoveryPrefix}/switch/${object_id}`

    effectiveClient.publish(configTopic, '', { retain: true, qos: 1 }, (err) => {
      if (err) console.warn(`HA Main: Error unregistering ${object_id}`, err.message)
    })
    // Unsubscribe only if it's the main, connected client
    if (mqttClient?.connected && effectiveClient === mqttClient) {
      mqttClient.unsubscribe(`${baseEntityTopic}/set`)
    }
  }

  if (tempClient) tempClient.end(true)

  isHaRegisteredWithMqtt = false
  setRegistrationStatusInStoreAndNotifyRenderer(false)
  console.log('HA Main: Device and entities unregistration messages sent.')
  return { success: true }
}

function subscribeToExistingRowCommandTopics() {
  if (!mqttClient?.connected || !currentHaConfig || !currentDeps || !currentHaConfig.ioInstanceId)
    return

  const store = currentDeps.getStore()
  const rows = store.get('rows', {}) as Record<string, Row>
  const discoveryPrefix = currentHaConfig.discoveryPrefix || 'homeassistant'
  const deviceConfigPayload = getDeviceConfigForHa()
  if (!deviceConfigPayload) return

  for (const rowId in rows) {
    const row = rows[rowId]
    if (!row) continue

    const sanitizedRowId = rowId.replace(/-/g, '_')
    const object_id = `io_row_${sanitizedRowId}`
    const commandTopic = `${discoveryPrefix}/switch/${object_id}/set`

    mqttClient.subscribe(commandTopic, (err) => {
      if (err) console.error(`HA Main: Failed to re-subscribe to ${commandTopic}`, err)
    })
  }
}

function handleMqttMessage(topic: string, payloadBuffer: Buffer) {
  if (!currentDeps || !currentHaConfig?.ioInstanceId) return

  const payload = payloadBuffer.toString()
  const discoveryPrefix = currentHaConfig.discoveryPrefix || 'homeassistant'

  // Expected topic: homeassistant/switch/io_row_sanitizedid/set
  const parts = topic.split('/')
  if (
    parts.length === 4 && // discovery_prefix / component / object_id / command
    parts[0] === discoveryPrefix &&
    parts[1] === 'switch' &&
    parts[2].startsWith('io_row_') && // This is the object_id
    parts[3] === 'set'
  ) {
    const object_id = parts[2]
    const rowIdFromTopic = object_id.substring('io_row_'.length).replace(/_/g, '-')

    console.log(`HA Main: Command for row ${rowIdFromTopic} (${object_id}): ${payload}`)
    currentDeps.getMainWindow()?.webContents.send('trigger-row-from-main-ha', {
      rowId: rowIdFromTopic,
      command: payload
    })
  }
}

export async function cleanupHomeAssistantIntegration(): Promise<void> {
  console.log('HA Main: Cleaning up HA Integration...')
  if (isHaRegisteredWithMqtt) await unregisterDeviceAndEntitiesInternalLogic()
  disconnectFromMqtt()
  if (currentDeps) {
    currentDeps.ipcMain.removeHandler('ha-connect-mqtt')
    // ... remove all other handlers
    currentDeps.ipcMain.removeHandler('ha-disconnect-mqtt')
    currentDeps.ipcMain.removeHandler('ha-register-device')
    currentDeps.ipcMain.removeHandler('ha-unregister-device')
    currentDeps.ipcMain.removeHandler('get-ha-statuses')
    currentDeps.ipcMain.removeAllListeners('update-home-assistant-config')
  }
  console.log('HA Main: HA Integration cleanup complete.')
}
