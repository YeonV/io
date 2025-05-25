// src/renderer/src/modules/Mqtt/Mqtt.tsx

import type { FC } from 'react'
import { useEffect, useState, useRef } from 'react'
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
  FormHelperText,
  Grid,
  Stack,
  type SelectChangeEvent,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material'
import { AddCircleOutline, Delete, Edit, AddLink, Add } from '@mui/icons-material'
import ConfirmDialog from '@/components/utils/ConfirmDialog';
import { log } from '@/utils'
import { v4 as uuidv4 } from 'uuid'
import DisplayButtons from '@/components/Row/DisplayButtons'
import type { IClientPublishOptions } from 'mqtt' // Corrected import for MQTT types
import { mqttTopicMatch } from './Mqtt.helper'
import { useRowActivation } from '@/hooks/useRowActivation'
import { MqttBrokerConfig, MqttModuleCustomConfig } from './Mqtt.types'

const ipcRenderer = window.electron?.ipcRenderer

// --- Row Data Types for this Module ---
export interface MqttInputRowData {
  profileId?: string // ID of the selected broker profile
  topic: string
  jsonPath?: string
  matchPayload?: string
  matchType?: 'exact' | 'contains' | 'regex'
}
export interface MqttOutputRowData {
  profileId?: string // ID of the selected broker profile
  topic: string
  payload: string
  retain?: boolean
  qos?: 0 | 1 | 2
}

// --- Module Definition ---
export const id = 'mqtt-module'
export const moduleConfig: ModuleConfig<MqttModuleCustomConfig> = {
  menuLabel: 'Network',
  description: 'Send and receive messages via MQTT protocol',
  inputs: [{ icon: 'rss_feed', name: 'MQTT Message', editable: true }],
  outputs: [{ icon: 'publish', name: 'Publish MQTT Message', editable: true }],
  config: {
    enabled: true,
    brokerConnections: [
      {
        id: uuidv4(),
        name: 'Local Mosquitto (Example)',
        host: 'mqtt://localhost:1883',
        clientId: `io_client_${Math.random().toString(16).slice(2, 6)}`
      }
    ]
  }
}

