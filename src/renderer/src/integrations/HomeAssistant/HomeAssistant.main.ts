// src/renderer/src/integrations/HomeAssistant/HomeAssistant.main.ts
import type { MainIntegrationDeps } from '../../../../main/integrationLoader'
import type { Row, ProfileDefinition } from '../../../../shared/types'
import Store from 'electron-store'
import mqtt from 'mqtt'
import pkg from '../../../../../package.json' with { type: 'json' }
import { IOMainIntegrationPart } from '@shared/integration-types'
import type { integrationsState } from './HomeAssistant.types'

const homeAssistantMainPart: IOMainIntegrationPart = {
  integrationId: 'home-assistant',
  initialize: initializeHomeAssistantIntegration,
  cleanup: cleanupHomeAssistantIntegration
}

let mqttClient: mqtt.MqttClient | null = null
let currentDeps: MainIntegrationDeps | null = null
let currentHaConfig: integrationsState['homeAssistant'] | null = null
let isHaRegisteredWithMqtt = false

const MQTT_RECONNECT_PERIOD = 5000
const MQTT_CONNECT_TIMEOUT = 10000
const PROFILE_SELECTOR_OBJECT_ID = 'io_profile_selector'
const NO_PROFILE_ACTIVE_HA_OPTION = 'None (All Rows Active)'

let currentActiveProfileInfo: { id: string | null; includedRowIds: string[] | null } = {
  id: null,
  includedRowIds: null
}
const currentlyRegisteredHaEntities = new Set<string>()

export function updateHaConfigFromExternal(
  newInnerConfig: integrationsState['homeAssistant']['config']
) {
  console.log('HA Main: Processing direct config update (from Express/internal).', newInnerConfig)

  if (!currentDeps || !currentHaConfig) {
    console.error(
      'HA Main: updateHaConfigFromExternal called before initialization or currentHaConfig is null.'
    )
    if (currentDeps && !currentHaConfig) {
      currentHaConfig = getHaConfigFromStore(currentDeps.getStore())
    }
    if (!currentHaConfig) return
  }

  const oldInnerConfig = { ...currentHaConfig.config }

  currentHaConfig.config = { ...currentHaConfig.config, ...newInnerConfig }

  if (currentHaConfig.config && !Array.isArray(currentHaConfig.config.exposedRowIds)) {
    currentHaConfig.config.exposedRowIds = []
  }

  currentDeps?.getStore().set('integrationsHomeAssistantConfig', currentHaConfig.config)

  if (!currentHaConfig.config.enabled) {
    if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
    disconnectFromMqtt()
  } else if (
    currentHaConfig.config.enabled &&
    (currentHaConfig.config.mqttHost !== oldInnerConfig?.mqttHost ||
      currentHaConfig.config.mqttPort !== oldInnerConfig?.mqttPort ||
      currentHaConfig.config.mqttUsername !== oldInnerConfig?.mqttUsername ||
      currentHaConfig.config.mqttPassword !== oldInnerConfig?.mqttPassword ||
      !mqttClient ||
      (!mqttClient.connected && !mqttClient.reconnecting))
  ) {
    if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
    disconnectFromMqtt()
    if (currentHaConfig.config.mqttHost && currentHaConfig.config.ioInstanceId) connectToMqtt()
  }
}

function getProfileOptionsForHa(store: Store): string[] {
  const profilesMap = store.get('profiles', {}) as Record<string, ProfileDefinition>
  const profileNames = Object.values(profilesMap).map((p) => p.name)
  return [NO_PROFILE_ACTIVE_HA_OPTION, ...profileNames]
}

