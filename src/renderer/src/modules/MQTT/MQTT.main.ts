// src/renderer/src/modules/MQTT/MQTT.main.ts
import { type IpcMain, type BrowserWindow, ipcMain } from 'electron'
import mqtt from 'mqtt'
import type { IOMainModulePart } from '../../../../shared/types.js'
import { type MqttBrokerConfig } from './MQTT.js'

const id = 'mqtt-module' // Unique ID for this module
interface MqttMainInitDeps {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
  getStore: () => any // To get broker profiles if needed, though renderer sends them
}

// Main process state for MQTT clients
const mainMqttClients = new Map<string, mqtt.MqttClient>() // Key: clientKey (host_user_clientid)
const mainClientSubscriptions = new Map<string, Map<string, Set<string>>>() // Key: clientKey, Value: Map<topic, Set<rowId>>
const mainClientStatus = new Map<
  string,
  'connecting' | 'connected' | 'error' | 'closed' | 'offline'
>()

// Helper to generate a unique key for a client based on connection parameters
function generateClientKey(config: { host: string; username?: string; clientId?: string }): string {
  const host = config.host || 'unknown_host'
  const username = config.username || 'nouser'
  // Ensure clientId is somewhat unique if not provided, especially if multiple rows connect to same broker anonymously
  const clientId = config.clientId || `io_main_mqtt_${Math.random().toString(16).slice(2, 10)}`
  return `${host}_${username}_${clientId}`
}

// Helper to get or create an MQTT client in the main process
function getOrCreateClient(
  brokerConfig: MqttBrokerConfig,
  mainWindow: BrowserWindow | null
): mqtt.MqttClient {
  const clientKey = generateClientKey(brokerConfig)
  if (mainMqttClients.has(clientKey)) {
    const existingClient = mainMqttClients.get(clientKey)!
    // If client is present but not connected and not reconnecting, it might be stale.
    if (!existingClient.connected && !existingClient.reconnecting) {
      console.log(
        `Main (MQTTHandler): Client ${clientKey} exists but is not connected/reconnecting. Attempting to reconnect.`
      )
      existingClient.reconnect() // Try to reconnect it
    }
    return existingClient
  }

  console.log(
    `Main (MQTTHandler): Creating new MQTT client for ${brokerConfig.host} (Key: ${clientKey})`
  )
  mainClientStatus.set(clientKey, 'connecting')
  const clientOptions: mqtt.IClientOptions = {
    clientId: brokerConfig.clientId || `io_main_mqtt_${Math.random().toString(16).slice(2, 10)}`,
    username: brokerConfig.username,
    password: brokerConfig.password,
    reconnectPeriod: 10000, // ms
    connectTimeout: 10000, // ms
    clean: true // Clean session
  }

  if (brokerConfig.host.startsWith('ws')) {
    clientOptions.protocol = brokerConfig.host.startsWith('wss') ? 'wss' : 'ws'
    try {
      const url = new URL(brokerConfig.host)
      if (url.pathname && url.pathname !== '/') clientOptions.path = url.pathname
    } catch (e) {
      /* ignore if not full URL */
    }
  } else if (brokerConfig.host.startsWith('mqtt')) {
    clientOptions.protocol = brokerConfig.host.startsWith('mqtts') ? 'mqtts' : 'mqtt'
  }

  const client = mqtt.connect(brokerConfig.host, clientOptions)
  mainMqttClients.set(clientKey, client)
  mainClientSubscriptions.set(clientKey, new Map())

  client.on('connect', () => {
    console.log(`Main (MQTTHandler): Client ${clientKey} connected to ${brokerConfig.host}`)
    mainClientStatus.set(clientKey, 'connected')
    // Re-subscribe to any topics this client was supposed to be listening to
    const subscriptions = mainClientSubscriptions.get(clientKey)
    subscriptions?.forEach((_rowIds, topic) => {
      console.log(`Main (MQTTHandler): Re-subscribing ${clientKey} to ${topic} on connect.`)
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err)
          console.error(
            `Main (MQTTHandler): Failed to re-subscribe to ${topic} for ${clientKey}`,
            err
          )
      })
    })
    mainWindow?.webContents.send('mqtt-client-status', {
      clientKey,
      status: 'connected',
      host: brokerConfig.host
    })
  })

  client.on('message', (topic, payloadBuffer) => {
    const payloadString = payloadBuffer.toString()
    console.log(`Main (MQTTHandler): Message on ${clientKey} - T: ${topic}`)
    mainWindow?.webContents.send('mqtt-message-received', {
      clientKey,
      topic,
      payloadString,
      brokerHost: brokerConfig.host // Send identifying info
    })
  })

  client.on('error', (err) => {
    console.error(`Main (MQTTHandler): Client error for ${clientKey}: ${err.message}`)
    mainClientStatus.set(clientKey, 'error')
    mainWindow?.webContents.send('mqtt-client-status', {
      clientKey,
      status: 'error',
      message: err.message,
      host: brokerConfig.host
    })
  })

  client.on('close', () => {
    console.warn(`Main (MQTTHandler): Client ${clientKey} closed.`)
    mainClientStatus.set(clientKey, 'closed')
    mainWindow?.webContents.send('mqtt-client-status', {
      clientKey,
      status: 'closed',
      host: brokerConfig.host
    })
  })

  client.on('offline', () => {
    console.warn(`Main (MQTTHandler): Client ${clientKey} offline.`)
    mainClientStatus.set(clientKey, 'offline')
    mainWindow?.webContents.send('mqtt-client-status', {
      clientKey,
      status: 'offline',
      host: brokerConfig.host
    })
  })

  client.on('reconnect', () => {
    console.info(`Main (MQTTHandler): Client ${clientKey} attempting to reconnect...`)
    mainClientStatus.set(clientKey, 'connecting') // Or 'reconnecting'
    mainWindow?.webContents.send('mqtt-client-status', {
      clientKey,
      status: 'connecting',
      host: brokerConfig.host
    })
  })

  return client
}

