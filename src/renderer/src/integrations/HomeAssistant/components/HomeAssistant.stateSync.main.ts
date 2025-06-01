// src/renderer/src/integrations/HomeAssistant/components/HomeAssistant.stateSync.main.ts
import type { Row } from '../../../../../shared/types'
import type { integrationsState } from '../HomeAssistant.types'
// import type { MainIntegrationDeps } from '../../../../../main/integrationLoader' // For getStore
import {
  registerSingleSwitchEntity,
  unregisterSingleSwitchEntity
} from './HomeAssistant.discovery.main'
import type mqtt from 'mqtt'

export async function syncHaEntitiesWithProfile(
  activeProfileInfo: { id: string | null; includedRowIds: string[] | null },
  allKnownIoRows: Record<string, Row>,
  haConfig: integrationsState['homeAssistant']['config'],
  deviceConfigPayload: any, // Result of getDeviceConfigPayloadForHa
  mqttClient: mqtt.MqttClient | null,
  currentlyRegisteredEntities: Set<string> // Pass this set to be mutated
  //   deps: MainIntegrationDeps // For getStore, if needed, though allRows passed now
): Promise<void> {
  if (!mqttClient?.connected || !haConfig || !haConfig.ioInstanceId || !deviceConfigPayload) {
    console.warn('StateSync: Cannot sync entities, MQTT not ready or core config missing.')
    return
  }
  if (!Array.isArray(haConfig.exposedRowIds)) haConfig.exposedRowIds = []

  const masterExposedList = new Set(haConfig.exposedRowIds)
  let effectiveRowIdsToExposeForHa: Set<string>

  if (activeProfileInfo.id !== null && Array.isArray(activeProfileInfo.includedRowIds)) {
    const profileIncludedIds = new Set(activeProfileInfo.includedRowIds)
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
    if (!currentlyRegisteredEntities.has(rowId) && allKnownIoRows[rowId]) {
      entitiesToRegister.add(rowId)
    }
  }
  for (const rowId of currentlyRegisteredEntities) {
    if (!effectiveRowIdsToExposeForHa.has(rowId)) {
      entitiesToUnregister.add(rowId)
    }
  }

  console.log('StateSync: Entities to ADD/UPDATE:', Array.from(entitiesToRegister))
  console.log('StateSync: Entities to REMOVE:', Array.from(entitiesToUnregister))

  for (const rowId of entitiesToUnregister) {
    unregisterSingleSwitchEntity(rowId, haConfig, mqttClient) // This should not return a promise that needs awaiting if it's just MQTT publish
    currentlyRegisteredEntities.delete(rowId)
  }
  for (const rowId of entitiesToRegister) {
    const row = allKnownIoRows[rowId]
    if (row) {
      registerSingleSwitchEntity(row, haConfig, deviceConfigPayload, mqttClient)
      currentlyRegisteredEntities.add(rowId)
    }
  }
  console.log(
    'StateSync: HA entity sync complete. Current registered set:',
    Array.from(currentlyRegisteredEntities)
  )
}
