// src/renderer/src/pages/IntegrationSettingsPage.tsx
import { FC, useEffect, useState, useCallback } from 'react'
import { Box, CircularProgress, Paper, Typography, Button } from '@mui/material'
import { ErrorOutline as ErrorIcon } from '@mui/icons-material'
import { integrationsState } from '@/store/integrationsStore'
import HomeAssistantSettingsBase from '@/integrations/HomeAssistant/components/HomeAssistantSettingsBase'
import InfoDialog from '@/components/utils/InfoDialog'
import { Row } from '@shared/types'
import ExposedRowsConfigurator_Web from '@/integrations/HomeAssistant/components/ExposedRowsConfigurator_Web'
// NEW: Placeholder for web version of row configurator
// We'll need to create this component next.
// import ExposedRowsConfiguratorWeb from '../integrations/HomeAssistant/components/ExposedRowsConfigurator_Web';

type HomeAssistantConfigData = integrationsState['homeAssistant']['config']
interface HomeAssistantStatusData {
  mqttConnected: boolean
  haRegistered: boolean
}

const IntegrationSettingsPage: FC = () => {
  const [integrationName, setIntegrationName] = useState<string | null>(null)

  const [config, setConfig] = useState<HomeAssistantConfigData | null>(null)
  const [status, setStatus] = useState<HomeAssistantStatusData>({
    mqttConnected: false,
    haRegistered: false
  })

  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true) // Can be separate from config loading
  const [pageError, setPageError] = useState<string | null>(null)

  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  const [infoDialogOpen, setInfoDialogOpen] = useState(false)
  const [infoDialogTitle, setInfoDialogTitle] = useState('')
  const [infoDialogMessage, setInfoDialogMessage] = useState('')

  const [allIoRows, setAllIoRows] = useState<Record<string, Row>>({}) // NEW state for rows
  const [isLoadingRows, setIsLoadingRows] = useState(true) // NEW loading state for rows

  const showInfo = (title: string, message: string) => {
    setInfoDialogTitle(title)
    setInfoDialogMessage(message)
    setInfoDialogOpen(true)
  }

  const fetchAllRows = useCallback(async () => {
    // This API endpoint returns all rows, not filtered by profile
    // If your /api/rows requires a profileId or defaults to active, adjust as needed
    // or create a new endpoint like /api/all-rows
    setIsLoadingRows(true)
    try {
      const response = await fetch(`http://${window.location.hostname}:1337/api/rows`) // Assuming this gets all rows
      if (!response.ok) throw new Error(`Failed to fetch rows: ${response.statusText}`)
      const data: Record<string, Row> = await response.json()
      setAllIoRows(data)
    } catch (err: any) {
      showInfo('Error Fetching Rows', err.message || 'Could not load IO automations list.')
      console.error('Error fetching all rows:', err)
    } finally {
      setIsLoadingRows(false)
    }
  }, [showInfo]) // Removed apiBaseUrl as /api/rows is fixed

  // Determine integrationName from query param on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const idFromQuery = searchParams.get('id')
    if (idFromQuery) {
      setIntegrationName(idFromQuery)
    } else {
      setPageError("No integration ID specified in URL query parameter '?id='.")
      setIsLoadingConfig(false)
      setIsLoadingStatus(false)
    }
  }, [])

  const apiBaseUrl = integrationName
    ? `http://${window.location.hostname}:1337/api/integrations/${integrationName}`
    : ''

  const fetchConfig = useCallback(async () => {
    if (!apiBaseUrl) return
    setIsLoadingConfig(true)
    setPageError(null)
    try {
      const response = await fetch(`${apiBaseUrl}/config`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to fetch config (${response.status}): ${errorData.error || response.statusText}`
        )
      }
      const data: HomeAssistantConfigData = await response.json()
      setConfig(data)
    } catch (err: any) {
      setPageError(err.message || 'Error fetching configuration.')
      console.error('Error fetching config:', err)
    } finally {
      setIsLoadingConfig(false)
    }
  }, [apiBaseUrl])

  const fetchStatus = useCallback(
    async (showError = true) => {
      if (!apiBaseUrl) return
      setIsLoadingStatus(true)
      try {
        const response = await fetch(`${apiBaseUrl}/status`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            `Failed to fetch status (${response.status}): ${errorData.error || response.statusText}`
          )
        }
        const data: HomeAssistantStatusData = await response.json()
        setStatus(data)
      } catch (err: any) {
        if (showError) setPageError(err.message || 'Error fetching status.')
        console.error('Error fetching status:', err)
      } finally {
        setIsLoadingStatus(false)
      }
    },
    [apiBaseUrl]
  )

  useEffect(() => {
    if (integrationName === 'home-assistant' && apiBaseUrl) {
      fetchConfig()
      fetchStatus()
      fetchAllRows()
    } else if (integrationName && integrationName !== 'home-assistant') {
      setPageError(`Integration "${integrationName}" is not supported on this page.`)
      setIsLoadingConfig(false)
      setIsLoadingStatus(false)
    }
  }, [integrationName, apiBaseUrl, fetchConfig, fetchStatus])

  useEffect(() => {
    if (integrationName !== 'home-assistant' || !apiBaseUrl) return

    const sseUrl = `http://${window.location.hostname}:1337/api/events`
    console.log(`IntegrationSettingsPage: Initializing SSE connection to ${sseUrl}`)
    const sse = new EventSource(sseUrl)

    sse.onopen = () => {
      console.log('IntegrationSettingsPage: SSE connection opened.')
    }

    sse.addEventListener('ha-mqtt-connection-status-updated', (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      console.log('SSE: ha-mqtt-connection-status-updated', data)
      if (typeof data.payload === 'boolean') {
        setStatus((prev) => ({ ...prev, mqttConnected: data.payload }))
        if (!data.payload) setIsConnecting(false)
      }
    })

    sse.addEventListener('ha-registration-status-updated', (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      console.log('SSE: ha-registration-status-updated', data)
      if (typeof data.payload === 'boolean') {
        setStatus((prev) => ({ ...prev, haRegistered: data.payload }))
        setIsRegistering(false)
      }
    })
    sse.addEventListener('ping', (event: MessageEvent) => {
      console.log('SSE Ping received:', JSON.parse(event.data))
    })

    sse.onerror = (err) => {
      console.error('SSE Error on IntegrationSettingsPage:', err)
      // sse.close(); // Consider closing on error to prevent flood if server is down
    }

    return () => {
      console.log('IntegrationSettingsPage: Closing SSE connection.')
      sse.close()
    }
  }, [integrationName, apiBaseUrl]) // Reconnect SSE if apiBaseUrl changes (e.g. integrationName)

  const handleConfigChange = useCallback(
    (
      update:
        | Partial<HomeAssistantConfigData>
        | ((prevState: HomeAssistantConfigData) => HomeAssistantConfigData)
    ) => {
      setConfig((prevConfig) => {
        if (!prevConfig) return null
        return typeof update === 'function' ? update(prevConfig) : { ...prevConfig, ...update }
      })
    },
    []
  )

  const handleSaveConfig = useCallback(async () => {
    if (!config || !apiBaseUrl) return
    try {
      const response = await fetch(`${apiBaseUrl}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to save config (${response.status})`)
      }
      showInfo('Configuration Saved', 'Settings have been saved successfully.')
      fetchConfig()
      fetchStatus(false) // Refresh status silently
    } catch (err: any) {
      showInfo('Save Error', err.message || 'Could not save configuration.')
      console.error('Error saving config:', err)
    }
  }, [config, apiBaseUrl, fetchConfig, fetchStatus])

  const performAction = async (actionPath: string, requestBody?: any, successMessage?: string) => {
    if (!apiBaseUrl) return

    const isLoadingSetter =
      actionPath.includes('connect') || actionPath.includes('disconnect')
        ? setIsConnecting
        : setIsRegistering
    isLoadingSetter(true)

    try {
      const response = await fetch(`${apiBaseUrl}/${actionPath}`, {
        method: 'POST',
        headers: requestBody ? { 'Content-Type': 'application/json' } : {},
        body: requestBody ? JSON.stringify(requestBody) : undefined
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Action ${actionPath} failed (${response.status}).`)
      }
      if (successMessage) console.log('Success', successMessage)
      fetchStatus(false) // Refresh status silently after action
      // Loading state will be reset by SSE or finally block
    } catch (err: any) {
      showInfo('Action Error', err.message || `Could not perform action: ${actionPath}.`)
      console.error(`Error performing action ${actionPath}:`, err)
      isLoadingSetter(false) // Ensure spinner stops on error
    }
    // No finally here, let SSE update reset spinners on success, or error path above.
  }

  const handleConnect = () =>
    performAction('action-connect-mqtt', undefined, 'MQTT connection process initiated.')
  const handleDisconnect = () =>
    performAction('action-disconnect-mqtt', undefined, 'MQTT disconnection process initiated.')
  const handleRegister = () =>
    performAction('action-register-device', undefined, 'Home Assistant registration initiated.')
  const handleUnregister = () =>
    performAction('action-unregister-device', undefined, 'Home Assistant unregistration initiated.')

  // Placeholder for ExposedRowsConfigurator_Web logic
  // This would involve fetching all rows, managing exposedRowIds (part of 'config'), and calling expose/unexpose APIs.
  // For now, we'll just pass the config down.
  // const handleToggleRowExposureWeb = async (rowId: string, shouldBeExposed: boolean) => {
  //   if (!config) return;
  //   const action = shouldBeExposed ? 'action-expose-row' : 'action-unexpose-row';
  //   await performAction(action, { rowId }, `Row exposure for ${rowId} updated.`);
  //   // After action, re-fetch config to get updated exposedRowIds list
  //   fetchConfig();
  // };

  const handleToggleRowExposureWeb = useCallback(
    async (rowId: string, newIsExposedState: boolean) => {
      if (!config || !apiBaseUrl) {
        showInfo('Error', 'Configuration not loaded or API not available.')
        return
      }

      const actionPath = newIsExposedState ? 'action-expose-row' : 'action-unexpose-row'
      const actionVerb = newIsExposedState ? 'expose' : 'unexpose'

      // Optimistically update UI first (the config state in IntegrationSettingsPage)
      const oldExposedRowIds = config.exposedRowIds || []
      let updatedExposedRowIds: string[]
      if (newIsExposedState) {
        updatedExposedRowIds = [...new Set([...oldExposedRowIds, rowId])]
      } else {
        updatedExposedRowIds = oldExposedRowIds.filter((id) => id !== rowId)
      }

      // Update local config state that's passed to HomeAssistantSettingsBase and ExposedRowsConfigurator_Web
      const newConfig = { ...config, exposedRowIds: updatedExposedRowIds }
      setConfig(newConfig) // This updates the UI for the toggles

      try {
        // Step 1: Tell the backend to perform the immediate MQTT action for this single row
        const actionResponse = await fetch(`${apiBaseUrl}/${actionPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rowId })
        })
        const actionResult = await actionResponse.json()
        if (!actionResponse.ok || !actionResult.success) {
          throw new Error(actionResult.error || `Failed to ${actionVerb} row ${rowId}.`)
        }
        showInfo('Success', `Row ${actionVerb}d. Saving updated exposure list...`)

        // Step 2: Persist the entire updated config (with the new exposedRowIds list)
        const saveResponse = await fetch(`${apiBaseUrl}/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig) // Send the already updated local config
        })
        const saveResult = await saveResponse.json()
        if (!saveResponse.ok || !saveResult.success) {
          throw new Error(
            saveResult.error || 'Failed to save updated exposed rows list to backend.'
          )
        }
        showInfo('Configuration Saved', 'List of exposed automations has been updated and saved.')
        // Optionally re-fetch config to be absolutely sure, though optimistic update + save should be fine
        // fetchConfig();
      } catch (err: any) {
        showInfo('Error Updating Exposure', err.message || 'An unknown error occurred.')
        // Revert optimistic UI update
        setConfig((prev) => (prev ? { ...prev, exposedRowIds: oldExposedRowIds } : null))
        console.error(`Error toggling row ${rowId} exposure to ${newIsExposedState}:`, err)
      }
    },
    [config, apiBaseUrl, showInfo, setConfig]
  )

  if (!integrationName) {
    return (
      <Paper sx={{ m: 3, p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Integration Not Specified
        </Typography>
        <Typography>
          Please specify an integration ID in the URL (e.g., ?id=home-assistant).
        </Typography>
      </Paper>
    )
  }

  if (integrationName !== 'home-assistant') {
    return (
      <Paper sx={{ m: 3, p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Unsupported Integration
        </Typography>
        <Typography>
          The integration &quot;{integrationName}&quot; cannot be configured via this page.
        </Typography>
      </Paper>
    )
  }

  if (isLoadingConfig || (isLoadingStatus && !config)) {
    // Show loader if config is loading, or if status is loading AND config isn't there yet
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (pageError && !config) {
    // If there's a page error and we couldn't even load config
    return (
      <Paper sx={{ m: 3, p: 3, textAlign: 'center' }}>
        <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Error Loading Integration
        </Typography>
        <Typography>{pageError}</Typography>
        <Button variant="outlined" onClick={fetchConfig} sx={{ mt: 2 }}>
          Retry Load
        </Button>
      </Paper>
    )
  }

  if (!config) {
    // Should be caught by isLoadingConfig, but as a fallback
    return <Typography>No configuration data loaded.</Typography>
  }

  return (
    <Box sx={{ maxWidth: 900, margin: 'auto', px: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 1 }}>
        Home Assistant Integration Management
      </Typography>

      <HomeAssistantSettingsBase
        config={config}
        onConfigChange={handleConfigChange}
        onSaveConfig={handleSaveConfig}
        mqttConnected={status.mqttConnected}
        haRegistered={status.haRegistered}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRegister={handleRegister}
        onUnregister={handleUnregister}
        isConnecting={isConnecting}
        isRegistering={isRegistering}
      />

      {/* NEW: Render ExposedRowsConfigurator_Web */}
      {config && ( // Only render if config is loaded
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pt: 0, mt: 0 }}>
          <ExposedRowsConfigurator_Web
            allIoRows={allIoRows}
            exposedRowIdsFromConfig={config.exposedRowIds}
            onToggleRowExposure={handleToggleRowExposureWeb}
            isHaIntegrationEnabled={config.enabled}
            isMqttConnected={status.mqttConnected}
            isLoadingRows={isLoadingRows}
          />
        </Box>
      )}

      <InfoDialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        title={infoDialogTitle}
        message={infoDialogMessage}
      />
    </Box>
  )
}

export default IntegrationSettingsPage