// --- Reusable Broker Profile Editor Dialog ---
const BrokerProfileDialog: FC<{
  open: boolean
  onClose: () => void
  onSave: (profile: MqttBrokerConfig) => void
  initialProfile?: MqttBrokerConfig | null // For editing existing or adding new
}> = ({ open, onClose, onSave, initialProfile }) => {
  const [profileName, setProfileName] = useState('')
  const [host, setHost] = useState('mqtt://')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [clientId, setClientId] = useState('')
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialProfile) {
        setProfileName(initialProfile.name || '')
        setHost(initialProfile.host || 'mqtt://')
        setUsername(initialProfile.username || '')
        setPassword(initialProfile.password || '')
        setClientId(initialProfile.clientId || '')
        setCurrentProfileId(initialProfile.id)
      } else {
        // New profile
        setProfileName('')
        setHost('mqtt://')
        setUsername('')
        setPassword('')
        setClientId(`io_client_${Math.random().toString(16).slice(2, 10)}`) // Default new client ID
        setCurrentProfileId(null) // Indicate it's a new profile
      }
    }
  }, [open, initialProfile])

  const handleSaveAction = () => {
    if (!profileName.trim() || !host.trim()) {
      alert('Profile Name and Host URL are required.')
      return
    }
    if (
      !host.startsWith('mqtt://') &&
      !host.startsWith('ws://') &&
      !host.startsWith('mqtts://') &&
      !host.startsWith('wss://')
    ) {
      alert('Host URL must start with a valid protocol (e.g., mqtt://, ws://, mqtts://, wss://).')
      return
    }
    onSave({
      id: currentProfileId || uuidv4(), // Use existing ID if editing, else new
      name: profileName,
      host,
      username,
      password,
      clientId
    })
    onClose() // Close dialog after save
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault()
          handleSaveAction()
        }
      }}
    >
      <DialogTitle>{initialProfile ? 'Edit' : 'Add New'} MQTT Broker Profile</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Profile Name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Host URL (e.g., mqtt://host:port)"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Username (Optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password (Optional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Client ID (Optional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            fullWidth
            helperText="Leave blank for auto-generated if supported by broker for custom."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          Save Profile
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// --- Global Settings Component for MQTT Module ---
export const Settings: FC = () => {
  const moduleCfg = useMainStore(
    (state) =>
      state.modules[id]?.config as (ModuleDefaultConfig & MqttModuleCustomConfig) | undefined
  )
  const brokerConnections = moduleCfg?.brokerConnections || []

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<MqttBrokerConfig | null>(null)

  const openAddDialog = () => {
    setEditingProfile(null)
    setAddEditDialogOpen(true)
    setManageDialogOpen(false)
  }
  const openEditDialogFromManage = (profile: MqttBrokerConfig) => {
    setEditingProfile(profile)
    setAddEditDialogOpen(true)
    setManageDialogOpen(false)
  }
  const handleDeleteProfile = (profileId: string) => {
    setConfirmDialogTitle('Delete MQTT Profile');
    setConfirmDialogMessage('Are you sure you want to delete this profile? Rows using it will need reconfiguration.');
    setConfirmAction(() => () => {
      setModuleConfig(
        id,
        'brokerConnections',
        brokerConnections.filter((p) => p.id !== profileId)
      );
    });
    setConfirmDialogOpen(true);
  };
  const handleSaveProfileCallback = (profileToSave: MqttBrokerConfig) => {
    let updatedConnections
    const existing = brokerConnections.find((p) => p.id === profileToSave.id)
    if (existing) {
      updatedConnections = brokerConnections.map((p) =>
        p.id === profileToSave.id ? profileToSave : p
      )
    } else {
      updatedConnections = [...brokerConnections, profileToSave] // ID already set by dialog
    }
    setModuleConfig(id, 'brokerConnections', updatedConnections)
    setAddEditDialogOpen(false) // Close the add/edit dialog
  }

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, minWidth: 250, display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Typography variant="overline">MQTT Broker Profiles</Typography>
      <Button
        startIcon={<Edit />}
        onClick={() => setManageDialogOpen(true)}
        variant="outlined"
        size="small"
        sx={{ height: 41 }}
        fullWidth
      >
        Manage Profiles ({brokerConnections.length})
      </Button>
      <Button
        startIcon={<AddCircleOutline />}
        onClick={openAddDialog}
        variant="outlined"
        size="small"
        sx={{ height: 41 }}
        fullWidth
      >
        Add New Profile
      </Button>

      <Dialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Manage MQTT Broker Profiles</DialogTitle>
        <DialogContent>
          <List dense>
            {brokerConnections.map((p) => (
              <ListItem
                key={p.id}
                secondaryAction={
                  <>
                    <IconButton
                      title="Edit Profile"
                      size="small"
                      onClick={() => openEditDialogFromManage(p)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      title="Delete Profile"
                      size="small"
                      onClick={() => handleDeleteProfile(p.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </>
                }
              >
                <ListItemText primary={p.name} secondary={p.host} />
              </ListItem>
            ))}
            {brokerConnections.length === 0 && (
              <ListItem>
                <ListItemText secondary="No profiles. Click 'Add New Profile' to create one." />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={openAddDialog} startIcon={<AddCircleOutline />}>
            Add New Profile
          </Button>
          <Button onClick={() => setManageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <BrokerProfileDialog
        open={addEditDialogOpen}
        onClose={() => setAddEditDialogOpen(false)}
        onSave={handleSaveProfileCallback}
        initialProfile={editingProfile}
      />
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
          }
          setConfirmDialogOpen(false);
          setConfirmAction(null);
        }}
        title={confirmDialogTitle}
        message={confirmDialogMessage}
      />
    </Paper>
  )
}

// --- InputEdit ---
export const InputEdit: FC<{
  input: InputData
  onChange: (data: Partial<MqttInputRowData>) => void
}> = ({ input, onChange }) => {
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )
  const currentData = input.data as Partial<MqttInputRowData>
  const [addProfileDialogOpen, setAddProfileDialogOpen] = useState(false)
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const handleProfileSelectChange = (event: SelectChangeEvent<string>) => {
    onChange({ profileId: event.target.value || undefined })
  }
  const handleAddNewProfile = () => setAddProfileDialogOpen(true)
  const handleSaveNewProfile = (profileToSave: MqttBrokerConfig) => {
    const newProfileWithId = { ...profileToSave, id: profileToSave.id || uuidv4() } // Ensure ID
    const currentGlobalProfiles =
      (useMainStore.getState().modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
    setModuleConfig(id, 'brokerConnections', [...currentGlobalProfiles, newProfileWithId])
    onChange({ profileId: newProfileWithId.id })
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="textSecondary">
        Broker Connection
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <FormControl fullWidth margin="dense" size="small" sx={{ flexGrow: 1 }}>
          <InputLabel id={`mqtt-input-profile-label-${input.name}`}>Broker Profile *</InputLabel>
          <Select
            labelId={`mqtt-input-profile-label-${input.name}`}
            value={currentData.profileId || ''}
            label="Broker Profile *"
            onChange={handleProfileSelectChange}
            required
            sx={{ height: '56px' }}
          >
            <MenuItem value="" disabled>
              <em>Select a profile...</em>
            </MenuItem>
            {brokerProfiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.host})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title="Add New Broker Profile">
          <span>
            {/* IconButton disabled state needs a span wrapper for Tooltip */}
            <IconButton onClick={handleAddNewProfile} size="medium" sx={{ mb: '4px' }}>
              <AddLink />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <BrokerProfileDialog
        open={addProfileDialogOpen}
        onClose={() => setAddProfileDialogOpen(false)}
        onSave={handleSaveNewProfile}
        initialProfile={null}
      />

      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="textSecondary">
        Subscription Details
      </Typography>
      <TextField
        label="Topic to Subscribe *"
        value={currentData.topic || ''}
        onChange={(e) => onChange({ topic: e.target.value })}
        fullWidth
        size="small"
        margin="dense"
        required
        sx={{ m: 0 }}
      />
      <TextField
        label="JSONPath Filter (Optional)"
        value={currentData.jsonPath || ''}
        onChange={(e) => onChange({ jsonPath: e.target.value })}
        fullWidth
        size="small"
        margin="dense"
        helperText="e.g., $.value or data.temperature"
        sx={{ m: 0 }}
      />

      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
        Payload Condition (Optional)
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField
            label="Trigger if payload..."
            value={currentData.matchPayload || ''}
            onChange={(e) => onChange({ matchPayload: e.target.value })}
            fullWidth
            size="small"
            margin="dense"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <FormControl fullWidth size="small" margin="dense" disabled={!currentData.matchPayload}>
            <InputLabel>Match Type</InputLabel>
            <Select
              value={currentData.matchType || 'exact'}
              label="Match Type"
              onChange={(e) =>
                onChange({ matchType: e.target.value as MqttInputRowData['matchType'] })
              }
            >
              <MenuItem value="exact">Exactly Matches</MenuItem>
              <MenuItem value="contains">Contains</MenuItem>
              <MenuItem value="regex">Matches Regex</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      <FormHelperText sx={{ ml: 1 }}>empty triggers on any message...</FormHelperText>
    </Box>
  )
}

// --- OutputEdit: REVISED (Similar to InputEdit) ---
export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Partial<MqttOutputRowData>) => void
}> = ({ output, onChange }) => {
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )
  const currentData = output.data as Partial<MqttOutputRowData>
  const [addProfileDialogOpen, setAddProfileDialogOpen] = useState(false)
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)
  const handleProfileSelectChange = (event: SelectChangeEvent<string>) =>
    onChange({ profileId: event.target.value || undefined })
  const handleAddNewProfile = () => setAddProfileDialogOpen(true)
  const handleSaveNewProfile = (profileToSave: MqttBrokerConfig) => {
    const newProfileWithId = { ...profileToSave, id: profileToSave.id || uuidv4() }
    const currentGlobalProfiles =
      (useMainStore.getState().modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
    setModuleConfig(id, 'brokerConnections', [...currentGlobalProfiles, newProfileWithId])
    onChange({ profileId: newProfileWithId.id })
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="caption" color="textSecondary">
        Broker Connection
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <FormControl fullWidth margin="dense" size="small" sx={{ flexGrow: 1 }}>
          <InputLabel id={`mqtt-output-profile-label-${output.name}`}>Broker Profile *</InputLabel>
          <Select
            labelId={`mqtt-output-profile-label-${output.name}`}
            value={currentData.profileId || ''}
            label="Broker Profile *"
            onChange={handleProfileSelectChange}
            required
          >
            <MenuItem value="" disabled>
              <em>Select a profile...</em>
            </MenuItem>
            {brokerProfiles.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} ({p.host})
              </MenuItem>
            ))}
          </Select>
          {brokerProfiles.length === 0 && (
            <FormHelperText error>No profiles. Add one with (+).</FormHelperText>
          )}
          {!currentData.profileId && brokerProfiles.length > 0 && (
            <FormHelperText error>Profile selection is required.</FormHelperText>
          )}
        </FormControl>
        <Tooltip title="Add New Broker Profile">
          <span>
            <IconButton onClick={handleAddNewProfile} size="medium" sx={{ mb: '4px' }}>
              <Add />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <BrokerProfileDialog
        open={addProfileDialogOpen}
        onClose={() => setAddProfileDialogOpen(false)}
        onSave={handleSaveNewProfile}
        initialProfile={null}
      />
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" color="textSecondary">
        Publication Details
      </Typography>
      <TextField
        label="Topic to Publish *"
        value={currentData.topic || ''}
        onChange={(e) => onChange({ topic: e.target.value })}
        fullWidth
        size="small"
        margin="dense"
        required
      />
      <TextField
        label="Payload (Message) *"
        value={currentData.payload || ''}
        onChange={(e) => onChange({ payload: e.target.value })}
        fullWidth
        size="small"
        margin="dense"
        required
        multiline
        rows={2}
      />
      <Grid container spacing={1} alignItems="center">
        <Grid>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={currentData.retain ?? false}
                onChange={(e) => onChange({ retain: e.target.checked })}
              />
            }
            label="Retain"
          />
        </Grid>
        <Grid>
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>QoS</InputLabel>
            <Select
              value={currentData.qos ?? 0}
              label="QoS"
              onChange={(e) => onChange({ qos: Number(e.target.value) as 0 | 1 | 2 })}
            >
              <MenuItem value={0}>0</MenuItem>
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  )
}

