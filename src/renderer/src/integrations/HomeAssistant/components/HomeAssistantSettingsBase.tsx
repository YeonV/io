// src/renderer/src/integrations/HomeAssistant/HomeAssistantSettingsBase.tsx
import { FC } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Divider,
  Stack
} from '@mui/material'
import {
  Link,
  LinkOff,
  CloudUpload,
  CloudOff,
  Save as SaveIcon,
  Dns as BrokerIcon,
  DevicesOther as DeviceDetailsIcon,
  PowerSettingsNew as ActionsIcon,
  Settings
} from '@mui/icons-material'
import type { integrationsState } from '@/store/integrationsStore'
import ExposedRowsConfigurator from './ExposedRowsConfigurator'

type HomeAssistantConfig = integrationsState['homeAssistant']['config']

const ipcRenderer = window.electron?.ipcRenderer || false

export interface HomeAssistantSettingsBaseProps {
  config: HomeAssistantConfig
  onConfigChange: (
    update: Partial<HomeAssistantConfig> | ((prevState: HomeAssistantConfig) => HomeAssistantConfig)
  ) => void
  onSaveConfig: () => void
  mqttConnected: boolean
  haRegistered: boolean
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
  onRegister: () => Promise<void>
  onUnregister: () => Promise<void>
  isConnecting: boolean
  isRegistering: boolean
  className?: string
  sx?: object
}

export const HomeAssistantSettingsBase: FC<HomeAssistantSettingsBaseProps> = ({
  config,
  onConfigChange,
  onSaveConfig,
  mqttConnected,
  haRegistered,
  onConnect,
  onDisconnect,
  onRegister,
  onUnregister,
  isConnecting,
  isRegistering,
  className,
  sx
}) => {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement
    const { name, value, type } = target
    onConfigChange((prevConfig) => ({
      ...prevConfig,
      [name]: type === 'number' ? Number(value) || 0 : value
    }))
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pb: 0, mb: 0, ...sx }} className={className}>
      <Paper elevation={2} sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent={'space-between'}
          sx={{ mb: 2.5 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
            <Settings color="primary" />
            <Typography variant="h6" component="div">
              Configuration
            </Typography>
          </Stack>
          <Button
            variant="outlined"
            onClick={onSaveConfig}
            disabled={!config.enabled}
            startIcon={<SaveIcon />}
            sx={{ display: 'flex', width: 'fit-content', alignSelf: 'center' }}
          >
            Save Configuration
          </Button>
        </Stack>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <BrokerIcon color="primary" />
              <Typography variant="h6" component="div">
                MQTT Broker Configuration
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  name="mqttHost"
                  label="MQTT Broker Host *"
                  value={config.mqttHost || ''}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={!config.enabled}
                  placeholder="e.g., mqtt://192.168.1.100"
                  helperText="Include protocol (mqtt://, ws://, etc.)"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  name="mqttPort"
                  label="MQTT Port *"
                  type="number"
                  value={config.mqttPort || 1883}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={!config.enabled}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="mqttUsername"
                  label="MQTT Username"
                  value={config.mqttUsername || ''}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!config.enabled}
                  placeholder="(Optional)"
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="mqttPassword"
                  label="MQTT Password"
                  type="password"
                  value={config.mqttPassword || ''}
                  onChange={handleInputChange}
                  fullWidth
                  disabled={!config.enabled}
                  placeholder="(Optional)"
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
          {/* Section: Home Assistant Device Details */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <DeviceDetailsIcon color="primary" />
              <Typography variant="h6" component="div">
                Home Assistant Device Details
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="discoveryPrefix"
                  label="HA Discovery Prefix *"
                  value={config.discoveryPrefix || 'homeassistant'}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={!config.enabled}
                  variant="outlined"
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="deviceName"
                  label="Device Name in HA *"
                  value={config.deviceName || 'IO Hub'}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  disabled={!config.enabled}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      </Paper>
      <Divider sx={{ my: 3 }} />
      <Paper elevation={2} sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <ActionsIcon color="primary" />
          <Typography variant="h6" component="div">
            Connection & Registration
          </Typography>
        </Stack>
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <BrokerIcon color="primary" sx={{ pl: 1 }} />
              <Stack direction="column" spacing={0.5} alignItems="start" flexGrow={1}>
                <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                  MQTT Broker
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Status of the connection to your MQTT broker.
                </Typography>
              </Stack>

              <Chip
                icon={mqttConnected ? <Link sx={{ pr: 0.5 }} /> : <LinkOff sx={{ pr: 1 }} />}
                label={mqttConnected ? 'Connected' : 'Disconnected'}
                color={mqttConnected ? 'success' : 'error'}
                variant="filled"
                size="small"
                sx={{ minWidth: 160, justifyContent: 'flex-start', pl: 1 }}
              />

              {!mqttConnected ? (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={
                    isConnecting ? <CircularProgress size={16} color="inherit" /> : <Link />
                  }
                  onClick={onConnect}
                  disabled={isConnecting || !config.enabled || !String(config.mqttHost).trim()}
                  sx={{ minWidth: 120 }}
                >
                  Connect
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={
                    isConnecting ? <CircularProgress size={16} color="inherit" /> : <LinkOff />
                  }
                  onClick={onDisconnect}
                  disabled={isConnecting}
                  sx={{ minWidth: 120 }}
                >
                  Disconnect
                </Button>
              )}
            </Stack>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={3} alignItems="center">
              <BrokerIcon color="primary" sx={{ pl: 1 }} />
              <Stack direction="column" spacing={0.5} alignItems="start" flexGrow={1}>
                <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
                  Home Assistant Link
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {config.ioInstanceId
                    ? `Registered: ${config.ioInstanceId}`
                    : 'Registers IO Hub and its automations with Home Assistant.'}
                </Typography>
              </Stack>
              <Stack direction="column">
                <Chip
                  icon={haRegistered ? <CloudUpload sx={{ pr: 1 }} /> : <CloudOff sx={{ pr: 1 }} />}
                  label={haRegistered ? 'Registered' : 'Not Registered'}
                  color={haRegistered ? 'success' : 'default'}
                  variant="filled"
                  size="small"
                  sx={{ minWidth: 160, justifyContent: 'flex-start', pl: 1 }}
                />
              </Stack>

              {!haRegistered ? (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={
                    isRegistering ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />
                  }
                  onClick={onRegister}
                  disabled={!mqttConnected || isRegistering || !config.enabled}
                  sx={{ minWidth: 120 }}
                >
                  Register
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={
                    isRegistering ? <CircularProgress size={16} color="inherit" /> : <CloudOff />
                  }
                  onClick={onUnregister}
                  disabled={isRegistering}
                  sx={{ minWidth: 120 }}
                >
                  Unregister
                </Button>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Paper>
      {ipcRenderer && (
        <ExposedRowsConfigurator
          isHaIntegrationEnabled={config.enabled}
          isMqttConnected={mqttConnected}
        />
      )}
    </Box>
  )
}

export default HomeAssistantSettingsBase
