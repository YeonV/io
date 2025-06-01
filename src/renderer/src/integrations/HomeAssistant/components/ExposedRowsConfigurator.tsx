// src/renderer/src/integrations/HomeAssistant/components/ExposedRowsConfigurator.tsx
import { FC, useMemo } from 'react'
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Paper,
  Tooltip,
  Stack
} from '@mui/material'
import { useMainStore } from '@/store/mainStore'
import type { Row } from '@shared/types'
import IoIcon from '@/components/IoIcon/IoIcon'
import { PlaylistAddCheckCircleOutlined } from '@mui/icons-material'

const ipcRenderer = window.electron?.ipcRenderer

interface ExposedRowsConfiguratorProps {
  // Props to indicate if the main HA integration is enabled and MQTT connected,
  // as individual row exposure might depend on this.
  isHaIntegrationEnabled: boolean
  isMqttConnected: boolean
}

export const ExposedRowsConfigurator: FC<ExposedRowsConfiguratorProps> = ({
  isHaIntegrationEnabled,
  isMqttConnected
}) => {
  const rows = useMainStore((state) => state.rows)
  const haConfig = useMainStore((state) => state.integrations.homeAssistant.config)
  const setHaConfig = useMainStore((state) => state.setHomeAssistantConfig)

  const exposedRowIds = useMemo(
    () => new Set(haConfig.exposedRowIds || []),
    [haConfig.exposedRowIds]
  ) as Set<string>

  const handleToggleRowExposure = (rowId: string, currentlyExposed: boolean) => {
    if (!isHaIntegrationEnabled || !isMqttConnected) {
      // Optionally show an InfoDialog: "Connect and enable HA integration first."
      return
    }

    const currentExposedIds = Array.from(exposedRowIds)
    let newExposedIds: string[]

    if (currentlyExposed) {
      // If it was exposed, we are unexposing it
      newExposedIds = currentExposedIds.filter((id) => id !== rowId)
      ipcRenderer
        ?.invoke('ha-unexpose-row', rowId)
        .then((result) => {
          if (!result?.success)
            console.error(`Failed to unexpose row ${rowId} from HA`, result?.error)
        })
        .catch((err) => console.error(`Error unexposing row ${rowId} from HA`, err))
    } else {
      // If it was not exposed, we are exposing it
      newExposedIds = [...currentExposedIds, rowId]
      ipcRenderer
        ?.invoke('ha-expose-row', rowId)
        .then((result) => {
          if (!result?.success) console.error(`Failed to expose row ${rowId} to HA`, result?.error)
        })
        .catch((err) => console.error(`Error exposing row ${rowId} to HA`, err))
    }

    // Update Zustand store, which will trigger IPC to main to save the full config
    // The main process doesn't need to react to this specific exposedRowIds change immediately
    // for *overall* registration, but the individual IPC calls above handle immediate entity changes.
    setHaConfig({ ...haConfig, exposedRowIds: newExposedIds })
  }

  const allIoRowsArray = useMemo(() => Object.values(rows), [rows])

  if (!isHaIntegrationEnabled) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 2 }}>
        Enable the Home Assistant integration to configure exposed automations.
      </Typography>
    )
  }

  return (
    <Paper elevation={2} sx={{ p: 2.5, mt: 5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <PlaylistAddCheckCircleOutlined color="primary" /> {/* Or similar relevant icon */}
        <Typography variant="h6" component="div">
          Expose Automations to Home Assistant
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select which IO automations (rows) should appear as controllable entities within Home
        Assistant. Changes here take effect immediately if connected and registered.
      </Typography>
      {allIoRowsArray.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No IO automations (rows) have been created yet.
        </Typography>
      ) : (
        <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
          {' '}
          {/* Example max height */}
          {allIoRowsArray.map((row: Row) => {
            const isExposed = exposedRowIds.has(row.id)
            const outputName =
              row.output.label ||
              row.output.settings?.label ||
              row.output.data?.text ||
              (typeof row.output.data?.originalFileName === 'string'
                ? row.output.data.originalFileName.replace(/\.(mp3|wav|ogg|aac|m4a|flac)$/i, '')
                : '') ||
              row.output.name ||
              `Row ${row.id.substring(0, 4)}`
            const inputName =
              row.input.name || `Input ${row.inputModule.replace('-module', '').substring(0, 10)}`
            // const rowDisplayName = `${inputName} → ${outputName}`

            return (
              <ListItem
                key={row.id}
                secondaryAction={
                  <Tooltip
                    title={isExposed ? 'Hide from Home Assistant' : 'Expose to Home Assistant'}
                  >
                    <span>
                      {' '}
                      {/* Span needed for Tooltip when Switch is disabled */}
                      <Switch
                        edge="end"
                        checked={isExposed}
                        onChange={() => handleToggleRowExposure(row.id, isExposed)}
                        disabled={!isHaIntegrationEnabled || !isMqttConnected}
                        size="small"
                      />
                    </span>
                  </Tooltip>
                }
                disablePadding
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <IoIcon name={row.output.icon || 'mdi:puzzle-outline'} />
                </ListItemIcon>
                <ListItemText
                  primary={outputName}
                  secondary={`Input: ${inputName}`}
                  primaryTypographyProps={{ noWrap: true, title: outputName }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    title: `Input: ${inputName}`,
                    fontSize: '0.75rem'
                  }}
                />
              </ListItem>
            )
          })}
        </List>
      )}
    </Paper>
  )
}

export default ExposedRowsConfigurator