function publishProfileSelectorState(activeProfileId: string | null, store: Store) {
  if (!mqttClient?.connected || !currentHaConfig?.config || !isHaRegisteredWithMqtt) return

  const profilesMap = store.get('profiles', {}) as Record<string, ProfileDefinition>
  let activeProfileName = NO_PROFILE_ACTIVE_HA_OPTION
  if (activeProfileId && profilesMap[activeProfileId]) {
    activeProfileName = profilesMap[activeProfileId].name
  }

  const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'
  const deviceConfigPayload = getDeviceConfigForHa()
  if (!deviceConfigPayload) return

  const stateTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/state`
  mqttClient.publish(stateTopic, activeProfileName, { retain: true, qos: 1 })
  console.log(`HA Main: Published profile selector state: ${activeProfileName}`)
}

function getHaConfigFromStore(store: Store): integrationsState['homeAssistant'] {
  const mainStoreTyped = store as Store<
    Record<string, any> & {
      integrationsHomeAssistantConfig?: integrationsState['homeAssistant']['config']
      'integrations.homeAssistant.exposedRowIds'?: string[]
    }
  >
  const persistedInnerConfig = mainStoreTyped.get('integrationsHomeAssistantConfig')

  const fullHaStateSlice: integrationsState['homeAssistant'] = {
    config: {
      enabled: false,
      mqttHost: '',
      mqttPort: 1883,
      discoveryPrefix: 'homeassistant',
      deviceName: 'IO Hub',
      ioInstanceId: '',
      exposedRowIds: []
    },
    mqttConnected: store.get('integrations.homeAssistant.mqttConnected', false) as boolean,
    haRegistered: store.get('integrations.homeAssistant.haRegistered', false) as boolean
  }

  if (persistedInnerConfig) {
    fullHaStateSlice.config = { ...fullHaStateSlice.config, ...persistedInnerConfig }
    if (!Array.isArray(fullHaStateSlice.config.exposedRowIds)) {
      fullHaStateSlice.config.exposedRowIds = []
    }
  }

  const persistedTopLevelExposedRowIds = store.get('integrations.homeAssistant.exposedRowIds')
  if (Array.isArray(persistedTopLevelExposedRowIds)) {
    fullHaStateSlice.config.exposedRowIds = persistedTopLevelExposedRowIds
  }

  isHaRegisteredWithMqtt = fullHaStateSlice.haRegistered

  return fullHaStateSlice
}

export async function initializeHomeAssistantIntegration(deps: MainIntegrationDeps): Promise<void> {
  console.log('HA Main: Initializing...')
  currentDeps = deps
  const store = deps.getStore()
  currentHaConfig = getHaConfigFromStore(store)

  if (
    currentHaConfig &&
    currentHaConfig.config &&
    !Array.isArray(currentHaConfig.config.exposedRowIds)
  ) {
    currentHaConfig.config.exposedRowIds = []
    store.set('integrationsHomeAssistantConfig.exposedRowIds', [])
  }
  if (currentHaConfig && !Array.isArray(currentHaConfig.config.exposedRowIds)) {
    currentHaConfig.config.exposedRowIds = []
    store.set('integrations.homeAssistant.exposedRowIds', [])
  }

  if (currentHaConfig?.config.ioInstanceId) {
    const currentPersistedInnerConfig = store.get('integrationsHomeAssistantConfig')
    if (
      !currentPersistedInnerConfig ||
      currentPersistedInnerConfig.ioInstanceId !== currentHaConfig.config.ioInstanceId
    ) {
      store.set('integrationsHomeAssistantConfig', currentHaConfig.config)
    }
    const currentPersistedExposedRowIds = store.get('integrations.homeAssistant.exposedRowIds')
    if (!Array.isArray(currentPersistedExposedRowIds)) {
      store.set('integrations.homeAssistant.exposedRowIds', currentHaConfig.config.exposedRowIds)
    }
  }

  if (
    currentHaConfig?.config.enabled &&
    currentHaConfig.config.mqttHost &&
    currentHaConfig.config.ioInstanceId
  ) {
    connectToMqtt()
  } else {
    console.log('HA Main: Not enabled or core config missing.')
  }

  deps.ipcMain.on(
    'update-home-assistant-config',
    (_event, newHaSliceFromRenderer: integrationsState['homeAssistant']) => {
      console.log(
        'HA Main: Received full HA slice update from renderer via IPC.',
        newHaSliceFromRenderer
      )
      const oldInnerConfig = { ...currentHaConfig?.config }

      if (!currentHaConfig) currentHaConfig = getHaConfigFromStore(deps.getStore())

      if (newHaSliceFromRenderer.config) {
        currentHaConfig!.config = { ...currentHaConfig!.config, ...newHaSliceFromRenderer.config }
      }
      if (!Array.isArray(currentHaConfig!.config.exposedRowIds)) {
        // Ensure it's an array inside config
        currentHaConfig!.config.exposedRowIds = []
      }

      if (Array.isArray(newHaSliceFromRenderer.config.exposedRowIds)) {
        // Update top-level
        currentHaConfig!.config.exposedRowIds = newHaSliceFromRenderer.config.exposedRowIds
      } else {
        currentHaConfig!.config.exposedRowIds = []
      }

      deps.getStore().set('integrationsHomeAssistantConfig', currentHaConfig!.config)
      deps
        .getStore()
        .set('integrations.homeAssistant.exposedRowIds', currentHaConfig!.config.exposedRowIds)

      if (!currentHaConfig!.config.enabled) {
        if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
        disconnectFromMqtt()
      } else if (
        currentHaConfig!.config.enabled &&
        (currentHaConfig!.config.mqttHost !== oldInnerConfig?.mqttHost ||
          currentHaConfig!.config.mqttPort !== oldInnerConfig?.mqttPort ||
          currentHaConfig!.config.mqttUsername !== oldInnerConfig?.mqttUsername ||
          currentHaConfig!.config.mqttPassword !== oldInnerConfig?.mqttPassword ||
          !mqttClient ||
          (!mqttClient.connected && !mqttClient.reconnecting))
      ) {
        if (isHaRegisteredWithMqtt) unregisterDeviceAndEntitiesInternalLogic()
        disconnectFromMqtt()
        if (currentHaConfig!.config.mqttHost && currentHaConfig!.config.ioInstanceId)
          connectToMqtt()
      }
    }
  )

  deps.ipcMain.on('ha-connect-mqtt', async () => {
    if (!currentHaConfig?.config.mqttHost || !currentHaConfig?.config.ioInstanceId) {
      return { success: false, error: 'MQTT host or IO Instance ID missing.' }
    }
    if (mqttClient?.connected) return { success: true, message: 'Already connected.' }
    connectToMqtt()
    return { success: true }
  })

  deps.ipcMain.on('ha-disconnect-mqtt', async () => {
    if (isHaRegisteredWithMqtt) await unregisterDeviceAndEntitiesInternalLogic()
    disconnectFromMqtt()
    return { success: true }
  })

  deps.ipcMain.on('ha-register-device-web', () => registerDeviceAndEntities())
  deps.ipcMain.on('ha-unregister-device', () => unregisterDeviceAndEntitiesInternalLogic())
  deps.ipcMain.handle('ha-connect-mqtt', async () => {
    if (!currentHaConfig?.config.mqttHost || !currentHaConfig?.config.ioInstanceId) {
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

  deps.ipcMain.on('ha-expose-row', async (_event, rowId: string) => {
    if (!isHaRegisteredWithMqtt && currentHaConfig?.config.enabled && mqttClient?.connected) {
      console.warn(`HA Main: Exposing row ${rowId} individually.`)
    } else if (!mqttClient?.connected || !currentHaConfig?.config.enabled) {
      return { success: false, error: 'MQTT not connected or HA integration not enabled.' }
    }
    return registerSingleRowEntityInHa(rowId)
  })

  deps.ipcMain.on('ha-unexpose-row', async (_event, rowId: string) => {
    return unregisterSingleRowEntityFromHa(rowId)
  })

  deps.ipcMain.on(
    'active-profile-changed-for-main',
    (_event, profileInfo: { activeProfileId: string | null; includedRowIds: string[] | null }) => {
      console.log('HA Main: Received active profile change IPC:', profileInfo)
      const oldActiveProfileId = currentActiveProfileInfo.id
      currentActiveProfileInfo = {
        id: profileInfo.activeProfileId,
        includedRowIds: profileInfo.includedRowIds
      }

      if (isHaRegisteredWithMqtt && mqttClient?.connected && currentHaConfig?.config.enabled) {
        console.log('HA Main: Conditions met, calling updateHaEntitiesForCurrentProfile().')
        updateHaEntitiesForCurrentProfile()
        if (oldActiveProfileId !== profileInfo.activeProfileId) {
          publishProfileSelectorState(profileInfo.activeProfileId, deps.getStore())
        }
      } else {
        console.log('HA Main: Profile changed, but conditions not met for HA entity update.', {
          isHaRegisteredWithMqtt,
          isMqttConnected: mqttClient?.connected,
          isHaConfigEnabled: currentHaConfig?.config.enabled
        })
      }
    }
  )
}

function connectToMqtt() {
  if (!currentDeps || !currentHaConfig?.config.mqttHost || !currentHaConfig?.config.ioInstanceId) {
    console.error(
      'HA Main: connectToMqtt PRE-CHECK FAIL - Dependencies or critical HA config missing.',
      {
        hasCurrentDeps: !!currentDeps,
        configExists: !!currentHaConfig?.config,
        host: currentHaConfig?.config?.mqttHost,
        instanceId: currentHaConfig?.config?.ioInstanceId
      }
    )
    setConnectionStatusInStoreAndNotifyRenderer(false)
    return
  }
  if (mqttClient && (mqttClient.connected || mqttClient.reconnecting)) {
    console.log('HA Main: connectToMqtt - MQTT client already connected or connecting.')
    return
  }

  const host = currentHaConfig.config.mqttHost
  const port = currentHaConfig.config.mqttPort
  const clientId = `io-hub-${currentHaConfig.config.ioInstanceId.substring(0, 8)}`
  const username = currentHaConfig.config.mqttUsername

  console.log(
    `HA Main: Attempting to connect to MQTT Broker with options:`,
    JSON.stringify(
      {
        host,
        port,
        protocol: 'mqtt',
        clientId,
        username: username || '(none)',
        reconnectPeriod: MQTT_RECONNECT_PERIOD,
        connectTimeout: MQTT_CONNECT_TIMEOUT,
        clean: true
      },
      null,
      2
    )
  )
  setConnectionStatusInStoreAndNotifyRenderer(false)

  const options: mqtt.IClientOptions = {
    host: host,
    port: port,
    protocol: 'mqtt',
    clientId: clientId,
    reconnectPeriod: MQTT_RECONNECT_PERIOD,
    connectTimeout: MQTT_CONNECT_TIMEOUT,
    clean: true
  }
  if (username) {
    options.username = username
    if (currentHaConfig.config.mqttPassword) options.password = currentHaConfig.config.mqttPassword
  }
  if (mqttClient) mqttClient.removeAllListeners()
  mqttClient = mqtt.connect(options)

  mqttClient.on('connect', () => {
    console.log(
      `HA Main: MQTT Connected successfully to ${host}:${port} with client ID ${clientId}!`
    )
    setConnectionStatusInStoreAndNotifyRenderer(true)
    if (currentHaConfig?.config.enabled && currentHaConfig?.haRegistered) {
      updateHaEntitiesForCurrentProfile()
    }
  })
  mqttClient.on('reconnect', () => {
    console.log(`HA Main: MQTT Reconnecting to ${host}:${port}...`)
    setConnectionStatusInStoreAndNotifyRenderer(false)
  })
  mqttClient.on('error', (error: Error) => {
    console.error(
      `HA Main: MQTT Connection Error for ${host}:${port} (ClientID: ${clientId}):`,
      error.message,
      error
    )
  })
  mqttClient.on('close', () => {
    console.log(`HA Main: MQTT Connection Closed for ${host}:${port} (ClientID: ${clientId}).`)
    setConnectionStatusInStoreAndNotifyRenderer(false)
  })
  mqttClient.on('offline', () => {
    console.log(`HA Main: MQTT Client Offline for ${host}:${port} (ClientID: ${clientId}).`)
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
}

function setConnectionStatusInStoreAndNotifyRenderer(isConnected: boolean) {
  currentDeps?.getStore().set('integrations.homeAssistant.mqttConnected', isConnected)
  if (currentHaConfig) currentHaConfig.mqttConnected = isConnected
  currentDeps?.getMainWindow()?.webContents.send('ha-mqtt-connection-status-updated', isConnected)
  if (currentDeps?.broadcastSseEvent) {
    currentDeps.broadcastSseEvent({
      type: 'ha-mqtt-connection-status-updated',
      payload: isConnected
    })
  }
}

function setRegistrationStatusInStoreAndNotifyRenderer(isRegistered: boolean) {
  currentDeps?.getStore().set('integrations.homeAssistant.haRegistered', isRegistered)
  if (currentHaConfig) currentHaConfig.haRegistered = isRegistered
  isHaRegisteredWithMqtt = isRegistered
  currentDeps?.getMainWindow()?.webContents.send('ha-registration-status-updated', isRegistered)
  if (currentDeps?.broadcastSseEvent) {
    currentDeps.broadcastSseEvent({ type: 'ha-registration-status-updated', payload: isRegistered })
  }
}

function getDeviceConfigForHa(): any {
  if (!currentHaConfig?.config || !currentHaConfig.config.ioInstanceId) {
    console.error('HA Main: ioInstanceId or .config missing.')
    return null
  }
  let configUrlString = `http://localhost:1337/integrations/home-assistant`
  try {
    const hostIsUrlLike = currentHaConfig.config.mqttHost?.includes('://')
    const baseUrl = hostIsUrlLike
      ? currentHaConfig.config.mqttHost
      : `http://${currentHaConfig.config.mqttHost || 'localhost'}`
    const tempUrl = new URL(baseUrl!)
    tempUrl.port = '1337'
    tempUrl.pathname = '/integrations/home-assistant'
    configUrlString = tempUrl.toString()
  } catch (e) {
    /* Default */
  }

  return {
    identifiers: [`io_hub_${currentHaConfig.config.ioInstanceId}`],
    name: currentHaConfig.config.deviceName || 'IO Hub',
    model: 'IO Automation Hub',
    manufacturer: 'YeonV/Blade',
    sw_version: pkg.version,
    configuration_url: configUrlString
  }
}

