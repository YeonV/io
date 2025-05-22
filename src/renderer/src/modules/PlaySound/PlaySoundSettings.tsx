import type { FC, DragEvent, ChangeEvent } from 'react'
import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [isLoadingDialogList, setIsLoadingDialogList] = useState(false)

  const [isBatchImportDragging, setIsBatchImportDragging] = useState(false)
  const [batchImportProgress, setBatchImportProgress] = useState(0)
  const [isBatchImporting, setIsBatchImporting] = useState(false)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  const triggerGlobalAudioStop = useMainStore((state) => state.setGlobalAudioCommandTimestamp)
  const isWindowBeingDraggedOver = useMainStore((state) => state.isWindowBeingDraggedOver)
  const setIsWindowBeingDraggedOver = useMainStore((state) => state.setIsWindowBeingDraggedOver)
  const setDropMessage = useMainStore((state) => state.setDropMessage)

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
      triggerGlobalAudioStop()
      await clearAllAudioFromDB()
      fetchCachedFilesData(false)
      setInitialCachedFileCount(0)
    }
  }

  const handleActualStopAllSounds = () => {
    console.info(
      '[PlaySound Settings] User clicked Stop All Sounds. Triggering global command via store.'
    )
    triggerGlobalAudioStop()
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
    setIsWindowBeingDraggedOver(false)
    setDropMessage(null)
  }

  const handleBatchDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsBatchImportDragging(true)
    setDropMessage('Drop to add audio file(s)')
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleBatchDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsBatchImportDragging(true)
    setDropMessage('Drop to add audio file(s)')
  }, [])

  const handleBatchDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsBatchImportDragging(false)
      setDropMessage(null)
    }
  }, [])

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
        sx={{ zIndex: 9999 }}
        slotProps={{
          paper: {
            elevation: isWindowBeingDraggedOver ? 0 : 2,
            sx: {
              // bgcolor: isWindowBeingDraggedOver ? '#00f' : '#232323'
            }
          }
        }}
      >
        <DialogTitle
          sx={{
            opacity: isWindowBeingDraggedOver ? 0.3 : 1
          }}
        >
          Manage Cached Audio Snippets
        </DialogTitle>
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
            onDragEnter={handleBatchDragEnter}
            onDragLeave={handleBatchDragLeave}
            sx={{
              borderRadius: 2,
              opacity: 1,
              p: 2,
              mb: 2,
              cursor: 'pointer',
              textAlign: 'center',
              position: 'relative',
              border: `2px dashed ${isBatchImportDragging ? '#fff' : isWindowBeingDraggedOver ? '#fff' : '#999'}`,
              bgcolor: isBatchImportDragging ? 'action.hover' : 'background.paper',
              zIndex: 10000 // 'auto'
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
            <List
              dense
              sx={{
                maxHeight: 300,
                overflow: 'auto',
                pr: 1,
                opacity: isWindowBeingDraggedOver ? 0.3 : 1
              }}
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
        <DialogActions
          sx={{
            justifyContent: 'space-between',
            px: 2,
            pb: 2,
            pt: 1,
            opacity: isWindowBeingDraggedOver ? 0.3 : 1
          }}
        >
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
