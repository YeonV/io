// src/renderer/src/store/integrationsStore.tsx
import { produce } from 'immer'

const ipcRenderer = window.electron?.ipcRenderer || false

export type { integrationsState } from '../integrations/HomeAssistant/HomeAssistant.types'

export const integrationsStore = () => ({
  homeAssistant: {
    config: {
      enabled: false,
      mqttHost: '',
      mqttPort: 1883,
      mqttUsername: '',
      mqttPassword: '',
      discoveryPrefix: 'homeassistant',
      deviceName: 'IO Hub',
      ioInstanceId: '',
      exposedRowIds: []
    },
    mqttConnected: false,
    haRegistered: false
  }
  // ... other integrations
})

export const integrationsStoreActions = (set: any) => ({
  setHomeAssistantConfig: (config) => {
    set(
      produce((state: any) => {
        state.integrations.homeAssistant.config = config
      }),
      false,
      'setHomeAssistantConfig'
    )
    // Send updated config to main process if needed
    if (ipcRenderer) {
      ipcRenderer.send('update-home-assistant-config', config)
    }
  }
  // ... other actions for different integrations
})