async function registerSingleRowEntityInHa(
  rowId: string
): Promise<{ success: boolean; error?: string }> {
  if (!mqttClient?.connected) return { success: false, error: 'MQTT client not connected.' }
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA configuration or ioInstanceId missing.' }
  }
  const store = currentDeps.getStore()
  const row = (store.get('rows', {}) as Record<string, Row>)[rowId]
  if (!row || !row.output) {
    return { success: false, error: `Row ${rowId} not found or has no output.` }
  }

  const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'
  const deviceConfigPayload = getDeviceConfigForHa()
  if (!deviceConfigPayload) return { success: false, error: 'Failed to generate HA device config.' }

  const sanitizedRowId = rowId.replace(/-/g, '_')
  const object_id = `io_row_${sanitizedRowId}`
  const configTopic = `${discoveryPrefix}/switch/${object_id}/config`
  const baseEntityTopic = `${discoveryPrefix}/switch/${object_id}`

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
    '~': baseEntityTopic,
    name: friendlyName,
    unique_id: `${deviceConfigPayload.identifiers[0]}_${object_id}`,
    cmd_t: '~/set',
    stat_t: '~/state',
    payload_on: 'ON',
    payload_off: 'OFF',
    state_on: 'ON',
    state_off: 'OFF',
    optimistic: true,
    device: deviceConfigPayload,
    icon:
      row.output.icon && row.output.icon.startsWith('mdi:')
        ? row.output.icon
        : 'mdi:flash-triangle-outline'
  }

  console.log(`HA Main: Exposing/Updating row ${rowId} (entity ${object_id})`)
  mqttClient.publish(configTopic, JSON.stringify(switchConfigPayload), { retain: true, qos: 1 })
  mqttClient.subscribe(`${baseEntityTopic}/set`, (err) => {
    if (err) console.error(`HA Main: Sub fail for ${object_id}`, err)
  })
  mqttClient.publish(`${baseEntityTopic}/state`, 'OFF', { retain: true, qos: 1 })
  currentlyRegisteredHaEntities.add(rowId)
  console.log(
    `HA Main: Added ${rowId} to currentlyRegistered. Set: ${Array.from(currentlyRegisteredHaEntities)}`
  )
  return { success: true }
}

