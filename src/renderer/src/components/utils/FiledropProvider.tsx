// src/renderer/src/components/utils/FiledropProvider.tsx
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Typography,
  CircularProgress,
  Alert,
  AlertTitle,
  Stack,
  Paper
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback, useState, type FC, type ReactNode, DragEvent } from 'react'
import type { ProfileExportFormat } from '@/components/Settings/ProfileManagerSettings.types'
import { useMainStore } from '@/store/mainStore'
import { addAudioToDB } from '@/modules/PlaySound/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { Upload } from '@mui/icons-material'

interface FiledropProviderProps {
  children: ReactNode
}

// Helper: Base64 to ArrayBuffer for Import
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64)
  const len = binary_string.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i)
  }
  return bytes.buffer
}

export const FiledropProvider: FC<FiledropProviderProps> = ({ children }) => {
  const [isDraggingOverWindow, setIsDraggingOverWindow] = useState(false)
  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false)
  const [importedProfileData, setImportedProfileData] = useState<ProfileExportFormat | null>(null)

  const [isImporting, setIsImporting] = useState(false)

  const { enqueueSnackbar } = useSnackbar()

  const addProfile = useMainStore((state) => state.addProfile)
  const addRowAction = useMainStore((state) => state.addRow)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  const processDroppedFile = useCallback(
    async (file: File) => {
      if (!file) return

      console.debug('[FiledropProvider] Processing dropped file:', file.name)
      setIsImporting(true)

      if (
        file.type !== 'application/json' &&
        !file.name.endsWith('.json') &&
        !file.name.endsWith('.ioProfile')
      ) {
        enqueueSnackbar('Invalid file type: Please drop a .json or .ioProfile file.', {
          variant: 'error'
        })
        setIsImporting(false)
        setIsDraggingOverWindow(false)
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string
          const parsedData = JSON.parse(fileContent) as ProfileExportFormat

          if (!parsedData.profile || !Array.isArray(parsedData.rows)) {
            throw new Error("Invalid .ioProfile structure: Missing 'profile' or 'rows' array.")
          }

          setImportedProfileData(parsedData)

          setShowImportConfirmDialog(true)
          console.debug('[FiledropProvider] File parsed, showing confirmation dialog.')
        } catch (parseError: any) {
          console.error('[FiledropProvider] Error parsing or processing profile file:', parseError)
          enqueueSnackbar(`Import Error: ${parseError.message || 'Invalid file content.'}`, {
            variant: 'error'
          })
        } finally {
          setIsImporting(false)

          setIsDraggingOverWindow(false)
        }
      }
      reader.onerror = () => {
        enqueueSnackbar('Error reading file.', { variant: 'error' })
        setIsImporting(false)
        setIsDraggingOverWindow(false)
      }
      reader.readAsText(file)
    },
    [enqueueSnackbar]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOverWindow(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processDroppedFile(e.dataTransfer.files[0])
      }
    },
    [processDroppedFile]
  )

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isDraggingOverWindow) setIsDraggingOverWindow(true)
    },
    [isDraggingOverWindow]
  )

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOverWindow(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.target === e.currentTarget) {
      setIsDraggingOverWindow(false)
    }
  }, [])

  const handleCloseConfirmDialog = () => {
    setShowImportConfirmDialog(false)
    setImportedProfileData(null)
  }

  const handleConfirmImport = async () => {
    if (!importedProfileData) return
    setIsImporting(true)

    try {
      const audioIdMap: Record<string, string> = {}
      if (importedProfileData.audioData) {
        console.debug('[FiledropProvider] Processing embedded audio data for import...')
        for (const oldAudioIdFromFile in importedProfileData.audioData) {
          const audioEntry = importedProfileData.audioData[oldAudioIdFromFile]
          try {
            const audioBuffer = base64ToArrayBuffer(audioEntry.base64Data)
            const newLocalAudioId = await addAudioToDB(
              audioEntry.originalFileName,
              audioEntry.mimeType,
              audioBuffer
            )
            audioIdMap[oldAudioIdFromFile] = newLocalAudioId
          } catch (err) {
            console.error(`Error importing audio entry ${oldAudioIdFromFile}:`, err)
          }
        }
      }

      const newImportedRowIdsForProfile: string[] = []
      for (const importedRow of importedProfileData.rows) {
        const newRowId = uuidv4()
        const newRowData = { ...importedRow, id: newRowId }
        if (newRowData.outputModule === 'playsound-module' && newRowData.output.data.audioId) {
          const oldAudioId = newRowData.output.data.audioId
          const newLocalAudioId = audioIdMap[oldAudioId]
          if (newLocalAudioId) {
            newRowData.output.data.audioId = newLocalAudioId
            const audioEntryFromImport = importedProfileData.audioData?.[oldAudioId]
            newRowData.output.data.originalFileName =
              audioEntryFromImport?.originalFileName || 'Imported Audio'
          } else {
            delete newRowData.output.data.audioId
            delete newRowData.output.data.originalFileName
          }
        }
        addRowAction(newRowData)
        newImportedRowIdsForProfile.push(newRowId)
      }

      const newProfileName = importedProfileData.profile.name || `Imported Profile ${Date.now()}`
      const newProfileIcon = importedProfileData.profile.icon || 'file_upload'
      const newProfileActualId = addProfile(
        newProfileName,
        newProfileIcon,
        newImportedRowIdsForProfile
      )

      enqueueSnackbar(`Profile "${newProfileName}" imported successfully!`, { variant: 'success' })
      setActiveProfile(newProfileActualId)
    } catch (error: any) {
      console.error('[FiledropProvider] Error during final import process:', error)
      enqueueSnackbar(`Import failed: ${error.message || 'Unknown error'}`, { variant: 'error' })
    } finally {
      setIsImporting(false)
      handleCloseConfirmDialog()
    }
  }

  return (
    <Box
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {children}

      {/* Visual overlay when dragging a file over the window */}
      {isDraggingOverWindow && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <Paper elevation={6} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <Upload sx={{ fontSize: 60, color: 'primary.main' }} />
            <Typography variant="h5" color="primary.main">
              Drop .ioProfile file to import
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={showImportConfirmDialog}
        onClose={handleCloseConfirmDialog}
        disableEscapeKeyDown={isImporting}
      >
        <DialogTitle>Valid Profile detected. Import?</DialogTitle>
        <DialogContent>
          {isImporting ? (
            <Stack alignItems="center" spacing={2} sx={{ p: 3 }}>
              <CircularProgress />
              <Typography>Importing profile and audio data...</Typography>
            </Stack>
          ) : (
            importedProfileData && (
              <>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.25 }}>
                  <Typography sx={{ width: 60 }}>Profile:</Typography>
                  <Typography>
                    <strong>{importedProfileData.profile.name || 'Unnamed Profile'}</strong>
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 0.25 }}>
                  <Typography sx={{ width: 60 }}>Rows:</Typography>
                  <Typography>
                    <strong>{importedProfileData.rows.length || 0}</strong>
                  </Typography>
                </Stack>
                {importedProfileData.audioData && (
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Typography sx={{ width: 60 }}>Audios:</Typography>
                    <Typography>
                      <strong>{Object.keys(importedProfileData.audioData).length}</strong>
                    </Typography>
                  </Stack>
                )}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Important</AlertTitle>
                  Importing will create a new profile and new rows with new IDs. Existing profiles
                  or rows with the same names will not be overwritten by this import. Audio snippets
                  will be added to your local cache.
                </Alert>
              </>
            )
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmImport}
            variant="contained"
            color="info"
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Confirm Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FiledropProvider
