// src/renderer/src/integrations/HomeAssistant/HomeAssistant.main.ts
import type { MainIntegrationDeps } from '../../../../main/integrationLoader'
import type { Row, ProfileDefinition } from '../../../../shared/types'
import Store from 'electron-store'
import type mqtt from 'mqtt' // Only import type if MqttClient is only used as type here
import { IOMainIntegrationPart } from '@shared/integration-types'
import type { integrationsState } from './HomeAssistant.types'

import {
  connectToMqttClient,
  disconnectMqttClient

  // subscribeToMqttTopic, // Not directly used by orchestrator, discovery.main.ts uses it
  // unsubscribeFromMqttTopic // Not directly used by orchestrator
} from './components/HomeAssistant.mqtt.main'
import type { MqttEventCallbacks } from './components/HomeAssistant.mqtt.main'

import {
  getDeviceConfigPayloadForHa,
  registerSingleSwitchEntity,
  unregisterSingleSwitchEntity,
  registerProfileSelectorEntity,
  unregisterProfileSelectorEntity,
  publishActiveProfileToSelector
} from './components/HomeAssistant.discovery.main'

import { syncHaEntitiesWithProfile } from './components/HomeAssistant.stateSync.main'

const homeAssistantMainPart: IOMainIntegrationPart = {
  integrationId: 'home-assistant',
  initialize: initializeHomeAssistantIntegration,
  cleanup: cleanupHomeAssistantIntegration
}

const PROFILE_SELECTOR_OBJECT_ID = 'io_profile_selector'
const NO_PROFILE_ACTIVE_HA_OPTION = 'None (All Rows Active)'

let mqttClientInstance: mqtt.MqttClient | null = null
let currentDeps: MainIntegrationDeps | null = null
let currentHaConfig: integrationsState['homeAssistant'] | null = null
let isHaRegisteredGlobally = false // Tracks if the "Register Device" button was pressed / main registration done

const currentlyRegisteredEntityRowIds = new Set<string>()
let currentActiveProfileInfo: { id: string | null; includedRowIds: string[] | null } = {
  id: null,
  includedRowIds: null
}

// --- Core Action Functions (called by IPC handlers) ---
async function doHaConnect(): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!currentHaConfig?.config.mqttHost || !currentHaConfig?.config.ioInstanceId) {
    return { success: false, error: 'MQTT host or IO Instance ID missing.' }
  }
  if (mqttClientInstance?.connected) return { success: true, message: 'Already connected.' }

  connectToMqtt() // This will set mqttClientInstance
  return { success: true, message: 'Connection process initiated.' }
}

async function doHaDisconnect(): Promise<{ success: boolean; error?: string }> {
  if (isHaRegisteredGlobally) await doHaUnregisterDevice() // If globally registered, unregister everything first
  setTimeout(() => {
    disconnectMqtt()
  }, 1000)
  return { success: true }
}

async function doHaRegisterDevice(): Promise<{ success: boolean; error?: string }> {
  return registerDeviceAndAllExposedEntities()
}

async function doHaUnregisterDevice(): Promise<{ success: boolean; error?: string }> {
  return unregisterDeviceAndAllExposedEntities()
}

async function doHaExposeRow(rowId: string): Promise<{ success: boolean; error?: string }> {
  if (!isHaRegisteredGlobally && currentHaConfig?.config.enabled && mqttClientInstance?.connected) {
    console.warn(
      `HA Main: Exposing row ${rowId} individually, but main device not marked as fully registered.`
    )
  } else if (!mqttClientInstance?.connected || !currentHaConfig?.config.enabled) {
    return { success: false, error: 'MQTT not connected or HA integration not enabled.' }
  }

  const store = currentDeps!.getStore()
  const row = (store.get('rows', {}) as Record<string, Row>)[rowId]
  const deviceConfig = getDeviceConfigPayloadForHa(currentHaConfig!.config)

  if (row && deviceConfig && currentHaConfig) {
    registerSingleSwitchEntity(row, currentHaConfig.config, deviceConfig, mqttClientInstance)
    currentlyRegisteredEntityRowIds.add(rowId)
    console.log(
      `HA Main: Added ${rowId} to currentlyRegistered. Set: ${Array.from(currentlyRegisteredEntityRowIds)}`
    )
    return { success: true }
  }
  return { success: false, error: `Could not expose row ${rowId}. Row or device config missing.` }
}

