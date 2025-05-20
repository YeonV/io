// src/renderer/src/modules/PlaySound/PlaySoundSettings.tsx
import type { FC, DragEvent, ChangeEvent } from 'react'
import { useEffect, useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  DialogActions,
  ListItemIcon,
  CircularProgress // Added for loading indicator in dialog
} from '@mui/material'
import {
  Audiotrack,
  StopCircle,
  Delete as DeleteIcon,
  Storage
  // Icons below are not directly used in this Settings component's JSX
  // FolderOpen, LoopIcon, PlayArrow, PauseIcon, Cached, RepeatOne, LayersClear, Layers
} from '@mui/icons-material'
// DB functions are still needed for managing the cache
import {
  addAudioToDB,
  getAllAudioInfoFromDB,
  deleteAudioFromDB,
  clearAllAudioFromDB
} from './lib/db'
// Import the main store to dispatch the global command
import { useMainStore } from '@/store/mainStore'
// Import from PlaySound.tsx (orchestrator) for direct player control if needed for cache deletion
import { activeAudioPlayers, stopPlayer, stopAllPlayers } from './PlaySound'

interface SettingsCachedAudioInfo {
  id: string
  originalFileName: string
  dateAdded: Date
}

export const PlaySoundSettings: FC = () => {
  const [manageCacheDialogOpen, setManageCacheDialogOpen] = useState(false)
  const [cachedFilesList, setCachedFilesList] = useState<SettingsCachedAudioInfo[]>([])
  const [initialCachedFileCount, setInitialCachedFileCount] = useState(0)
  const [isLoadingInitialCount, setIsLoadingInitialCount] = useState(true) // For button count
  const [isLoadingDialogList, setIsLoadingDialogList] = useState(false) // For dialog list

  const [isBatchImportDragging, setIsBatchImportDragging] = useState(false)
  const [batchImportProgress, setBatchImportProgress] = useState(0)
  const [isBatchImporting, setIsBatchImporting] = useState(false)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  // Get the action from mainStore
  const triggerGlobalAudioStop = useMainStore((state) => state.setGlobalAudioCommandTimestamp)

  const fetchCachedFilesData = async (forCountOnly = false) => {
    if (forCountOnly) {
      setIsLoadingInitialCount(true)
    } else {
      setIsLoadingDialogList(true) // Loading for dialog list
    }

    try {
      const filesFromDB = await getAllAudioInfoFromDB()
      const processedFiles = filesFromDB
        .map((f) => ({ ...f, dateAdded: new Date(f.dateAdded) }))
        .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())

      if (forCountOnly) {
        setInitialCachedFileCount(processedFiles.length)
      } else {
        setCachedFilesList(processedFiles) // Store full objects for dialog
        setInitialCachedFileCount(processedFiles.length) // Also update count
      }
    } catch (error) {
      console.error('[PlaySound Settings] Error fetching cached files:', error)
      if (forCountOnly) setInitialCachedFileCount(0)
      else setCachedFilesList([])
    }
    if (forCountOnly) setIsLoadingInitialCount(false)
    else setIsLoadingDialogList(false)
  }

  useEffect(() => {
    fetchCachedFilesData(true) // Fetch only count for the button on mount
  }, [])

  const handleOpenManageCacheDialog = () => {
    fetchCachedFilesData(false) // Fetch full data for the dialog list
    setManageCacheDialogOpen(true)
  }
  const handleCloseManageCacheDialog = () => setManageCacheDialogOpen(false)

  const handleDeleteCachedFile = async (audioId: string) => {
    if (window.confirm('Delete this cached sound? Rows using it will need a new file selected.')) {
      // Stop any active player using this specific audioId before deleting from DB
      activeAudioPlayers.forEach((player) => {
        if (player.audioId === audioId) {
          stopPlayer(player.rowId) // Use the global stopPlayer from PlaySound.tsx
        }
      })
      await deleteAudioFromDB(audioId)
      fetchCachedFilesData(false) // Refresh dialog list
      // The button count will be updated when the dialog list is refreshed if it's also open
      // Or, call fetchCachedFilesData(true) if you want to ensure button updates even if dialog not open
      setInitialCachedFileCount((prev) => Math.max(0, prev - 1)) // Optimistic update for button
    }
  }

  const handleClearAllCache = async () => {
    if (
      window.confirm('Delete ALL cached sounds? This cannot be undone. Rows will need new files.')
    ) {
      stopAllPlayers(true) // Stop all sounds first, including preview
      await clearAllAudioFromDB()
      fetchCachedFilesData(false) // Refresh dialog list
      setInitialCachedFileCount(0) // Directly set count to 0
    }
  }

  const handleStopAllSoundsFromSettings = () => {
    console.info('[PlaySound Settings] User clicked Stop All Sounds. Triggering global command.')
    // This will call the module-scoped stopAllPlayers, which then emits the global command
    // stopAllPlayers(true);
    // OR, directly trigger the Zustand state change:
    triggerGlobalAudioStop() // This sets globalAudioCommandTimestamp in mainStore
    // The actual audio elements are stopped by stopAllPlayers, which should still be called.
    // The globalAudioCommandTimestamp is for UI components like MiniPlayer to react.
    // So, we need both:
    stopAllPlayers(true) // Immediately stop audio elements
    triggerGlobalAudioStop() // Signal UI components to reset
  }

  const processBatchFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsBatchImporting(true)
    setBatchImportProgress(0)
    const totalFiles = files.length
    let filesProcessed = 0
    console.info(`[PlaySound Settings] Starting batch import of ${totalFiles} files...`)

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i]
      const validAudioTypes = [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/mp4',
        'audio/flac'
      ]
      if (validAudioTypes.includes(file.type) || /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)) {
        try {
          const audioBuffer = await file.arrayBuffer()
          const mimeType =
            file.type || `audio/${file.name.split('.').pop()?.toLowerCase() || 'mpeg'}`
          await addAudioToDB(file.name, mimeType, audioBuffer)
          console.debug(`[PlaySound Settings] Batch imported: ${file.name}`)
        } catch (error) {
          console.error(`[PlaySound Settings] Error importing file ${file.name} in batch:`, error)
        }
      } else {
        console.warn(`[PlaySound Settings] Skipped non-audio file in batch: ${file.name}`)
      }
      filesProcessed++
      setBatchImportProgress((filesProcessed / totalFiles) * 100)
    }
    setIsBatchImporting(false)
    setBatchImportProgress(100)
    console.info(
      `[PlaySound Settings] Batch import finished. Processed ${filesProcessed}/${totalFiles}.`
    )
    alert(`Batch import complete. Processed ${filesProcessed} of ${totalFiles} files.`)
    fetchCachedFilesData(true) // Refresh button count
    if (manageCacheDialogOpen) fetchCachedFilesData(false) // Refresh dialog list if open
    setTimeout(() => setBatchImportProgress(0), 1500)
  }

  const handleBatchFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsBatchImportDragging(false)
    processBatchFiles(event.dataTransfer.files)
  }
  const handleBatchDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsBatchImportDragging(true)
  }
  const handleBatchDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsBatchImportDragging(false)
  }
  const handleBatchFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    processBatchFiles(event.target.files)
    if (event.target) event.target.value = ''
  }
  const handleBatchSelectClick = () => batchFileInputRef.current?.click()

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}
    >
      <Typography variant="overline">Global Audio Control</Typography>
      <Button
        variant="outlined"
        color="primary" // Changed from secondary for consistency or preference
        onClick={handleOpenManageCacheDialog}
        startIcon={<Storage />}
        fullWidth
        size="small"
        sx={{ height: 40 }}
        disabled={isLoadingInitialCount && initialCachedFileCount === 0}
      >
        Manage Cached Sounds (
        {isLoadingInitialCount && initialCachedFileCount === 0 ? (
          <CircularProgress size={14} sx={{ mr: 0.5 }} />
        ) : (
          initialCachedFileCount
        )}
        )
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={handleStopAllSoundsFromSettings} // Renamed to avoid conflict if stopAllPlayers was also directly used
        startIcon={<StopCircle />}
        fullWidth
        size="small"
        sx={{ height: 40 }}
      >
        Stop All Sounds
      </Button>

      <Dialog
        open={manageCacheDialogOpen}
        onClose={handleCloseManageCacheDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Manage Cached Audio Snippets</DialogTitle>
        <DialogContent dividers>
          {' '}
          {/* Added dividers */}
          <input
            type="file"
            multiple
            accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac"
            style={{ display: 'none' }}
            ref={batchFileInputRef}
            onChange={handleBatchFileInputChange}
          />
          <Box
            onClick={handleBatchSelectClick}
            onDrop={handleBatchFileDrop}
            onDragOver={handleBatchDragOver}
            onDragLeave={handleBatchDragLeave}
            sx={{
              border: `2px dashed ${isBatchImportDragging ? 'primary.main' : 'grey.400'}`,
              p: 2,
              mb: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isBatchImportDragging ? 'action.hover' : 'transparent', // Use theme action.hover
              borderRadius: 1
            }}
          >
            <Audiotrack sx={{ fontSize: 24, color: 'text.secondary', mb: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Drop Audio Files Here or Click to Batch Import
            </Typography>
          </Box>
          {isBatchImporting && (
            <LinearProgress variant="determinate" value={batchImportProgress} sx={{ mb: 1 }} /> // Changed my to mb
          )}
          {isLoadingDialogList ? ( // Show loader for dialog list
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : cachedFilesList.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
              No audio snippets cached in IndexedDB.
            </Typography>
          ) : (
            <List
              dense
              sx={{ maxHeight: 300, overflow: 'auto', pr: 1 /* Add padding for scrollbar */ }}
            >
              {cachedFilesList.map((file) => (
                <ListItem
                  key={file.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteCachedFile(file.id)}
                      color="error"
                    >
                      {' '}
                      <DeleteIcon fontSize="small" />{' '}
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Audiotrack fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.originalFileName}
                    secondary={`Cached: ${file.dateAdded.toLocaleDateString()}`}
                    primaryTypographyProps={{ noWrap: true, title: file.originalFileName }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 1 }}>
          <Button
            onClick={handleClearAllCache}
            color="error"
            size="small"
            disabled={cachedFilesList.length === 0 || isLoadingDialogList}
          >
            Clear All Cache
          </Button>
          <Button onClick={handleCloseManageCacheDialog} variant="outlined" size="small">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

// No default export if this is imported by PlaySound.tsx (orchestrator)
// export default PlaySoundSettings;
