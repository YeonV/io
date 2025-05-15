// src/renderer/src/modules/MQTT/MQTT.tsx

import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, InputData, OutputData, Row, ModuleDefaultConfig } from '@shared/types'
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  SelectChangeEvent,
  FormControlLabel,
  Switch
} from '@mui/material'
import { AddCircleOutline, Delete, Edit } from '@mui/icons-material'
import { log } from '@/utils'
import mqtt from 'mqtt'

import { v4 as uuidv4 } from 'uuid' // For unique broker profile IDs
import DisplayButtons from '@/components/Row/DisplayButtons'

// --- Types Specific to this Module ---
export interface MqttBrokerConfig {
  id: string // Unique ID for this profile
  name: string // User-friendly name (e.g., "Home Assistant MQTT")
  host: string // e.g., 'mqtt://localhost:1883' or 'ws://broker.hivemq.com:8000/mqtt'
  username?: string
  password?: string
  clientId?: string // Optional: custom client ID
  // Add other common MQTT options if needed: port, path, protocol, keepalive, clean, etc.
}

export interface MqttModuleCustomConfig {
  brokerConnections: MqttBrokerConfig[]
}

// For row data
interface MqttRowConnectionData {
  useProfileId?: string // ID of a broker profile from moduleConfig
  customHost?: string
  customUsername?: string
  customPassword?: string
  customClientId?: string
}
interface MqttInputRowData extends MqttRowConnectionData {
  topic: string
  jsonPath?: string // Optional JSONPath expression to extract value from payload
}
interface MqttOutputRowData extends MqttRowConnectionData {
  topic: string
  payload: string // The message to send
  retain?: boolean
  qos?: 0 | 1 | 2
}

// --- Module Definition ---
export const id = 'mqtt-module'
export const moduleConfig: ModuleConfig<MqttModuleCustomConfig> = {
  menuLabel: 'Network & Web',
  inputs: [{ icon: 'rss_feed', name: 'MQTT Message Received' }], // Updated icon/name
  outputs: [{ icon: 'publish', name: 'Publish MQTT Message' }], // Updated icon/name
  config: {
    enabled: true,
    brokerConnections: [
      {
        id: uuidv4(),
        name: 'Local Mosquitto',
        host: 'mqtt://localhost:1883',
        clientId: `io_client_${Math.random().toString(16).slice(2, 10)}`
      },
      {
        id: uuidv4(),
        name: 'EMQX Public Broker (WS)',
        host: 'ws://broker.emqx.io:8083/mqtt',
        clientId: `io_client_${Math.random().toString(16).slice(2, 10)}`
      }
    ]
  }
}

