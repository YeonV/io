// src/renderer/src/modules/PlaySound/PlaySoundSettings.tsx
import type { FC, DragEvent, ChangeEvent } from 'react'
import { useEffect, useState, useRef } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
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
  CircularProgress
} from '@mui/material'
import { Audiotrack, StopCircle, Delete as DeleteIcon, Storage } from '@mui/icons-material'
import { useMainStore } from '@/store/mainStore'
import {
  addAudioToDB,
  getAllAudioInfoFromDB,
  deleteAudioFromDB,
  clearAllAudioFromDB
} from './lib/db'

interface SettingsCachedAudioInfo {
  id: string
  originalFileName: string
  dateAdded: Date
}

export const PlaySoundSettings: FC = () => {
  const [manageCacheDialogOpen, setManageCacheDialogOpen] = useState(false)
  const [cachedFilesList, setCachedFilesList] = useState<SettingsCachedAudioInfo[]>([])
  const [initialCachedFileCount, setInitialCachedFileCount] = useState(0)
  const [isLoadingInitialCount, setIsLoadingInitialCount] = useState(true)
  const [isLoadingDialogList, setIsLoadingDialogList] = useState(false) // Added this from your last version

  const [isBatchImportDragging, setIsBatchImportDragging] = useState(false)
  const [batchImportProgress, setBatchImportProgress] = useState(0)
  const [isBatchImporting, setIsBatchImporting] = useState(false)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  const triggerGlobalAudioStop = useMainStore((state) => state.setGlobalAudioCommandTimestamp)

  const fetchCachedFilesData = async (forCountOnly = false) => {
    if (forCountOnly) setIsLoadingInitialCount(true)
    else setIsLoadingDialogList(true)
    try {
      const filesFromDB = await getAllAudioInfoFromDB()
      const processedFiles = filesFromDB
        .map((f) => ({ ...f, dateAdded: new Date(f.dateAdded) }))
        .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
      if (forCountOnly) setInitialCachedFileCount(processedFiles.length)
      else {
        setCachedFilesList(processedFiles)
        setInitialCachedFileCount(processedFiles.length)
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
    fetchCachedFilesData(true)
  }, [])

  const handleOpenManageCacheDialog = () => {
    fetchCachedFilesData(false)
    setManageCacheDialogOpen(true)
  }
  const handleCloseManageCacheDialog = () => setManageCacheDialogOpen(false)

  const handleDeleteCachedFile = async (audioId: string) => {
    if (window.confirm('Delete this cached sound? Rows using it will need a new file selected.')) {
      // To stop a specific player, we'd need access to activeAudioPlayers and stopPlayer,
      // or dispatch a specific event. For now, deleting from DB.
      // activeAudioPlayers.forEach((player) => { if (player.audioId === audioId) stopPlayer(player.rowId); });
      console.warn(
        `[PlaySound Settings] Deleting audioId ${audioId}. If playing, it might continue until row is re-triggered or app restart unless PlaySoundModule handles this.`
      )
      await deleteAudioFromDB(audioId)
      fetchCachedFilesData(false)
      fetchCachedFilesData(true)
    }
  }

  const handleClearAllCache = async () => {
    if (window.confirm('Delete ALL cached sounds? This cannot be undone.')) {
      // stopAllPlayers(true); // This would need to be imported from PlaySound.tsx
      // For now, rely on the global command to signal players.
      // The actual audio elements will be orphaned if not stopped by the global command's effect.
      // This is fine if the global command reliably stops them.
      triggerGlobalAudioStop() // Signal all players to stop and reset UI
      await clearAllAudioFromDB() // Then clear the data
      fetchCachedFilesData(false)
      setInitialCachedFileCount(0)
    }
  }

  const handleActualStopAllSounds = () => {
    console.info(
      '[PlaySound Settings] User clicked Stop All Sounds. Triggering global command via store.'
    )
    triggerGlobalAudioStop() // ONLY set the timestamp in Zustand
    // The AudioPlayerCore instances will react to this timestamp change.
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
    fetchCachedFilesData(true)
    if (manageCacheDialogOpen) fetchCachedFilesData(false)
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
        color="primary"
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
        onClick={handleActualStopAllSounds}
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
              bgcolor: isBatchImportDragging ? 'action.hover' : 'transparent',
              borderRadius: 1
            }}
          >
            <Audiotrack sx={{ fontSize: 24, color: 'text.secondary', mb: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Drop Audio Files Here or Click to Batch Import
            </Typography>
          </Box>
          {isBatchImporting && (
            <LinearProgress variant="determinate" value={batchImportProgress} sx={{ mb: 1 }} />
          )}
          {isLoadingDialogList && cachedFilesList.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : cachedFilesList.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
              No audio snippets cached.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 300, overflow: 'auto', pr: 1 }}>
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