async function unregisterSingleRowEntityFromHa(
  rowId: string
): Promise<{ success: boolean; error?: string }> {
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA configuration or ioInstanceId missing.' }
  }

  const clientToUse = mqttClient
  let tempClient: mqtt.MqttClient | null = null
  if (!clientToUse && currentHaConfig.config.mqttHost) {
    const opts: mqtt.IClientOptions = {
      host: currentHaConfig.config.mqttHost,
      port: currentHaConfig.config.mqttPort,
      clientId: `io-hub-unexpose-${Date.now()}`
    }
    if (currentHaConfig.config.mqttUsername) opts.username = currentHaConfig.config.mqttUsername
    if (currentHaConfig.config.mqttPassword) opts.password = currentHaConfig.config.mqttPassword
    tempClient = mqtt.connect(opts)
    tempClient.on('error', (e) => console.warn('HA Main: Temp unexpose client error', e.message))
  }
  const effectiveClient = clientToUse || tempClient
  if (!effectiveClient) return { success: false, error: 'No MQTT client for unexpose.' }

  const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'
  const sanitizedRowId = rowId.replace(/-/g, '_')
  const object_id = `io_row_${sanitizedRowId}`
  const configTopic = `${discoveryPrefix}/switch/${object_id}/config`
  const baseEntityTopic = `${discoveryPrefix}/switch/${object_id}`

  console.log(`HA Main: Unexposing row ${rowId} (entity ${object_id})`)
  effectiveClient.publish(configTopic, '', { retain: true, qos: 1 }, (err) => {
    if (err) console.warn(`HA Main: Error unreg ${object_id}`, err.message)
    if (tempClient) tempClient.end(true)
  })
  if (mqttClient?.connected && effectiveClient === mqttClient) {
    mqttClient.unsubscribe(`${baseEntityTopic}/set`)
  }
  currentlyRegisteredHaEntities.delete(rowId)
  console.log(
    `HA Main: Removed ${rowId} from currentlyRegistered. Set: ${Array.from(currentlyRegisteredHaEntities)}`
  )
  return { success: true }
}

