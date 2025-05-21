// src/renderer/src/modules/PlaySound/AudioPlayerCore.tsx
import type { FC } from 'react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Stack, IconButton, Tooltip, LinearProgress, Typography } from '@mui/material'
import { PlayArrow, Pause as PauseIcon, StopCircle } from '@mui/icons-material'
import { useMainStore } from '@/store/mainStore'

interface AudioPlayerCoreProps {
  title?: string
  audioSrc?: string | null
  volume?: number
  loop?: boolean
  autoPlay?: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onStopProp?: () => void // Renamed from onStop
  onTimeUpdate?: (currentTime: number, duration: number) => void
  externalCommand?: 'play' | 'pause' | 'stop' | null
  onCommandProcessed?: () => void
  onAudioElementCreated?: (audioEl: HTMLAudioElement | null) => void
}

export const AudioPlayerCore: FC<AudioPlayerCoreProps> = ({
  title,
  audioSrc,
  volume = 1.0,
  loop = false,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded,
  onStopProp,
  onTimeUpdate,
  onAudioElementCreated
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [_duration, setDuration] = useState(0)

  const globalAudioCommandTimestamp = useMainStore((state) => state.globalAudioCommandTimestamp)
  const prevGlobalAudioCommandTimestampRef = useRef<string | null>(null)

  // Effect for local audio element events (play, pause, ended, timeupdate)
  useEffect(() => {
    // console.debug(`[AudioPlayerCore] Main effect for audioSrc: ${audioSrc?.slice(-20)}`);
    if (!audioRef.current) {
      // console.debug("[AudioPlayerCore] Creating new Audio element");
      audioRef.current = new Audio()
      if (onAudioElementCreated) {
        onAudioElementCreated(audioRef.current)
      }
    }
    const audio = audioRef.current // audio is guaranteed to be HTMLAudioElement here

    // Update src if it changes or if it's different
    if (audioSrc && audio.src !== audioSrc) {
      console.debug(`[AudioPlayerCore] Setting src: ${audioSrc.slice(-30)}`)
      audio.src = audioSrc
      audio.load() // Important after changing src
    } else if (!audioSrc && audio.currentSrc) {
      console.debug(`[AudioPlayerCore] Clearing src because audioSrc prop is null/undefined.`)
      audio.removeAttribute('src')
      audio.load()
      setIsPlaying(false)
      setProgress(0)
      setDuration(0)
    }

    // Update other properties if they changed
    if (audio.volume !== volume) audio.volume = volume
    if (audio.loop !== loop) audio.loop = loop

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }
    const handleEnded = () => {
      setIsPlaying(false)
      if (!audio.loop) setProgress(0) // Only reset progress if not looping, timeupdate will handle loop reset
      onEnded?.()
    }
    const handleTimeUpdate = () => {
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
        onTimeUpdate?.(audio.currentTime, audio.duration)
      } else if (progress !== 0) {
        // If duration becomes invalid (e.g. src removed)
        setProgress(0)
      }
    }
    const handleLoadedData = () => {
      setDuration(audio.duration)
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
      } else {
        setProgress(0)
      }
      setIsPlaying(
        !audio.paused && !audio.ended && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
      )
      if (autoPlay && audio.paused && audio.src) {
        // Ensure src is set before autoplay
        audio.play().catch((e) => console.error('[AudioPlayerCore] Autoplay error:', e))
      }
    }
    const handleError = () => {
      console.error('[AudioPlayerCore] Error on audio element:', audio.error)
      setIsPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('playing', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('error', handleError)
    audio.addEventListener('emptied', handleError) // Treat emptied also as an error/reset state

    // Initial sync if audioSrc is already set and data might be loaded
    // 1 === HAVE_LOADED_METADATA
    if (audio.src && audio.readyState >= 1) {
      setDuration(audio.duration)
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
      }
    }
    if (audio.src) {
      // Only set isPlaying if there's a source
      setIsPlaying(
        !audio.paused && !audio.ended && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
      )
    }

    return () => {
      // console.debug("[AudioPlayerCore] Cleanup main effect for src:", audioSrc?.slice(-30));
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('playing', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('emptied', handleError)
      if (onAudioElementCreated) {
        onAudioElementCreated(null) // Signal that this specific audioRef instance is being "destroyed" by this effect cleanup
      }
      // Don't pause or reset src here, as this effect re-runs if props like volume/loop change.
      // The parent MiniPlayer is responsible for revoking blob URLs when audioSrcForPlayer changes.
    }
  }, [
    audioSrc,
    volume,
    loop,
    autoPlay,
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    onAudioElementCreated
  ]) // Corrected: Removed trailing slash

  // Effect to handle external commands (like play/pause/stop from parent MiniPlayer)
  useEffect(() => {
    if (
      globalAudioCommandTimestamp &&
      globalAudioCommandTimestamp !== prevGlobalAudioCommandTimestampRef.current
    ) {
      console.debug(
        `[AudioPlayerCore] Detected globalAudioCommandTimestamp change: ${globalAudioCommandTimestamp}. Current src: ${audioRef.current?.src?.slice(-20)}`
      )
      if (audioRef.current && audioRef.current.src) {
        // Only act if there's an audio source loaded
        console.debug(
          `[AudioPlayerCore] Global stop: Calling internal stop logic for src: ${audioRef.current.src.slice(-20)}`
        )
        // Call this component's own stop logic
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        // The 'pause' and 'timeupdate' (to 0) events will trigger
        // setIsPlaying(false) and setProgress(0) via the main useEffect's listeners.
        onStopProp?.() // Also call the onStopProp passed from MiniPlayer, which calls global stopPlayer
      }
      prevGlobalAudioCommandTimestampRef.current = globalAudioCommandTimestamp
    }
  }, [globalAudioCommandTimestamp, onStopProp])

  // Effect to react to globalAudioCommandTimestamp for "Stop All"
  useEffect(() => {
    if (
      globalAudioCommandTimestamp &&
      globalAudioCommandTimestamp !== prevGlobalAudioCommandTimestampRef.current
    ) {
      console.debug(
        `[AudioPlayerCore] Detected globalAudioCommandTimestamp change: ${globalAudioCommandTimestamp}. Current src: ${audioRef.current?.src.slice(-20)}`
      )
      if (audioRef.current && audioRef.current.src) {
        // Only act if there's an audio source loaded
        // The actual audio.pause() and currentTime=0 was done by stopAllPlayers.
        // This effect ensures this component's UI state (isPlaying, progress) reflects that.
        // The 'pause' and 'timeupdate' events on audioRef.current should trigger the state updates
        // via the listeners in the main useEffect.
        // Forcing it here ensures UI reset even if events are missed or audio element was already removed by stopPlayer.
        setIsPlaying(false)
        setProgress(0)
        console.debug(`[AudioPlayerCore] UI explicitly reset due to globalAudioCommandTimestamp.`)
      }
      prevGlobalAudioCommandTimestampRef.current = globalAudioCommandTimestamp
    }
  }, [globalAudioCommandTimestamp])

  const handlePlayPauseToggle = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.src) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((e) => console.error('[AudioPlayerCore] Play error:', e))
      } else {
        audioRef.current.pause()
      }
    } else if (audioSrc) {
      // If src prop is available but not on element yet
      audioRef.current.src = audioSrc
      audioRef.current.load()
      audioRef.current
        .play()
        .catch((e) => console.error('[AudioPlayerCore] Play-from-cleared-src error:', e))
    }
  }, [audioSrc])

  const handleStop = useCallback(() => {
    if (!audioRef.current) return
    if (audioRef.current.src) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      // Event listeners ('pause', 'timeupdate') will update isPlaying and progress state
      onStopProp?.()
    }
  }, [onStopProp])

  const namePart = title?.replace('.mp3', '')
  const displayName = namePart
    ? namePart?.length > 17
      ? `${namePart.substring(0, 17)}...`
      : namePart
    : undefined

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
      <Stack sx={{ flexGrow: 1, pr: 1 }}>
        {title && (
          <Tooltip title={namePart} placement="top" arrow>
            <Typography variant="caption">{displayName}</Typography>
          </Tooltip>
        )}
        <LinearProgress
          variant="determinate"
          value={!audioSrc ? 0 : progress}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 3,
            mt: '3px',
            bgcolor: !audioSrc ? 'action.disabledBackground' : undefined
          }}
        />
      </Stack>
      <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
        <span>
          <IconButton onClick={handlePlayPauseToggle} size="small" disabled={!audioSrc}>
            {isPlaying ? <PauseIcon fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Stop">
        <span>
          <IconButton
            onClick={handleStop}
            size="small"
            disabled={!audioSrc || (!isPlaying && progress === 0)}
          >
            <StopCircle fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  )
}
