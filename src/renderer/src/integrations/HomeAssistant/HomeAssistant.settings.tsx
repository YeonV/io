// src/renderer/src/integrations/HomeAssistant/HomeAssistant.settings.tsx
import { FC, useEffect, useState, useCallback } from 'react'
import { useMainStore } from '@/store/mainStore'
import { integrationsState } from '@/store/integrationsStore' // Assuming this exports the type correctly
import { useShallow } from 'zustand/react/shallow'
import HomeAssistantSettingsBase from './components/HomeAssistantSettingsBase'
import InfoDialog from '@/components/utils/InfoDialog'
import type { IntegrationConfig } from '../../../../shared/integration-types'

export const integrationConfig: IntegrationConfig = {
  id: 'home-assistant',
  name: 'Home Assistant',
  description: 'Connect IO to Home Assistant via MQTT for discovery and control.',
  icon: 'mdi:home-assistant'
}

const ipcRenderer = window.electron?.ipcRenderer

type HomeAssistantConfigFromStore = integrationsState['homeAssistant']['config']

export const HomeAssistantSettings: FC = () => {
  const { configFromStore, setHomeAssistantConfigInZustand } = useMainStore(
    useShallow((state) => ({
      configFromStore: state.integrations.homeAssistant.config,
      setHomeAssistantConfigInZustand: state.setHomeAssistantConfig
    }))
  )

  const [editableConfig, setEditableConfig] =
    useState<HomeAssistantConfigFromStore>(configFromStore)

  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [mqttConnectedMain, setMqttConnectedMain] = useState(false)
  const [haRegisteredMain, setHaRegisteredMain] = useState(false)

  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoDialogTitle, setInfoDialogTitle] = useState('')
  const [infoDialogMessage, setInfoDialogMessage] = useState('')

  const showInfo = useCallback((title: string, message: string) => {
    setInfoDialogTitle(title)
    setInfoDialogMessage(message)
    setInfoDialogOpen(true)
  }, [])

  useEffect(() => {
    setEditableConfig(configFromStore)
  }, [configFromStore])

  useEffect(() => {
    ipcRenderer?.invoke('get-ha-statuses').then((statuses) => {
      if (statuses) {
        setMqttConnectedMain(statuses.mqttConnected || false)
        setHaRegisteredMain(statuses.haRegistered || false)
      }
    })

    const handleMqttStatusUpdate = (_event: any, isConnected: boolean) => {
      setMqttConnectedMain(isConnected)
      if (!isConnected) {
        setIsConnecting(false)
        setIsRegistering(false)
        setHaRegisteredMain(false)
      }
    }

    const handleRegistrationStatusUpdate = (_event: any, isRegistered: boolean) => {
      setHaRegisteredMain(isRegistered)
      setIsRegistering(false)
    }

    const handleMainProcessConfigChange = (
      _event: any,
      newConfigFromMain: integrationsState['homeAssistant']['config']
    ) => {
      console.log(
        "HomeAssistantSettings (Electron UI): Received 'ha-config-changed-in-main'",
        newConfigFromMain
      )
      // Update Zustand store BUT suppress sending IPC back to main to prevent loop
      setHomeAssistantConfigInZustand(newConfigFromMain, true)
    }

    ipcRenderer?.on('ha-mqtt-connection-status-updated', handleMqttStatusUpdate)
    ipcRenderer?.on('ha-registration-status-updated', handleRegistrationStatusUpdate)
    ipcRenderer?.on('ha-config-changed-in-main', handleMainProcessConfigChange)

    return () => {
      ipcRenderer?.removeListener('ha-mqtt-connection-status-updated', handleMqttStatusUpdate)
      ipcRenderer?.removeListener('ha-registration-status-updated', handleRegistrationStatusUpdate)
      ipcRenderer?.removeListener('ha-config-changed-in-main', handleMainProcessConfigChange)
    }
  }, [setHomeAssistantConfigInZustand])

  const handleBaseConfigChange = useCallback(
    (
      update:
        | Partial<HomeAssistantConfigFromStore>
        | ((prevState: HomeAssistantConfigFromStore) => HomeAssistantConfigFromStore)
    ) => {
      if (typeof update === 'function') {
        setEditableConfig(update)
      } else {
        setEditableConfig((prev) => ({ ...prev, ...update }))
      }
    },
    []
  )

  const handleSaveConfig = useCallback(() => {
    console.log(
      'Saving config. Current editableConfig:',
      JSON.parse(JSON.stringify(editableConfig))
    )
    setHomeAssistantConfigInZustand(editableConfig) // This will send IPC to main
    // showInfo('Configuration Saved', 'Your Home Assistant integration settings have been saved.')
  }, [editableConfig, setHomeAssistantConfigInZustand, showInfo])

  const handleConnect = useCallback(async () => {
    if (!editableConfig.mqttHost || !editableConfig.ioInstanceId) {
      showInfo('Connection Error', 'MQTT Host and a valid IO Instance ID are required.')
      return
    }
    setIsConnecting(true)
    try {
      await ipcRenderer?.invoke('ha-connect-mqtt')
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('MQTT Connection Error', `Error connecting to MQTT: ${errorMsg}`)
      setIsConnecting(false) // Stop spinner on error
    }
  }, [editableConfig, showInfo])

  const handleDisconnect = useCallback(async () => {
    setIsConnecting(true)
    try {
      await ipcRenderer?.invoke('ha-disconnect-mqtt')
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('MQTT Disconnect Error', `Error disconnecting from MQTT: ${errorMsg}`)
    } finally {
      setIsConnecting(false)
    }
  }, [showInfo])

  const handleRegister = useCallback(async () => {
    if (!mqttConnectedMain) {
      showInfo('Registration Error', 'Cannot register. Not connected to MQTT broker.')
      return
    }
    setIsRegistering(true)
    try {
      const result = await ipcRenderer?.invoke('ha-register-device')
      if (result && !result.success) {
        showInfo(
          'Registration Failed',
          `Failed to register: ${result.error || 'Unknown IPC error'}`
        )
        setIsRegistering(false)
      } else if (!result) {
        showInfo('Registration Error', 'Could not communicate with the main process to register.')
        setIsRegistering(false)
      }
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('Registration Error', `Error registering with HA: ${errorMsg}`)
      setIsRegistering(false)
    }
  }, [mqttConnectedMain, showInfo])

  const handleUnregister = useCallback(async () => {
    setIsRegistering(true)
    try {
      const result = await ipcRenderer?.invoke('ha-unregister-device')
      if (result && !result.success && result.error) {
        showInfo('Unregistration Failed', `Failed to unregister: ${result.error}`)
        setIsRegistering(false)
      } else if (!result) {
        showInfo(
          'Unregistration Error',
          'Could not communicate with the main process to unregister.'
        )
        setIsRegistering(false)
      }
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('Unregistration Error', `Error unregistering from HA: ${errorMsg}`)
      setIsRegistering(false)
    }
  }, [showInfo])

  return (
    <>
      <HomeAssistantSettingsBase
        config={editableConfig}
        onConfigChange={handleBaseConfigChange}
        onSaveConfig={handleSaveConfig}
        mqttConnected={mqttConnectedMain}
        haRegistered={haRegisteredMain}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRegister={handleRegister}
        onUnregister={handleUnregister}
        isConnecting={isConnecting}
        isRegistering={isRegistering}
      />
      <InfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        title={infoDialogTitle}
        message={infoDialogMessage}
      />
    </>
  )
}

export default HomeAssistantSettings
