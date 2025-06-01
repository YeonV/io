// src/renderer/src/integrations/HomeAssistant/components/ExposedRowsConfigurator_Web.tsx
import { FC, useMemo, useState } from 'react'
import {
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Paper,
  Tooltip,
  Stack,
  CircularProgress
} from '@mui/material'
import type { Row } from '@shared/types'
import IoIcon from '@/components/IoIcon/IoIcon' // Ensure this path is correct for your web context
// If IoIcon is Electron-specific, you might need a web alternative
// or ensure it degrades gracefully (e.g., shows nothing or a placeholder).
import { PlaylistAddCheckCircleOutlined as SectionIcon } from '@mui/icons-material'

interface ExposedRowsConfiguratorWebProps {
  allIoRows: Record<string, Row> | null // Can be null initially
  exposedRowIdsFromConfig: string[] | undefined
  onToggleRowExposure: (rowId: string, newIsExposedState: boolean) => Promise<void>
  isHaIntegrationEnabled: boolean
  isMqttConnected: boolean
  isLoadingRows: boolean
}

export const ExposedRowsConfigurator_Web: FC<ExposedRowsConfiguratorWebProps> = ({
  allIoRows,
  exposedRowIdsFromConfig,
  onToggleRowExposure,
  isHaIntegrationEnabled,
  isMqttConnected,
  isLoadingRows
}) => {
  const exposedRowIdsSet = useMemo(
    () => new Set(exposedRowIdsFromConfig || []),
    [exposedRowIdsFromConfig]
  )
  const allIoRowsArray = useMemo(() => Object.values(allIoRows || {}), [allIoRows])

  // Local state to indicate which row's toggle is currently being processed by an API call
  const [togglingRowId, setTogglingRowId] = useState<string | null>(null)

  const handleToggle = async (rowId: string, currentIsExposed: boolean) => {
    if (togglingRowId) return // Prevent multiple rapid toggles on the same row

    setTogglingRowId(rowId)
    try {
      await onToggleRowExposure(rowId, !currentIsExposed)
    } catch (error) {
      // Error handling is done in the parent (IntegrationSettingsPage)
      // which will show an InfoDialog and revert optimistic UI if needed.
      console.error(`ExposedRowsConfigurator_Web: Error during toggle for row ${rowId}`, error)
    } finally {
      setTogglingRowId(null)
    }
  }

  const paperStyles = { p: 2.5, mt: 3 } // Consistent padding and margin

  if (!isHaIntegrationEnabled) {
    return (
      <Paper elevation={2} sx={paperStyles}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Enable the Home Assistant integration (and save configuration) to manage exposed
          automations.
        </Typography>
      </Paper>
    )
  }

  if (isLoadingRows) {
    return (
      <Paper elevation={2} sx={{ ...paperStyles, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary" component="span">
          Loading automations list...
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper elevation={2} sx={paperStyles}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <SectionIcon color="primary" />
        <Typography variant="h6" component="div">
          Expose Automations to Home Assistant
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select which IO automations (rows) should appear as controllable entities within Home
        Assistant. Changes are applied immediately if connected & registered. The list of exposed
        automations is saved when you click &quot;Save Configuration&quot; for the integration.
      </Typography>
      {allIoRowsArray.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No IO automations (rows) have been created yet in your IO application.
        </Typography>
      ) : (
        <List
          dense
          sx={{
            maxHeight: 300,
            overflowY: 'auto',
            backgroundColor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {allIoRowsArray.map((row: Row) => {
            const isExposed = exposedRowIdsSet.has(row.id)
            const outputName =
              row.output.label ||
              row.output.settings?.label ||
              row.output.data?.text ||
              (typeof row.output.data?.originalFileName === 'string'
                ? row.output.data.originalFileName.replace(/\.(mp3|wav|ogg|aac|m4a|flac)$/i, '')
                : '') ||
              row.output.name ||
              `Row ${row.id.substring(0, 4)}`

            const inputModuleName = row.inputModule.replace('-module', '')
            const outputModuleName = row.outputModule.replace('-module', '')
            const secondaryText = `Input: ${row.input.name || inputModuleName} → Output: ${outputModuleName}`

            return (
              <ListItem
                key={row.id}
                secondaryAction={
                  <Tooltip
                    title={isExposed ? 'Hide from Home Assistant' : 'Expose to Home Assistant'}
                  >
                    <span>
                      <Switch
                        edge="end"
                        checked={isExposed}
                        onChange={() => handleToggle(row.id, isExposed)}
                        disabled={
                          !isHaIntegrationEnabled || !isMqttConnected || togglingRowId === row.id
                        }
                        size="small"
                      />
                    </span>
                  </Tooltip>
                }
                disablePadding
                sx={{
                  py: 0.75,
                  px: 1.5,
                  '&:not(:last-child)': { borderBottom: '1px solid', borderColor: 'divider' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mr: 1.5, display: 'flex', alignItems: 'center' }}>
                  {togglingRowId === row.id ? (
                    <CircularProgress size={20} />
                  ) : (
                    <IoIcon name={row.output.icon || 'mdi:puzzle-outline'} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={outputName}
                  secondary={secondaryText}
                  primaryTypographyProps={{
                    noWrap: true,
                    title: outputName,
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    title: secondaryText,
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

export default ExposedRowsConfigurator_Web
