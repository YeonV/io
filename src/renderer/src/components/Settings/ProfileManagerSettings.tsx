// src/renderer/src/components/Settings/ProfileManagerSettings.tsx
import type { FC } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ProfileDefinition, Row } from '@shared/types'
import {
  Box,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  FormControlLabel,
  ListSubheader,
  Tooltip,
  Stack,
  SelectChangeEvent,
  FormHelperText
} from '@mui/material'
import {
  AddCircleOutline,
  Delete,
  Edit,
  CheckCircle,
  RadioButtonUnchecked,
  People,
  PersonAdd,
  ManageAccounts,
  Info,
  Settings
} from '@mui/icons-material'
import { v4 as uuidv4 } from 'uuid'
import { log } from '@/utils'
import IoIcon from '../IoIcon/IoIcon'
// Assume you have an IconPicker component or a simple TextField for icon names for now
// import IconPicker from '../IconPicker';

// --- Profile Editor Dialog ---
interface ProfileEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (profileData: Omit<ProfileDefinition, 'id'> & { id?: string }) => void // id is optional for new
  initialProfile?: ProfileDefinition | null
  allRows: Record<string, Row> // To list rows for inclusion
}

const ProfileEditorDialog: FC<ProfileEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  initialProfile,
  allRows
}) => {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('people')
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialProfile) {
        setName(initialProfile.name || '')
        setIcon(initialProfile.icon || 'people')
        setSelectedRowIds([...initialProfile.includedRowIds])
        setCurrentProfileId(initialProfile.id)
      } else {
        setName('')
        setIcon('people')
        setSelectedRowIds([])
        setCurrentProfileId(null)
      }
    }
  }, [open, initialProfile])

  const handleRowToggle = (rowId: string) =>
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    )
  const handleSave = () => {
    if (!name.trim()) {
      alert('Profile name is required.')
      return
    }
    onSave({ id: currentProfileId || undefined, name, icon, includedRowIds: selectedRowIds })
    onClose()
  }
  const sortedRowsArray = useMemo(
    () =>
      Object.values(allRows).sort((a, b) =>
        (a.output.name || a.id).localeCompare(b.output.name || b.id)
      ),
    [allRows]
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault()
          handleSave()
        }
      }}
    >
      <DialogTitle>{initialProfile ? 'Edit' : 'Create New'} Profile</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Profile Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Profile Icon (MUI Icon Name)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            fullWidth
            helperText="e.g., work, home, sports_esports"
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Include Rows in this Profile:
          </Typography>
          {Object.keys(allRows).length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No rows configured yet.
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto' }}>
              <List dense>
                {sortedRowsArray.map((row) => (
                  <ListItem
                    key={row.id}
                    dense
                    disablePadding
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        onChange={() => handleRowToggle(row.id)}
                        checked={selectedRowIds.includes(row.id)}
                      />
                    }
                    onClick={() => handleRowToggle(row.id)}
                  >
                    <ListItemIcon sx={{ minWidth: 30 }}>
                      {selectedRowIds.includes(row.id) ? (
                        <CheckCircle color="primary" fontSize="small" />
                      ) : (
                        <RadioButtonUnchecked fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={row.output.name || `Row ${row.id.substring(0, 8)}...`}
                      secondary={`${row.inputModule} → ${row.outputModule}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {' '}
        <Button onClick={onClose}>Cancel</Button>{' '}
        <Button type="submit" variant="contained">
          Save Profile
        </Button>{' '}
      </DialogActions>
    </Dialog>
  )
}

// --- Main Settings Widget for Profiles ---
export const ProfileManagerSettings: FC = () => {
  const profiles = useMainStore((state) => state.profiles)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const allRows = useMainStore((state) => state.rows)

  const addProfile = useMainStore((state) => state.addProfile)
  const updateProfile = useMainStore((state) => state.updateProfile)
  const deleteProfile = useMainStore((state) => state.deleteProfile)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  const [manageProfilesDialogOpen, setManageProfilesDialogOpen] = useState(false) // For the list of profiles
  const [profileEditorOpen, setProfileEditorOpen] = useState(false) // For Add/Edit individual profile
  const [editingProfile, setEditingProfile] = useState<ProfileDefinition | null>(null)

  const sortedProfiles = useMemo(
    () => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  )

  const handleOpenProfileManager = () => setManageProfilesDialogOpen(true)
  const handleCloseProfileManager = () => setManageProfilesDialogOpen(false)

  const handleAddNewProfileFromManager = () => {
    setEditingProfile(null) // Clear for new profile
    setProfileEditorOpen(true) // Open editor
    // setManageProfilesDialogOpen(false); // Keep manager open or close? User preference. Let's keep it open.
  }

  const handleEditProfileFromManager = (profile: ProfileDefinition) => {
    setEditingProfile(profile)
    setProfileEditorOpen(true)
    // setManageProfilesDialogOpen(false); // Keep manager open.
  }

  const handleDeleteProfileInManager = (profileId: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the profile "${profiles[profileId]?.name || profileId}"?`
      )
    ) {
      deleteProfile(profileId)
      // If the deleted profile was being edited, close the editor
      if (editingProfile?.id === profileId) {
        setProfileEditorOpen(false)
        setEditingProfile(null)
      }
    }
  }

  const handleSaveProfileFromEditor = (
    profileData: Omit<ProfileDefinition, 'id'> & { id?: string }
  ) => {
    if (profileData.id) {
      // Editing existing
      updateProfile(profileData.id, profileData)
    } else {
      // Adding new
      addProfile(profileData.name, profileData.icon, profileData.includedRowIds)
      console.log('EYYYYY', profileData)
    }
    setProfileEditorOpen(false) // Close editor after save
    setEditingProfile(null)
    // setManageProfilesDialogOpen(true); // Ensure manager dialog is visible if it was closed
  }

  const handleSetActiveProfile = (event: SelectChangeEvent<string>) => {
    console.log('WTF', event.target.value)
    setActiveProfile(event.target.value || null)
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        boxsizing: 'border-box',
        marginTop: '0.5rem'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="overline">Active Profile</Typography>
      </Box>
      <FormControl fullWidth size="small">
        {/* Removed InputLabel and FormHelperText for cleaner look if desired for this specific dropdown */}
        <Select
          value={activeProfileId || ''}
          onChange={handleSetActiveProfile}
          displayEmpty
          sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
        >
          <MenuItem value="">
            <em>None (All Rows Considered)</em>
          </MenuItem>
          {sortedProfiles.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ '& .MuiSelect-select': { display: 'flex' } }}>
              <ListItemIcon sx={{ minWidth: 32, mr: 0.5 }}>
                <IoIcon name={p.icon && p.icon !== '' ? p.icon : 'people'} />
              </ListItemIcon>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        startIcon={<Settings />}
        onClick={handleOpenProfileManager}
        variant="outlined"
        size="small"
        sx={{ height: 41 }}
        fullWidth
      >
        Manage Profiles
      </Button>

      {/* Dialog to List/Edit/Delete Profiles */}
      <Dialog
        open={manageProfilesDialogOpen}
        onClose={handleCloseProfileManager}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Manage IO Profiles
          <Button
            onClick={handleAddNewProfileFromManager}
            startIcon={<PersonAdd />}
            variant="outlined"
            size="small"
          >
            Add New Profile
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {sortedProfiles.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
              No profiles defined yet. Click &quot;Add New Profile&quot; to create one.
            </Typography>
          ) : (
            <List dense>
              {sortedProfiles.map((p) => (
                <ListItem
                  key={p.id}
                  secondaryAction={
                    <>
                      <Tooltip title="Edit Profile">
                        <IconButton size="small" onClick={() => handleEditProfileFromManager(p)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Profile">
                        <IconButton size="small" onClick={() => handleDeleteProfileInManager(p.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <IoIcon name={p.icon && p.icon !== '' ? p.icon : 'people'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.includedRowIds.length} rows included. ${activeProfileId === p.id ? '(Active)' : ''}`}
                    primaryTypographyProps={{
                      fontWeight: activeProfileId === p.id ? 'bold' : 'normal'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProfileManager}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Adding/Editing a single profile (reused) */}
      <ProfileEditorDialog
        open={profileEditorOpen}
        onClose={() => {
          setProfileEditorOpen(false)
          setEditingProfile(null)
        }}
        onSave={handleSaveProfileFromEditor}
        initialProfile={editingProfile}
        allRows={allRows}
      />
    </Paper>
  )
}

// Make sure to export it if it's not the default, or make it default
export default ProfileManagerSettings
