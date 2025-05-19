import type { FC, DragEvent, ChangeEvent } from 'react' // Added ChangeEvent
import { useEffect, useState, useRef, useCallback } from 'react'
import { useMainStore } from '@/store/mainStore' // For actions like toggleRowEnabled if used by mini-player for one-shot
import type { ModuleConfig, OutputData, Row } from '@shared/types'
import {
  Box,
  Button,
  // TextField, // Not directly used in OutputEdit for file path anymore
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material'
import {
  Audiotrack,
  FolderOpen,
  StopCircle,
  Loop as LoopIcon,
  PlayArrow,
  Pause as PauseIcon
  // VolumeUp, // Already available on Slider marks
  // VolumeDown, // Already available on Slider marks
  // VolumeMute, // Already available on Slider marks
} from '@mui/icons-material'
// import { log } from '@/utils'; // Using console for now
import DisplayButtons from '@/components/Row/DisplayButtons'
import type { PlaySoundOutputData, PlaySoundModuleCustomConfig } from './PlaySound.types'

// ipcRenderer is no longer needed in this file if file dialog is fully renderer-side via <input type="file">
// const ipcRenderer = window.electron?.ipcRenderer || false;

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

// --- Helper: Manage active audio players (Module Scoped) ---
interface ActivePlayer {
  audio: HTMLAudioElement
  rowId: string
  isLooping: boolean
  originalFileName?: string
}
const activeAudioPlayers = new Map<string, ActivePlayer>() // rowId -> ActivePlayer
const previewPlayer = new Audio() // Single, module-scoped audio element for previews

function stopPlayer(rowIdOrPlayer: string | HTMLAudioElement) {
  let playerKey: string | undefined
  let audioToStop: HTMLAudioElement | undefined
  let wasPlayingPreview = false

  if (typeof rowIdOrPlayer === 'string') {
    playerKey = rowIdOrPlayer
    audioToStop = activeAudioPlayers.get(playerKey)?.audio
  } else {
    // Assumes HTMLAudioElement is passed
    audioToStop = rowIdOrPlayer
    if (audioToStop === previewPlayer) {
      wasPlayingPreview = true
    } else {
      for (const [key, player] of activeAudioPlayers.entries()) {
        if (player.audio === audioToStop) {
          playerKey = key
          break
        }
      }
    }
  }

  if (audioToStop && !audioToStop.paused) {
    audioToStop.pause()
  }
  if (audioToStop) {
    audioToStop.currentTime = 0
    if (audioToStop.loop) audioToStop.loop = false
    // Don't removeAttribute('src') immediately if we might replay it soon,
    // but good for full cleanup if the player instance is being discarded.
    // For previewPlayer, we'll clear src on stop to ensure it's fresh.
    if (wasPlayingPreview) {
      audioToStop.removeAttribute('src')
      audioToStop.load() // Resets the audio element after removing src
    }
    console.debug(
      `[PlaySound] Stopped player: ${playerKey || (wasPlayingPreview ? 'preview' : 'unknown')}`
    )
  }

  if (playerKey && activeAudioPlayers.has(playerKey)) {
    activeAudioPlayers.delete(playerKey)
    console.debug(`[PlaySound] Removed active player entry for: ${playerKey}`)
  }
}

function stopAllPlayers(stopThePreviewPlayer = true) {
  console.debug('[PlaySound] Stopping all active IO row players.')
  activeAudioPlayers.forEach((player, key) => {
    stopPlayer(key) // stopPlayer will handle map deletion
  })
  // activeAudioPlayers.clear(); // stopPlayer handles deletion

  if (stopThePreviewPlayer && previewPlayer && !previewPlayer.paused) {
    stopPlayer(previewPlayer) // Stop the preview player
    console.debug('[PlaySound] Stopped preview player via StopAll.')
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

  // Effect for cleaning up the preview player when the component unmounts
  // or when the audioDataUrl changes (meaning a new file is selected).
  useEffect(() => {
    const currentPreviewSrc = previewPlayer.currentSrc // src before Data URL, currentSrc after
    const isThisAudioDataLoaded =
      currentData.audioDataUrl &&
      (previewPlayer.src === currentData.audioDataUrl ||
        currentPreviewSrc === currentData.audioDataUrl)

    // If the component unmounts or the audioDataUrl changes while preview is playing *this* sound
    return () => {
      if (isThisAudioDataLoaded && !previewPlayer.paused) {
        console.debug(
          '[PlaySound OutputEdit] Cleanup: Stopping preview player for',
          currentData.originalFileName
        )
        stopPlayer(previewPlayer) // Use the helper
        setIsPreviewPlaying(false)
      }
    }
  }, [currentData.audioDataUrl]) // Dependency: if the source changes, cleanup old one

  const updateAudioDataInState = (audioDataUrl?: string, originalFileName?: string) => {
    // Stop any ongoing preview before changing the source
    if (!previewPlayer.paused) {
      stopPlayer(previewPlayer)
      setIsPreviewPlaying(false)
    }
    onChange({ audioDataUrl, originalFileName })
  }

  const readFileAsDataURL = (
    file: File
  ): Promise<{ audioDataUrl: string; originalFileName: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () =>
        resolve({ audioDataUrl: reader.result as string, originalFileName: file.name })
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  const processFile = async (file: File | null | undefined) => {
    if (!file) return
    if (/\.(mp3|wav|ogg|aac|m4a|flac)$/i.test(file.name)) {
      try {
        const { audioDataUrl, originalFileName } = await readFileAsDataURL(file)
        updateAudioDataInState(audioDataUrl, originalFileName)
      } catch (error) {
        console.error('[PlaySound OutputEdit] Error processing file:', error)
        alert('Failed to load audio file.')
        updateAudioDataInState(undefined, undefined) // Clear on error
      }
    } else {
      alert(
        'Invalid file type. Please drop or select an audio file (mp3, wav, ogg, aac, m4a, flac).'
      )
    }
  }

  const handleHiddenInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0])
    }
    if (event.target) event.target.value = ''
  }

  const handleSelectFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0])
    }
  }
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(true)
  }
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDraggingOver(false)
  }

  const handleVolumeChange = (_event: Event, newValue: number | number[]) =>
    onChange({ volume: parseFloat((newValue as number).toFixed(2)) })
  const handleCancelPreviousToggle = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ cancelPrevious: event.target.checked })
  const handleLoopToggle = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ loop: event.target.checked })

  const handlePreview = () => {
    if (!currentData.audioDataUrl) return

    console.debug('[PlaySound OutputEdit] Previewing audioDataUrl:', currentData.audioDataUrl)
    if (!previewPlayer.paused && previewPlayer.src === currentData.audioDataUrl) {
      // If it's playing THIS sound
      stopPlayer(previewPlayer)
      setIsPreviewPlaying(false)
    } else {
      stopPlayer(previewPlayer) // Stop any other preview first

      console.debug('[PlaySound OutputEdit] Previewing audioDataUrl:', currentData.audioDataUrl)
      previewPlayer.src = currentData.audioDataUrl
      previewPlayer.volume = currentData.volume === undefined ? 1.0 : currentData.volume
      previewPlayer.loop = false // Preview explicitly does not loop from this button
      previewPlayer
        .play()
        .then(() => {
          setIsPreviewPlaying(true)
        })
        .catch((e) => {
          console.error('[PlaySound OutputEdit] Preview play error:', e)
          setIsPreviewPlaying(false)
        })
      previewPlayer.onended = () => setIsPreviewPlaying(false)
      previewPlayer.onpause = () => {
        // If paused by other means (e.g. stopAll)
        if (previewPlayer.src === currentData.audioDataUrl) setIsPreviewPlaying(false)
      }
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 2, mt: 1, border: '1px dashed grey', borderRadius: 1 }}>
      <Stack spacing={2.5}>
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
            border: `2px dashed ${isDraggingOver ? 'primary.dark' : 'grey.400'}`,
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
          {currentData.audioDataUrl && currentData.originalFileName ? (
            <Stack alignItems="center" spacing={1}>
              <Tooltip title={currentData.originalFileName}>
                <Typography
                  variant="body2"
                  sx={{ wordBreak: 'break-all', maxWidth: '100%' }}
                  noWrap
                >
                  {currentData.originalFileName}
                </Typography>
              </Tooltip>
              <Stack direction="row" spacing={1}>
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
                  startIcon={
                    isPreviewPlaying && previewPlayer.src === currentData.audioDataUrl ? (
                      <PauseIcon />
                    ) : (
                      <PlayArrow />
                    )
                  }
                  color={
                    isPreviewPlaying && previewPlayer.src === currentData.audioDataUrl
                      ? 'warning'
                      : 'primary'
                  }
                >
                  {isPreviewPlaying && previewPlayer.src === currentData.audioDataUrl
                    ? 'Stop'
                    : 'Preview'}
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Drop audio file, or click to select
            </Typography>
          )}
        </Box>

        <Box>
          <Typography gutterBottom variant="caption" color="textSecondary" id="volume-slider-label">
            Volume
          </Typography>
          <Slider
            value={currentData.volume === undefined ? 1 : currentData.volume}
            onChange={handleVolumeChange}
            aria-labelledby="volume-slider-label"
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
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={currentData.cancelPrevious === undefined ? true : currentData.cancelPrevious}
              onChange={handleCancelPreviousToggle}
              size="small"
            />
          }
          label="Stop other active sounds first"
        />
        <FormControlLabel
          control={
            <Switch checked={currentData.loop || false} onChange={handleLoopToggle} size="small" />
          }
          label="Loop audio playback"
        />
      </Stack>
    </Paper>
  )
}

