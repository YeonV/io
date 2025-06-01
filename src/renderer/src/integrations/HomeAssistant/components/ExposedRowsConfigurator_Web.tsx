// src/renderer/src/integrations/HomeAssistant/components/ExposedRowsConfigurator_Web.tsx
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
  Stack,
  CircularProgress
} from '@mui/material'
import type { Row } from '@shared/types' // Assuming Row type is available
import IoIcon from '@/components/IoIcon/IoIcon' // Assuming IoIcon is web-compatible or you have an alternative
import { PlaylistAddCheckCircleOutlined } from '@mui/icons-material'

interface ExposedRowsConfiguratorWebProps {
  allIoRows: Record<string, Row>
  exposedRowIdsFromConfig: string[] | undefined // From the HA config object
  onToggleRowExposure: (rowId: string, newIsExposedState: boolean) => Promise<void> // Async for API call
  isHaIntegrationEnabled: boolean
  isMqttConnected: boolean
  isLoadingRows: boolean // To show a loader while rows are being fetched
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

  // Local loading state for individual row toggles, if needed for UX
  // const [togglingRowId, setTogglingRowId] = useState<string | null>(null);

  const handleToggle = async (rowId: string, currentIsExposed: boolean) => {
    // setTogglingRowId(rowId);
    await onToggleRowExposure(rowId, !currentIsExposed) // Tell parent to flip the state
    // setTogglingRowId(null);
  }

  if (!isHaIntegrationEnabled) {
    return (
      <Paper elevation={2} sx={{ p: 2.5, mt: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Enable the Home Assistant integration above to configure exposed automations.
        </Typography>
      </Paper>
    )
  }

  if (isLoadingRows) {
    return (
      <Paper elevation={2} sx={{ p: 2.5, mt: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2" color="text.secondary" component="span">
          Loading automations...
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper elevation={2} sx={{ p: 2.5, mt: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <PlaylistAddCheckCircleOutlined color="primary" />
        <Typography variant="h6" component="div">
          Expose Automations to Home Assistant
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select which IO automations (rows) should appear as controllable entities within Home
        Assistant. Changes take effect immediately if connected and registered. The list of exposed
        automations is saved when you click &quot;Save Configuration&quot; above.
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
            backgroundColor: 'action.hover',
            borderRadius: 1
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

            // For display, keep it concise, focusing on output as per your earlier note
            // const inputName = row.input.name || `Input ${row.inputModule.replace('-module','').substring(0,10)}`;

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
                        disabled={!isHaIntegrationEnabled || !isMqttConnected}
                        size="small"
                        // disabled={togglingRowId === row.id} // Optional: disable while processing
                      />
                    </span>
                  </Tooltip>
                }
                disablePadding
                sx={{ py: 0.5, px: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36, mr: 1 }}>
                  <IoIcon name={row.output.icon || 'mdi:puzzle-outline'} />
                </ListItemIcon>
                <ListItemText
                  primary={outputName}
                  // secondary={`Input: ${inputName}`} // Removed input details as per your note
                  primaryTypographyProps={{ noWrap: true, title: outputName, fontSize: '0.9rem' }}
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
