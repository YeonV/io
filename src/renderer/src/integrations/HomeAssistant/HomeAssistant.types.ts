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
    exposedRowIds?: string[]
  }
  setHomeAssistantConfig: (config: integrationsState['homeAssistant']['config']) => void
}