async function updateHaEntitiesForCurrentProfile() {
  if (
    !mqttClient?.connected ||
    !currentHaConfig?.config ||
    !currentDeps ||
    !currentHaConfig.config.ioInstanceId
  ) {
    console.warn(
      'HA Main: Cannot update HA entities for profile, MQTT not ready or config missing.'
    )
    return
  }
  if (!Array.isArray(currentHaConfig.config.exposedRowIds))
    currentHaConfig.config.exposedRowIds = [] // Use top-level

  const store = currentDeps.getStore()
  const allKnownIoRows = store.get('rows', {}) as Record<string, Row>
  const masterExposedList = new Set(currentHaConfig.config.exposedRowIds) // Use top-level

  let effectiveRowIdsToExposeForHa: Set<string>
  if (
    currentActiveProfileInfo.id !== null &&
    Array.isArray(currentActiveProfileInfo.includedRowIds)
  ) {
    const profileIncludedIds = new Set(currentActiveProfileInfo.includedRowIds)
    effectiveRowIdsToExposeForHa = new Set(
      [...masterExposedList].filter((id) => profileIncludedIds.has(id) && allKnownIoRows[id])
    )
  } else {
    effectiveRowIdsToExposeForHa = new Set(
      [...masterExposedList].filter((id) => allKnownIoRows[id])
    )
  }

  const entitiesToRegister = new Set<string>()
  const entitiesToUnregister = new Set<string>()
  for (const rowId of effectiveRowIdsToExposeForHa) {
    if (!currentlyRegisteredHaEntities.has(rowId)) entitiesToRegister.add(rowId)
  }
  for (const rowId of currentlyRegisteredHaEntities) {
    if (!effectiveRowIdsToExposeForHa.has(rowId)) entitiesToUnregister.add(rowId)
  }

  console.log(
    'HA Main: Entities to ADD/UPDATE based on profile sync:',
    Array.from(entitiesToRegister)
  )
  console.log(
    'HA Main: Entities to REMOVE based on profile sync:',
    Array.from(entitiesToUnregister)
  )

  for (const rowId of entitiesToUnregister) await unregisterSingleRowEntityFromHa(rowId)
  for (const rowId of entitiesToRegister) await registerSingleRowEntityInHa(rowId)

  console.log(
    'HA Main: HA entity sync for profile change complete. Current registered set:',
    Array.from(currentlyRegisteredHaEntities)
  )
}

