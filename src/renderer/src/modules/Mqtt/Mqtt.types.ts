// src/renderer/src/modules/Mqtt/Mqtt.types.ts
export interface MqttBrokerConfig {
  id: string
  name: string
  host: string
  username?: string
  password?: string
  clientId?: string
}
export interface MqttModuleCustomConfig {
  brokerConnections: MqttBrokerConfig[]
}
