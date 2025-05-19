import type { FC, DragEvent, ChangeEvent } from 'react'
import { useEffect, useState, useRef } from 'react'
import type { ModuleConfig, OutputData, Row } from '@shared/types'
import {
  Box,
  Button,
  Typography,
  //   Slider,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  DialogActions,
  ListItemIcon,
  SelectChangeEvent,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  MenuItem,
  Divider
} from '@mui/material'
import {
  Audiotrack,
  FolderOpen,
  StopCircle,
  Loop as LoopIcon,
  PlayArrow,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Storage,
  Cached,
  Repeat,
  RepeatOne,
  LayersClear,
  Layers
} from '@mui/icons-material'
import DisplayButtons from '@/components/Row/DisplayButtons'
import type { PlaySoundOutputData, PlaySoundModuleCustomConfig } from './PlaySound.types'
import {
  addAudioToDB,
  getAudioBufferFromDB,
  getAllAudioInfoFromDB,
  deleteAudioFromDB,
  clearAllAudioFromDB
} from './lib/db'

// --- Module Definition ---
export const id = 'playsound-module'

export const moduleConfig: ModuleConfig<PlaySoundModuleCustomConfig> = {
  menuLabel: 'Audio',
  inputs: [],
  outputs: [{ name: 'Play Sound', icon: 'audiotrack', editable: true }],
  config: {
    enabled: true
  }
}

// --- Active Audio Player Management (Module Scoped) ---
interface ActivePlayer {
  audio: HTMLAudioElement
  rowId: string
  isLooping: boolean
  audioId?: string
  originalFileName?: string
}
const activeAudioPlayers = new Map<string, ActivePlayer>()
const previewPlayer = new Audio() // Single audio element for previews in OutputEdit
const blobUrlCache = new Map<string, string>() // Cache Blob URLs: audioId -> blobUrl

function stopPlayer(rowIdOrPlayer: string | HTMLAudioElement) {
  let playerKey: string | undefined
  let audioToStop: HTMLAudioElement | undefined
  let wasPlayingPreview = false

  if (typeof rowIdOrPlayer === 'string') {
    playerKey = rowIdOrPlayer
    const playerEntry = activeAudioPlayers.get(playerKey)
    audioToStop = playerEntry?.audio
    if (playerEntry?.audioId && blobUrlCache.has(playerEntry.audioId)) {
      URL.revokeObjectURL(blobUrlCache.get(playerEntry.audioId)!)
      blobUrlCache.delete(playerEntry.audioId)
    }
  } else {
    audioToStop = rowIdOrPlayer
    if (audioToStop === previewPlayer) wasPlayingPreview = true
    else {
      for (const [key, player] of activeAudioPlayers.entries()) {
        if (player.audio === audioToStop) {
          playerKey = key
          if (player.audioId && blobUrlCache.has(player.audioId)) {
            URL.revokeObjectURL(blobUrlCache.get(player.audioId)!)
            blobUrlCache.delete(player.audioId)
          }
          break
        }
      }
    }
  }

  if (audioToStop && !audioToStop.paused) audioToStop.pause()
  if (audioToStop) {
    audioToStop.currentTime = 0
    if (audioToStop.loop) audioToStop.loop = false
    if (audioToStop.src && audioToStop.src.startsWith('blob:')) {
      // Blob URLs are already revoked above or will be when new sound loads
    }
    audioToStop.removeAttribute('src')
    audioToStop.load()
    console.debug(
      `[PlaySound] Stopped player: ${playerKey || (wasPlayingPreview ? 'preview' : 'unknown')}`
    )
  }
  if (playerKey) activeAudioPlayers.delete(playerKey)
}

function stopAllPlayers(stopThePreviewPlayer = true) {
  console.debug('[PlaySound] Stopping all active IO row players.')
  activeAudioPlayers.forEach((_player, key) => stopPlayer(key))

  if (stopThePreviewPlayer && previewPlayer && !previewPlayer.paused) {
    stopPlayer(previewPlayer)
    console.debug('[PlaySound] Stopped preview player via StopAll.')
  }
}

if (process.env.NODE_ENV === 'development') {
  if (!window.IO_DEV_TOOLS) {
    // @ts-ignore
    window.IO_DEV_TOOLS = {}
  }
  // @ts-ignore
  window.IO_DEV_TOOLS.clearPlaySoundCache = async () => {
    console.log('[DEV TOOLS] Clearing PlaySound IndexedDB cache via window.IO_DEV_TOOLS...')
    await clearAllAudioFromDB()
    console.log('[DEV TOOLS] PlaySound IndexedDB cache clear request complete.')
  }
}

