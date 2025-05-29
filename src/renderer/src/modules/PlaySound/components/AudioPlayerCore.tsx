import type { FC } from 'react'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Stack, IconButton, Tooltip, LinearProgress, Button } from '@mui/material'
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
  onStopProp?: () => void
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

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      if (onAudioElementCreated) {
        onAudioElementCreated(audioRef.current)
      }
    }
    const audio = audioRef.current

    if (audioSrc && audio.src !== audioSrc) {
      console.debug(`[AudioPlayerCore] Setting src: ${audioSrc.slice(-30)}`)
      audio.src = audioSrc
      audio.load()
    } else if (!audioSrc && audio.currentSrc) {
      console.debug(`[AudioPlayerCore] Clearing src because audioSrc prop is null/undefined.`)
      audio.removeAttribute('src')
      audio.load()
      setIsPlaying(false)
      setProgress(0)
      setDuration(0)
    }

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
      if (!audio.loop) setProgress(0)
      onEnded?.()
    }
    const handleTimeUpdate = () => {
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
        onTimeUpdate?.(audio.currentTime, audio.duration)
      } else if (progress !== 0) {
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
    audio.addEventListener('emptied', handleError)

    if (audio.src && audio.readyState >= 1) {
      setDuration(audio.duration)
      if (audio.duration > 0 && isFinite(audio.duration)) {
        setProgress(Math.min(100, (audio.currentTime / audio.duration) * 100))
      }
    }
    if (audio.src) {
      setIsPlaying(
        !audio.paused && !audio.ended && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA
      )
    }

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('playing', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('emptied', handleError)
      if (onAudioElementCreated) {
        onAudioElementCreated(null)
      }
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
  ])

  useEffect(() => {
    if (
      globalAudioCommandTimestamp &&
      globalAudioCommandTimestamp !== prevGlobalAudioCommandTimestampRef.current
    ) {
      console.debug(
        `[AudioPlayerCore] Detected globalAudioCommandTimestamp change: ${globalAudioCommandTimestamp}. Current src: ${audioRef.current?.src?.slice(-20)}`
      )
      if (audioRef.current && audioRef.current.src) {
        console.debug(
          `[AudioPlayerCore] Global stop: Calling internal stop logic for src: ${audioRef.current.src.slice(-20)}`
        )

        audioRef.current.pause()
        audioRef.current.currentTime = 0

        onStopProp?.()
      }
      prevGlobalAudioCommandTimestampRef.current = globalAudioCommandTimestamp
    }
  }, [globalAudioCommandTimestamp, onStopProp])

  useEffect(() => {
    if (
      globalAudioCommandTimestamp &&
      globalAudioCommandTimestamp !== prevGlobalAudioCommandTimestampRef.current
    ) {
      console.debug(
        `[AudioPlayerCore] Detected globalAudioCommandTimestamp change: ${globalAudioCommandTimestamp}. Current src: ${audioRef.current?.src.slice(-20)}`
      )
      if (audioRef.current && audioRef.current.src) {
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
            <Button
              variant="outlined"
              size="small"
              sx={{
                width: '100%',
                height: '33px',
                justifyContent: 'flex-start',
                textTransform: 'none',
                textAlign: 'left',
                position: 'relative'
              }}
            >
              {displayName}
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  opacity: progress > 0 ? 1 : 0,
                  height: 6,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: !audioSrc ? 'action.disabledBackground' : 'transparent',
                  position: 'absolute'
                  // '& .MuiLinearProgress-bar': {
                  //   transition: 'none' // Disable transition for instant feedback if preferred
                  // }
                }}
              />
            </Button>
          </Tooltip>
        )}
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