async function doHaUnexposeRow(rowId: string): Promise<{ success: boolean; error?: string }> {
  if (!currentHaConfig?.config) return { success: false, error: 'HA Config not available.' }
  unregisterSingleSwitchEntity(rowId, currentHaConfig.config, mqttClientInstance)
  currentlyRegisteredEntityRowIds.delete(rowId)
  console.log(
    `HA Main: Removed ${rowId} from currentlyRegistered. Set: ${Array.from(currentlyRegisteredEntityRowIds)}`
  )
  return { success: true }
}

// This function is called by the renderer's IPC 'update-home-assistant-config'
// AND can be called by Express if the payload matches
export function updateHaConfigFromExternal(
  newInnerConfig: integrationsState['homeAssistant']['config'] // Expects only the .config part
) {
  console.log('HA Main: updateHaConfigFromExternal received newInnerConfig:', newInnerConfig)

  if (!currentDeps || !currentHaConfig) {
    console.error(
      'HA Main: updateHaConfigFromExternal called before deps/currentHaConfig initialized.'
    )
    if (currentDeps && !currentHaConfig)
      currentHaConfig = getHaConfigFromStore(currentDeps.getStore())
    if (!currentHaConfig) return
  }

  const oldInnerConfig = { ...currentHaConfig.config }
  currentHaConfig.config = { ...currentHaConfig.config, ...newInnerConfig }

  if (!Array.isArray(currentHaConfig.config.exposedRowIds)) {
    currentHaConfig.config.exposedRowIds = []
  }

  currentDeps?.getStore().set('integrationsHomeAssistantConfig', currentHaConfig.config)

  if (!currentHaConfig.config.enabled) {
    if (isHaRegisteredGlobally) unregisterDeviceAndAllExposedEntities()
    disconnectMqtt()
  } else if (
    currentHaConfig.config.enabled &&
    (currentHaConfig.config.mqttHost !== oldInnerConfig?.mqttHost ||
      currentHaConfig.config.mqttPort !== oldInnerConfig?.mqttPort ||
      currentHaConfig.config.mqttUsername !== oldInnerConfig?.mqttUsername ||
      currentHaConfig.config.mqttPassword !== oldInnerConfig?.mqttPassword ||
      !mqttClientInstance ||
      (!mqttClientInstance.connected && !mqttClientInstance.reconnecting))
  ) {
    if (isHaRegisteredGlobally) unregisterDeviceAndAllExposedEntities()
    disconnectMqtt()
    if (currentHaConfig.config.mqttHost && currentHaConfig.config.ioInstanceId) connectToMqtt()
  }
}
function getHaConfigFromStore(store: Store): integrationsState['homeAssistant'] {
  const persistedInnerConfig = store.get('integrationsHomeAssistantConfig') as
    | integrationsState['homeAssistant']['config']
    | undefined

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
    // exposedRowIds is NOT a top-level property of fullHaStateSlice as per HomeAssistant.types.ts
    // It is inside fullHaStateSlice.config.exposedRowIds
  }

  if (persistedInnerConfig) {
    fullHaStateSlice.config = { ...fullHaStateSlice.config, ...persistedInnerConfig }
    if (!Array.isArray(fullHaStateSlice.config.exposedRowIds)) {
      fullHaStateSlice.config.exposedRowIds = []
    }
  }

  // This part from your code implies exposedRowIds might be stored separately from the main config block
  // This is inconsistent with HomeAssistant.types.ts if exposedRowIds is only in config.
  // For consistency with HomeAssistant.types.ts, exposedRowIds should only be in config.
  // If mainStore persists it separately, this getHaConfigFromStore needs to reconcile.
  // Assuming mainStore now correctly persists the whole config object (including its exposedRowIds)
  // under 'integrationsHomeAssistantConfig'.
  // const persistedTopLevelExposedRowIds = store.get('integrations.homeAssistant.exposedRowIds');
  // if (Array.isArray(persistedTopLevelExposedRowIds)) {
  //   fullHaStateSlice.config.exposedRowIds = persistedTopLevelExposedRowIds; // This would be correct if it was top-level
  // }

  isHaRegisteredGlobally = fullHaStateSlice.haRegistered
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
    // If persisting the whole config object, this change will be saved when config is next set.
    // Or explicitly: store.set('integrationsHomeAssistantConfig', currentHaConfig.config);
  }

  if (currentHaConfig?.config.ioInstanceId) {
    const currentPersistedInnerConfig = store.get('integrationsHomeAssistantConfig')
    if (
      !currentPersistedInnerConfig ||
      currentPersistedInnerConfig.ioInstanceId !== currentHaConfig.config.ioInstanceId ||
      !Array.isArray(currentPersistedInnerConfig.exposedRowIds) // Check if persisted inner config also needs array init
    ) {
      store.set('integrationsHomeAssistantConfig', currentHaConfig.config)
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
    'update-home-assistant-config', // Renderer sends the inner 'config' object
    (_event, newInnerConfigFromRenderer: integrationsState['homeAssistant']['config']) => {
      console.log(
        'HA Main: Received inner config update from renderer via IPC.',
        newInnerConfigFromRenderer
      )
      updateHaConfigFromExternal(newInnerConfigFromRenderer) // Call the shared logic
    }
  )

  // IPC Handlers for Electron UI (using handle for invoke)
  deps.ipcMain.handle('ha-connect-mqtt', async () => doHaConnect())
  deps.ipcMain.handle('ha-disconnect-mqtt', async () => doHaDisconnect())
  deps.ipcMain.handle('ha-register-device', async () => doHaRegisterDevice())
  deps.ipcMain.handle('ha-unregister-device', async () => doHaUnregisterDevice())
  deps.ipcMain.handle('ha-expose-row', async (_event, rowId: string) => doHaExposeRow(rowId))
  deps.ipcMain.handle('ha-unexpose-row', async (_event, rowId: string) => doHaUnexposeRow(rowId))

  // IPC Listeners for Express API (using on for emit) - Suffix with -web
  // These ensure Express can trigger actions without needing a response.
  deps.ipcMain.on('ha-connect-mqtt-web', () => {
    doHaConnect()
  })
  deps.ipcMain.on('ha-disconnect-mqtt-web', () => {
    doHaDisconnect()
  })
  deps.ipcMain.on('ha-register-device-web', () => {
    doHaRegisterDevice()
  }) // You had this as 'on' already
  deps.ipcMain.on('ha-unregister-device-web', () => {
    doHaUnregisterDevice()
  }) // You had this as 'on' already
  deps.ipcMain.on('ha-expose-row-web', (_event, rowId: string) => {
    doHaExposeRow(rowId)
  })
  deps.ipcMain.on('ha-unexpose-row-web', (_event, rowId: string) => {
    doHaUnexposeRow(rowId)
  })

  deps.ipcMain.handle('get-ha-statuses', async () => {
    const store = deps.getStore()
    return {
      mqttConnected: store.get('integrations.homeAssistant.mqttConnected', false),
      haRegistered: store.get('integrations.homeAssistant.haRegistered', false)
    }
  })

  deps.ipcMain.on(
    'active-profile-changed-for-main',
    (_event, profileInfo: { activeProfileId: string | null; includedRowIds: string[] | null }) => {
      console.log('HA Main: Received active profile change IPC:', profileInfo)
      currentActiveProfileInfo = {
        // Corrected assignment
        id: profileInfo.activeProfileId,
        includedRowIds: profileInfo.includedRowIds
      }
      const oldActiveProfileId =
        currentActiveProfileInfo.id === profileInfo.activeProfileId
          ? null
          : currentActiveProfileInfo.id // Simplified to avoid using old value if it's the same

      if (
        isHaRegisteredGlobally &&
        mqttClientInstance?.connected &&
        currentHaConfig?.config.enabled
      ) {
        updateEntitiesBasedOnProfile()
        if (oldActiveProfileId !== profileInfo.activeProfileId) {
          const profiles = deps.getStore().get('profiles', {}) as Record<string, ProfileDefinition>
          if (currentHaConfig) {
            // Ensure currentHaConfig and its .config is defined
            publishActiveProfileToSelector(
              profileInfo.activeProfileId,
              profiles,
              currentHaConfig.config,
              mqttClientInstance
            )
          }
        }
      } else {
        console.log('HA Main: Profile changed, but conditions not met for HA entity update.', {
          isHaRegisteredGlobally,
          isMqttConnected: mqttClientInstance?.connected,
          isHaConfigEnabled: currentHaConfig?.config.enabled
        })
      }
    }
  )
}