// --- OutputDisplay Component (with Mini Player elements) ---
// Using a sub-component for the player controls to manage its own state based on the global player
const MiniPlayer: FC<{ rowId: string; outputData: PlaySoundOutputData }> = ({
  rowId,
  outputData
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null) // Ref to the specific audio element

  useEffect(() => {
    const playerEntry = activeAudioPlayers.get(rowId)
    audioRef.current = playerEntry ? playerEntry.audio : null

    if (audioRef.current) {
      const audio = audioRef.current
      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)
      const handleEnded = () => {
        setIsPlaying(false)
        setProgress(0)
        // If it wasn't looping, it would have been removed from activeAudioPlayers by useOutputActions's onended
      }
      const handleTimeUpdate = () => {
        if (audio.duration) {
          setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
        }
      }

      audio.addEventListener('play', handlePlay)
      audio.addEventListener('playing', handlePlay) // For when it actually starts after buffering
      audio.addEventListener('pause', handlePause)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('timeupdate', handleTimeUpdate)

      // Set initial state
      setIsPlaying(!audio.paused && audio.readyState > 0 && audio.duration > 0) // More robust check
      if (audio.duration && audio.currentTime > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
      } else {
        setProgress(0)
      }

      return () => {
        audio.removeEventListener('play', handlePlay)
        audio.removeEventListener('playing', handlePlay)
        audio.removeEventListener('pause', handlePause)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
      }
    } else {
      setIsPlaying(false)
      setProgress(0)
    }
    // Re-run when the specific audio element for this rowId potentially changes in activeAudioPlayers
    // This requires activeAudioPlayers to be a reactive source or to pass a dependency that changes.
    // For simplicity, let's rely on IoRow re-rendering if outputData changes, which might re-mount MiniPlayer.
    // A more robust solution might involve a global state for active players or event bus.
    // For now, let's add outputData.audioDataUrl to trigger re-check if the sound file itself changes for the row.
  }, [rowId, outputData.audioDataUrl, activeAudioPlayers.get(rowId)?.audio])

  const handlePlayPauseToggle = () => {
    if (audioRef.current) {
      if (audioRef.current.paused)
        audioRef.current.play().catch((e) => console.error('MiniPlayer play error:', e))
      else audioRef.current.pause()
    } else {
      // No active player for this row, means it's not playing. Trigger it.
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }))
    }
  }

  const handleStop = () => {
    stopPlayer(rowId) // Use the global stopPlayer, it will update activeAudioPlayers map
    // The useEffect above will catch the change to activeAudioPlayers and update isPlaying/progress
  }

  if (!outputData.audioDataUrl) return null // Don't show player if no file

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

