// src/renderer/src/components/Settings/ProfileManagerContent.tsx
import type { ChangeEvent, FC } from 'react'
import { useState, useMemo, useRef } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ProfileDefinition, Row } from '@shared/types'
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
  Stack,
  Tooltip,
  FormControlLabel,
  Switch,
  Divider
} from '@mui/material'
import {
  Delete,
  Edit,
  PersonAdd,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon
} from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon'
import { PlaySoundOutputData } from '@/modules/PlaySound/PlaySound.types'
import { addAudioToDB, getAudioBufferFromDB } from '@/modules/PlaySound/lib/db'
import { arrayBufferToBase64, base64ToArrayBuffer, downloadJsonFile } from '@/utils/utils'
import { ProfileEditorDialog } from './ProfileEditorDialog' // Import the extracted dialog
import type { ProfileExportFormat } from './ProfileManagerSettings.types' // Assuming types are here or moved
import { useSnackbar } from 'notistack'

interface ProfileManagerContentProps {
  // Prop to indicate if it's embedded in a way that might change its top-level wrapper
  // For example, if embedded directly in settings pane, it might not need its own Paper.
  // For now, let's assume it always renders its own content structure.
  // isEmbedded?: boolean;
}

export const ProfileManagerContent: FC<ProfileManagerContentProps> = () => {
  const profiles = useMainStore((state) => state.profiles)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const allRows = useMainStore((state) => state.rows)

  const addProfile = useMainStore((state) => state.addProfile)
  const updateProfile = useMainStore((state) => state.updateProfile)
  const deleteProfile = useMainStore((state) => state.deleteProfile)
  const setActiveProfileGlobal = useMainStore((state) => state.setActiveProfile) // For activating after import
  const addRowAction = useMainStore((state) => state.addRow)
  const { enqueueSnackbar } = useSnackbar()

  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProfileDefinition | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [includeAudioOnExport, setIncludeAudioOnExport] = useState(true)

  const sortedProfiles = useMemo(
    () => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  )

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

  return (
    // This component now returns the direct content for managing profiles
    // The Paper wrapper might be part of the parent Settings pane or this can have its own.
    // For now, let's assume the parent (SettingsProfiles.tsx) provides the main Paper.
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={1}
        sx={{ p: 1, borderBottom: 1, borderColor: 'divider', mb: 1 }}
      >
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
          Import Profile
        </Button>
        <Button onClick={handleAddNewProfile} startIcon={<PersonAdd />} variant="text" size="small">
          Add New Profile
        </Button>
      </Stack>

      {sortedProfiles.length === 0 ? (
        <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
          No profiles configured. Click &quot;Add New&quot; or &quot;Import&quot; to begin.
        </Typography>
      ) : (
        <List dense sx={{ overflowY: 'auto', flexGrow: 1 }}>
          {sortedProfiles.map((p) => (
            <ListItem
              key={p.id}
              divider
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
                    <IconButton size="small" onClick={() => handleEditProfile(p)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Profile">
                    <IconButton size="small" onClick={() => handleDeleteProfile(p.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              }
              sx={{
                bgcolor: activeProfileId === p.id ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <IoIcon name={p.icon || 'people'} />
              </ListItemIcon>
              <ListItemText
                primary={p.name}
                secondary={`${p.includedRowIds.length} rows. ${activeProfileId === p.id ? '(Currently Active)' : ''}`}
                primaryTypographyProps={{
                  fontWeight: activeProfileId === p.id ? 'bold' : 'normal'
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      <Divider sx={{ mt: 'auto' }} />
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          borderTop: 1,
          borderColor: 'divider',
          flexShrink: 0
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
          sx={{ mr: 1 }}
        />
      </Box>

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

export default ProfileManagerContent