// --- OutputEdit Component ---
export const OutputEdit: FC<{
  output: OutputData
  onChange: (dataChanges: Partial<PlaySoundOutputData>) => void
}> = ({ output, onChange }) => {
  const currentData = output.data as Partial<PlaySoundOutputData>
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)
  const [cachedAudioFiles, setCachedAudioFiles] = useState<
    Array<{ id: string; originalFileName: string }>
  >([])
  const [isLoadingCache, setIsLoadingCache] = useState(false)

  // Fetch cached files when component mounts or edit mode starts for this output
  useEffect(() => {
    const fetchFiles = async () => {
      setIsLoadingCache(true)
      try {
        const filesInfo = await getAllAudioInfoFromDB()
        // Sort by name for the dropdown
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
  }, [])

  useEffect(() => {
    // Cleanup preview player and revoke Blob URL when component unmounts or audioId changes
    return () => {
      if (!previewPlayer.paused) stopPlayer(previewPlayer)
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
        setPreviewBlobUrl(null)
      }
    }
  }, [currentData.audioId]) // Re-run cleanup if the audioId changes

  const updateAudioDataInState = (audioId?: string, originalFileName?: string) => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) // Revoke old preview Blob URL
    setPreviewBlobUrl(null)
    if (!previewPlayer.paused) stopPlayer(previewPlayer)
    setIsPreviewPlaying(false)
    onChange({
      audioId,
      originalFileName,
      volume: currentData.volume,
      loop: currentData.loop,
      cancelPrevious: currentData.cancelPrevious
    })
    if (audioId && !cachedAudioFiles.find((f) => f.id === audioId)) {
      const fetchFiles = async () => {
        const filesInfo = await getAllAudioInfoFromDB()
        filesInfo.sort((a, b) => a.originalFileName.localeCompare(b.originalFileName))
        setCachedAudioFiles(
          filesInfo.map((f) => ({ id: f.id, originalFileName: f.originalFileName }))
        )
      }
      fetchFiles()
    }
  }

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => file.arrayBuffer()

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
    // Checking file.type is more reliable than extension for web File objects
    if (validAudioTypes.includes(file.type) || /\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)) {
      try {
        const audioBuffer = await file.arrayBuffer()
        const mimeType = file.type || `audio/${file.name.split('.').pop()?.toLowerCase()}` // Guess MIME if not present
        const newAudioId = await addAudioToDB(file.name, mimeType, audioBuffer)
        updateAudioDataInState(newAudioId, file.name)
        console.debug(
          `[PlaySound OutputEdit] Processed and stored file: ${file.name}, ID: ${newAudioId}`
        )
      } catch (error) {
        console.error('[PlaySound OutputEdit] Error processing file into IndexedDB:', error)
        alert('Failed to load and store audio file.')
        updateAudioDataInState(undefined, undefined)
      }
    } else {
      alert('Invalid file type. Please drop or select a common audio file.')
    }
  }

  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) processFile(event.target.files[0])
    if (event.target) event.target.value = ''
  }
  const handleSelectFileClick = () => fileInputRef.current?.click()
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    /* ... calls processFile ... */ event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0])
      processFile(event.dataTransfer.files[0])
  }
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    /* ... */ event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    /* ... */ event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
  }
  //   const handleVolumeChange = (_event: Event, newValue: number | number[]) =>
  //     onChange({ volume: parseFloat((newValue as number).toFixed(2)) })

  //   const handleCancelPreviousToggle = (event: React.ChangeEvent<HTMLInputElement>) =>
  //     onChange({ cancelPrevious: event.target.checked })

  const handleCancelPreviousToggle = (_event: any) => {
    onChange({ cancelPrevious: !currentData.cancelPrevious })
  }
  //   const handleLoopToggle = (event: React.ChangeEvent<HTMLInputElement>) =>
  // onChange({ loop: event.target.checked })
  const handleLoopToggle = (_event: any) => onChange({ loop: !currentData.loop })

  const handlePreview = async () => {
    if (!currentData.audioId) return

    if (!previewPlayer.paused && previewBlobUrl) {
      // If it's playing THIS sound via previewBlobUrl
      stopPlayer(previewPlayer)
      setIsPreviewPlaying(false)
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) // Revoke immediately after stopping
      setPreviewBlobUrl(null)
    } else {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl) // Revoke any old one
      setPreviewBlobUrl(null)
      if (!previewPlayer.paused) stopPlayer(previewPlayer) // Stop any other preview sound

      const audioRecord = await getAudioBufferFromDB(currentData.audioId)
      if (audioRecord?.audioBuffer) {
        const blob = new Blob([audioRecord.audioBuffer], { type: audioRecord.mimeType })
        const newBlobUrl = URL.createObjectURL(blob)
        setPreviewBlobUrl(newBlobUrl) // Store for cleanup

        previewPlayer.src = newBlobUrl
        previewPlayer.volume = currentData.volume === undefined ? 1.0 : currentData.volume
        previewPlayer.loop = false
        previewPlayer
          .play()
          .then(() => setIsPreviewPlaying(true))
          .catch((e) => {
            console.error('[PlaySound OutputEdit] Preview play error:', e)
            setIsPreviewPlaying(false)
            URL.revokeObjectURL(newBlobUrl) // Cleanup on error
            setPreviewBlobUrl(null)
          })
        previewPlayer.onended = () => {
          setIsPreviewPlaying(false)
          if (newBlobUrl) URL.revokeObjectURL(newBlobUrl) // Cleanup after playing
          setPreviewBlobUrl(null)
        }
        previewPlayer.onpause = () => {
          // Check if it was this specific preview that was paused
          if (previewPlayer.src === newBlobUrl && isPreviewPlaying) {
            setIsPreviewPlaying(false)
          }
        }
      } else {
        alert('Audio data not found in cache for preview.')
      }
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
      // "None" or empty selection
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

