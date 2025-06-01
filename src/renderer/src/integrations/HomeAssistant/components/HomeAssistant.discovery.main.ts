// src/renderer/src/integrations/HomeAssistant/components/HomeAssistant.discovery.main.ts
import os from 'os'
import type mqtt from 'mqtt'
import type { Row, ProfileDefinition } from '../../../../../shared/types'
import type { integrationsState } from '../HomeAssistant.types'
import pkg from '../../../../../../package.json' with { type: 'json' }
import {
  publishToMqtt,
  subscribeToMqttTopic,
  unsubscribeFromMqttTopic
} from './HomeAssistant.mqtt.main'

const PROFILE_SELECTOR_OBJECT_ID = 'io_profile_selector' // Keep consistent
const NO_PROFILE_ACTIVE_HA_OPTION = 'None (All Rows Active)' // Keep consistent

export function getLocalLanIp(): string | null {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const ifaceDetails = interfaces[name]
    if (ifaceDetails) {
      for (const iface of ifaceDetails) {
        // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        // Also skip over Docker/VM interfaces if possible (can be tricky)
        if (iface.family === 'IPv4' && !iface.internal) {
          // Prioritize common LAN IP ranges, but this is not foolproof
          if (
            iface.address.startsWith('192.168.') ||
            iface.address.startsWith('10.') ||
            (iface.address.startsWith('172.') &&
              parseInt(iface.address.split('.')[1], 10) >= 16 &&
              parseInt(iface.address.split('.')[1], 10) <= 31)
          ) {
            return iface.address
          }
        }
      }
    }
  }
  // Fallback if no ideal private IP found, could return a placeholder or localhost
  // For configuration_url, a real LAN IP is best. If not found, localhost is a guess.
  // Or, we could make this configurable by the user if discovery fails.
  // For now, let's try to find one, and if not, the user might need to adjust.
  // A more robust solution might involve user input if auto-detection is tricky.
  // Fallback to first non-internal IPv4 if no private range matched
  for (const name of Object.keys(interfaces)) {
    const ifaceDetails = interfaces[name]
    if (ifaceDetails) {
      for (const iface of ifaceDetails) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address // Return the first one found
        }
      }
    }
  }
  return 'localhost' // Last resort fallback
}

export function getDeviceConfigPayloadForHa(
  haConfig: integrationsState['homeAssistant']['config']
): any | null {
  if (!haConfig.ioInstanceId) {
    console.error('HA Discovery: ioInstanceId missing for device config.')
    return null
  }
  const detectedIp = getLocalLanIp() // Get the LAN IP

  // The port 1337 is for IO's Express server
  const configUrlString = `http://${detectedIp}:1337/integrations/?id=home-assistant&yz=1`
  return {
    identifiers: [`io_hub_${haConfig.ioInstanceId}`],
    name: haConfig.deviceName || 'IO Hub',
    model: 'IO Automation Hub',
    manufacturer: 'YeonV/Blade',
    sw_version: pkg.version,
    configuration_url: configUrlString // Use the new URL
  }
}
export function registerSingleSwitchEntity(
  row: Row,
  haConfig: integrationsState['homeAssistant']['config'],
  deviceConfigPayload: any,
  mqttClient: mqtt.MqttClient | null
): void {
  if (!row.output || !mqttClient || !deviceConfigPayload) return

  const discoveryPrefix = haConfig.discoveryPrefix || 'homeassistant'
  const sanitizedRowId = row.id.replace(/-/g, '_')
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
    `IO Row ${row.id.substring(0, 4)}`

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

  console.log(`HA Discovery: Publishing config for switch ${object_id}`)
  publishToMqtt(mqttClient, configTopic, JSON.stringify(switchConfigPayload), {
    retain: true,
    qos: 1
  })
  subscribeToMqttTopic(mqttClient, `${baseEntityTopic}/set`, { qos: 1 }, (err) => {
    if (err) console.error(`HA Discovery: Failed to subscribe to cmd topic for ${object_id}`, err)
  })
  publishToMqtt(mqttClient, `${baseEntityTopic}/state`, 'OFF', { retain: true, qos: 1 })
}

