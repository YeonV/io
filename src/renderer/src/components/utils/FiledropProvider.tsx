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
  Stack
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useCallback, useState, type FC, type ReactNode, DragEvent, useEffect } from 'react'
import type { ProfileExportFormat } from '@/components/Settings/ProfileManagerSettings.types'
import { useMainStore } from '@/store/mainStore'
import { addAudioToDB } from '@/modules/PlaySound/lib/db'
import type { BlueprintDefinition, RestModuleCustomConfig } from '@/modules/REST/REST.types'
import { id as restModuleId } from '@/modules/REST/REST'
import { v4 as uuidv4 } from 'uuid'
import { UploadFile as UploadFileIcon } from '@mui/icons-material'

interface FiledropProviderProps {
  children: ReactNode
}

// Helper: Base64 to ArrayBuffer for Import (from your original)
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
  const setDropMessageGlobal = useMainStore((state) => state.setDropMessage)

  // State for Profile Import
  const [showProfileImportConfirmDialog, setShowProfileImportConfirmDialog] = useState(false)
  const [importedProfileData, setImportedProfileData] = useState<ProfileExportFormat | null>(null)
  const [isImportingProfile, setIsImportingProfile] = useState(false)

  const { enqueueSnackbar } = useSnackbar()

  // Profile specific store actions
  const addProfile = useMainStore((state) => state.addProfile)
  const addRowAction = useMainStore((state) => state.addRow)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  // Blueprint specific store actions
  const setBlueprintToRunFromDrop = useMainStore((state) => state.setBlueprintToRunFromDrop)
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)
  const getRestModuleBlueprints = useCallback(
    () =>
      (useMainStore.getState().modules[restModuleId]?.config as RestModuleCustomConfig)
        ?.blueprints || [],
    []
  )

  // --- Profile Import Logic ---
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
          setShowProfileImportConfirmDialog(true)
          console.debug('[FiledropProvider] Profile file parsed, showing confirmation dialog.')
        } catch (parseError: any) {
          console.error('[FiledropProvider] Error parsing profile file:', parseError)
          enqueueSnackbar(
            `Profile Import Error: ${parseError.message || 'Invalid file content.'}`,
            {
              variant: 'error'
            }
          )
        }
      }
      reader.onerror = () => {
        enqueueSnackbar('Error reading profile file.', { variant: 'error' })
      }
      reader.readAsText(file)
    },
    [enqueueSnackbar]
  )

  const handleConfirmProfileImport = async () => {
    if (!importedProfileData) return
    setIsImportingProfile(true)

    try {
      const audioIdMap: Record<string, string> = {}
      if (importedProfileData.audioData) {
        console.debug('[FiledropProvider] Processing embedded audio data for profile import...')
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
            console.error(`Error importing audio entry ${oldAudioIdFromFile} for profile:`, err)
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
      console.error('[FiledropProvider] Error during final profile import process:', error)
      enqueueSnackbar(`Profile Import failed: ${error.message || 'Unknown error'}`, {
        variant: 'error'
      })
    } finally {
      setIsImportingProfile(false)
      setShowProfileImportConfirmDialog(false)
      setImportedProfileData(null)
    }
  }

  const handleCloseProfileConfirmDialog = () => {
    setShowProfileImportConfirmDialog(false)
    setImportedProfileData(null)
  }

  // --- Blueprint Import Logic ---
  const processDroppedBlueprintFile = useCallback(
    async (file: File) => {
      if (!file) return
      console.debug('[FiledropProvider] Processing dropped .ioBlueprint file:', file.name)

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string
          const parsedData = JSON.parse(fileContent) as BlueprintDefinition

          // Basic Validation
          if (
            !parsedData.id ||
            !parsedData.name ||
            !Array.isArray(parsedData.simpleInputs) ||
            !parsedData.presetTemplate
          ) {
            throw new Error(
              'Invalid .ioBlueprint structure: Missing required fields (id, name, simpleInputs, presetTemplate).'
            )
          }
          // TODO: Optional: More detailed validation of simpleInputs and presetTemplate structure

          const currentBlueprints = getRestModuleBlueprints()
          if (currentBlueprints.some((bp) => bp.id === parsedData.id)) {
            enqueueSnackbar(
              `Blueprint with ID "${parsedData.id}" (${parsedData.name}) already exists. Import skipped.`,
              { variant: 'warning', autoHideDuration: 5000 }
            )
            return
          }

          // Ensure the 'blueprints' array exists in the module config
          const moduleConf = useMainStore.getState().modules[restModuleId]
            ?.config as RestModuleCustomConfig
          if (!moduleConf?.blueprints) {
            // This case should be rare if store is initialized properly
            setModuleConfig(restModuleId, 'blueprints', [parsedData])
          } else {
            setModuleConfig(restModuleId, 'blueprints', [...currentBlueprints, parsedData])
          }

          enqueueSnackbar(
            `Blueprint "${parsedData.name}" imported successfully! Opening for configuration...`,
            { variant: 'success' }
          )
          setBlueprintToRunFromDrop(parsedData) // Signal to run this blueprint
        } catch (parseError: any) {
          console.error(
            '[FiledropProvider] Error parsing or processing blueprint file:',
            parseError
          )
          enqueueSnackbar(
            `Blueprint Import Error: ${parseError.message || 'Invalid file content.'}`,
            { variant: 'error' }
          )
        }
      }
      reader.onerror = () => {
        enqueueSnackbar('Error reading blueprint file.', { variant: 'error' })
      }
      reader.readAsText(file)
    },
    [enqueueSnackbar, setModuleConfig, getRestModuleBlueprints, setBlueprintToRunFromDrop]
  )

  // --- Global Drop and DragOver Handlers ---
  const handleGlobalDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation() // Stop propagation to ensure only this global handler acts unless a child explicitly wants it
      setIsWindowBeingDraggedOver(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]

        if (
          file.name.endsWith('.ioProfile') ||
          (file.name.endsWith('.json') && file.type === 'application/json')
        ) {
          // Heuristic for .json possibly being a profile, can be tightened
          console.debug(
            '[FiledropProvider] Global drop, attempting to process as .ioProfile:',
            file.name
          )
          processDroppedProfileFile(file)
        } else if (file.name.endsWith('.ioBlueprint')) {
          console.debug(
            '[FiledropProvider] Global drop, attempting to process as .ioBlueprint:',
            file.name
          )
          processDroppedBlueprintFile(file)
        } else {
          console.debug(
            '[FiledropProvider] File dropped on global area is not .ioProfile or .ioBlueprint, ignoring.',
            file.name
          )
          setDropMessageGlobal(null) // Clear any specific message
        }
      } else {
        setDropMessageGlobal(null)
      }
    },
    [
      processDroppedProfileFile,
      processDroppedBlueprintFile,
      setIsWindowBeingDraggedOver,
      setDropMessageGlobal
    ]
  )

  const handleGlobalDragOver = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation() // Stop propagation for dragOver as well on the global level
      if (e.dataTransfer.types.includes('Files')) {
        if (!isWindowBeingDraggedOver) {
          setIsWindowBeingDraggedOver(true)
        }
        // More specific message if we can peek at file type/name, for now generic
        const files = e.dataTransfer.items
        let potentialMessage = 'Drop .ioProfile or .ioBlueprint file'
        if (files && files.length > 0) {
          const firstFileName =
            files[0].type === 'application/json' ? 'file.json' : (files[0] as any).name // (files[0] as any).name is a hack, proper way needs DataTransferItemList
          // A more robust check would iterate files or use DataTransferItemList API if available and reliable
          if (firstFileName?.endsWith('.ioBlueprint')) {
            potentialMessage = 'Drop .ioBlueprint file'
          } else if (firstFileName?.endsWith('.ioProfile')) {
            potentialMessage = 'Drop .ioProfile file'
          }
        }
        setDropMessageGlobal(potentialMessage)
      }
      e.dataTransfer.dropEffect = 'copy'
    },
    [isWindowBeingDraggedOver, setIsWindowBeingDraggedOver, setDropMessageGlobal]
  )

  // Document-level listeners to reliably catch when drag leaves window
  useEffect(() => {
    const handleDocDragEnter = (ev: globalThis.DragEvent) => {
      // Check if files are being dragged
      if (ev.dataTransfer && Array.from(ev.dataTransfer.types).includes('Files')) {
        // Do not set if already over a specific drop zone that handled it.
        // This global one is a fallback or initial trigger.
        // The logic inside handleGlobalDragOver is better for setting the message.
        if (!isWindowBeingDraggedOver) {
          // Only set if not already set (e.g. by a local zone)
          setIsWindowBeingDraggedOver(true)
        }
      }
    }
    const handleDocDragLeave = (ev: globalThis.DragEvent) => {
      // If relatedTarget is null, it means drag left the window
      if (!ev.relatedTarget || (ev.relatedTarget as Node).nodeName === 'HTML') {
        setIsWindowBeingDraggedOver(false)
        setDropMessageGlobal(null)
      }
    }
    const handleDocDrop = () => {
      // Fired when drop occurs anywhere, even if handled by child
      setIsWindowBeingDraggedOver(false)
      setDropMessageGlobal(null)
    }

    document.addEventListener('dragenter', handleDocDragEnter, false)
    document.addEventListener('dragleave', handleDocDragLeave, false)
    document.addEventListener('drop', handleDocDrop, false)

    return () => {
      document.removeEventListener('dragenter', handleDocDragEnter, false)
      document.removeEventListener('dragleave', handleDocDragLeave, false)
      document.removeEventListener('drop', handleDocDrop, false)
    }
  }, [setIsWindowBeingDraggedOver, setDropMessageGlobal, isWindowBeingDraggedOver]) // Added isWindowBeingDraggedOver to deps

  return (
    <Box
      onDrop={handleGlobalDrop}
      onDragOver={handleGlobalDragOver}
      // onDragLeave HERE might interfere if children have their own dragLeave.
      // Document level dragleave is more reliable for "left the window".
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative'
        // If this Box itself is meant to be the primary global drop surface,
        // ensure its z-index allows it to receive events if children are overlaid.
        // However, the document listeners are more robust for window-wide drag state.
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
            bgcolor: 'rgba(0, 0, 0, 0.75)', // Slightly darker
            zIndex: 1301, // Higher than MUI Dialogs (usually 1300)
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none', // Let drop events pass through to onDrop handler of this Box
            borderRadius: 1, // More subtle
            outline: '3px dashed',
            outlineColor: 'primary.main', // Brighter
            outlineOffset: '-3px',
            boxSizing: 'border-box'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              bottom: '3px', // Keep consistent
              width: 'calc(100% - 6px)',
              textAlign: 'center',
              bgcolor: 'rgba(0,0,0,0.8)', // Slightly transparent black
              color: 'common.white',
              left: '3px',
              boxSizing: 'border-box',
              height: '45px', // Slightly taller
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0 0 4px 4px' // Match outline
            }}
          >
            <UploadFileIcon sx={{ mr: 1.5 }} />
            <Typography variant="h6">
              {dropMessage || 'Drop .ioProfile or .ioBlueprint file'}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Profile Import Confirmation Dialog */}
      <Dialog
        open={showProfileImportConfirmDialog}
        onClose={handleCloseProfileConfirmDialog}
        disableEscapeKeyDown={isImportingProfile}
      >
        <DialogTitle>Valid Profile detected. Import?</DialogTitle>
        <DialogContent>
          {isImportingProfile ? (
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
          <Button onClick={handleCloseProfileConfirmDialog} disabled={isImportingProfile}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmProfileImport}
            variant="contained"
            color="info"
            disabled={isImportingProfile}
          >
            {isImportingProfile ? 'Importing...' : 'Confirm Profile Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default FiledropProvider