const mqttEventCallbacks: MqttEventCallbacks = {
  onConnect: () => {
    console.log(`HA Main: MQTT Connected via callback!`)
    setConnectionStatusInStoreAndNotifyRenderer(true)
    if (currentHaConfig?.config.enabled && currentHaConfig?.haRegistered) {
      updateEntitiesBasedOnProfile()
    }
  },
  onReconnect: () => {
    console.log(`HA Main: MQTT Reconnecting via callback...`)
    setConnectionStatusInStoreAndNotifyRenderer(false)
  },
  onError: (error: Error) => {
    console.error(`HA Main: MQTT Error via callback:`, error.message)
  },
  onClose: () => {
    console.log(`HA Main: MQTT Closed via callback.`)
    setConnectionStatusInStoreAndNotifyRenderer(false)
  },
  onOffline: () => {
    console.log(`HA Main: MQTT Offline via callback.`)
    setConnectionStatusInStoreAndNotifyRenderer(false)
  },
  onMessage: (topic: string, payload: Buffer) => {
    handleMqttMessageInternal(topic, payload)
  }
}

function connectToMqtt() {
  if (!currentDeps || !currentHaConfig?.config.mqttHost || !currentHaConfig?.config.ioInstanceId) {
    setConnectionStatusInStoreAndNotifyRenderer(false)
    return
  }
  if (mqttClientInstance && (mqttClientInstance.connected || mqttClientInstance.reconnecting))
    return

  setConnectionStatusInStoreAndNotifyRenderer(false)
  mqttClientInstance = connectToMqttClient(currentHaConfig.config, mqttEventCallbacks)
}