// --- MiniPlayer Sub-Component for OutputDisplay ---
const MiniPlayer: FC<{ rowId: string; outputData: PlaySoundOutputData }> = ({
  rowId,
  outputData
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null) // To hold the specific Audio object

  useEffect(() => {
    const playerEntry = activeAudioPlayers.get(rowId)
    audioInstanceRef.current = playerEntry ? playerEntry.audio : null
    const audio = audioInstanceRef.current

    if (audio) {
      const handleStateChange = () => {
        setIsPlaying(!audio.paused && audio.readyState > 0 && audio.duration > 0 && !audio.ended)
        if (audio.duration) {
          setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
        } else {
          setProgress(0)
        }
      }

      audio.addEventListener('play', handleStateChange)
      audio.addEventListener('playing', handleStateChange)
      audio.addEventListener('pause', handleStateChange)
      audio.addEventListener('ended', handleStateChange)
      audio.addEventListener('timeupdate', handleStateChange)
      audio.addEventListener('emptied', handleStateChange) // When src is removed
      audio.addEventListener('loadeddata', handleStateChange) // After src is set and data loaded

      handleStateChange() // Set initial state

      return () => {
        audio.removeEventListener('play', handleStateChange)
        audio.removeEventListener('playing', handleStateChange)
        audio.removeEventListener('pause', handleStateChange)
        audio.removeEventListener('ended', handleStateChange)
        audio.removeEventListener('timeupdate', handleStateChange)
        audio.removeEventListener('emptied', handleStateChange)
        audio.removeEventListener('loadeddata', handleStateChange)
      }
    } else {
      setIsPlaying(false)
      setProgress(0)
    }
  }, [rowId, activeAudioPlayers.get(rowId)?.audio]) // Depend on the specific audio instance

  const handlePlayPauseToggle = () => {
    if (audioInstanceRef.current) {
      if (audioInstanceRef.current.paused)
        audioInstanceRef.current
          .play()
          .catch((e) => console.error('[PlaySound MiniPlayer] Play error:', e))
      else audioInstanceRef.current.pause()
    } else {
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }))
    }
  }

  const handleStop = () => stopPlayer(rowId)

  if (!outputData.audioId || !outputData.originalFileName) return null

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ px: 0.5, width: '100%' }}>
      <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
        <IconButton onClick={handlePlayPauseToggle} size="small">
          {isPlaying ? <PauseIcon fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Stop">
        <IconButton onClick={handleStop} size="small">
          <StopCircle fontSize="inherit" />
        </IconButton>
      </Tooltip>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
      />
    </Stack>
  )
}