async function registerDeviceAndEntities(): Promise<{ success: boolean; error?: string }> {
  if (!mqttClient?.connected) return { success: false, error: 'MQTT client not connected.' }
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA configuration or ioInstanceId missing.' }
  }

  console.log('HA Main: Main "Register" button: Syncing entities with current profile/defaults.')

  const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'
  const deviceConfigPayload = getDeviceConfigForHa()
  if (!deviceConfigPayload)
    return { success: false, error: 'Failed to generate HA device config for profile selector.' }

  const store = currentDeps.getStore()
  getProfileOptionsForHa(store)
  const profileSelectorConfigTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/config`
  const profileSelectorBaseTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}`
  const selectorConfigPayload = {
    '~': profileSelectorBaseTopic,
    name: 'IO Active Profile',
    unique_id: `${deviceConfigPayload.identifiers[0]}_${PROFILE_SELECTOR_OBJECT_ID}`,
    cmd_t: '~/set',
    stat_t: '~/state',
    options: 'profileOptions, device: deviceConfigPayload',
    icon: 'mdi:account-switch-outline',
    entity_category: 'config'
  }
  mqttClient.publish(profileSelectorConfigTopic, JSON.stringify(selectorConfigPayload), {
    retain: true,
    qos: 1
  })
  mqttClient.subscribe(`${profileSelectorBaseTopic}/set`, (err) => {
    if (err) console.error(`HA Main: Failed to subscribe to profile selector cmd topic`, err)
  })
  const initialActiveProfileId = store.get('activeProfileId', null) as string | null
  publishProfileSelectorState(initialActiveProfileId, store)

  await updateHaEntitiesForCurrentProfile()
  setRegistrationStatusInStoreAndNotifyRenderer(true)
  return { success: true }
}

