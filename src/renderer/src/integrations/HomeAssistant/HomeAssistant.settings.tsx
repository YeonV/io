// src/renderer/src/integrations/HomeAssistant/HomeAssistant.settings.tsx
import { FC, useEffect, useState, useCallback } from 'react'
import { useMainStore } from '@/store/mainStore'
import { integrationsState } from '@/store/integrationsStore'
import { useShallow } from 'zustand/react/shallow'
import HomeAssistantSettingsBase from './components/HomeAssistantSettingsBase'
import InfoDialog from '@/components/utils/InfoDialog' // Import InfoDialog
import type { IntegrationConfig } from '../../../../shared/integration-types'

// --- Config for this Integration ---
export const integrationConfig: IntegrationConfig = {
  id: 'home-assistant', // Kebab-case, matches folder derived ID
  name: 'Home Assistant',
  description: 'Connect IO to Home Assistant via MQTT for discovery and control.',
  icon: 'mdi:home-assistant'
  // customConfig can be added here if HA integration needs specific persistent settings
  // beyond what's in integrations.homeAssistant.config in mainStore
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

  // State for InfoDialog
  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoDialogTitle, setInfoDialogTitle] = useState('')
  const [infoDialogMessage, setInfoDialogMessage] = useState('')

  const showInfo = (title: string, message: string) => {
    setInfoDialogTitle(title)
    setInfoDialogMessage(message)
    setInfoDialogOpen(true)
  }

  useEffect(() => {
    setEditableConfig(configFromStore)
    ipcRenderer?.invoke('get-ha-statuses').then((statuses) => {
      if (statuses) {
        setMqttConnectedMain(statuses.mqttConnected || false)
        setHaRegisteredMain(statuses.haRegistered || false)
      }
    })
  }, [configFromStore])

  useEffect(() => {
    const handleMqttStatusUpdate = (_event: any, isConnected: boolean) => {
      setMqttConnectedMain(isConnected)
      if (!isConnected) {
        setIsConnecting(false)
        // If MQTT disconnects, and we were trying to register, stop that spinner.
        // Also, HA registration status is now effectively false.
        setIsRegistering(false)
        setHaRegisteredMain(false) // Reflect that registration is lost
      }
    }

    const handleRegistrationStatusUpdate = (_event: any, isRegistered: boolean) => {
      setHaRegisteredMain(isRegistered)
      // ALWAYS stop the spinner when we get a registration status update,
      // regardless of whether it's true or false, as the operation has concluded.
      setIsRegistering(false)
    }

    ipcRenderer?.on('ha-mqtt-connection-status-updated', handleMqttStatusUpdate)
    ipcRenderer?.on('ha-registration-status-updated', handleRegistrationStatusUpdate)

    return () => {
      ipcRenderer?.removeListener('ha-mqtt-connection-status-updated', handleMqttStatusUpdate)
      ipcRenderer?.removeListener('ha-registration-status-updated', handleRegistrationStatusUpdate)
    }
  }, []) // Keep empty deps for mount/unmount behavior

  const handleRegister = useCallback(async () => {
    if (!mqttConnectedMain) {
      showInfo('Registration Error', 'Cannot register. Not connected to MQTT broker.')
      // setIsRegistering(false); // No need, spinner not started yet
      return
    }

    setIsRegistering(true) // Spinner starts
    try {
      const result = await ipcRenderer?.invoke('ha-register-device')
      if (result && result.success) {
        // showInfo(
        //   'Registration Initiated',
        //   'Home Assistant registration process initiated. Status will update shortly.'
        // )
        // Don't set setIsRegistering(false) here; wait for IPC 'ha-registration-status-updated'
      } else if (result && !result.success) {
        showInfo(
          'Registration Failed',
          `Failed to register: ${result.error || 'Unknown IPC error'}`
        )
        setIsRegistering(false) // Stop spinner on explicit failure from invoke
      } else if (!result) {
        showInfo('Registration Error', 'Could not communicate with the main process to register.')
        setIsRegistering(false) // Stop spinner on IPC communication failure
      }
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('Registration Error', `Error registering with HA: ${errorMsg}`)
      setIsRegistering(false) // Stop spinner on caught error
    }
    // No finally block setting it to false; rely on IPC status update or explicit error paths.
  }, [mqttConnectedMain, showInfo])

  const handleUnregister = useCallback(async () => {
    // It's okay to try and unregister even if MQTT is not connected,
    // main process will do its best to publish empty retained messages.
    setIsRegistering(true) // Use the same spinner for unregister operation
    try {
      const result = await ipcRenderer?.invoke('ha-unregister-device')
      if (result && result.success) {
        // showInfo(
        //   'Unregistration Initiated',
        //   'Home Assistant unregistration process initiated. Status will update shortly.'
        // )
        // Don't set setIsRegistering(false) here; wait for IPC 'ha-registration-status-updated'
      } else if (result && !result.success && result.error) {
        showInfo('Unregistration Failed', `Failed to unregister: ${result.error}`)
        setIsRegistering(false) // Stop spinner on explicit failure
      } else if (!result) {
        showInfo(
          'Unregistration Error',
          'Could not communicate with the main process to unregister.'
        )
        setIsRegistering(false) // Stop spinner on IPC communication failure
      }
    } catch (error) {
      const errorMsg =
        error && typeof error === 'object' && 'message' in error
          ? (error as any).message
          : 'Unknown IPC error'
      showInfo('Unregistration Error', `Error unregistering from HA: ${errorMsg}`)
      setIsRegistering(false) // Stop spinner on caught error
    }
    // No finally block setting it to false; rely on IPC status update or explicit error paths.
  }, [showInfo])

  const handleBaseConfigChange = useCallback(
    (
      update:
        | Partial<HomeAssistantConfigFromStore>
        | ((prevState: HomeAssistantConfigFromStore) => HomeAssistantConfigFromStore)
    ) => {
      if (typeof update === 'function') {
        setEditableConfig(update) // Pass the updater function directly
      } else {
        setEditableConfig((prev) => ({ ...prev, ...update })) // Handle partial object update
      }
    },
    []
  )

  const handleSaveConfig = useCallback(() => {
    console.log(
      'Saving config. Current editableConfig:',
      JSON.parse(JSON.stringify(editableConfig))
    ) // <-- ADD THIS LOG
    setHomeAssistantConfigInZustand(editableConfig)
    console.log('HA Settings (Container): Configuration saved.')
    showInfo('Configuration Saved', 'Your Home Assistant integration settings have been saved.')
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
    } finally {
      // setIsConnecting(false); // Let IPC listener handle this for connect success
    }
  }, [editableConfig])

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
      setIsConnecting(false) // Explicitly set for disconnect
    }
  }, [])

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