// --- InputDisplay & OutputDisplay (Helper to display resolved broker info) ---
function resolveBrokerConfigForRowDisplay(
  rowData: Partial<MqttInputRowData | MqttOutputRowData>,
  profiles: MqttBrokerConfig[]
): Partial<MqttBrokerConfig> {
  if (rowData.profileId) {
    const profile = profiles.find((p) => p.id === rowData.profileId)
    return profile ? { name: profile.name, host: profile.host } : { name: 'Invalid/No Profile' }
  }
  return { name: 'Profile Not Set' }
}
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const d = input.data as MqttInputRowData
  const ps = useMainStore(
    (s) =>
      (s.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)?.brokerConnections ||
      []
  )
  const brokerDisplay = resolveBrokerConfigForRowDisplay(d, ps)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflow: 'hidden' }}>
      <DisplayButtons data={{ ...input, name: 'MQTT In' }} />
      <Button
        size="small"
        disabled
        variant="outlined"
        color="primary"
        sx={{
          fontSize: 10,
          minWidth: '45px',
          justifyContent: 'flex-start',
          mr: 1,
          ml: -1
        }}
      >
        {brokerDisplay.name}
      </Button>
      <Button
        size="small"
        disabled
        variant="outlined"
        sx={{
          fontSize: 10,
          minWidth: '45px',
          justifyContent: 'flex-start',
          mr: 1,
          ml: -1
        }}
      >
        {d.topic || 'N/A'}
      </Button>
    </Box>
  )
}
export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  const d = output.data as MqttOutputRowData
  const ps = useMainStore(
    (s) =>
      (s.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)?.brokerConnections ||
      []
  )
  const brokerDisplay = resolveBrokerConfigForRowDisplay(d, ps)
  const pl = d.payload
    ? d.payload.length > 15
      ? d.payload.substring(0, 12) + '...'
      : d.payload
    : 'N/A'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflow: 'hidden' }}>
      <DisplayButtons data={{ ...output, name: 'MQTT Out' }} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexGrow: 1,
          textAlign: 'left'
        }}
      >
        <Typography noWrap variant="body2" title={d.topic}>
          T: {d.topic || 'N/A'}
        </Typography>
        <Typography noWrap variant="caption" title={brokerDisplay.host}>
          B: {brokerDisplay.name}
        </Typography>
        <Typography noWrap variant="caption" title={d.payload}>
          P: {pl}
        </Typography>
      </Box>
    </Box>
  )
}