async function unregisterDeviceAndEntitiesInternalLogic(): Promise<{
  success: boolean
  error?: string
}> {
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA config or ioInstanceId missing.' }
  }
  console.log('HA Main: Main "Unregister" button: Unregistering ALL currently tracked HA entities.')

  const idsToClear = Array.from(currentlyRegisteredHaEntities)
  for (const rowId of idsToClear) {
    await unregisterSingleRowEntityFromHa(rowId)
  }
  if (currentlyRegisteredHaEntities.size > 0) currentlyRegisteredHaEntities.clear()

  if (mqttClient && currentHaConfig?.config) {
    const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'
    const profileSelectorConfigTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/config`
    const profileSelectorBaseTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}`
    mqttClient.publish(profileSelectorConfigTopic, '', { retain: true, qos: 1 })
    mqttClient.unsubscribe(`${profileSelectorBaseTopic}/set`)
  }

  setRegistrationStatusInStoreAndNotifyRenderer(false)
  return { success: true }
}

function handleMqttMessage(topic: string, payloadBuffer: Buffer) {
  if (!currentDeps || !currentHaConfig?.config.ioInstanceId) return

  const payload = payloadBuffer.toString()
  const discoveryPrefix = currentHaConfig.config.discoveryPrefix || 'homeassistant'

  const parts = topic.split('/')
  if (
    parts.length === 4 &&
    parts[0] === discoveryPrefix &&
    parts[1] === 'switch' &&
    parts[2].startsWith('io_row_') &&
    parts[3] === 'set'
  ) {
    const object_id = parts[2]
    const rowIdFromTopic = object_id.substring('io_row_'.length).replace(/_/g, '-')
    if (currentHaConfig?.config.exposedRowIds?.includes(rowIdFromTopic)) {
      // Check top-level
      console.log(`HA Main: Command for exposed row ${rowIdFromTopic} (${object_id}): ${payload}`)
      currentDeps.getMainWindow()?.webContents.send('trigger-row-from-main-ha', {
        rowId: rowIdFromTopic,
        command: payload
      })
    } else {
      console.warn(
        `HA Main: Received command for unexposed/unknown row via topic ${topic}. Ignoring.`
      )
    }
    return
  }
  if (
    parts.length === 4 &&
    parts[0] === discoveryPrefix &&
    parts[1] === 'select' &&
    parts[2] === PROFILE_SELECTOR_OBJECT_ID &&
    parts[3] === 'set'
  ) {
    const selectedProfileName = payload
    console.log(`HA Main: Received command to set profile to: ${selectedProfileName}`)
    const store = currentDeps.getStore()
    const profilesMap = store.get('profiles', {}) as Record<string, ProfileDefinition>
    let profileIdToActivate: string | null = null
    if (selectedProfileName === NO_PROFILE_ACTIVE_HA_OPTION) {
      profileIdToActivate = null
    } else {
      for (const id in profilesMap) {
        if (profilesMap[id].name === selectedProfileName) {
          profileIdToActivate = id
          break
        }
      }
    }
    if (selectedProfileName !== NO_PROFILE_ACTIVE_HA_OPTION && profileIdToActivate === null) {
      console.warn(`HA Main: Profile name "${selectedProfileName}" not found.`)
      const currentActiveProfileId = store.get('activeProfileId', null) as string | null
      publishProfileSelectorState(currentActiveProfileId, store)
      return
    }
    currentDeps.getMainWindow()?.webContents.send('ipc-api-set-active-profile', profileIdToActivate)
    return
  }
}

export async function cleanupHomeAssistantIntegration(): Promise<void> {
  console.log('HA Main: Cleaning up HA Integration...')
  if (isHaRegisteredWithMqtt) {
    await unregisterDeviceAndEntitiesInternalLogic()
  }
  disconnectFromMqtt()
  if (currentDeps) {
    currentDeps.ipcMain.removeHandler('ha-connect-mqtt')
    currentDeps.ipcMain.removeHandler('ha-disconnect-mqtt')
    currentDeps.ipcMain.removeHandler('ha-register-device')
    currentDeps.ipcMain.removeHandler('ha-unregister-device')
    currentDeps.ipcMain.removeHandler('get-ha-statuses')
    currentDeps.ipcMain.removeHandler('ha-expose-row')
    currentDeps.ipcMain.removeHandler('ha-unexpose-row')
    currentDeps.ipcMain.removeAllListeners('update-home-assistant-config')
    currentDeps.ipcMain.removeAllListeners('active-profile-changed-for-main')
  }
  console.log('HA Main: HA Integration cleanup complete.')
}

export default homeAssistantMainPart