// --- OutputDisplay Component ---
export const OutputDisplay: FC<{ output: OutputData; rowId: string }> = ({ output, rowId }) => {
  const data = output.data as PlaySoundOutputData
  const displayFileName = data.originalFileName || 'No file selected'
  const displayInfo: string[] = []
  if (data.cancelPrevious === false) displayInfo.push('||') // Using "||" for parallel
  if (data.loop) displayInfo.push('Loop')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        <DisplayButtons data={{ ...output, name: 'Play Sound' }} />
        <Stack sx={{ textAlign: 'left', flexGrow: 1, overflow: 'hidden', minWidth: 0 }}>
          <Tooltip title={displayFileName}>
            <Typography variant="body2" noWrap>
              {displayFileName.length > 20
                ? `${displayFileName.substring(0, 17)}...`
                : displayFileName}
            </Typography>
          </Tooltip>
          {displayInfo.length > 0 && (
            <Typography
              variant="caption"
              color="textSecondary"
              noWrap
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              {data.loop && (
                <Tooltip title="Looping">
                  <LoopIcon sx={{ fontSize: '0.9rem' }} />
                </Tooltip>
              )}
              {data.cancelPrevious === false && (
                <Tooltip title="Plays in Parallel">
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    ||
                  </Typography>
                </Tooltip>
              )}
            </Typography>
          )}
        </Stack>
      </Box>
      <MiniPlayer rowId={rowId} outputData={data} />
    </Box>
  )
}

// --- useOutputActions (Renderer) ---
export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row

  useEffect(() => {
    const outputData = output.data as PlaySoundOutputData

    const playAudioFromDb = async (audioId: string) => {
      const audioRecord = await getAudioBufferFromDB(audioId)
      if (!audioRecord?.audioBuffer) {
        console.warn(`[PlaySound] Audio data for ID ${audioId} not found in DB for row ${rowId}.`)
        return null
      }
      const blob = new Blob([audioRecord.audioBuffer], { type: audioRecord.mimeType })
      const newBlobUrl = URL.createObjectURL(blob)
      // Cache the blob URL for potential reuse by MiniPlayer if it re-renders quickly
      // and for cleanup.
      if (blobUrlCache.has(audioId)) URL.revokeObjectURL(blobUrlCache.get(audioId)!)
      blobUrlCache.set(audioId, newBlobUrl)
      return newBlobUrl
    }

    const ioListener = async (event: Event) => {
      // Parameter is Event
      // Type guard to ensure it's the CustomEvent with string detail you expect
      if (
        event instanceof CustomEvent &&
        typeof event.detail === 'string' && // Ensure detail is a string
        event.detail === rowId // Check if it's for this row
      ) {
        // Now TypeScript knows event.detail is a string within this block
        const eventRowId = event.detail // Which is === rowId

        if (!outputData.audioId) {
          console.warn(`[PlaySound] Row ${eventRowId} triggered, but no audioId configured.`)
          return
        }
        console.info(
          `[PlaySound] Row ${eventRowId} triggered. Playing: ${outputData.originalFileName}`,
          outputData
        )

        if (outputData.cancelPrevious === undefined || outputData.cancelPrevious === true) {
          console.debug(
            `[PlaySound] CancelPrevious active for row ${eventRowId}. Stopping other players.`
          )
          activeAudioPlayers.forEach((player, key) => {
            if (key !== eventRowId) {
              // Use eventRowId from the event
              stopPlayer(key)
            }
          })
        }

        let playerEntry = activeAudioPlayers.get(eventRowId)

        if (playerEntry && !playerEntry.audio.paused) {
          if (playerEntry.isLooping) {
            console.debug(
              `[PlaySound] Row ${eventRowId} is looping and re-triggered. Stopping loop.`
            )
            stopPlayer(eventRowId)
            return
          } else {
            console.debug(
              `[PlaySound] Row ${eventRowId} is playing (not loop) and re-triggered. Restarting.`
            )
            playerEntry.audio.currentTime = 0
            playerEntry.audio.volume = outputData.volume ?? 1.0
            playerEntry.audio.loop = outputData.loop || false
            playerEntry.isLooping = outputData.loop || false
            playerEntry.audio
              .play()
              .catch((e) => console.error('[PlaySound] Error restarting audio:', e))
            return
          }
        }

        const blobUrl = await playAudioFromDb(outputData.audioId)
        if (!blobUrl) {
          console.error(
            `[PlaySound] Could not get blobUrl for audioId ${outputData.audioId} on row ${eventRowId}`
          )
          return
        }

        if (playerEntry && playerEntry.audio.paused) {
          console.debug(`[PlaySound] Row ${eventRowId} reusing existing audio element.`)
          playerEntry.audio.src = blobUrl
        } else {
          console.debug(`[PlaySound] Row ${eventRowId} creating new audio element.`)
          const audio = new Audio(blobUrl) // blobUrl is from playAudioFromDb
          playerEntry = {
            audio,
            rowId: eventRowId,
            isLooping: false, // Will be set below
            audioId: outputData.audioId,
            originalFileName: outputData.originalFileName
          }
          activeAudioPlayers.set(eventRowId, playerEntry)
        }

        // This must be playerEntry.audio from the if/else block above
        const audioToPlay = playerEntry.audio
        audioToPlay.volume = outputData.volume ?? 1.0
        audioToPlay.loop = outputData.loop || false
        playerEntry.isLooping = audioToPlay.loop // Update isLooping in our map entry
        playerEntry.originalFileName = outputData.originalFileName // Update filename in map entry

        audioToPlay.oncanplaythrough = () =>
          console.debug(
            `[PlaySound] Audio can play through for row ${eventRowId}: ${playerEntry?.originalFileName}`
          )
        audioToPlay.onerror = () => {
          console.error(
            `[PlaySound] Error with audio element for row ${eventRowId}:`,
            audioToPlay.error
          )
          stopPlayer(eventRowId)
        }
        audioToPlay.onended = () => {
          console.debug(
            `[PlaySound] Audio ended for row ${eventRowId}: ${playerEntry?.originalFileName}`
          )
          if (!playerEntry?.isLooping) stopPlayer(eventRowId)
        }

        audioToPlay.play().catch((e) => {
          console.error('[PlaySound] Error playing audio:', e)
          stopPlayer(eventRowId)
        })
      }
    }

    window.addEventListener('io_input', ioListener as EventListener)
    return () => {
      window.removeEventListener('io_input', ioListener as EventListener)
      console.debug(`[PlaySound] useOutputActions cleanup for row ${rowId}. Stopping its player.`)
      stopPlayer(rowId)
    }
  }, [rowId, output.data])
}

