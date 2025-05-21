// src/renderer/src/modules/PlaySound/PlaySoundOutputEdit.tsx
import type { FC, DragEvent, ChangeEvent } from 'react'
import { useEffect, useState, useRef } from 'react'
import type { OutputData } from '@shared/types'
import {
  Box,
  Button,
  Typography,
  Stack,
  // IconButton,
  Tooltip,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  MenuItem,
  Divider
  // Slider
} from '@mui/material'
import {
  Audiotrack,
  FolderOpen,
  PlayArrow,
  Pause as PauseIcon,
  Cached,
  RepeatOne,
  // Loop as LoopIcon,
  LayersClear,
  Layers,
  // VolumeUp,
  Repeat
} from '@mui/icons-material'
import type { PlaySoundOutputData } from './PlaySound.types'
import { addAudioToDB, getAudioBufferFromDB, getAllAudioInfoFromDB } from './lib/db'
import { previewPlayer, stopPlayer as stopAnyPlayer } from './PlaySound'

export interface PlaySoundOutputEditProps {
  output: OutputData
  onChange: (dataChanges: Partial<PlaySoundOutputData>) => void
}

export const PlaySoundOutputEdit: FC<PlaySoundOutputEditProps> = ({ output, onChange }) => {
  const currentData = output.data as Partial<PlaySoundOutputData>
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null) // Blob URL for the current preview
  const [cachedAudioFiles, setCachedAudioFiles] = useState<
    Array<{ id: string; originalFileName: string }>
  >([])
  const [isLoadingCache, setIsLoadingCache] = useState(false)

  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoadingCache(true)
      try {
        const filesInfo = await getAllAudioInfoFromDB()
        filesInfo.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName))
        setCachedAudioFiles(
          filesInfo.map((f) => ({ id: f.id, originalFileName: f.originalFileName }))
        )
      } catch (error) {
        console.error('[PlaySound OutputEdit] Error fetching cached audio files:', error)
      }
      setIsLoadingCache(false)
    }
    fetchFiles()
  }, []) // Fetch once on mount

  useEffect(() => {
    // Cleanup effect for the previewBlobUrl and previewPlayer
    const currentBlobUrlForCleanup = previewBlobUrl
    return () => {
      if (
        previewPlayer &&
        !previewPlayer.paused &&
        previewPlayer.src === currentBlobUrlForCleanup
      ) {
        stopAnyPlayer(previewPlayer) // Use the global stopPlayer
      }
      if (currentBlobUrlForCleanup) {
        URL.revokeObjectURL(currentBlobUrlForCleanup)
      }
    }
  }, [previewBlobUrl]) // Depend only on previewBlobUrl for this specific cleanup

  const updateAudioDataInState = (audioId?: string, originalFileName?: string) => {
    // Stop and clean up any current preview before changing the audio source
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    setPreviewBlobUrl(null)
    if (previewPlayer && !previewPlayer.paused) stopAnyPlayer(previewPlayer)
    setIsPreviewPlaying(false)

    onChange({
      audioId,
      originalFileName,
      volume: currentData.volume, // Preserve other settings
      loop: currentData.loop,
      cancelPrevious: currentData.cancelPrevious
    })

    // If a new file was added (not just selected from cache), refresh the cache list
    if (audioId && originalFileName && !cachedAudioFiles.find((f) => f.id === audioId)) {
      // Add to local cache list immediately for better UX, or re-fetch
      setCachedAudioFiles((prev) => {
        const newFileEntry = { id: audioId, originalFileName }
        const existing = prev.find((f) => f.id === audioId)
        if (existing)
          return prev
            .map((f) => (f.id === audioId ? newFileEntry : f))
            .sort((a, b) => a.originalFileName.localeCompare(b.originalFileName))
        return [...prev, newFileEntry].sort((a, b) =>
          a.originalFileName.localeCompare(b.originalFileName)
        )
      })
    }
  }

  // const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => file.arrayBuffer()

  const processFile = async (file: File | null | undefined) => {
    if (!file) return
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
        const mimeType = file.type || `audio/${file.name.split('.').pop()?.toLowerCase() || 'mpeg'}`
        const newAudioId = await addAudioToDB(file.name, mimeType, audioBuffer) // This ID is from IndexedDB
        updateAudioDataInState(newAudioId, file.name)
        console.debug(
          `[PlaySound OutputEdit] Processed and stored file: ${file.name}, ID: ${newAudioId}`
        )
      } catch (error) {
        console.error('[PlaySound OutputEdit] Error processing file into IndexedDB:', error)
        alert('Failed to load and store audio file.')
        updateAudioDataInState(undefined, undefined) // Clear on error
      }
    } else {
      alert('Invalid file type. Please drop or select a common audio file.')
    }
  }

  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) processFile(event.target.files[0])
    if (event.target) event.target.value = '' // Reset input to allow selecting the same file again
  }
  const handleSelectFileClick = () => fileInputRef.current?.click()
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0])
      processFile(event.dataTransfer.files[0])
  }
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    console.log('[PlaySound OutputEdit] Dragging over drop area')
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
  }

  // const handleVolumeChange = (_event: Event, newValue: number | number[]) =>
  //   onChange({ volume: parseFloat((newValue as number).toFixed(2)) })

  const handleCancelPreviousToggle = () =>
    onChange({
      cancelPrevious: !(currentData.cancelPrevious === undefined
        ? true
        : currentData.cancelPrevious)
    })
  const handleLoopToggle = () => onChange({ loop: !currentData.loop })

  const handlePreview = async () => {
    if (!currentData.audioId) {
      console.warn('[PlaySound OutputEdit] Preview clicked but no audioId selected.')
      return
    }

    // If the current preview player is playing this specific sound's current blob URL, stop it.
    if (!previewPlayer.paused && previewPlayer.src === previewBlobUrl) {
      stopAnyPlayer(previewPlayer) // Use the imported stopPlayer
      setIsPreviewPlaying(false)
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
      setPreviewBlobUrl(null)
      return
    }

    // Stop any other sound that might be previewing and clean up its blob URL
    if (!previewPlayer.paused) stopAnyPlayer(previewPlayer)
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)

    console.debug(
      '[PlaySound OutputEdit] Attempting to play preview for:',
      currentData.originalFileName,
      'ID:',
      currentData.audioId
    )
    const audioRecord = await getAudioBufferFromDB(currentData.audioId)
    if (audioRecord?.audioBuffer) {
      const blob = new Blob([audioRecord.audioBuffer], { type: audioRecord.mimeType })
      const newBlobUrl = URL.createObjectURL(blob)
      setPreviewBlobUrl(newBlobUrl) // Store for cleanup

      previewPlayer.src = newBlobUrl
      previewPlayer.volume = currentData.volume === undefined ? 1.0 : currentData.volume
      previewPlayer.loop = false

      const onPreviewEnded = () => {
        setIsPreviewPlaying(false)
        if (previewPlayer.src === newBlobUrl) {
          // Only revoke if it's still this URL
          URL.revokeObjectURL(newBlobUrl)
          setPreviewBlobUrl(null)
        }
        previewPlayer.removeEventListener('ended', onPreviewEnded)
        previewPlayer.removeEventListener('pause', onPreviewPauseDuringPlay)
      }
      const onPreviewPauseDuringPlay = () => {
        if (previewPlayer.src === newBlobUrl && !previewPlayer.ended) {
          setIsPreviewPlaying(false)
        }
      }

      previewPlayer.addEventListener('ended', onPreviewEnded)
      previewPlayer.addEventListener('pause', onPreviewPauseDuringPlay) // Handle pause by other means

      previewPlayer
        .play()
        .then(() => setIsPreviewPlaying(true))
        .catch((e) => {
          console.error('[PlaySound OutputEdit] Preview play error:', e)
          setIsPreviewPlaying(false)
          URL.revokeObjectURL(newBlobUrl)
          setPreviewBlobUrl(null)
        })
    } else {
      alert('Audio data not found in cache for preview.')
      setPreviewBlobUrl(null)
    }
  }

  const handleCachedAudioSelect = (event: SelectChangeEvent<string>) => {
    const selectedAudioId = event.target.value
    if (selectedAudioId) {
      const selectedFile = cachedAudioFiles.find((f) => f.id === selectedAudioId)
      if (selectedFile) {
        updateAudioDataInState(selectedFile.id, selectedFile.originalFileName)
      }
    } else {
      updateAudioDataInState(undefined, undefined)
    }
  }

  return (
    <>
      <FormControl fullWidth size="medium" disabled={isLoadingCache} sx={{ mt: '4px', mb: '0' }}>
        <InputLabel id="cached-audio-select-label">Select Sound</InputLabel>
        <Select
          labelId="cached-audio-select-label"
          label="Select Sound"
          value={currentData.audioId || ''}
          onChange={handleCachedAudioSelect}
          startAdornment={
            isLoadingCache ? (
              <CircularProgress size={20} sx={{ mr: 1 }} />
            ) : (
              <Cached sx={{ mr: 1, color: 'action.active' }} />
            )
          }
        >
          <MenuItem value="">
            <em>None / Add New Below</em>
          </MenuItem>
          {cachedAudioFiles.map((file) => (
            <MenuItem key={file.id} value={file.id}>
              {file.originalFileName.length > 40
                ? `${file.originalFileName.substring(0, 37)}...`
                : file.originalFileName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack spacing={2}>
        <input
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
        />
        <Box
          onClick={handleSelectFileClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            border: `2px dashed ${isDraggingOver ? '#999' : '#666'}`,
            borderRadius: 1,
            p: 2,
            textAlign: 'center',
            cursor: 'pointer',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: isDraggingOver ? 'primary.lightest' : 'transparent', // Updated colors
            transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out'
          }}
        >
          <Audiotrack sx={{ fontSize: 30, color: 'text.secondary', mb: 1 }} />
          {currentData.audioId && currentData.originalFileName ? (
            <Stack alignItems="center" spacing={1}>
              <Tooltip title={currentData.originalFileName}>
                <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
                  {currentData.originalFileName}
                </Typography>
              </Tooltip>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Drop audio file, or click to select
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} justifyContent={'center'}>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handleSelectFileClick()
            }}
            size="small"
            variant="text"
            startIcon={<FolderOpen />}
          >
            Change
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              handlePreview()
            }}
            size="small"
            variant="text"
            startIcon={isPreviewPlaying ? <PauseIcon /> : <PlayArrow />}
            color={isPreviewPlaying ? 'warning' : 'primary'}
          >
            {isPreviewPlaying ? 'Stop' : 'Preview'}
          </Button>
        </Stack>
        {/* <Box>
          <Typography gutterBottom variant="caption">
            Volume
          </Typography>{' '}
          <Slider
            value={currentData.volume ?? 1}
            onChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.01}
            valueLabelDisplay="auto"
            marks={[
              { value: 0, label: 'Mute' },
              { value: 0.5, label: '50%' },
              { value: 1, label: '100%' }
            ]}
          />
        </Box> */}
        <Divider />
        <Button
          variant="text"
          sx={{ textTransform: 'capitalize', justifyContent: 'flex-start' }}
          startIcon={
            currentData.cancelPrevious ? (
              <LayersClear sx={{ fontSize: '1.2rem' }} />
            ) : (
              <Layers sx={{ fontSize: '1.2rem' }} />
            )
          }
          onClick={handleCancelPreviousToggle}
        >
          {currentData.cancelPrevious ? 'Stop other sounds' : 'Play in parallel'}
        </Button>
        <Button
          variant="text"
          sx={{ textTransform: 'capitalize', justifyContent: 'flex-start' }}
          startIcon={
            currentData.loop ? (
              <Repeat sx={{ fontSize: '1.2rem' }} />
            ) : (
              <RepeatOne sx={{ fontSize: '1.2rem' }} />
            )
          }
          onClick={handleLoopToggle}
        >
          {currentData.loop ? 'Looping' : 'Play once (Loop off)'}
        </Button>
      </Stack>
    </>
  )
}

// Note: The rest of the file (OutputDisplay, MiniPlayer, useOutputActions, Settings)
// would follow, exactly as in your last fully provided PlaySound.tsx.
// For brevity and focus, I'm only showing OutputEdit here based on the "breakdown" approach.
// You would merge this OutputEdit into the final PlaySoundModule.tsx or keep it separate.
