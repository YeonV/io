// src/renderer/src/components/Settings/ProfileManagerSettings.tsx
import type { ChangeEvent, FC } from 'react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ProfileDefinition, Row } from '@shared/types' // Ensure all used types are imported
import { v4 as uuidv4 } from 'uuid'
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
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  Tooltip,
  Stack,
  SelectChangeEvent,
  FormControlLabel,
  Switch
} from '@mui/material'
import {
  Delete,
  Edit,
  CheckCircle,
  RadioButtonUnchecked,
  PersonAdd,
  Settings,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon'
import { PlaySoundOutputData } from '@/modules/PlaySound/PlaySound.types'
import { addAudioToDB, getAudioBufferFromDB } from '@/modules/PlaySound/lib/db' // Assuming these are correctly exported
import { arrayBufferToBase64, base64ToArrayBuffer, downloadJsonFile } from '@/utils/utils'

// --- Data Structures for Export/Import ---
interface ProfileExportAudioEntry {
  originalFileName: string
  mimeType: string
  base64Data: string
}
interface ProfileExportFormat {
  profile: ProfileDefinition
  rows: Row[]
  audioData?: Record<string, ProfileExportAudioEntry> // audioId (from exporting system) -> data
}

// --- Profile Editor Dialog (Sub-component) ---
interface ProfileEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (profileData: Omit<ProfileDefinition, 'id'> & { id?: string }) => void
  initialProfile?: ProfileDefinition | null
  allRows: Record<string, Row>
}
const ProfileEditorDialog: FC<ProfileEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  initialProfile,
  allRows
}) => {
  // ... (Your existing, working ProfileEditorDialog implementation)
  // This component doesn't need to change for the import/export of profiles themselves,
  // only for how it gets `allRows` if that's impacted.
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('people')
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  useEffect(() => {
    /* ... logic to set state from initialProfile ... */
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
  const handleSaveDialog = () => {
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
        (a.input.name || a.id).localeCompare(b.input.name || b.id)
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
          handleSaveDialog()
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
                      primary={
                        row.output.label || row.output.name || `Row ${row.id.substring(0, 8)}`
                      }
                      secondary={`${row.input.name} (${row.inputModule.replace('-module', '')}) → ${row.output.name} (${row.outputModule.replace('-module', '')})`}
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
  const addRowAction = useMainStore((state) => state.addRow)

  const [manageProfilesDialogOpen, setManageProfilesDialogOpen] = useState(false)
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileDefinition | null>(null)

  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [includeAudioOnExport, setIncludeAudioOnExport] = useState(true)

  const sortedProfiles = useMemo(
    () => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  )
  const handleOpenProfileManager = () => setManageProfilesDialogOpen(true)
  const handleCloseProfileManager = () => setManageProfilesDialogOpen(false)
  const handleAddNewProfileFromManager = () => {
    setEditingProfile(null)
    setProfileEditorOpen(true)
  }
  const handleEditProfileFromManager = (profile: ProfileDefinition) => {
    setEditingProfile(profile)
    setProfileEditorOpen(true)
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
    }
    setProfileEditorOpen(false) // Close editor after save
    setEditingProfile(null)
    // setManageProfilesDialogOpen(true); // Ensure manager dialog is visible if it was closed
  }
  const handleSetActiveProfile = (event: SelectChangeEvent<string>) => {
    setActiveProfile(event.target.value || null)
  }

  const handleExportProfile = async (profileIdToExport: string) => {
    const profileToExport = profiles[profileIdToExport]
    if (!profileToExport) {
      alert('Profile not found.')
      return
    }

    const includedRowsArray: Row[] = profileToExport.includedRowIds
      .map((rowId) => allRows[rowId])
      .filter((row) => !!row)

    const exportData: ProfileExportFormat = {
      profile: { ...profileToExport }, // Export a clean copy
      rows: includedRowsArray.map((r) => ({ ...r })), // Deep copy rows
      ...(includeAudioOnExport && { audioData: {} })
    }

    if (includeAudioOnExport && exportData.audioData) {
      console.debug('[ExportProfile] Including audio data...')
      for (const row of includedRowsArray) {
        if (row.outputModule === 'playsound-module') {
          const soundData = row.output.data as PlaySoundOutputData
          if (soundData.audioId && !exportData.audioData[soundData.audioId]) {
            try {
              const audioRecord = await getAudioBufferFromDB(soundData.audioId)
              if (audioRecord?.audioBuffer && audioRecord?.mimeType) {
                const base64Data = arrayBufferToBase64(audioRecord.audioBuffer)
                exportData.audioData[soundData.audioId] = {
                  originalFileName: audioRecord.originalFileName,
                  mimeType: audioRecord.mimeType,
                  base64Data: base64Data
                }
                console.debug(`[ExportProfile] Added audio for ${audioRecord.originalFileName}`)
              }
            } catch (err) {
              console.error(`Error fetching/encoding audio ${soundData.audioId}:`, err)
            }
          }
        }
      }
    }
    const fileName = `${profileToExport.name.replace(/[^a-z0-9]/gi, '_') || 'IO_Profile'}.ioProfile`
    downloadJsonFile(exportData, fileName)
    console.info(`[ExportProfile] Profile "${profileToExport.name}" download initiated.`)
  }

  const handleImportProfileClick = () => {
    importFileInputRef.current?.click()
  }

  const handleImportFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.debug('[ImportProfile] File selected:', file.name)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string
        const importedData = JSON.parse(fileContent) as ProfileExportFormat
        console.debug('[ImportProfile] Parsed data:', JSON.parse(JSON.stringify(importedData)))

        if (!importedData.profile || !Array.isArray(importedData.rows)) {
          // Check rows is array
          throw new Error('Invalid profile export file structure (missing profile or rows array).')
        }

        const audioIdMap: Record<string, string> = {} // oldAudioId (from file) -> newAudioId (in local DB)
        if (importedData.audioData) {
          console.debug('[ImportProfile] Processing embedded audio data...')
          for (const oldAudioIdFromFile in importedData.audioData) {
            const audioEntry = importedData.audioData[oldAudioIdFromFile]
            try {
              const audioBuffer = base64ToArrayBuffer(audioEntry.base64Data)
              const newLocalAudioId = await addAudioToDB(
                audioEntry.originalFileName,
                audioEntry.mimeType,
                audioBuffer
              )
              audioIdMap[oldAudioIdFromFile] = newLocalAudioId
              console.debug(
                `[ImportProfile] Imported audio "${audioEntry.originalFileName}" -> new ID ${newLocalAudioId}`
              )
            } catch (err) {
              console.error(`Error importing audio entry ${oldAudioIdFromFile}:`, err)
            }
          }
        }

        const newImportedRowIdsForProfile: string[] = []
        for (const importedRow of importedData.rows) {
          const newRowId = uuidv4() // Always generate new ID for imported row

          const newRowData = { ...importedRow, id: newRowId }
          newImportedRowIdsForProfile.push(newRowId)

          if (newRowData.outputModule === 'playsound-module' && newRowData.output.data.audioId) {
            const oldAudioId = newRowData.output.data.audioId
            const newLocalAudioId = audioIdMap[oldAudioId]
            if (newLocalAudioId) {
              newRowData.output.data.audioId = newLocalAudioId
              // originalFileName should be part of audioEntry and thus re-set from DB or passed along
              const audioEntryFromImport = importedData.audioData?.[oldAudioId]
              newRowData.output.data.originalFileName =
                audioEntryFromImport?.originalFileName || 'Unknown Imported Audio'
              console.debug(
                `[ImportProfile] Mapped audio for new row ${newRowId}: old ${oldAudioId} -> new ${newLocalAudioId}`
              )
            } else {
              console.warn(
                `[ImportProfile] Audio ID ${oldAudioId} for row ${newRowId} not found in mapped audio or import file's audioData. Sound needs re-linking.`
              )
              delete newRowData.output.data.audioId
              delete newRowData.output.data.originalFileName
            }
          }
          addRowAction(newRowData) // Add the processed row to mainStore
        }

        // Create the new profile with new ID, using imported name/icon, and NEW row IDs
        const newProfileName = importedData.profile.name || `Imported Profile ${Date.now()}`
        const newProfileIcon = importedData.profile.icon || 'file_upload'
        const newProfileActualId = addProfile(
          newProfileName,
          newProfileIcon,
          newImportedRowIdsForProfile
        )

        alert(
          `Profile "${newProfileName}" imported successfully with ${newImportedRowIdsForProfile.length} rows!`
        )
        handleCloseProfileManager()
        setActiveProfile(newProfileActualId)
      } catch (error: any) {
        console.error('[ImportProfile] Error parsing or processing profile file:', error)
        alert(`Failed to import profile: ${error.message}`)
      }
    }
    if (file) reader.readAsText(file)
    if (event.target) event.target.value = '' // Reset file input
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 250,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%',
        boxSizing: 'border-box',
        marginTop: '0.5rem'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="overline">Active Profile</Typography>
      </Box>
      <FormControl fullWidth size="small">
        <Select
          value={activeProfileId || ''}
          onChange={handleSetActiveProfile}
          displayEmpty
          sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
        >
          <MenuItem value="">
            <em>None (All Rows Active)</em>
          </MenuItem>
          {sortedProfiles.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ '& .MuiSelect-select': { display: 'flex' } }}>
              <ListItemIcon sx={{ minWidth: 32, mr: 0.5 }}>
                <IoIcon name={p.icon || 'people'} />
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
          <Stack direction="row" spacing={1}>
            <input
              type="file"
              accept=".json,.ioProfile"
              style={{ display: 'none' }}
              ref={importFileInputRef}
              onChange={handleImportFileSelected}
            />
            <Button
              onClick={handleImportProfileClick}
              startIcon={<ImportIcon />}
              variant="text"
              size="small"
            >
              Import
            </Button>
            <Button
              onClick={handleAddNewProfileFromManager}
              startIcon={<PersonAdd />}
              variant="text"
              size="small"
            >
              Add New
            </Button>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {sortedProfiles.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
              No profiles. Click &quot;Add New&quot; to create.
            </Typography>
          ) : (
            <List dense>
              {sortedProfiles.map((p) => (
                <ListItem
                  key={p.id}
                  secondaryAction={
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Export Profile">
                        <IconButton
                          size="small"
                          onClick={() => handleExportProfile(p.id)}
                          color="primary"
                        >
                          <ExportIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                    </Stack>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <IoIcon name={p.icon || 'people'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={p.name}
                    secondary={`${p.includedRowIds.length} rows. ${activeProfileId === p.id ? '(Active)' : ''}`}
                    primaryTypographyProps={{
                      fontWeight: activeProfileId === p.id ? 'bold' : 'normal'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: 'space-between',
            px: 2,
            pb: 1,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={includeAudioOnExport}
                onChange={(e) => setIncludeAudioOnExport(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="caption">Include audio data in export</Typography>}
          />
          <Button onClick={handleCloseProfileManager}>Close</Button>
        </DialogActions>
      </Dialog>

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

export default ProfileManagerSettings
