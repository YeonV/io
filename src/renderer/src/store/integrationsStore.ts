// src/renderer/src/store/integrationsStore.tsx
import { produce } from 'immer'

const ipcRenderer = window.electron?.ipcRenderer || false

import type { integrationsState } from '../integrations/HomeAssistant/HomeAssistant.types'
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
  setHomeAssistantConfig: (
    config: integrationsState['homeAssistant']['config'],
    suppressIpcSend = false
  ) => {
    set(
      produce((state: { integrations: integrationsState }) => {
        // Ensure state type for produce
        state.integrations.homeAssistant.config = config
      }),
      false,
      'setHomeAssistantConfig'
    )
    if (ipcRenderer && !suppressIpcSend) {
      ipcRenderer.send('update-home-assistant-config', config)
    }
  }

  // ... other actions for different integrations
})
