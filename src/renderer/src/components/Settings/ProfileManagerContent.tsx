// src/renderer/src/components/Settings/ProfileManagerContent.tsx
import type { ChangeEvent, FC } from 'react'
import { useState, useMemo, useRef, useEffect } from 'react' // Added useEffect
import { useMainStore } from '@/store/mainStore'
import type { ProfileDefinition, Row, ModuleId } from '@shared/types'
import { v4 as uuidv4 } from 'uuid'
import {
  Box,
  Button,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Stack,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider,
  TextField,
  InputAdornment, // Added TextField, InputAdornment
  ListItemButton
} from '@mui/material'
import {
  Delete,
  Edit,
  PersonAdd,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon, // For search bar
  PlayCircleOutline as ActivateIcon, // For activating profile
  CheckCircleOutline as ActiveIcon, // To show next to active profile name
  CheckCircleOutline
} from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon'
import { PlaySoundOutputData } from '@/modules/PlaySound/PlaySound.types' // Assuming path
import { addAudioToDB, getAudioBufferFromDB } from '@/modules/PlaySound/lib/db' // Assuming path
import { arrayBufferToBase64, base64ToArrayBuffer, downloadJsonFile } from '@/utils/utils' // Assuming path
import { ProfileEditorDialog } from './ProfileEditorDialog'
import type { ProfileExportFormat } from './ProfileManagerSettings.types'
import { useSnackbar } from 'notistack'