// --- resolveBrokerConfigForRow (For action hooks, expects profileId to be set) ---
function resolveBrokerConfigForRow(
  rowData: MqttInputRowData | MqttOutputRowData,
  profiles: MqttBrokerConfig[]
): MqttBrokerConfig | null {
  if (rowData.profileId) {
    const profile = profiles.find((p) => p.id === rowData.profileId)
    if (!profile) log.info1(`MQTT: Profile ID '${rowData.profileId}' not found in global profiles.`)
    return profile || null
  }
  log.info1('MQTT: resolveBrokerConfigForRow - No profileId in rowData.', rowData)
  return null
}

// --- useGlobalActions ---
export const useGlobalActions = () => {
  const [clientStatuses, setClientStatuses] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!ipcRenderer) return
    const listener = (
      _event: any,
      data: { clientKey: string; status: string; host: string; message?: string }
    ) => {
      log.info(
        `MQTT Client Status [${data.host} / ${data.clientKey}]: ${data.status}`,
        data.message || ''
      )
      log.info(`EYYYYYY`, clientStatuses)
      setClientStatuses((prev) => ({ ...prev, [data.clientKey]: data.status }))
    }
    ipcRenderer.on('mqtt-client-status', listener)
    return () => {
      ipcRenderer.removeListener('mqtt-client-status', listener)
    }
  }, [])
  // For future UI feedback on connection statuses
  return null
}