function disconnectMqtt() {
  disconnectMqttClient(mqttClientInstance)
  mqttClientInstance = null
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
  isHaRegisteredGlobally = isRegistered
  currentDeps?.getMainWindow()?.webContents.send('ha-registration-status-updated', isRegistered)
  if (currentDeps?.broadcastSseEvent) {
    currentDeps.broadcastSseEvent({ type: 'ha-registration-status-updated', payload: isRegistered })
  }
}

async function updateEntitiesBasedOnProfile() {
  if (!currentDeps || !currentHaConfig) return // Guard against null currentHaConfig
  const store = currentDeps.getStore()
  const allRows = store.get('rows', {}) as Record<string, Row>
  const deviceConfig = getDeviceConfigPayloadForHa(currentHaConfig.config) // Pass inner config

  await syncHaEntitiesWithProfile(
    currentActiveProfileInfo,
    allRows,
    currentHaConfig.config, // Pass inner config
    deviceConfig,
    mqttClientInstance,
    currentlyRegisteredEntityRowIds
    // currentDeps
  )
}

async function registerDeviceAndAllExposedEntities(): Promise<{
  success: boolean
  error?: string
}> {
  if (!mqttClientInstance?.connected) return { success: false, error: 'MQTT client not connected.' }
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA configuration or ioInstanceId missing.' }
  }

  console.log('HA Main: Registering device, profile selector, and syncing entities...')
  const deviceConfig = getDeviceConfigPayloadForHa(currentHaConfig.config) // Pass inner config
  if (!deviceConfig) return { success: false, error: 'Failed to generate device config.' }

  const store = currentDeps.getStore()
  const profiles = store.get('profiles', {}) as Record<string, ProfileDefinition>
  const activeProfileId = store.get('activeProfileId', null) as string | null

  registerProfileSelectorEntity(
    profiles,
    activeProfileId,
    currentHaConfig.config,
    deviceConfig,
    mqttClientInstance
  ) // Pass inner config
  await updateEntitiesBasedOnProfile()

  setRegistrationStatusInStoreAndNotifyRenderer(true)
  return { success: true }
}

