import * as mqtt from 'mqtt'

const mqttData = window.localStorage.getItem('io_mqtt_data')
  ? JSON.parse(window.localStorage.getItem('io_mqtt_data') || '')
  : {
      host: 'ws://192.168.1.47:1884',
      username: 'blade',
      password: '',
      topic: 'homeassistant/sensor/gesturesensor'
    }

function getClient(errorHandler: any) {
  const client = mqtt.connect(mqttData.host, {
    clientId: 'gestures',
    username: mqttData.username,
    password: mqttData.password,
    clean: true
  })
  if (client) {
    client.on('error', (_err: any) => {
      errorHandler(`Connection to ${mqttData.host} failed`)
      client.end()
    })
    return client
  }
  return null
}
function subscribe(client: any, topic: string, errorHandler: any) {
  const callBack = (err: any, _granted: any) => {
    if (err) {
      errorHandler('Subscription request failed')
    }
  }
  if (client) {
    return client.subscribe(topic, callBack)
  }
}
function onMessage(client: any, callBack: any) {
  if (client) {
    client.on('message', (_topic: string, message: any, _packet: any) => {
      callBack(new TextDecoder('utf-8').decode(message))
    })
  }
}
function unsubscribe(client: any, topic: string) {
  if (client) {
    client.unsubscribe(topic)
  }
}
function closeConnection(client: any) {
  if (client) {
    client.end()
  }
}
const mqttService = {
  getClient,
  subscribe,
  onMessage,
  unsubscribe,
  closeConnection
}
export default mqttService