// --- Helper: Broker Profile Editor Dialog ---
const BrokerProfileDialog: FC<{
  open: boolean
  onClose: () => void
  onSave: (profile: MqttBrokerConfig) => void
  initialProfile?: MqttBrokerConfig | null
}> = ({ open, onClose, onSave, initialProfile }) => {
  const [profile, setProfile] = useState<Partial<MqttBrokerConfig>>(
    initialProfile || { host: 'mqtt://' }
  )

  useEffect(() => {
    setProfile(
      initialProfile || {
        id: uuidv4(),
        name: '',
        host: 'mqtt://',
        clientId: `io_client_${Math.random().toString(16).slice(2, 10)}`
      }
    )
  }, [initialProfile, open])

  const handleChange = (field: keyof MqttBrokerConfig, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    // Basic validation
    if (!profile.name?.trim() || !profile.host?.trim()) {
      alert('Profile Name and Host URL are required.')
      return
    }
    onSave(profile as MqttBrokerConfig) // Assert complete profile
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{initialProfile ? 'Edit' : 'Add'} MQTT Broker Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Profile Name"
            value={profile.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Host URL (e.g., mqtt://host:port or ws://host:port/path)"
            value={profile.host || ''}
            onChange={(e) => handleChange('host', e.target.value)}
            fullWidth
          />
          <TextField
            label="Username (Optional)"
            value={profile.username || ''}
            onChange={(e) => handleChange('username', e.target.value)}
            fullWidth
          />
          <TextField
            label="Password (Optional)"
            type="password"
            value={profile.password || ''}
            onChange={(e) => handleChange('password', e.target.value)}
            fullWidth
          />
          <TextField
            label="Client ID (Optional - auto-generates if blank)"
            value={profile.clientId || ''}
            onChange={(e) => handleChange('clientId', e.target.value)}
            fullWidth
            helperText="Leave blank for auto-generated."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// --- Settings: UI for managing MQTT Broker Connection Profiles ---
export const Settings: FC = () => {
  const moduleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const customConfig = moduleFullConfig as
    | (ModuleDefaultConfig & MqttModuleCustomConfig)
    | undefined
  const brokerConnections = customConfig?.brokerConnections || []
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<MqttBrokerConfig | null>(null)

  const handleAddProfile = () => {
    setEditingProfile(null) // Clear for new profile
    setDialogOpen(true)
  }

  const handleEditProfile = (profile: MqttBrokerConfig) => {
    setEditingProfile(profile)
    setDialogOpen(true)
  }

  const handleDeleteProfile = (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this broker profile?')) {
      const updatedConnections = brokerConnections.filter((p) => p.id !== profileId)
      setModuleConfig(id, 'brokerConnections', updatedConnections)
    }
  }

  const handleSaveProfile = (profileToSave: MqttBrokerConfig) => {
    let updatedConnections
    if (editingProfile && profileToSave.id === editingProfile.id) {
      // Editing existing
      updatedConnections = brokerConnections.map((p) =>
        p.id === profileToSave.id ? profileToSave : p
      )
    } else {
      // Adding new or editing with a new ID (shouldn't happen if ID is from uuid)
      const newProfile = { ...profileToSave, id: profileToSave.id || uuidv4() }
      updatedConnections = [...brokerConnections, newProfile]
    }
    setModuleConfig(id, 'brokerConnections', updatedConnections)
  }

  return (
    <Paper elevation={2} sx={{ p: 2, minWidth: 300, maxWidth: 500 }}>
      <Typography variant="overline">MQTT Broker Profiles</Typography>
      <List dense>
        {brokerConnections.map((profile) => (
          <ListItem
            key={profile.id}
            disablePadding
            secondaryAction={
              <>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleEditProfile(profile)}
                  size="small"
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeleteProfile(profile.id)}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </>
            }
          >
            <ListItemText primary={profile.name} secondary={profile.host} />
          </ListItem>
        ))}
        {brokerConnections.length === 0 && (
          <ListItem>
            <ListItemText secondary="No broker profiles configured." />
          </ListItem>
        )}
      </List>
      <Button
        startIcon={<AddCircleOutline />}
        onClick={handleAddProfile}
        variant="outlined"
        size="small"
        sx={{ mt: 1 }}
      >
        Add Broker Profile
      </Button>
      <BrokerProfileDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={editingProfile}
      />
    </Paper>
  )
}

// --- Helper: MQTT Connection Fields for Input/Output Edit ---
const MqttConnectionFields: FC<{
  data: MqttRowConnectionData
  onChange: (updatedConnectionData: Partial<MqttRowConnectionData>) => void
  brokerProfiles: MqttBrokerConfig[]
}> = ({ data, onChange, brokerProfiles }) => {
  const [useProfile, setUseProfile] = useState(!!data.useProfileId)

  const handleProfileChange = (event: SelectChangeEvent<string>) => {
    const profileId = event.target.value
    onChange({ useProfileId: profileId || undefined })
  }

  const handleCustomFieldChange = (field: keyof MqttRowConnectionData, value: string) => {
    onChange({ [field]: value })
  }

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={useProfile}
            onChange={(e) => setUseProfile(e.target.checked)}
            size="small"
          />
        }
        label="Use Saved Broker Profile"
      />
      {useProfile ? (
        <FormControl fullWidth margin="dense" size="small">
          <InputLabel>Broker Profile</InputLabel>
          <Select
            value={data.useProfileId || ''}
            label="Broker Profile"
            onChange={handleProfileChange}
          >
            <MenuItem value="">
              <em>Select a profile...</em>
            </MenuItem>
            {brokerProfiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.host})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            label="Custom Host URL"
            value={data.customHost || ''}
            onChange={(e) => handleCustomFieldChange('customHost', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
          />
          <TextField
            label="Custom Username (Optional)"
            value={data.customUsername || ''}
            onChange={(e) => handleCustomFieldChange('customUsername', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
          />
          <TextField
            label="Custom Password (Optional)"
            type="password"
            value={data.customPassword || ''}
            onChange={(e) => handleCustomFieldChange('customPassword', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
          />
          <TextField
            label="Custom Client ID (Optional)"
            value={data.customClientId || ''}
            onChange={(e) => handleCustomFieldChange('customClientId', e.target.value)}
            fullWidth
            size="small"
            margin="dense"
            helperText="Leave blank for auto-generated."
          />
        </Stack>
      )}
    </Box>
  )
}

// --- InputEdit: UI for configuring an MQTT Input Row ---
export const InputEdit: FC<{
  input: InputData // input.data should be MqttInputRowData
  onChange: (data: Partial<MqttInputRowData>) => void
}> = ({ input, onChange }) => {
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )
  const currentData = input.data as Partial<MqttInputRowData> // Cast for easier access

  const handleConnectionChange = (connectionUpdate: Partial<MqttRowConnectionData>) => {
    onChange(connectionUpdate)
  }
  const handleFieldChange = (field: keyof MqttInputRowData, value: string) => {
    onChange({ [field]: value })
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="textSecondary">
        Connection:
      </Typography>
      <MqttConnectionFields
        data={currentData}
        onChange={handleConnectionChange}
        brokerProfiles={brokerProfiles}
      />
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="textSecondary">
        Subscription:
      </Typography>
      <TextField
        label="Topic to Subscribe"
        value={currentData.topic || ''}
        onChange={(e) => handleFieldChange('topic', e.target.value)}
        fullWidth
        size="small"
        margin="dense"
        required
      />
      <TextField
        label="JSONPath (Optional, e.g., $.sensor.temp)"
        value={currentData.jsonPath || ''}
        onChange={(e) => handleFieldChange('jsonPath', e.target.value)}
        fullWidth
        size="small"
        margin="dense"
        helperText="Extract specific value from JSON payload."
      />
    </Box>
  )
}

// --- OutputEdit: UI for configuring an MQTT Output Row ---
export const OutputEdit: FC<{
  output: OutputData // output.data should be MqttOutputRowData
  onChange: (data: Partial<MqttOutputRowData>) => void
}> = ({ output, onChange }) => {
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )
  const currentData = output.data as Partial<MqttOutputRowData>

  const handleConnectionChange = (connectionUpdate: Partial<MqttRowConnectionData>) => {
    onChange(connectionUpdate)
  }
  const handleFieldChange = (field: keyof MqttOutputRowData, value: string | boolean | number) => {
    onChange({ [field]: value })
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="textSecondary">
        Connection:
      </Typography>
      <MqttConnectionFields
        data={currentData}
        onChange={handleConnectionChange}
        brokerProfiles={brokerProfiles}
      />
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="textSecondary">
        Publication:
      </Typography>
      <TextField
        label="Topic to Publish"
        value={currentData.topic || ''}
        onChange={(e) => handleFieldChange('topic', e.target.value)}
        fullWidth
        size="small"
        margin="dense"
        required
      />
      <TextField
        label="Payload (Message)"
        value={currentData.payload || ''}
        onChange={(e) => handleFieldChange('payload', e.target.value)}
        fullWidth
        size="small"
        margin="dense"
        required
        multiline
        rows={2}
      />
      <Grid container spacing={1} alignItems="center">
        <Grid item>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={currentData.retain ?? false}
                onChange={(e) => handleFieldChange('retain', e.target.checked)}
              />
            }
            label="Retain"
          />
        </Grid>
        <Grid item xs>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>QoS</InputLabel>
            <Select
              value={currentData.qos ?? 0}
              label="QoS"
              onChange={(e) => handleFieldChange('qos', Number(e.target.value) as 0 | 1 | 2)}
            >
              <MenuItem value={0}>0 (At most once)</MenuItem>
              <MenuItem value={1}>1 (At least once)</MenuItem>
              <MenuItem value={2}>2 (Exactly once)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  )
}

// --- Global MQTT Client Management ---
const mqttClients = new Map<string, mqtt.MqttClient>() // Key: host_username_clientId
const clientSubscriptions = new Map<string, Set<string>>() // Key: clientKey, Value: Set of topics
const clientStatus = new Map<string, 'connecting' | 'connected' | 'error' | 'closed'>()

function getClientKey(config: MqttBrokerConfig | MqttRowConnectionData): string {
  const host =
    'customHost' in config && config.customHost
      ? config.customHost
      : 'host' in config
        ? config.host
        : ''
  const username =
    'customUsername' in config && config.customUsername
      ? config.customUsername
      : 'username' in config
        ? config.username
        : ''
  const clientId =
    'customClientId' in config && config.customClientId
      ? config.customClientId
      : 'clientId' in config
        ? config.clientId
        : `io_client_${Math.random().toString(16).slice(2, 10)}`
  return `${host}_${username || 'nouser'}_${clientId}`
}

function getEffectiveBrokerConfig(
  rowData: MqttRowConnectionData,
  profiles: MqttBrokerConfig[]
): MqttBrokerConfig | null {
  if (rowData.useProfileId) {
    return profiles.find((p) => p.id === rowData.useProfileId) || null
  }
  if (rowData.customHost) {
    return {
      id: 'custom_' + uuidv4(), // Internal ID for custom config
      name: 'Custom Row Connection',
      host: rowData.customHost,
      username: rowData.customUsername,
      password: rowData.customPassword,
      clientId: rowData.customClientId || `io_client_${Math.random().toString(16).slice(2, 10)}`
    }
  }
  return null
}

// --- useGlobalActions: Manages MQTT clients and subscriptions ---
export const useGlobalActions = () => {
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  // Cleanup all clients on unmount (e.g., module disabled or app closing context)
  useEffect(() => {
    return () => {
      log.info('MQTT Global: Cleaning up all MQTT clients.')
      mqttClients.forEach((client) => client.end(true))
      mqttClients.clear()
      clientSubscriptions.clear()
      clientStatus.clear()
    }
  }, [])

  // This hook mainly provides the context for client management.
  // Specific connect/subscribe/publish actions will be triggered by Input/Output actions.
  // We need a way for Input/Output actions to request client and subscriptions.
  // This is more of a "service" setup than a typical global action hook.
  // For now, let's log that it's active.
  log.info2('MQTT Global Actions initialized (client management context).')

  return null
}

// --- useInputActions: Handles incoming MQTT messages for a row ---
export const useInputActions = (row: Row) => {
  const { input } = row
  const inputData = input.data as MqttInputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  useEffect(() => {
    const effectiveConfig = getEffectiveBrokerConfig(inputData, brokerProfiles)
    if (!effectiveConfig || !inputData.topic) {
      log.info1(`MQTT Input Row ${row.id}: Missing effective config or topic.`)
      return
    }

    const clientKey = getClientKey(effectiveConfig)
    let client = mqttClients.get(clientKey)

    const connectAndSubscribe = () => {
      // If client doesn't exist, OR is not connected AND not currently trying to reconnect
      if (!client || (!client.connected && !client.reconnecting)) {
        if (client) {
          // If client exists but is in a 'closed' like state
          log.info(
            `MQTT Input Row ${row.id}: Client ${clientKey} exists but is not connected/reconnecting. Forcing new connection.`
          )
          client.end(true, () => {
            mqttClients.delete(clientKey)
            clientStatus.delete(clientKey) // Also remove from our status tracker
            clientSubscriptions.delete(clientKey) // Clear its subscriptions too
            performConnection()
          })
          return
        }
        performConnection()
      } else if (client.connected) {
        performSubscription(client)
      } else {
        // Client exists, not connected, but might be reconnecting or in an intermediate state
        log.info(
          `MQTT Input Row ${row.id}: Client ${clientKey} exists but not yet connected (State: ${clientStatus.get(clientKey)}, Reconnecting: ${client.reconnecting}). Waiting for 'connect' or error event.`
        )
      }
    }

    const performConnection = () => {
      log.info(`MQTT Input Row ${row.id}: Attempting connection for ${clientKey}`)
      clientStatus.set(clientKey, 'connecting')

      // --- AGGRESSIVE LOGGING ---
      if (!effectiveConfig || !effectiveConfig.host) {
        log.error(
          `MQTT FATAL: effectiveConfig or effectiveConfig.host is NULL/UNDEFINED before connect for row ${row.id}`,
          effectiveConfig
        )
        return
      }
      log.info(
        `MQTT PRE-CONNECT for row ${row.id}: Host='${effectiveConfig.host}', ClientID='${effectiveConfig.clientId}', User='${effectiveConfig.username}'`
      )
      // --- END AGGRESSIVE LOGGING ---

      // --- EXPLICIT PROTOCOL IN OPTIONS (Defensive) ---
      const options: mqtt.IClientOptions = {
        // Use IClientOptions for better typing
        clientId: effectiveConfig.clientId,
        username: effectiveConfig.username,
        password: effectiveConfig.password,
        reconnectPeriod: 5000,
        connectTimeout: 10000
        // Try to force the protocol based on the URL scheme
        // This might be redundant if URL parsing is correct, but worth a try.
      }

      if (effectiveConfig.host.startsWith('ws')) {
        options.protocol = effectiveConfig.host.startsWith('wss') ? 'wss' : 'ws'
        // For WebSockets, 'path' might also be needed if broker URL includes it
        // e.g., ws://broker.emqx.io:8083/mqtt  => path should be /mqtt
        // Try to parse it from host if present
        try {
          const url = new URL(effectiveConfig.host)
          if (url.pathname && url.pathname !== '/') {
            options.path = url.pathname
            log.info(`MQTT: Using WebSocket path: ${options.path}`)
          }
        } catch (e) {
          /* Host might not be a full URL, ignore error */
        }
      } else if (effectiveConfig.host.startsWith('mqtt')) {
        options.protocol = effectiveConfig.host.startsWith('mqtts') ? 'mqtts' : 'mqtt'
      }
      log.info(`MQTT: Options for connect for row ${row.id}:`, options)
      // --- END EXPLICIT PROTOCOL ---

      const newClient = mqtt.connect(effectiveConfig.host, options) // Pass refined options
      mqttClients.set(clientKey, newClient)
      client = newClient // Update local ref

      client.on('connect', () => {
        log.success(
          `MQTT Input Row ${row.id}: Connected to ${effectiveConfig.host} as ${clientKey}`
        )
        clientStatus.set(clientKey, 'connected')
        performSubscription(client!)
      })

      client.on('message', (topic, payloadBuffer) => {
        const payloadString = payloadBuffer.toString()
        log.info2(
          `MQTT Input Row ${row.id}: Message on ${clientKey} - T: ${topic}, P: ${payloadString}`
        )
        // Dispatch global event for all MQTT inputs to potentially consume
        window.dispatchEvent(
          new CustomEvent('io_mqtt_message_received', {
            detail: { clientKey, topic, payload: payloadString, MqttBrokerConfig: effectiveConfig }
          })
        )
      })

      client.on('error', (err) => {
        log.error(`MQTT Input Row ${row.id}: Client error for ${clientKey}:`, err.message)
        clientStatus.set(clientKey, 'error')
      })
      client.on('close', () => {
        log.info(`MQTT Input Row ${row.id}: Client ${clientKey} closed.`)
        clientStatus.set(clientKey, 'closed')
      })
      client.on('offline', () => {
        log.info(`MQTT Input Row ${row.id}: Client ${clientKey} offline.`)
        // Status will likely go to 'reconnecting' or 'closed'
      })
    }

    const performSubscription = (activeClient: mqtt.MqttClient) => {
      if (!clientSubscriptions.has(clientKey)) {
        clientSubscriptions.set(clientKey, new Set())
      }
      const topicsForClient = clientSubscriptions.get(clientKey)!
      if (!topicsForClient.has(inputData.topic)) {
        log.info(
          `MQTT Input Row ${row.id}: Subscribing client ${clientKey} to topic: ${inputData.topic}`
        )
        activeClient.subscribe(inputData.topic, { qos: 0 }, (err) => {
          if (err) {
            log.error(`MQTT Input Row ${row.id}: Failed to subscribe to ${inputData.topic}`, err)
          } else {
            log.success(`MQTT Input Row ${row.id}: Subscribed to ${inputData.topic}`)
            topicsForClient.add(inputData.topic)
          }
        })
      } else {
        log.info2(
          `MQTT Input Row ${row.id}: Client ${clientKey} already subscribed to ${inputData.topic}`
        )
      }
    }

    // This is the listener for the globally dispatched MQTT messages
    const globalMqttMessageListener = (event: CustomEvent) => {
      const { clientKey: msgClientKey, topic: msgTopic, payload: msgPayload } = event.detail
      if (msgClientKey === clientKey && msgTopic === inputData.topic) {
        log.info(`MQTT Input Row ${row.id}: Processing message for topic ${msgTopic}`)
        let finalPayload: any = msgPayload
        if (inputData.jsonPath) {
          try {
            // Basic JSONPath-like extraction (very simplified)
            // For real JSONPath, use a library like 'jsonpath-plus'
            const parsedPayload = JSON.parse(msgPayload)
            const pathParts = inputData.jsonPath.replace(/^\$\.?/, '').split('.')
            let extractedValue = parsedPayload
            for (const part of pathParts) {
              if (extractedValue && typeof extractedValue === 'object' && part in extractedValue) {
                extractedValue = extractedValue[part]
              } else {
                extractedValue = undefined
                break
              }
            }
            finalPayload = extractedValue
            log.info2(
              `MQTT Input Row ${row.id}: Extracted with JSONPath '${inputData.jsonPath}':`,
              finalPayload
            )
          } catch (e) {
            log.info(
              `MQTT Input Row ${row.id}: Failed to parse JSON or apply JSONPath. Using raw payload. Error:`,
              e
            )
            finalPayload = msgPayload // Fallback to raw payload
          }
        }
        // Dispatch actual IO trigger
        window.dispatchEvent(
          new CustomEvent('io_input', { detail: { rowId: row.id, payload: finalPayload } })
        )
      }
    }

    connectAndSubscribe()
    window.addEventListener('io_mqtt_message_received', globalMqttMessageListener as EventListener)

    return () => {
      log.info(`MQTT Input Row ${row.id}: Cleaning up input action.`)
      window.removeEventListener(
        'io_mqtt_message_received',
        globalMqttMessageListener as EventListener
      )

      // Unsubscribe logic: if this is the last row subscribed to this topic on this client
      if (client) {
        // Use the client established in this hook's scope
        const topicsForClient = clientSubscriptions.get(clientKey)
        if (topicsForClient?.has(inputData.topic)) {
          // Check if other rows use this topic on this client
          // This is complex to manage without a central subscription manager.
          // For now, let's be simple: if row is removed, try to unsubscribe.
          // A more robust system would count subscribers per topic/client.
          log.info(
            `MQTT Input Row ${row.id}: Unsubscribing client ${clientKey} from topic: ${inputData.topic}`
          )
          client.unsubscribe(inputData.topic, (err) => {
            if (err)
              log.error(
                `MQTT Input Row ${row.id}: Error unsubscribing from ${inputData.topic}`,
                err
              )
            else topicsForClient.delete(inputData.topic)

            // If no more subscriptions for this client, consider closing it
            if (topicsForClient.size === 0) {
              log.info(
                `MQTT Input Row ${row.id}: No more subscriptions for ${clientKey}. Closing client.`
              )
              client?.end(true)
              mqttClients.delete(clientKey)
              clientStatus.delete(clientKey)
              clientSubscriptions.delete(clientKey)
            }
          })
        }
      }
    }
  }, [
    inputData.topic,
    inputData.useProfileId,
    inputData.customHost,
    inputData.customUsername,
    inputData.customPassword,
    inputData.customClientId,
    inputData.jsonPath,
    row.id,
    brokerProfiles
  ]) // Re-run if config changes
}

// --- useOutputActions: Handles publishing MQTT messages for a row ---
export const useOutputActions = (row: Row) => {
  const { output } = row
  const outputData = output.data as MqttOutputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  useEffect(() => {
    const effectiveConfig = getEffectiveBrokerConfig(outputData, brokerProfiles)

    const ioListener = (event: CustomEvent) => {
      if (event.detail?.rowId === row.id || event.detail === row.id) {
        // Handle both payload and simple ID
        if (!effectiveConfig || !outputData.topic || outputData.payload === undefined) {
          log.error(
            `MQTT Output Row ${row.id}: Missing effective config, topic, or payload. Cannot publish.`
          )
          return
        }
        log.info(`MQTT Output Row ${row.id}: Triggered. Publishing to ${outputData.topic}`)

        const clientKey = getClientKey(effectiveConfig)
        let client = mqttClients.get(clientKey)

        const publishMessage = (activeClient: mqtt.MqttClient) => {
          activeClient.publish(
            outputData.topic,
            outputData.payload,
            { qos: outputData.qos ?? 0, retain: outputData.retain ?? false },
            (err) => {
              if (err) {
                log.error(
                  `MQTT Output Row ${row.id}: Failed to publish to ${outputData.topic}`,
                  err
                )
              } else {
                log.success(
                  `MQTT Output Row ${row.id}: Published to ${outputData.topic}:`,
                  outputData.payload
                )
              }
            }
          )
        }

        if (client && client.connected) {
          publishMessage(client)
        } else if (client && !client.connected && !client.reconnecting) {
          // If client exists but is effectively closed
          log.info(
            `MQTT Output Row ${row.id}: Client ${clientKey} exists but not connected/reconnecting. Attempting to reconnect and publish.`
          )
          client.end(true, () => {
            mqttClients.delete(clientKey)
            clientStatus.delete(clientKey)
            clientSubscriptions.delete(clientKey) // If output actions also manage subscriptions (unlikely here but good practice)
            connectAndPublish()
          })
        } else if (client && client.reconnecting) {
          log.info(
            `MQTT Output Row ${row.id}: Client ${clientKey} is reconnecting. Publish will be attempted on connect by 'connectAndPublish'.`
          )
          // Potentially wait for connect, or let connectAndPublish handle it.
          // For now, if it's reconnecting, connectAndPublish will also be called if there was no client.
          // If there IS a client and it's reconnecting, maybe we just queue the message or log.
          // For simplicity, let's assume connectAndPublish will create a new one if this one is problematic.
          connectAndPublish() // This might create a parallel client if the existing one is stuck reconnecting.
          // A more robust solution would be a message queue per client.
        } else {
          // No client, or client in an unknown state
          connectAndPublish()
        }

        function connectAndPublish() {
          log.info(
            `MQTT Output Row ${row.id}: Client ${clientKey} not connected/found. Connecting to publish.`
          )
          clientStatus.set(clientKey, 'connecting')
          const newClient = mqtt.connect(effectiveConfig!.host, {
            // Assert effectiveConfig exists
            clientId: effectiveConfig!.clientId,
            username: effectiveConfig!.username,
            password: effectiveConfig!.password
          })
          mqttClients.set(clientKey, newClient)
          client = newClient

          client.on('connect', () => {
            log.success(
              `MQTT Output Row ${row.id}: Connected to ${effectiveConfig!.host} for publishing.`
            )
            clientStatus.set(clientKey, 'connected')
            publishMessage(client!)
            // Potentially close after publish if it's a one-shot? Or keep alive? Keep alive for now.
            // client.end();
          })
          client.on('error', (err) => {
            log.error(
              `MQTT Output Row ${row.id}: Client error for ${clientKey} during publish attempt:`,
              err.message
            )
            clientStatus.set(clientKey, 'error')
            client?.end(true) // End on error to allow fresh connect next time
            mqttClients.delete(clientKey)
            clientStatus.delete(clientKey)
          })
        }
      }
    }

    window.addEventListener('io_input', ioListener as EventListener)
    return () => {
      window.removeEventListener('io_input', ioListener as EventListener)
    }
  }, [row.id, outputData, brokerProfiles]) // Re-run if config changes
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const inputData = input.data as MqttInputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  let displayHost = 'Unknown Host'
  if (inputData.useProfileId) {
    const profile = brokerProfiles.find((p) => p.id === inputData.useProfileId)
    displayHost = profile ? `${profile.name} (Profile)` : 'Invalid Profile'
  } else if (inputData.customHost) {
    displayHost = inputData.customHost
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflow: 'hidden' }}>
      <DisplayButtons data={{ ...input, name: 'MQTT In' }} />{' '}
      {/* Shows module icon + override name */}
      <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: '#888',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={inputData.topic}
        >
          Topic: {inputData.topic || 'Not Set'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={displayHost}
        >
          Broker: {displayHost}
        </Typography>
      </Box>
    </Box>
  )
}

// --- OutputDisplay: UI for showing configured MQTT Output in a row ---
export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  const outputData = output.data as MqttOutputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  let displayHost = 'Unknown Host'
  if (outputData.useProfileId) {
    const profile = brokerProfiles.find((p) => p.id === outputData.useProfileId)
    displayHost = profile ? `${profile.name} (Profile)` : 'Invalid Profile'
  } else if (outputData.customHost) {
    displayHost = outputData.customHost
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflow: 'hidden' }}>
      <DisplayButtons data={{ ...output, name: 'MQTT Out' }} />{' '}
      {/* Shows module icon + override name */}
      <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
        <Typography
          variant="body2"
          sx={{
            color: '#888',
            fontStyle: 'italic',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={outputData.topic}
        >
          Topic: {outputData.topic || 'Not Set'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={displayHost}
        >
          Broker: {displayHost}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={outputData.payload}
        >
          Payload:{' '}
          {outputData.payload
            ? outputData.payload.length > 20
              ? outputData.payload.substring(0, 17) + '...'
              : outputData.payload
            : 'N/A'}
        </Typography>
      </Box>
    </Box>
  )
}
