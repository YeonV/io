```ts

// src/renderer/src/modules/Example/Example.tsx
// This is a template/example module to guide new module developers.
// It showcases all possible exports and includes comments on their purpose.

import type { FC } from 'react'
import { useEffect, useState, useCallback } from 'react' // Common React hooks
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, InputData, OutputData, Row, ModuleDefaultConfig } from '@shared/types'
import { Box, Button, TextField, Typography, Switch, FormControlLabel, Paper } from '@mui/material' // Example MUI imports
import { log } from '@/utils' // Your log utility
import { useRowActivation } from '@/hooks/useRowActivation' // For profile/enable awareness
import DisplayButtons from '@/components/Row/DisplayButtons' // Example common component

const ipcRenderer = window.electron?.ipcRenderer // For modules needing IPC

// --- 1. Define Custom Config Types (if your module needs them) ---
// These define the structure of the module's global configuration
// and the data stored within individual input/output row configurations.

// Example: Global configuration for this module
export interface ExampleModuleCustomConfig {
  globalApiKey?: string
  defaultRefreshRate: number
  isFeatureXGloballyActive: boolean
}

// Example: Data structure for this module's INPUT rows
export interface ExampleInputRowData {
  targetValue: string
  listenMode: 'exact' | 'contains'
}

// Example: Data structure for this module's OUTPUT rows
export interface ExampleOutputRowData {
  commandToSend: string
  retryAttempts: number
}

// --- 2. Module ID (Required) ---
// Must be unique across all modules. Convention: 'my-module-name-module'.
export const id = 'example-module'

// --- 3. Module Configuration (Required) ---
// Defines metadata, what inputs/outputs it offers, and default global config.
export const moduleConfig: ModuleConfig<ExampleModuleCustomConfig> = {
  menuLabel: 'Examples & Templates', // How it's grouped in UI selectors
  inputs: [
    { name: 'Example Input Trigger', icon: 'input' }
    // Add more input types if your module provides several
  ],
  outputs: [
    { name: 'Example Output Action', icon: 'output' }
    // Add more output types
  ],
  config: {
    // Default values for ModuleDefaultConfig
    enabled: true, // Is this module available to be selected by users?
    // Default values for ExampleModuleCustomConfig
    defaultRefreshRate: 5000,
    isFeatureXGloballyActive: false
    // globalApiKey is undefined by default, user must set it in Settings
  }
}

// --- 4. InputEdit Component (Optional) ---
// Renders UI for configuring an INPUT row of this module.
export const InputEdit: FC<{
  input: InputData // Contains input.data (which will be ExampleInputRowData)
  onChange: (dataChanges: Partial<ExampleInputRowData>) => void
}> = ({ input, onChange }) => {
  const currentData = input.data as Partial<ExampleInputRowData> // Cast for easier access

  const handleTargetValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ targetValue: event.target.value })
  }

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ listenMode: event.target.value as ExampleInputRowData['listenMode'] })
  }

  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        label="Target Value to Listen For"
        value={currentData.targetValue || ''}
        onChange={handleTargetValueChange}
        size="small"
        fullWidth
      />
      <FormControlLabel
        control={
          <Switch
            checked={currentData.listenMode === 'contains'}
            onChange={(e) => onChange({ listenMode: e.target.checked ? 'contains' : 'exact' })}
            size="small"
          />
        }
        label={`Listen Mode: ${currentData.listenMode === 'contains' ? 'Contains Target Value' : 'Exact Match for Target Value'}`}
      />
      <Typography variant="caption">
        Current data for this input row: {JSON.stringify(input.data)}
      </Typography>
    </Box>
  )
}

// --- 5. OutputEdit Component (Optional) ---
// Renders UI for configuring an OUTPUT row of this module.
export const OutputEdit: FC<{
  output: OutputData // Contains output.data (which will be ExampleOutputRowData)
  onChange: (dataChanges: Partial<ExampleOutputRowData>) => void
}> = ({ output, onChange }) => {
  const currentData = output.data as Partial<ExampleOutputRowData>

  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        label="Command to Send"
        value={currentData.commandToSend || ''}
        onChange={(e) => onChange({ commandToSend: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Retry Attempts"
        type="number"
        value={currentData.retryAttempts || 0}
        onChange={(e) => onChange({ retryAttempts: parseInt(e.target.value, 10) || 0 })}
        size="small"
        InputProps={{ inputProps: { min: 0, max: 5 } }}
      />
      <Typography variant="caption">
        Current data for this output row: {JSON.stringify(output.data)}
      </Typography>
    </Box>
  )
}

// --- 6. InputDisplay Component (Optional) ---
// Renders a summary of the INPUT configuration in the main row list.
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const data = input.data as ExampleInputRowData
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={{ ...input, name: 'Example In' }} /> {/* Shows module icon and name */}
      <Typography variant="body2" noWrap title={data.targetValue}>
        Val: {data.targetValue || 'N/A'} ({data.listenMode || 'exact'})
      </Typography>
    </Box>
  )
}

// --- 7. OutputDisplay Component (Optional) ---
// Renders a summary of the OUTPUT configuration in the main row list.
export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  const data = output.data as ExampleOutputRowData
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={{ ...output, name: 'Example Out' }} />
      <Typography variant="body2" noWrap title={data.commandToSend}>
        Cmd: {data.commandToSend || 'N/A'} (Retries: {data.retryAttempts ?? 0})
      </Typography>
    </Box>
  )
}

// --- 8. Settings Component (Optional) ---
// Renders UI for GLOBAL settings for this module (shown on Home page).
export const Settings: FC = () => {
  // Access this module's specific config from the global store
  const moduleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const currentModuleConfig = moduleFullConfig as
    | (ModuleDefaultConfig & ExampleModuleCustomConfig)
    | undefined

  const globalApiKey = currentModuleConfig?.globalApiKey
  const defaultRefreshRate = currentModuleConfig?.defaultRefreshRate
  const isFeatureXActive = currentModuleConfig?.isFeatureXGloballyActive

  const setModuleConfigValue = useMainStore((state) => state.setModuleConfigValue)

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // If you module is not iniitialized, you will get an error here for id.
    // it will be auto-fixed on the next yarn dev. alternatively, you can run yarn sync-modules
    setModuleConfigValue(id, 'globalApiKey', event.target.value)
  }
  const handleRefreshRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setModuleConfigValue(id, 'defaultRefreshRate', parseInt(event.target.value, 10) || 5000)
  }
  const handleToggleFeatureX = () => {
    setModuleConfigValue(id, 'isFeatureXGloballyActive', !isFeatureXActive)
  }

  if (!currentModuleConfig) return <Typography>Example Module settings not loaded.</Typography>

  return (
    <Paper
      elevation={1}
      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 250 }}
    >
      <Typography variant="overline">Example Module Settings</Typography>
      <TextField
        label="Global API Key"
        value={globalApiKey || ''}
        onChange={handleApiKeyChange}
        size="small"
        type="password"
      />
      <TextField
        label="Default Refresh Rate (ms)"
        value={defaultRefreshRate || 5000}
        onChange={handleRefreshRateChange}
        type="number"
        size="small"
      />
      <FormControlLabel
        control={
          <Switch
            checked={isFeatureXActive || false}
            onChange={handleToggleFeatureX}
            size="small"
          />
        }
        label="Activate Global Feature X"
      />
    </Paper>
  )
}

// --- 9. useInputActions Hook (Optional - for Input modules) ---
// Contains runtime logic for an INPUT row. Called once per active row.
export const useInputActions = (row: Row) => {
  const { id: rowId, input } = row
  const { isActive, inactiveReason } = useRowActivation(row) // Essential for profile/enable awareness
  const inputData = input.data as ExampleInputRowData

  useEffect(() => {
    if (!isActive) {
      log.info2(`ExampleModule Input: Row ${rowId} not active. Reason: ${inactiveReason}.`)
      return // Do nothing if not active
    }

    log.info(
      `ExampleModule Input: Row ${rowId} IS ACTIVE. Setting up listener for target '${inputData.targetValue}' (Mode: ${inputData.listenMode}).`
    )
    // Example: Setup an interval that checks something
    const intervalId = setInterval(() => {
      const currentValue = `Some dynamic value ${Math.random().toFixed(2)}` // Simulate checking a value
      let match = false
      if (inputData.listenMode === 'exact' && currentValue === inputData.targetValue) {
        match = true
      } else if (
        inputData.listenMode === 'contains' &&
        currentValue.includes(inputData.targetValue)
      ) {
        match = true
      }

      if (match) {
        log.success(
          `ExampleModule Input: Row ${rowId} MATCHED! Value: ${currentValue}. Triggering io_input.`
        )
        window.dispatchEvent(
          new CustomEvent('io_input', {
            detail: {
              rowId: rowId,
              payload: { original: currentValue, matchedOn: inputData.targetValue }
            }
          })
        )
      }
    }, 5000) // Check every 5 seconds

    return () => {
      log.info(`ExampleModule Input: Cleaning up for row ${rowId}. Clearing interval.`)
      clearInterval(intervalId)
    }
  }, [rowId, isActive, inactiveReason, inputData.targetValue, inputData.listenMode]) // Key dependencies
}

// --- 10. useOutputActions Hook (Optional - for Output modules) ---
// Contains runtime logic for an OUTPUT row. Called once per active row.
export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row
  const { isActive, inactiveReason } = useRowActivation(row) // Essential
  const outputData = output.data as ExampleOutputRowData

  useEffect(() => {
    if (!isActive) {
      log.info2(`ExampleModule Output: Row ${rowId} not active. Reason: ${inactiveReason}.`)
      return
    }

    log.info(
      `ExampleModule Output: Row ${rowId} IS ACTIVE. Listening for io_input. Command: '${outputData.commandToSend}'`
    )
    const listener = (event: CustomEvent) => {
      const eventDetail = event.detail
      let triggerRowId: string | undefined
      let receivedPayload: any = undefined

      if (typeof eventDetail === 'string') triggerRowId = eventDetail
      else if (
        eventDetail &&
        typeof eventDetail === 'object' &&
        Object.prototype.hasOwnProperty.call(eventDetail, 'rowId')
      ) {
        triggerRowId = eventDetail.rowId
        receivedPayload = eventDetail.payload
      } else return

      if (triggerRowId === rowId) {
        log.success(
          `ExampleModule Output: Row ${rowId} TRIGGERED! Command: '${outputData.commandToSend}'. Payload received:`,
          receivedPayload
        )
        // Execute the output action, e.g., send command to main process via IPC
        // ipcRenderer?.send('example-module-do-action', { command: outputData.commandToSend, retries: outputData.retryAttempts, payloadFromInput: receivedPayload });
        alert(
          `Example Output Action for Row ${rowId}:\nCommand: ${outputData.commandToSend}\nPayload from Input: ${JSON.stringify(receivedPayload)}`
        )
      }
    }

    window.addEventListener('io_input', listener as EventListener)
    return () => {
      log.info(`ExampleModule Output: Cleaning up for row ${rowId}. Removing listener.`)
      window.removeEventListener('io_input', listener as EventListener)
    }
  }, [rowId, isActive, inactiveReason, outputData.commandToSend, outputData.retryAttempts]) // Key dependencies
}

// --- 11. useGlobalActions Hook (Optional) ---
// Runs ONCE if any row uses this module. For module-wide setup/listeners.
export const useGlobalActions = () => {
  // Get this module's specific config
  const moduleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const currentModuleConfig = moduleFullConfig as
    | (ModuleDefaultConfig & ExampleModuleCustomConfig)
    | undefined

  useEffect(() => {
    if (!currentModuleConfig?.enabled || !currentModuleConfig?.isFeatureXGloballyActive) {
      log.info(
        `ExampleModule Global: Not active or feature X disabled. (Enabled: ${currentModuleConfig?.enabled}, FeatureX: ${currentModuleConfig?.isFeatureXGloballyActive})`
      )
      return
    }

    log.info(
      `ExampleModule Global: Initializing global stuff because Feature X is active. API Key: ${currentModuleConfig?.globalApiKey}, Refresh: ${currentModuleConfig?.defaultRefreshRate}ms`
    )
    // Example: Set up a global interval or a single connection
    const globalInterval = setInterval(() => {
      // log.debug(`ExampleModule Global: Tick tack from global action with API Key: ${currentModuleConfig?.globalApiKey}`);
    }, currentModuleConfig.defaultRefreshRate || 5000)

    return () => {
      log.info('ExampleModule Global: Cleaning up global stuff.')
      clearInterval(globalInterval)
    }
  }, [
    currentModuleConfig?.enabled,
    currentModuleConfig?.isFeatureXGloballyActive,
    currentModuleConfig?.globalApiKey,
    currentModuleConfig?.defaultRefreshRate
  ]) // Dependencies

  return null // This hook doesn't render anything
}

```