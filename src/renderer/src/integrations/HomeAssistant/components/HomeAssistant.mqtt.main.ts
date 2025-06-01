// src/renderer/src/integrations/HomeAssistant/components/HomeAssistant.mqtt.main.ts
import mqtt from 'mqtt'
import type { integrationsState } from '../HomeAssistant.types'

const MQTT_RECONNECT_PERIOD = 5000
const MQTT_CONNECT_TIMEOUT = 10000

export interface MqttEventCallbacks {
  onConnect: () => void
  onReconnect: () => void
  onError: (error: Error) => void
  onClose: () => void
  onMessage: (topic: string, payload: Buffer) => void
  onOffline: () => void
}

export function connectToMqttClient(
  haConfig: integrationsState['homeAssistant']['config'],
  callbacks: MqttEventCallbacks
): mqtt.MqttClient | null {
  if (!haConfig.mqttHost || !haConfig.ioInstanceId) {
    console.error('MQTT Connect: Host or ioInstanceId missing in config.')
    callbacks.onError(new Error('MQTT Host or ioInstanceId missing in config.'))
    return null
  }

  console.log(`MQTT Connect: Attempting to connect to ${haConfig.mqttHost}:${haConfig.mqttPort}`)

  const options: mqtt.IClientOptions = {
    host: haConfig.mqttHost,
    port: haConfig.mqttPort,
    protocol: 'mqtt',
    clientId: `io-hub-${haConfig.ioInstanceId.substring(0, 8)}`,
    reconnectPeriod: MQTT_RECONNECT_PERIOD,
    connectTimeout: MQTT_CONNECT_TIMEOUT,
    clean: true
  }
  if (haConfig.mqttUsername) options.username = haConfig.mqttUsername
  if (haConfig.mqttPassword) options.password = haConfig.mqttPassword

  const client = mqtt.connect(options)

  client.on('connect', callbacks.onConnect)
  client.on('reconnect', callbacks.onReconnect)
  client.on('error', callbacks.onError)
  client.on('close', callbacks.onClose)
  client.on('offline', callbacks.onOffline)
  client.on('message', callbacks.onMessage)

  return client
}

export function disconnectMqttClient(client: mqtt.MqttClient | null): void {
  if (client) {
    console.log('MQTT Disconnect: Ending client connection.')
    client.end(true, () => {
      console.log('MQTT Disconnect: Client forcefully ended.')
    })
  }
}

export function publishToMqtt(
  client: mqtt.MqttClient | null,
  topic: string,
  payload: string | Buffer,
  options?: mqtt.IClientPublishOptions,
  callback?: mqtt.PacketCallback
): boolean {
  if (client && client.connected) {
    client.publish(topic, payload, options || { qos: 1, retain: false }, callback)
    return true
  }
  console.warn(`MQTT Publish: Client not connected or null. Topic: ${topic}`)
  return false
}

export function subscribeToMqttTopic(
  client: mqtt.MqttClient | null,
  topic: string | string[],
  options?: mqtt.IClientSubscribeOptions,
  callback?: mqtt.ClientSubscribeCallback
): boolean {
  if (client && client.connected) {
    client.subscribe(topic, options || { qos: 1 }, callback)
    return true
  }
  console.warn(`MQTT Subscribe: Client not connected or null. Topic: ${topic}`)
  return false
}

export function unsubscribeFromMqttTopic(
  client: mqtt.MqttClient | null,
  topic: string | string[],
  options?: object, // mqtt.js types options as Object for unsubscribe
  callback?: mqtt.PacketCallback
): boolean {
  if (client && client.connected) {
    client.unsubscribe(topic, options, callback)
    return true
  }
  console.warn(`MQTT Unsubscribe: Client not connected or null. Topic: ${topic}`)
  return false
}
