// src/renderer/src/components/Settings/ProfileManagerContent.tsx
import type { ChangeEvent, FC, MouseEvent } from 'react' // Added MouseEvent
import { useState, useMemo, useRef, useEffect } from 'react'
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
  Tooltip /* Switch, FormControlLabel, */, // Switch and FormControlLabel for audio toggle removed
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup, // Added ToggleButton(Group)
  ListItemButton
} from '@mui/material'
import {
  Delete,
  Edit,
  PersonAdd,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Search as SearchIcon,
  PlayCircleOutline as ActivateIcon, // Consistently use this icon
  // CheckCircleOutline as ActiveIcon, // Removed, row highlighting is enough
  MusicNote,
  MusicOff
} from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon'
// ... other imports (PlaySound types, DB functions, utils, ProfileEditorDialog, ProfileExportFormat, useSnackbar) ...
import { PlaySoundOutputData } from '@/modules/PlaySound/PlaySound.types'
import { addAudioToDB, getAudioBufferFromDB } from '@/modules/PlaySound/lib/db'
import { arrayBufferToBase64, base64ToArrayBuffer, downloadJsonFile } from '@/utils/utils'
import { ProfileEditorDialog } from './ProfileEditorDialog'
import type { ProfileExportFormat } from './ProfileManagerSettings.types'
import { useSnackbar } from 'notistack'
import ConfirmDialog from '../utils/ConfirmDialog'

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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('')
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [includeAudioOnExport, setIncludeAudioOnExport] = useState(true) // Now for ToggleButton
  const [searchTerm, setSearchTerm] = useState('')

  const handleAddNewProfile = () => {
    setEditingProfile(null)
    setProfileEditorOpen(true)
  }
  const handleEditProfile = (profile: ProfileDefinition) => {
    setEditingProfile(profile)
    setProfileEditorOpen(true)
  }
  const handleDeleteProfile = (profileId: string) => {
    setConfirmDialogTitle('Delete Profile')
    setConfirmDialogMessage(
      `Are you sure you want to delete the profile "${profiles[profileId]?.name || profileId}"?`
    )
    setConfirmAction(() => () => {
      deleteProfile(profileId)
      if (editingProfile?.id === profileId) {
        setProfileEditorOpen(false)
        setEditingProfile(null)
      }
      enqueueSnackbar('Profile deleted.', { variant: 'info' })
    })
    setConfirmDialogOpen(true)
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
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string
        const importedData = JSON.parse(fileContent) as ProfileExportFormat
        if (!importedData.profile || !Array.isArray(importedData.rows))
          throw new Error('Invalid profile file structure.')
        const audioIdMap: Record<string, string> = {}
        if (importedData.audioData) {
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
            } catch (err) {
              console.error(`Error importing audio ${oldAudioIdFromFile}:`, err)
            }
          }
        }
        const newImportedRowIdsForProfile: string[] = []
        for (const importedRow of importedData.rows) {
          const newRowId = uuidv4()
          const newRowData = { ...importedRow, id: newRowId }
          newImportedRowIdsForProfile.push(newRowId)
          if (newRowData.outputModule === 'playsound-module' && newRowData.output.data.audioId) {
            const oldAudioId = newRowData.output.data.audioId
            const newLocalAudioId = audioIdMap[oldAudioId]
            if (newLocalAudioId) {
              newRowData.output.data.audioId = newLocalAudioId
              const audioEntryFromImport = importedData.audioData?.[oldAudioId]
              newRowData.output.data.originalFileName =
                audioEntryFromImport?.originalFileName || 'Imported Audio'
            } else {
              delete newRowData.output.data.audioId
              delete newRowData.output.data.originalFileName
            }
          }
          addRowAction(newRowData)
        }
        const newProfileName = importedData.profile.name || `Imported Profile ${Date.now()}`
        const newProfileIcon = importedData.profile.icon || 'file_upload'
        const newProfileActualId = addProfile(
          newProfileName,
          newProfileIcon,
          newImportedRowIdsForProfile
        )
        enqueueSnackbar(`Profile "${newProfileName}" imported successfully!`, {
          variant: 'success'
        })
        setActiveProfileGlobal(newProfileActualId) // Activate the newly imported profile
      } catch (error: any) {
        console.error('[ImportProfile] Error:', error)
        enqueueSnackbar(`Failed to import profile: ${error.message}`, { variant: 'error' })
      }
    }
    if (file) reader.readAsText(file)
    if (event.target) event.target.value = ''
  }

  const handleActivateProfileFromList = (profileId: string) => {
    if (activeProfileId === profileId) return // Don't re-activate if already active
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

  const handleAudioExportToggle = (event: MouseEvent<HTMLElement>, newValue: boolean | null) => {
    if (newValue !== null) {
      // ToggleButton can return null if no exclusive selection and current is clicked
      setIncludeAudioOnExport(newValue)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: { xs: 1, sm: 1.5, md: 2 }
      }}
    >
      {/* --- Top Action Row --- */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{
          pb: { xs: 1, sm: 1.5 },
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
            justifyContent: { xs: 'center', sm: 'flex-end' },
            pt: { xs: 1, sm: 0 }
          }}
        >
          <ToggleButtonGroup
            value={includeAudioOnExport}
            exclusive
            onChange={handleAudioExportToggle}
            aria-label="Include audio in export"
            size="small"
          >
            <ToggleButton value={true} aria-label="Include Audio">
              <Tooltip title="Audio data WILL be included in export">
                <MusicNote fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={false} aria-label="Exclude Audio">
              <Tooltip title="Audio data will NOT be included in export">
                <MusicOff fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          {/* Optional label */}
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
              divider={index < filteredAndSortedProfiles.length - 1}
              disablePadding
              onDoubleClick={() => handleActivateProfileFromList(p.id)} // <<< DOUBLE CLICK TO ACTIVATE
              secondaryAction={
                <Stack direction="row" spacing={0.25}>
                  <Tooltip
                    title={activeProfileId === p.id ? 'Profile is active' : 'Activate Profile'}
                  >
                    {/* Span needed for tooltip on disabled button */}
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => handleActivateProfileFromList(p.id)}
                        color="primary"
                        disabled={activeProfileId === p.id} // <<< KEEP ICON, JUST DISABLE
                      >
                        <ActivateIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* ... Export, Edit, Delete IconButtons (same) ... */}
                  <Tooltip title="Export Profile">
                    <IconButton size="small" onClick={() => handleExportProfile(p.id)}>
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
            >
              <ListItemButton
                selected={activeProfileId === p.id}
                // onClick={() => handleActivateProfileFromList(p.id)} // Removed single click activate from here
                sx={{ py: 0.75, borderRadius: 'inherit' }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: activeProfileId === p.id ? 'primary.main' : 'inherit'
                  }}
                >
                  {/* Keep custom profile icon always visible */}
                  <IoIcon name={p.icon || 'people'} style={{ fontSize: '1.3rem' }} />
                </ListItemIcon>
                <ListItemText
                  primary={p.name}
                  secondary={`${p.includedRowIds.length} row(s) included ${activeProfileId === p.id ? '(Active)' : ''}`} // Indicate active here too
                  primaryTypographyProps={{
                    fontWeight: activeProfileId === p.id ? 'bold' : 500,
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
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false)
          setConfirmAction(null)
        }}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction()
          }
          setConfirmDialogOpen(false)
          setConfirmAction(null)
        }}
        title={confirmDialogTitle}
        message={confirmDialogMessage}
      />
    </Box>
  )
}

export default ProfileManagerContent