// --- useInputActions ---
export const useInputActions = (row: Row) => {
  const { input } = row
  const { isActive, inactiveReason } = useRowActivation(row)
  const inputData = input.data as MqttInputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )
  const clientKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isActive) {
      log.info(`Row ${row.id} actions not running. Reason: ${inactiveReason}.`)
      return () => {} // Return empty cleanup if disabled from the start
    }
    if (!ipcRenderer || !inputData.profileId) {
      // Require profileId
      clientKeyRef.current = null // Clear if no profile
      return
    }

    const effectiveConfig = resolveBrokerConfigForRow(inputData, brokerProfiles)
    if (!effectiveConfig || !inputData.topic) {
      log.info1(`MQTT Input Row ${row.id}: No valid broker config or topic for subscription.`)
      clientKeyRef.current = null
      return
    }

    log.info(
      `MQTT Input Row ${row.id}: Requesting subscription to topic '${inputData.topic}' on broker '${effectiveConfig.host}'`
    )
    ipcRenderer
      .invoke('mqtt-subscribe', {
        brokerConfig: effectiveConfig,
        topic: inputData.topic,
        rowId: row.id
      })
      .then((result) => {
        if (result?.success && result.clientKey) clientKeyRef.current = result.clientKey
        else clientKeyRef.current = null
        log.info(
          `MQTT Input Row ${row.id}: Subscribe IPC result (ClientKey: ${clientKeyRef.current}):`,
          result
        )
      })
      .catch((err) => {
        log.error(`MQTT Input Row ${row.id}: Subscribe IPC error:`, err)
        clientKeyRef.current = null
      })

    const messageListener = (
      _event: any,
      data: { clientKey: string; topic: string; payloadString: string; brokerHost: string }
    ) => {
      log.info(
        `MQTT Row ${row.id} messageListener: IPC data received. My clientKeyRef.current='${clientKeyRef.current}', My subscribed pattern='${inputData.topic}', Msg topic='${data.topic}'`
      )

      if (
        clientKeyRef.current &&
        data.clientKey === clientKeyRef.current &&
        mqttTopicMatch(data.topic, inputData.topic)
      ) {
        log.info(
          `MQTT Input Row ${row.id} (ClientKey: ${clientKeyRef.current}): Matched message for topic pattern '${inputData.topic}' (actual: '${data.topic}'). Payload:`,
          data.payloadString
        )

        let finalPayload: any = data.payloadString
        let extractedValueForMatching: any = data.payloadString
        if (inputData.jsonPath) {
          try {
            const parsed = JSON.parse(data.payloadString)
            const parts = inputData.jsonPath.replace(/^\$\.?/, '').split('.')
            let val = parsed
            for (const p of parts) {
              if (val && typeof val === 'object' && p in val) val = val[p]
              else {
                val = undefined
                break
              }
            }
            finalPayload = val
            extractedValueForMatching = finalPayload // Match on extracted value if JSONPath is used
          } catch (e) {
            log.info1(
              `MQTT Input Row ${row.id}: JSONPath error for '${inputData.jsonPath}' on payload '${data.payloadString}'. Using raw.`,
              e
            )
          }
        }

        let trigger = true
        if (inputData.matchPayload !== undefined && inputData.matchPayload.trim() !== '') {
          const actualPayloadToMatch = String(extractedValueForMatching)
          const targetMatch = inputData.matchPayload
          switch (inputData.matchType) {
            case 'contains':
              trigger = actualPayloadToMatch.includes(targetMatch)
              break
            case 'regex':
              try {
                trigger = new RegExp(targetMatch).test(actualPayloadToMatch)
              } catch (e) {
                log.error(`MQTT Row ${row.id}: Invalid Regex: ${targetMatch}`, e)
                trigger = false
              }
              break
            default:
              trigger = actualPayloadToMatch === targetMatch
              break
          }
          log.info(
            `MQTT Row ${row.id}: Payload matching: '${actualPayloadToMatch}' ${inputData.matchType || 'exact'} '${targetMatch}' -> ${trigger}`
          )
        }

        if (trigger) {
          log.success(`MQTT Row ${row.id}: Triggering action. Final payload:`, finalPayload)
          window.dispatchEvent(
            new CustomEvent('io_input', { detail: { rowId: row.id, payload: finalPayload } })
          )
        }
      }
    }
    ipcRenderer.on('mqtt-message-received', messageListener)

    return () => {
      const currentEffectiveConfig = resolveBrokerConfigForRow(inputData, brokerProfiles)
      if (ipcRenderer && currentEffectiveConfig && inputData.topic) {
        log.info(
          `MQTT Input Row ${row.id}: Cleaning up. Unsubscribing from '${inputData.topic}' on '${currentEffectiveConfig.host}'`
        )
        ipcRenderer.invoke('mqtt-unsubscribe', {
          brokerConfig: currentEffectiveConfig,
          topic: inputData.topic,
          rowId: row.id
        })
      }
      ipcRenderer?.removeListener('mqtt-message-received', messageListener)
      clientKeyRef.current = null
    }
  }, [
    inputData.profileId,
    inputData.topic,
    inputData.jsonPath,
    inputData.matchPayload,
    inputData.matchType,
    row.id,
    brokerProfiles,
    row.enabled
  ]) // Dependencies updated
}

