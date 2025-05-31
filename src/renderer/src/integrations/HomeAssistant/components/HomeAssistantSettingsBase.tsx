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
  Switch,
  FormControlLabel
} from '@mui/material'
import { Link, LinkOff, CloudUpload, CloudOff, SettingsInputComponent } from '@mui/icons-material' // Example Icons
import { integrationsState } from '@/store/integrationsStore' // Keep type import

type HomeAssistantConfig = integrationsState['homeAssistant']['config']

export interface HomeAssistantSettingsBaseProps {
  config: HomeAssistantConfig
  onConfigChange: (
    updatedConfigPartial:
      | Partial<HomeAssistantConfig>
      | ((prevState: HomeAssistantConfig) => HomeAssistantConfig)
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
  // Allow passing className or sx for top-level Paper if needed from container
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
    const target = event.target as HTMLInputElement // Cast for type and checked
    const { name, value, type, checked } = target
    onConfigChange((prevConfig) => ({
      ...prevConfig,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) || 0 : value // Ensure number conversion
    }))
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, m: { xs: 1, sm: 0 }, ...sx }} className={className}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SettingsInputComponent sx={{ mr: 1, fontSize: '2rem' }} /> {/* Placeholder */}
        Home Assistant Integration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Connect IO to Home Assistant via MQTT for seamless automation. Your unique IO Instance ID
        for Home Assistant is:{' '}
        <Chip size="small" label={config.ioInstanceId || 'Will be auto-generated on save/load'} />
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <FormControlLabel
            control={
              <Switch checked={config.enabled} onChange={handleInputChange} name="enabled" />
            }
            label="Enable Home Assistant Integration"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="mqttHost"
            label="MQTT Broker Host *"
            value={config.mqttHost || ''}
            onChange={handleInputChange}
            fullWidth
            required
            disabled={!config.enabled}
            helperText="e.g., mqtt://your-broker-ip or ws://your-broker-ip/mqtt"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="mqttPort"
            label="MQTT Port *"
            type="number"
            value={config.mqttPort || 1883}
            onChange={handleInputChange}
            fullWidth
            required
            disabled={!config.enabled}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="mqttUsername"
            label="MQTT Username (Optional)"
            value={config.mqttUsername || ''}
            onChange={handleInputChange}
            fullWidth
            disabled={!config.enabled}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="mqttPassword"
            label="MQTT Password (Optional)"
            type="password"
            value={config.mqttPassword || ''}
            onChange={handleInputChange}
            fullWidth
            disabled={!config.enabled}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="discoveryPrefix"
            label="HA Discovery Prefix *"
            value={config.discoveryPrefix || 'homeassistant'}
            onChange={handleInputChange}
            fullWidth
            required
            disabled={!config.enabled}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            name="deviceName"
            label="Device Name in HA *"
            value={config.deviceName || 'IO Hub'}
            onChange={handleInputChange}
            fullWidth
            required
            disabled={!config.enabled}
          />
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={onSaveConfig} disabled={!config.enabled}>
            Save Configuration
          </Button>
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          {!mqttConnected ? (
            <Button
              variant="outlined"
              color="primary"
              startIcon={isConnecting ? <CircularProgress size={20} /> : <Link />}
              onClick={onConnect}
              disabled={isConnecting || !config.enabled || !String(config.mqttHost).trim()}
            >
              Connect to MQTT Broker
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={isConnecting ? <CircularProgress size={20} /> : <LinkOff />}
              onClick={onDisconnect}
              disabled={isConnecting}
            >
              Disconnect from MQTT
            </Button>
          )}
          <Chip
            label={mqttConnected ? 'MQTT Connected' : 'MQTT Disconnected'}
            color={mqttConnected ? 'success' : 'error'}
            variant="outlined"
            size="small"
          />
        </Grid>

        <Grid size={{ xs: 12 }} sx={{ mt: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
          {!haRegistered ? (
            <Button
              variant="outlined"
              color="primary"
              startIcon={isRegistering ? <CircularProgress size={20} /> : <CloudUpload />}
              onClick={onRegister}
              disabled={!mqttConnected || isRegistering || !config.enabled}
            >
              Register IO with Home Assistant
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={isRegistering ? <CircularProgress size={20} /> : <CloudOff />}
              onClick={onUnregister}
              disabled={isRegistering} // Allow unregister even if MQTT disconnected (best effort by main) or integration disabled
            >
              Unregister IO from Home Assistant
            </Button>
          )}
          <Chip
            label={haRegistered ? 'HA Registered' : 'HA Not Registered'}
            color={haRegistered ? 'success' : 'default'}
            variant="outlined"
            size="small"
          />
        </Grid>
      </Grid>
    </Paper>
  )
}

export default HomeAssistantSettingsBase