const mqttMainModule: IOMainModulePart = {
  moduleId: id,

  initialize: (deps: MqttMainInitDeps) => {
    const { ipcMain, getMainWindow } = deps
    console.log(`Main (${id}): Initializing MQTT main process handler...`)

    ipcMain.handle(
      'mqtt-subscribe',
      async (_event, args: { brokerConfig: MqttBrokerConfig; topic: string; rowId: string }) => {
        const { brokerConfig, topic, rowId } = args
        if (!brokerConfig || !topic || !rowId)
          return { success: false, error: 'Missing parameters for subscribe' }

        console.log(
          `Main (${id}): IPC 'mqtt-subscribe' for row ${rowId}, topic ${topic}, broker ${brokerConfig.host}`
        )
        const client = getOrCreateClient(brokerConfig, getMainWindow())
        const clientKey = generateClientKey(brokerConfig)

        if (!mainClientSubscriptions.has(clientKey)) {
          mainClientSubscriptions.set(clientKey, new Map())
        }
        const clientTopics = mainClientSubscriptions.get(clientKey)!
        if (!clientTopics.has(topic)) {
          clientTopics.set(topic, new Set())
        }
        clientTopics.get(topic)!.add(rowId)

        // Subscribe if client is connected, otherwise it will subscribe on 'connect' event
        if (client.connected) {
          try {
            await new Promise<void>((resolve, reject) => {
              client.subscribe(topic, { qos: 0 }, (err) => {
                if (err) {
                  console.error(
                    `Main (${id}): Failed to subscribe to ${topic} for ${clientKey}`,
                    err
                  )
                  reject(err)
                } else {
                  console.log(
                    `Main (${id}): Client ${clientKey} subscribed to ${topic} for row ${rowId}`
                  )
                  resolve()
                }
              })
            })
            return {
              success: true,
              clientKey,
              status: mainClientStatus.get(clientKey) || 'pending_connect_then_subscribe'
            }
          } catch (err: any) {
            return { success: false, error: err?.message || 'Failed to subscribe', clientKey }
          }
        } else {
          console.log(
            `Main (${id}): Client ${clientKey} not yet connected, will subscribe to ${topic} on connect.`
          )
          return {
            success: true,
            clientKey: clientKey,
            status: mainClientStatus.get(clientKey) || 'unknown'
          }
        }
      }
    )

    ipcMain.handle(
      'mqtt-unsubscribe',
      async (_event, args: { brokerConfig: MqttBrokerConfig; topic: string; rowId: string }) => {
        const { brokerConfig, topic, rowId } = args
        if (!brokerConfig || !topic || !rowId)
          return { success: false, error: 'Missing parameters for unsubscribe' }

        console.log(
          `Main (${id}): IPC 'mqtt-unsubscribe' for row ${rowId}, topic ${topic}, broker ${brokerConfig.host}`
        )
        const clientKey = generateClientKey(brokerConfig)
        const client = mainMqttClients.get(clientKey)
        const clientTopics = mainClientSubscriptions.get(clientKey)

        if (client && clientTopics?.has(topic)) {
          clientTopics.get(topic)!.delete(rowId)
          if (clientTopics.get(topic)!.size === 0) {
            // If no more rows for this topic
            console.log(
              `Main (${id}): No more rows for topic ${topic} on client ${clientKey}. Unsubscribing client.`
            )
            client.unsubscribe(topic, (err) => {
              if (err)
                console.error(`Main (${id}): Error unsubscribing ${clientKey} from ${topic}`, err)
            })
            clientTopics.delete(topic)

            // If no more topics for this client, consider closing it
            if (clientTopics.size === 0) {
              console.log(
                `Main (${id}): No more topics for client ${clientKey}. Closing connection.`
              )
              client.end(true) // Force close
              mainMqttClients.delete(clientKey)
              mainClientSubscriptions.delete(clientKey)
              mainClientStatus.delete(clientKey)
            }
          }
        }
        return { success: true }
      }
    )

    ipcMain.handle(
      'mqtt-publish',
      async (
        _event,
        args: {
          brokerConfig: MqttBrokerConfig
          topic: string
          payload: string
          options: mqtt.IClientPublishOptions
        }
      ) => {
        const { brokerConfig, topic, payload, options } = args
        if (!brokerConfig || !topic || payload === undefined)
          return { success: false, error: 'Missing parameters for publish' }

        console.log(
          `Main (${id}): IPC 'mqtt-publish' to topic ${topic}, broker ${brokerConfig.host}`
        )
        const client = getOrCreateClient(brokerConfig, getMainWindow())

        const publishWhenConnected = () => {
          client.publish(topic, payload, options, (err) => {
            if (err) console.error(`Main (${id}): Failed to publish to ${topic}`, err)
            else console.log(`Main (${id}): Published to ${topic}: ${payload}`)
          })
        }

        if (client.connected) {
          publishWhenConnected()
        } else {
          console.log(
            `Main (${id}): Client for ${brokerConfig.host} not connected. Publishing on connect.`
          )
          client.once('connect', publishWhenConnected) // Publish once connected
        }
        return { success: true }
      }
    )
    console.log(`Main (${id}): MQTT IPC handlers initialized.`)
  },

  cleanup: () => {
    console.log(`Main (${id}): Cleaning up MQTT main process handler. Closing all clients.`)
    mainMqttClients.forEach((client) => client.end(true))
    mainMqttClients.clear()
    mainClientSubscriptions.clear()
    mainClientStatus.clear()
    ipcMain.removeHandler('mqtt-subscribe')
    ipcMain.removeHandler('mqtt-unsubscribe')
    ipcMain.removeHandler('mqtt-publish')
  }
}

export default mqttMainModule // For the dynamic loader
