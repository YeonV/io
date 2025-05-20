// src/renderer/src/modules/PlaySound/MiniPlayer.tsx
import type { FC } from 'react'
import { useEffect, useState, useRef, useCallback } from 'react'
import type { PlaySoundOutputData } from './PlaySound.types'
import { activeAudioPlayers, stopPlayer, blobUrlCache } from './PlaySound' // Assuming this path
import { getAudioBufferFromDB } from './lib/db'
import { AudioPlayerCore } from './AudioPlayerCore' // Import the new base component

interface MiniPlayerProps {
  rowId: string
  outputData: PlaySoundOutputData
}

export const MiniPlayer: FC<MiniPlayerProps> = ({ rowId, outputData }) => {
  const [audioSrcForPlayer, setAudioSrcForPlayer] = useState<string | null>(null)
  const [isLoadingSrc, setIsLoadingSrc] = useState(false)

  // To keep track of the current audio element managed by AudioPlayerCore for this row
  const managedAudioElementRef = useRef<HTMLAudioElement | null>(null)

  // This command state is to imperatively control the BaseAudioPlayer from external logic
  const [playerCommand, setPlayerCommand] = useState<'play' | 'pause' | 'stop' | null>(null)

  // Effect to load audio data from IndexedDB and create Blob URL
  useEffect(() => {
    let didUnmount = false
    if (!outputData.audioId) {
      if (audioSrcForPlayer) {
        // If there was an old src, clear it
        URL.revokeObjectURL(audioSrcForPlayer)
        setAudioSrcForPlayer(null)
      }
      return
    }

    setIsLoadingSrc(true)
    const loadAudio = async () => {
      console.debug(
        `[MiniPlayer ${rowId}] useEffect: Loading audio for audioId: ${outputData.audioId}`
      )
      const audioRecord = outputData.audioId ? await getAudioBufferFromDB(outputData.audioId) : null
      if (didUnmount) return

      if (audioRecord?.audioBuffer && audioRecord.mimeType) {
        // Revoke previous blob URL if it exists for this audioId to prevent memory leaks
        const oldBlobUrl = blobUrlCache.get(outputData.audioId!)
        if (oldBlobUrl) {
          URL.revokeObjectURL(oldBlobUrl)
        }

        const blob = new Blob([audioRecord.audioBuffer], { type: audioRecord.mimeType })
        const newBlobUrl = URL.createObjectURL(blob)
        blobUrlCache.set(outputData.audioId!, newBlobUrl) // Cache new one
        setAudioSrcForPlayer(newBlobUrl)
        console.debug(
          `[MiniPlayer ${rowId}] useEffect: Loaded new Blob URL for ${outputData.originalFileName}: ${newBlobUrl.slice(-20)}`
        )
      } else {
        console.warn(
          `[MiniPlayer ${rowId}] useEffect: Audio data not found in DB for ${outputData.audioId}. Clearing src.`
        )
        if (audioSrcForPlayer) URL.revokeObjectURL(audioSrcForPlayer) // Revoke if there was an old one
        setAudioSrcForPlayer(null)
        if (outputData.audioId) blobUrlCache.delete(outputData.audioId) // Remove from cache if data is gone
      }
      setIsLoadingSrc(false)
    }

    loadAudio()

    return () => {
      didUnmount = true
      // The actual Blob URL revocation for *this specific instance's src*
      // should happen when audioSrcForPlayer changes OR when MiniPlayer unmounts.
      // The blobUrlCache helps manage this globally if the same audioId is used elsewhere.
      // For this component instance, if it had a blob url, it should be revoked.
      // However, if another MiniPlayer is using the same audioId, revoking from cache might be too soon.
      // The current `stopPlayer` logic handles cache revocation when a player is stopped.
      // Here, we just ensure this component's local blobUrl isn't leaked if it was unique and not cached.
      // This is complex. For now, rely on `stopPlayer` and cache management in `useOutputActions`.
      // The main purpose of this cleanup is to stop pending async operations.
    }
  }, [rowId, outputData.audioId]) // Re-load if audioId changes for the row

  const handleAudioElementCreated = useCallback(
    (audioEl: HTMLAudioElement | null) => {
      // This callback from AudioPlayerCore gives us the actual HTMLAudioElement
      // We can add it to our activeAudioPlayers map here.
      const playerEntry = activeAudioPlayers.get(rowId)

      if (audioEl) {
        managedAudioElementRef.current = audioEl
        if (playerEntry && playerEntry.audio === audioEl) {
          // Already the same, do nothing or update metadata if needed
          playerEntry.isLooping = outputData.loop || false // Ensure map is synced with current config
          playerEntry.originalFileName = outputData.originalFileName
        } else {
          // New audio element or replacing an old one for this rowId
          if (playerEntry) stopPlayer(rowId) // Stop and clean up old one first

          activeAudioPlayers.set(rowId, {
            audio: audioEl,
            rowId: rowId,
            isLooping: outputData.loop || false,
            audioId: outputData.audioId,
            originalFileName: outputData.originalFileName
          })
          console.debug(
            `[MiniPlayer ${rowId}] Registered new audio element in activeAudioPlayers for ${outputData.originalFileName}`
          )
        }
      } else {
        // audioEl is null (AudioPlayerCore is cleaning up its element)
        managedAudioElementRef.current = null
        // If AudioPlayerCore signals its element is gone, ensure it's removed from our map
        // (though stopPlayer called by onStop or useOutputActions cleanup should also handle this)
        if (activeAudioPlayers.has(rowId)) {
          // console.debug(`[MiniPlayer ${rowId}] AudioPlayerCore cleaned up its element. Checking if stopPlayer is needed.`);
          // stopPlayer(rowId); // This might be too aggressive if stopPlayer wasn't the cause.
          // Let's rely on explicit stopPlayer calls.
        }
      }
    },
    [rowId, outputData.loop, outputData.audioId, outputData.originalFileName]
  )

  const onPlayerPlay = useCallback(() => {
    // Optional: if MiniPlayer needs to do something specific when its Base player starts
    console.debug(`[MiniPlayer ${rowId}] Play event from BaseAudioPlayer.`)
  }, [rowId])

  const onPlayerPause = useCallback(() => {
    console.debug(`[MiniPlayer ${rowId}] Pause event from BaseAudioPlayer.`)
  }, [rowId])

  const onPlayerEnded = useCallback(() => {
    console.debug(`[MiniPlayer ${rowId}] Ended event from BaseAudioPlayer.`)
    // If not looping, useOutputActions' onended will call stopPlayer, which removes from map.
    // If BaseAudioPlayer handles its own looping, this might be where we tell it to stop if it was a one-shot.
    if (!outputData.loop) {
      // The actual stopPlayer for non-looping sounds is handled by useOutputActions's own
      // event listener on the audio element it creates. BaseAudioPlayer just reports.
      // No action needed here if useOutputActions handles the cleanup from activeAudioPlayers.
    }
  }, [rowId, outputData.loop])

  // --- CLICK HANDLERS ---
  const handlePlayPauseToggle = useCallback(() => {
    console.log(`[MiniPlayer ${rowId}] !!! PlayPauseToggle CLICKED !!!`)
    const playerEntry = activeAudioPlayers.get(rowId)
    const audioForAction = playerEntry?.audio

    if (audioForAction === managedAudioElementRef.current && audioForAction) {
      // Ensure we're controlling the one we think we are
      if (audioForAction.paused) {
        audioForAction.play().catch((e) => console.error('[PlaySound MiniPlayer] Play error:', e))
      } else {
        audioForAction.pause()
      }
    } else if (audioSrcForPlayer) {
      // If we have a src but no active player yet or ref mismatch
      console.warn(
        `[MiniPlayer ${rowId}] PlayPauseToggle: Ref mismatch or no player in map. Dispatching io_input.`
      )
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }))
    } else {
      console.debug(
        `[MiniPlayer ${rowId}] No audio src available for toggle, dispatching io_input to load & play.`
      )
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }))
    }
  }, [rowId, audioSrcForPlayer])

  const handleStop = useCallback(() => {
    console.log(`[MiniPlayer ${rowId}] !!! Stop CLICKED !!!`)
    // Command the BaseAudioPlayer to stop, which will also call onStop.
    // Or, directly call the global stopPlayer which targets the entry in activeAudioPlayers.
    setPlayerCommand('stop') // Command BaseAudioPlayer
    // stopPlayer(rowId); // This is more direct for ensuring cleanup from the map.
    // Let's use the command for now, if BaseAudioPlayer handles it.
    // Actually, for global map management, stopPlayer(rowId) is better.
    stopPlayer(rowId)
  }, [rowId])

  const handleCommandProcessed = useCallback(() => {
    setPlayerCommand(null)
  }, [])

  // Don't render if no audio is configured (no audioId)
  if (!outputData.audioId || !outputData.originalFileName) {
    return null
  }

  // The BaseAudioPlayerControls will derive its own isPlaying and progress
  // from the audioSrc prop and its internal audio element.
  // We pass down the src, volume, loop config, and our action handlers.
  return (
    <AudioPlayerCore
      audioSrc={isLoadingSrc ? null : audioSrcForPlayer} // Pass null while loading src to prevent playing old audio
      volume={outputData.volume === undefined ? 1.0 : outputData.volume}
      loop={outputData.loop || false}
      autoPlay={false} // Row triggers should initiate play, not autoplay on src load
      onPlay={onPlayerPlay}
      onPause={onPlayerPause}
      onEnded={onPlayerEnded}
      // onTimeUpdate: BaseAudioPlayer handles its own progress bar.
      // onStop: BaseAudioPlayer handles its own stop button.
      externalCommand={playerCommand}
      onCommandProcessed={handleCommandProcessed}
      onAudioElementCreated={handleAudioElementCreated}
      //   disabled={isLoadingSrc || !audioSrcForPlayer} // Disable controls while loading or if no src
    />
  )
}

export default MiniPlayer // Assuming MiniPlayer is in its own file as planned