export const ProfileManagerContent: FC = () => {
  const profiles = useMainStore((state) => state.profiles)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const allRows = useMainStore((state) => state.rows)

  const addProfile = useMainStore((state) => state.addProfile)
  const updateProfile = useMainStore((state) => state.updateProfile)
  const deleteProfile = useMainStore((state) => state.deleteProfile)
  const setActiveProfileGlobal = useMainStore((state) => state.setActiveProfile)
  const addRowAction = useMainStore((state) => state.addRow)
  const { enqueueSnackbar } = useSnackbar()

  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileDefinition | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [includeAudioOnExport, setIncludeAudioOnExport] = useState(true)
  const [searchTerm, setSearchTerm] = useState('') // For profile search

  const handleAddNewProfile = () => {
    setEditingProfile(null)
    setProfileEditorOpen(true)
  }
  const handleEditProfile = (profile: ProfileDefinition) => {
    setEditingProfile(profile)
    setProfileEditorOpen(true)
  }
  const handleDeleteProfile = (profileId: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the profile "${profiles[profileId]?.name || profileId}"?`
      )
    ) {
      deleteProfile(profileId)
      if (editingProfile?.id === profileId) {
        setProfileEditorOpen(false)
        setEditingProfile(null)
      }
      enqueueSnackbar('Profile deleted.', { variant: 'info' })
    }
  }
  const handleSaveProfileFromEditor = (
    profileData: Omit<ProfileDefinition, 'id'> & { id?: string }
  ) => {
    // ... (same save logic as before in ProfileManagerSettings) ...
    if (profileData.id) {
      updateProfile(profileData.id, profileData)
      enqueueSnackbar('Profile updated.', { variant: 'success' })
    } else {
      addProfile(profileData.name, profileData.icon, profileData.includedRowIds)
      enqueueSnackbar('Profile created.', { variant: 'success' })
    }
    setProfileEditorOpen(false)
    setEditingProfile(null)
  }
  const handleExportProfile = async (profileIdToExport: string) => {
    /* ... (same export logic as before) ... */
    const profileToExport = profiles[profileIdToExport]
    if (!profileToExport) return
    const includedRowsArray: Row[] = profileToExport.includedRowIds
      .map((rowId) => allRows[rowId])
      .filter(Boolean)
    const exportData: ProfileExportFormat = {
      profile: { ...profileToExport },
      rows: includedRowsArray.map((r) => ({ ...r })),
      ...(includeAudioOnExport && { audioData: {} })
    }
    if (includeAudioOnExport && exportData.audioData) {
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
    enqueueSnackbar(`Profile "${profileToExport.name}" export initiated.`, { variant: 'info' })
  }

  const handleImportProfileClick = () => importFileInputRef.current?.click()
  const handleImportFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    /* ... (same import logic as before) ... */
  }

  // --- NEW: Activate Profile Handler ---
  const handleActivateProfileFromList = (profileId: string) => {
    setActiveProfileGlobal(profileId)
    enqueueSnackbar(`Profile "${profiles[profileId]?.name || 'Profile'}" activated.`, {
      variant: 'info',
      autoHideDuration: 2000
    })
  }

  const filteredAndSortedProfiles = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim()
    const allProfilesArray = Object.values(profiles)

    const filtered =
      lowerSearchTerm === ''
        ? allProfilesArray
        : allProfilesArray.filter(
            (p) =>
              p.name.toLowerCase().includes(lowerSearchTerm) ||
              p.id.toLowerCase().includes(lowerSearchTerm)
          )
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [profiles, searchTerm])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: { xs: 1, sm: 1.5 } /* Add padding to the Box */
      }}
    >
      {/* --- Top Action Row --- */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{
          p: { xs: 1, sm: 1.5 },
          borderBottom: 1,
          borderColor: 'divider',
          mb: 1.5,
          flexShrink: 0
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button
            onClick={handleImportProfileClick}
            startIcon={<ImportIcon />}
            variant="outlined"
            size="small"
            sx={{ flexGrow: { xs: 1, sm: 0 } }}
          >
            Import
          </Button>
          <Button
            onClick={handleAddNewProfile}
            startIcon={<PersonAdd />}
            variant="outlined"
            size="small"
            sx={{ flexGrow: { xs: 1, sm: 0 } }}
          >
            New Profile
          </Button>
        </Stack>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', sm: 'flex-end' },
            pt: { xs: 1, sm: 0 }
          }}
        >
          <Tooltip
            title={
              includeAudioOnExport
                ? 'Audio data WILL be included in export'
                : 'Audio data will NOT be included in export'
            }
          >
            <FormControlLabel
              control={
                <Switch
                  checked={includeAudioOnExport}
                  onChange={(e) => setIncludeAudioOnExport(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="caption">Include Audio in Export</Typography>}
              sx={{ mr: 1, ml: 0 }} // No extra margin if it's tight
              labelPlacement="start"
            />
          </Tooltip>
        </Box>
      </Stack>

      {/* --- Search Bar --- */}
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        placeholder="Search profiles by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 1.5, flexShrink: 0 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />

      {/* --- Profile List --- */}
      {filteredAndSortedProfiles.length === 0 ? (
        <Typography
          sx={{
            p: 2,
            textAlign: 'center',
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          color="textSecondary"
        >
          {searchTerm
            ? `No profiles match "${searchTerm}".`
            : 'No profiles configured. Click "New Profile" or "Import" to begin.'}
        </Typography>
      ) : (
        <List
          dense
          sx={{
            overflowY: 'auto',
            flexGrow: 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 0 /* Remove List padding, ListItemButton has it */
          }}
        >
          {filteredAndSortedProfiles.map((p, index) => (
            <ListItem
              key={p.id}
              divider={index < filteredAndSortedProfiles.length - 1} // Add divider except for last item
              disablePadding // Let ListItemButton handle padding
              secondaryAction={
                <Stack direction="row" spacing={0.25}>
                  {' '}
                  {/* Reduced spacing for compact action icons */}
                  {activeProfileId !== p.id && ( // Show Activate button only if not active
                    <Tooltip title="Activate Profile">
                      <IconButton
                        size="small"
                        onClick={() => handleActivateProfileFromList(p.id)}
                        color="primary"
                      >
                        <ActivateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Export Profile">
                    <IconButton
                      size="small"
                      onClick={() => handleExportProfile(p.id)} /* color="primary" */
                    >
                      <ExportIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Profile">
                    <IconButton size="small" onClick={() => handleEditProfile(p)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Profile">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteProfile(p.id)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
              sx={
                {
                  // No direct bgcolor here, handled by ListItemButton hover/selected
                  // '&:hover': {bgcolor: 'action.hover'}, // Moved to ListItemButton
                  // pl: 1, // Padding for the start of the list item content
                }
              }
            >
              <ListItemButton
                selected={activeProfileId === p.id}
                onClick={() => handleActivateProfileFromList(p.id)} // Also allow click on item to activate
                sx={{ py: 0.75, borderRadius: 'inherit' }} // Padding inside button, inherit border radius
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: activeProfileId === p.id ? 'primary.main' : 'inherit'
                  }}
                >
                  {activeProfileId === p.id ? (
                    <CheckCircleOutline color="primary" sx={{ fontSize: '1.3rem' }} />
                  ) : (
                    <IoIcon name={p.icon || 'people'} style={{ fontSize: '1.3rem' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={p.name}
                  secondary={`${p.includedRowIds.length} row(s) included`}
                  primaryTypographyProps={{
                    fontWeight: activeProfileId === p.id ? 'bold' : 500, // Medium weight for non-active, bold for active
                    color: activeProfileId === p.id ? 'primary.main' : 'text.primary',
                    fontSize: '0.95rem'
                  }}
                  secondaryTypographyProps={{ fontSize: '0.7rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json,.ioProfile"
        style={{ display: 'none' }}
        ref={importFileInputRef}
        onChange={handleImportFileSelected}
      />

      {/* Profile Editor Dialog (same as before) */}
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
    </Box>
  )
}

// export default ProfileManagerContent; // Keep this if it's default export of its file