export function unregisterSingleSwitchEntity(
  rowId: string, // Only need rowId to construct object_id
  haConfig: integrationsState['homeAssistant']['config'],
  mqttClient: mqtt.MqttClient | null // Can be main client or temp client
): void {
  if (!haConfig.ioInstanceId || !mqttClient) return

  const discoveryPrefix = haConfig.discoveryPrefix || 'homeassistant'
  const sanitizedRowId = rowId.replace(/-/g, '_')
  const object_id = `io_row_${sanitizedRowId}`
  const configTopic = `${discoveryPrefix}/switch/${object_id}/config`
  const baseEntityTopic = `${discoveryPrefix}/switch/${object_id}`

  console.log(`HA Discovery: Unregistering switch ${object_id}`)
  publishToMqtt(mqttClient, configTopic, '', { retain: true, qos: 1 })
  if (mqttClient.connected) {
    // Only try to unsubscribe if it's the main connected client
    unsubscribeFromMqttTopic(mqttClient, `${baseEntityTopic}/set`)
  }
}

export function getProfileOptionsForHaSelect(
  profiles: Record<string, ProfileDefinition>
): string[] {
  const profileNames = Object.values(profiles).map((p) => p.name)
  return [NO_PROFILE_ACTIVE_HA_OPTION, ...profileNames]
}

export function registerProfileSelectorEntity(
  profiles: Record<string, ProfileDefinition>,
  activeProfileId: string | null,
  haConfig: integrationsState['homeAssistant']['config'],
  deviceConfigPayload: any,
  mqttClient: mqtt.MqttClient | null
): void {
  if (!mqttClient || !deviceConfigPayload) return

  const discoveryPrefix = haConfig.discoveryPrefix || 'homeassistant'
  const profileOptions = getProfileOptionsForHaSelect(profiles)
  const configTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/config`
  const baseTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}`

  const selectorConfigPayload = {
    '~': baseTopic,
    name: 'IO Active Profile',
    unique_id: `${deviceConfigPayload.identifiers[0]}_${PROFILE_SELECTOR_OBJECT_ID}`,
    cmd_t: '~/set',
    stat_t: '~/state',
    options: profileOptions,
    device: deviceConfigPayload,
    icon: 'mdi:account-switch-outline',
    entity_category: 'config'
  }

  console.log('HA Discovery: Publishing Profile Selector config')
  publishToMqtt(mqttClient, configTopic, JSON.stringify(selectorConfigPayload), {
    retain: true,
    qos: 1
  })
  subscribeToMqttTopic(mqttClient, `${baseTopic}/set`, { qos: 1 }, (err) => {
    if (err) console.error(`HA Discovery: Failed to subscribe to profile selector cmd topic`, err)
  })

  let activeProfileName = NO_PROFILE_ACTIVE_HA_OPTION
  if (activeProfileId && profiles[activeProfileId]) {
    activeProfileName = profiles[activeProfileId].name
  }
  publishToMqtt(mqttClient, `${baseTopic}/state`, activeProfileName, { retain: true, qos: 1 })
}

export function unregisterProfileSelectorEntity(
  haConfig: integrationsState['homeAssistant']['config'],
  mqttClient: mqtt.MqttClient | null
): void {
  if (!mqttClient || !haConfig.ioInstanceId) return
  const discoveryPrefix = haConfig.discoveryPrefix || 'homeassistant'
  const configTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/config`
  const baseTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}`

  console.log('HA Discovery: Unregistering Profile Selector')
  publishToMqtt(mqttClient, configTopic, '', { retain: true, qos: 1 })
  if (mqttClient.connected) {
    unsubscribeFromMqttTopic(mqttClient, `${baseTopic}/set`)
  }
}

export function publishActiveProfileToSelector(
  activeProfileId: string | null,
  profiles: Record<string, ProfileDefinition>,
  haConfig: integrationsState['homeAssistant']['config'],
  mqttClient: mqtt.MqttClient | null
): void {
  if (!mqttClient?.connected || !haConfig) return

  let activeProfileName = NO_PROFILE_ACTIVE_HA_OPTION
  if (activeProfileId && profiles[activeProfileId]) {
    activeProfileName = profiles[activeProfileId].name
  }
  const discoveryPrefix = haConfig.discoveryPrefix || 'homeassistant'
  const stateTopic = `${discoveryPrefix}/select/${PROFILE_SELECTOR_OBJECT_ID}/state`
  publishToMqtt(mqttClient, stateTopic, activeProfileName, { retain: true, qos: 1 })
  console.log(`HA Discovery: Published profile selector state update: ${activeProfileName}`)
}