export const OutputDisplay: FC<{ output: OutputData; rowId: string }> = ({ output, rowId }) => {
  const data = output.data as PlaySoundOutputData
  const displayFileName = data.originalFileName || 'No file selected'

  const displayInfo: string[] = []
  if (data.cancelPrevious === false) displayInfo.push('Parallel')
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
              {data.loop && <LoopIcon sx={{ fontSize: '0.9rem' }} />}
              {data.cancelPrevious === false && <Typography variant="caption">||</Typography>}{' '}
              {/* Simple indicator for parallel */}
              {/* {displayInfo.join(', ')} */}
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
  // This effect runs when the component for THIS ROW mounts, or if its output.data changes.
  useEffect(() => {
    const outputData = output.data as PlaySoundOutputData

    const ioListener = (event: CustomEvent) => {
      if (event.detail === rowId) {
        // Trigger is for THIS row
        if (!outputData.audioDataUrl) {
          console.warn(`[PlaySound] Row ${rowId} triggered, but no audioDataUrl configured.`)
          return
        }
        console.info(
          `[PlaySound] Row ${rowId} triggered. Playing: ${outputData.originalFileName}`,
          outputData
        )

        if (outputData.cancelPrevious === undefined || outputData.cancelPrevious === true) {
          console.debug(
            `[PlaySound] CancelPrevious active for row ${rowId}. Stopping other players.`
          )
          activeAudioPlayers.forEach((player, key) => {
            if (key !== rowId) {
              stopPlayer(key)
            }
          })
        }

        let playerEntry = activeAudioPlayers.get(rowId)

        if (playerEntry && !playerEntry.audio.paused) {
          // If already playing this row's sound
          if (playerEntry.isLooping) {
            // If it's looping and triggered again, stop it
            console.debug(`[PlaySound] Row ${rowId} is looping and re-triggered. Stopping loop.`)
            stopPlayer(rowId)
            return // Don't proceed to play again immediately
          } else {
            // If not looping and retriggered, restart it
            console.debug(
              `[PlaySound] Row ${rowId} is playing (not loop) and re-triggered. Restarting.`
            )
            playerEntry.audio.currentTime = 0
            // Volume and loop properties might have changed in row.output.data since last play
            playerEntry.audio.volume = outputData.volume === undefined ? 1.0 : outputData.volume
            playerEntry.audio.loop = outputData.loop || false
            playerEntry.isLooping = outputData.loop || false
            playerEntry.audio
              .play()
              .catch((e) => console.error('[PlaySound] Error restarting audio:', e))
            return // Done
          }
        }

        // If player doesn't exist, or existed but was paused (or stopped above)
        if (playerEntry && playerEntry.audio.paused) {
          // Reuse paused player
          console.debug(`[PlaySound] Row ${rowId} reusing paused player.`)
          playerEntry.audio.src = outputData.audioDataUrl // Re-assign src in case it changed
          playerEntry.audio.currentTime = 0
        } else {
          // Create new player
          console.debug(`[PlaySound] Row ${rowId} creating new player.`)
          console.debug('[PlaySound] audioDataUrl to be used:', outputData.audioDataUrl)
          const audio = new Audio()
          audio.src = outputData.audioDataUrl
          playerEntry = {
            audio,
            rowId,
            isLooping: false,
            originalFileName: outputData.originalFileName
          } // isLooping will be set below
          activeAudioPlayers.set(rowId, playerEntry)
        }

        const audio = playerEntry.audio
        audio.volume = outputData.volume === undefined ? 1.0 : outputData.volume
        audio.loop = outputData.loop || false
        playerEntry.isLooping = audio.loop // Update isLooping in our map
        playerEntry.originalFileName = outputData.originalFileName // Update filename in map

        audio.oncanplaythrough = () =>
          console.debug(
            `[PlaySound] Audio can play through for row ${rowId}: ${outputData.originalFileName}`
          )
        audio.onerror = (e) => {
          console.error(`[PlaySound] Error with audio element for row ${rowId}:`, audio.error)
          stopPlayer(rowId)
        }
        audio.onended = () => {
          console.debug(
            `[PlaySound] Audio ended for row ${rowId}: ${playerEntry?.originalFileName}`
          )
          if (!playerEntry?.isLooping) {
            // Use the state from our map
            stopPlayer(rowId)
          }
        }

        audio.play().catch((e) => {
          console.error('[PlaySound] Error playing audio:', e)
          stopPlayer(rowId)
        })
      }
    }

    window.addEventListener('io_input', ioListener as EventListener)
    return () => {
      window.removeEventListener('io_input', ioListener as EventListener)
      // When row unmounts or its output.data changes significantly (re-running effect)
      // Stop the sound associated with this specific row to prevent orphaned playback
      // This is important if the audioDataUrl changes, or if loop status changes.
      console.debug(`[PlaySound] useOutputActions cleanup for row ${rowId}. Stopping its player.`)
      stopPlayer(rowId)
    }
  }, [rowId, output.data])
}

// --- Settings Component (Module Global Settings) ---
export const Settings: FC = () => {
  const handleStopAllSounds = () => {
    console.info('[PlaySound Settings] User requested Stop All Sounds.')
    stopAllPlayers(true) // true to also stop preview player
  }

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}
    >
      <Typography variant="overline">Global Audio Control</Typography>
      <Button
        variant="contained"
        color="error"
        onClick={handleStopAllSounds}
        startIcon={<StopCircle />}
        fullWidth
        size="small"
      >
        Stop All Sounds
      </Button>
    </Paper>
  )
}
