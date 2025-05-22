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
  Stack
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback, useState, type FC, type ReactNode, DragEvent, useEffect } from 'react'
import type { ProfileExportFormat } from '@/components/Settings/ProfileManagerSettings.types'
import { useMainStore } from '@/store/mainStore'
import { addAudioToDB } from '@/modules/PlaySound/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { UploadFile as UploadFileIcon } from '@mui/icons-material'

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
  const isWindowBeingDraggedOver = useMainStore((state) => state.isWindowBeingDraggedOver)
  const dropMessage = useMainStore((state) => state.dropMessage)
  const setIsWindowBeingDraggedOver = useMainStore((state) => state.setIsWindowBeingDraggedOver)

  const [showImportConfirmDialog, setShowImportConfirmDialog] = useState(false)
  const [importedProfileData, setImportedProfileData] = useState<ProfileExportFormat | null>(null)
  // const [importedFileName, setImportedFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { enqueueSnackbar } = useSnackbar()

  const addProfile = useMainStore((state) => state.addProfile)
  const addRowAction = useMainStore((state) => state.addRow)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  const processDroppedProfileFile = useCallback(
    async (file: File) => {
      if (!file) return
      console.debug('[FiledropProvider] Processing dropped .ioProfile file:', file.name)

      if (
        file.type !== 'application/json' &&
        !file.name.endsWith('.json') &&
        !file.name.endsWith('.ioProfile')
      ) {
        enqueueSnackbar('Invalid file type: Please drop a .json or .ioProfile file.', {
          variant: 'error'
        })
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
          // setImportedFileName(file.name)
          setShowImportConfirmDialog(true)
          console.debug('[FiledropProvider] File parsed, showing confirmation dialog.')
        } catch (parseError: any) {
          console.error('[FiledropProvider] Error parsing or processing profile file:', parseError)
          enqueueSnackbar(`Import Error: ${parseError.message || 'Invalid file content.'}`, {
            variant: 'error'
          })
        }
      }
      reader.onerror = () => {
        enqueueSnackbar('Error reading file.', { variant: 'error' })
      }
      reader.readAsText(file)
    },
    [enqueueSnackbar]
  )

  const handleGlobalDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()

      setIsWindowBeingDraggedOver(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]

        if (file.name.endsWith('.json') || file.name.endsWith('.ioProfile')) {
          console.debug(
            '[FiledropProvider] Global drop, attempting to process as profile:',
            file.name
          )
          processDroppedProfileFile(file)
        } else {
          console.debug(
            '[FiledropProvider] File dropped on global area is not an .ioProfile, ignoring.',
            file.name
          )
        }
      }
    },
    [processDroppedProfileFile, setIsWindowBeingDraggedOver]
  )

  const handleGlobalDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()

      if (e.dataTransfer.types.includes('Files')) {
        if (!isWindowBeingDraggedOver) {
          setIsWindowBeingDraggedOver(true)
        }
      }
      e.dataTransfer.dropEffect = 'copy'
    },
    [isWindowBeingDraggedOver, setIsWindowBeingDraggedOver]
  )

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

  useEffect(() => {
    const handleDocDragEnter = (e: globalThis.DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        setIsWindowBeingDraggedOver(true)
      }
    }
    const handleDocDragLeave = (e: globalThis.DragEvent) => {
      if (!e.relatedTarget || (e.relatedTarget as Node).nodeName === 'HTML') {
        setIsWindowBeingDraggedOver(false)
      }
    }

    const handleDocDrop = () => {
      setIsWindowBeingDraggedOver(false)
    }

    document.addEventListener('dragenter', handleDocDragEnter)
    document.addEventListener('dragleave', handleDocDragLeave)
    document.addEventListener('drop', handleDocDrop)

    return () => {
      document.removeEventListener('dragenter', handleDocDragEnter)
      document.removeEventListener('dragleave', handleDocDragLeave)
      document.removeEventListener('drop', handleDocDrop)
    }
  }, [setIsWindowBeingDraggedOver])

  return (
    <Box
      onDrop={handleGlobalDrop}
      onDragOver={handleGlobalDragOver}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      {children}

      {isWindowBeingDraggedOver && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 9990,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',

            borderRadius: 2,
            outline: '3px dashed',
            outlineColor: 'primary.light',
            outlineOffset: '-3px',
            boxSizing: 'border-box'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: '3px',
              width: 'calc(100% - 6px)',
              textAlign: 'center',
              bgcolor: '#000',
              left: '3px',
              boxSizing: 'border-box',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UploadFileIcon sx={{ color: 'primary.contrastText', mr: 1 }} />
            <Typography variant="h6" color="primary.contrastText">
              {dropMessage || 'Drop .ioProfile file here'}
            </Typography>
          </Box>
        </Box>
      )}

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