// --- useOutputActions ---
export const useOutputActions = (row: Row) => {
  const { output } = row
  const outputData = output.data as MqttOutputRowData
  const brokerProfiles = useMainStore(
    (state) =>
      (state.modules[id]?.config as ModuleDefaultConfig & MqttModuleCustomConfig)
        ?.brokerConnections || []
  )

  useEffect(() => {
    if (!ipcRenderer || !outputData.profileId) return // Require profileId

    const effectiveConfig = resolveBrokerConfigForRow(outputData, brokerProfiles)

    const ioListener = (event: CustomEvent) => {
      const eventRowId =
        typeof event.detail === 'object' && event.detail !== null
          ? event.detail.rowId
          : event.detail
      if (eventRowId === row.id) {
        if (!effectiveConfig || !outputData.topic || outputData.payload === undefined) {
          log.error(
            `MQTT Output Row ${row.id}: Incomplete config (missing profile, topic, or payload). Cannot publish.`
          )
          return
        }
        log.info(
          `MQTT Output Row ${row.id}: Triggered. Publishing to '${outputData.topic}' on broker '${effectiveConfig.host}'`
        )

        const publishOptions: IClientPublishOptions = {
          qos: outputData.qos ?? 0,
          retain: outputData.retain ?? false
        }
        ipcRenderer
          .invoke('mqtt-publish', {
            brokerConfig: effectiveConfig,
            topic: outputData.topic,
            payload: outputData.payload,
            options: publishOptions
          })
          .then((result) => log.info(`MQTT Output Row ${row.id}: Publish IPC result:`, result))
          .catch((err) => log.error(`MQTT Output Row ${row.id}: Publish IPC error:`, err))
      }
    }
    window.addEventListener('io_input', ioListener as EventListener)
    return () => {
      window.removeEventListener('io_input', ioListener as EventListener)
    }
  }, [
    row.id,
    outputData.profileId,
    outputData.topic,
    outputData.payload,
    outputData.qos,
    outputData.retain,
    brokerProfiles
  ]) // Updated dependencies
}