interface CachedAudioInfo {
  id: string
  originalFileName: string
  dateAdded: Date
}

// --- Settings Component (Module Global Settings) ---
interface CachedAudioInfo {
  id: string
  originalFileName: string
  dateAdded: Date
}

export const Settings: FC = () => {
  const [manageCacheOpen, setManageCacheOpen] = useState(false)
  const [cachedFiles, setCachedFiles] = useState<CachedAudioInfo[]>([])
  const [isBatchImportDragging, setIsBatchImportDragging] = useState(false)
  const [batchImportProgress, setBatchImportProgress] = useState(0)
  const [isBatchImporting, setIsBatchImporting] = useState(false)
  const [manageCacheDialogOpenFromSettings, setManageCacheDialogOpenFromSettings] = useState(false) // Renamed to avoid confusion
  const [cachedAudioFilesList, setCachedAudioFilesList] = useState<
    Pick<CachedAudioInfo, 'id' | 'originalFileName' | 'dateAdded'>[]
  >([]) // For the dialog
  const [initialCachedFileCount, setInitialCachedFileCount] = useState(0) // For the button label
  const [isLoadingInitialCount, setIsLoadingInitialCount] = useState(true)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  const fetchCachedFiles = async () => {
    try {
      const files = await getAllAudioInfoFromDB()
      files.sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime()) // Newest first
      setCachedFiles(files)
    } catch (error) {
      console.error('[PlaySound Settings] Error fetching cached files:', error)
      setCachedFiles([])
    }
  }

  const fetchCachedFilesData = async (forCountOnly = false) => {
    if (!forCountOnly) setIsLoadingInitialCount(true) // Show loading for full fetch for dialog
    try {
      const files = await getAllAudioInfoFromDB() // This gets all info
      if (forCountOnly) {
        setInitialCachedFileCount(files.length)
      } else {
        files.sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
        setCachedAudioFilesList(files) // For the dialog list
        setInitialCachedFileCount(files.length) // Also update count
      }
    } catch (error) {
      console.error('[PlaySound Settings] Error fetching cached files:', error)
      if (forCountOnly) setInitialCachedFileCount(0)
      else setCachedAudioFilesList([])
    }
    if (!forCountOnly) setIsLoadingInitialCount(false)
  }

  // Fetch initial count on mount
  useEffect(() => {
    setIsLoadingInitialCount(true) // Set loading true for initial count fetch
    fetchCachedFilesData(true).finally(() => setIsLoadingInitialCount(false)) // Fetch only count, then set loading false
  }, [])

  const handleOpenManageCacheDialog = () => {
    fetchCachedFilesData(false) // Fetch full data for the dialog
    setManageCacheDialogOpenFromSettings(true)
  }
  const handleCloseManageCacheDialog = () => setManageCacheDialogOpenFromSettings(false)

  const handleDeleteCachedFile = async (audioId: string) => {
    if (window.confirm('Delete this cached sound? Rows using it will need a new file.')) {
      activeAudioPlayers.forEach((player) => {
        // `activeAudioPlayers` needs to be accessible or passed
        if (player.audioId === audioId) stopPlayer(player.rowId)
      })
      await deleteAudioFromDB(audioId)
      fetchCachedFilesData(false) // Refresh full list for dialog
      fetchCachedFilesData(true) // And refresh count for button
    }
  }

  const handleClearAllCache = async () => {
    if (window.confirm('Delete ALL cached sounds? This cannot be undone...')) {
      stopAllPlayers(true)
      await clearAllAudioFromDB()
      fetchCachedFilesData(false) // Refresh full list
      fetchCachedFilesData(true) // And refresh count
    }
  }

  const handleStopAllSounds = () => {
    console.info('[PlaySound Settings] User requested Stop All Sounds.')
    stopAllPlayers(true)
  }

  const processBatchFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsBatchImporting(true)
    setBatchImportProgress(0)
    const totalFiles = files.length
    let filesProcessed = 0

    console.info(`[PlaySound Settings] Starting batch import of ${totalFiles} files...`)

    for (let i = 0; i < files.length; i++) {
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
          await addAudioToDB(file.name, mimeType, audioBuffer) // ID is generated by addAudioToDB
          console.debug(`[PlaySound Settings] Batch imported: ${file.name}`)
        } catch (error) {
          console.error(`[PlaySound Settings] Error importing file ${file.name} in batch:`, error)
          // Optionally collect errors to show user
        }
      } else {
        console.warn(`[PlaySound Settings] Skipped non-audio file in batch: ${file.name}`)
      }
      filesProcessed++
      setBatchImportProgress((filesProcessed / totalFiles) * 100)
    }
    setIsBatchImporting(false)
    setBatchImportProgress(100) // Show complete for a moment
    console.info(
      `[PlaySound Settings] Batch import finished. Processed ${filesProcessed}/${totalFiles}.`
    )
    alert(`Batch import complete. Processed ${filesProcessed} of ${totalFiles} files.`)
    fetchCachedFiles() // Refresh cache list if manager dialog is open
    setTimeout(() => setBatchImportProgress(0), 1500) // Reset progress bar
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
    if (event.target) event.target.value = '' // Reset input
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
        onClick={handleOpenManageCacheDialog} // Use new handler
        startIcon={<Storage />}
        fullWidth
        size="small"
        sx={{ height: 40 }}
        disabled={isLoadingInitialCount} // Disable while fetching count
      >
        Manage Cached Sounds ({isLoadingInitialCount ? '...' : initialCachedFileCount})
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={handleStopAllSounds}
        startIcon={<StopCircle />}
        fullWidth
        size="small"
        sx={{ height: 40 }}
      >
        Stop All Sounds
      </Button>

      <Dialog
        open={manageCacheDialogOpenFromSettings}
        onClose={handleCloseManageCacheDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Manage Cached Audio Snippets</DialogTitle>
        <DialogContent>
          <input
            type="file"
            multiple
            accept="audio/*,..."
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
              /* ... drop zone styles similar to OutputEdit, but maybe distinct ... */
              border: `2px dashed ${isBatchImportDragging ? '#999' : '#666'}`,
              p: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isBatchImportDragging ? 'success.lightest' : 'transparent'
            }}
          >
            <Audiotrack sx={{ fontSize: 24, color: 'text.secondary', mb: 0.5 }} />
            <Typography variant="body2" color="textSecondary">
              Drop Audio Files Here or Click to Batch Import
            </Typography>
          </Box>
          {isBatchImporting && (
            <LinearProgress variant="determinate" value={batchImportProgress} sx={{ my: 1 }} />
          )}
          {cachedFiles.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center' }} color="textSecondary">
              No audio snippets cached in IndexedDB.
            </Typography>
          ) : (
            <List dense>
              {cachedFiles.map((file) => (
                <ListItem
                  key={file.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteCachedFile(file.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
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
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClearAllCache} color="error" disabled={cachedFiles.length === 0}>
            Clear All Cache
          </Button>
          <Button onClick={handleCloseManageCacheDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