async function unregisterDeviceAndAllExposedEntities(): Promise<{
  success: boolean
  error?: string
}> {
  if (!currentHaConfig?.config || !currentDeps || !currentHaConfig.config.ioInstanceId) {
    return { success: false, error: 'HA config or ioInstanceId missing.' }
  }
  console.log('HA Main: Unregistering ALL entities and profile selector...')

  const idsToClear = Array.from(currentlyRegisteredEntityRowIds)
  for (const rowId of idsToClear) {
    unregisterSingleSwitchEntity(rowId, currentHaConfig.config, mqttClientInstance) // Pass inner config
  }
  currentlyRegisteredEntityRowIds.clear()

  unregisterProfileSelectorEntity(currentHaConfig.config, mqttClientInstance) // Pass inner config

  setRegistrationStatusInStoreAndNotifyRenderer(false)
  return { success: true }
}

function handleMqttMessageInternal(topic: string, payloadBuffer: Buffer) {
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
      // Check inside .config
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
    const store = currentDeps.getStore()
    const profilesMap = store.get('profiles', {}) as Record<string, ProfileDefinition>
    let profileIdToActivate: string | null = null
    if (selectedProfileName === NO_PROFILE_ACTIVE_HA_OPTION) profileIdToActivate = null
    else {
      for (const id in profilesMap)
        if (profilesMap[id].name === selectedProfileName) {
          profileIdToActivate = id
          break
        }
    }

    if (selectedProfileName !== NO_PROFILE_ACTIVE_HA_OPTION && profileIdToActivate === null) {
      console.warn(`HA Main: Profile name "${selectedProfileName}" not found.`)
      const currentActiveProfileId = store.get('activeProfileId', null) as string | null
      if (currentHaConfig)
        publishActiveProfileToSelector(
          currentActiveProfileId,
          profilesMap,
          currentHaConfig.config,
          mqttClientInstance
        )
      return
    }
    currentDeps.getMainWindow()?.webContents.send('ipc-api-set-active-profile', profileIdToActivate)
    return
  }
}

export async function cleanupHomeAssistantIntegration(): Promise<void> {
  console.log('HA Main: Cleaning up HA Integration...')
  if (isHaRegisteredGlobally) {
    await unregisterDeviceAndAllExposedEntities()
  }
  disconnectMqtt()
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
    currentDeps.ipcMain.removeAllListeners('ha-connect-mqtt-web')
    currentDeps.ipcMain.removeAllListeners('ha-disconnect-mqtt-web')
    currentDeps.ipcMain.removeAllListeners('ha-register-device-web')
    currentDeps.ipcMain.removeAllListeners('ha-unregister-device-web')
    currentDeps.ipcMain.removeAllListeners('ha-expose-row-web')
    currentDeps.ipcMain.removeAllListeners('ha-unexpose-row-web')
  }
  console.log('HA Main: HA Integration cleanup complete.')
}

export default homeAssistantMainPart
