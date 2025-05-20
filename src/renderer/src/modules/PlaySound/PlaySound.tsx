// src/renderer/src/modules/PlaySound/PlaySoundModule.tsx

import type { ModuleConfig, Row } from '@shared/types'
import { useEffect } from 'react'
import type { PlaySoundOutputData, PlaySoundModuleCustomConfig } from './PlaySound.types'
import { getAudioBufferFromDB } from './lib/db' // For useOutputActions

// Import the UI components we've created
import { PlaySoundOutputEdit } from './PlaySoundOutputEdit'
import { PlaySoundOutputDisplay } from './PlaySoundOutputDisplay'
import { PlaySoundSettings } from './PlaySoundSettings'

// --- Module Definition (Re-exported) ---
export const id = 'playsound-module'

export const moduleConfig: ModuleConfig<PlaySoundModuleCustomConfig> = {
  menuLabel: 'Audio',
  inputs: [], // This module is an output-only module
  outputs: [
    {
      name: 'Play Sound',
      icon: 'audiotrack',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ], // Output is editable
  config: {
    enabled: true
    // No specific dynamic config for the module itself yet
  }
}

// --- Globally Scoped Audio Player Management for THIS MODULE ---
interface ActivePlayer {
  audio: HTMLAudioElement
  rowId: string
  isLooping: boolean
  audioId?: string // The ID of the audio in IndexedDB
  originalFileName?: string
}
export const activeAudioPlayers = new Map<string, ActivePlayer>() // Export for MiniPlayer
export const previewPlayer = new Audio() // Export for OutputEdit
export const blobUrlCache = new Map<string, string>() // audioId -> blobUrl

// Export stopPlayer and stopAllPlayers so MiniPlayer and Settings can use them
export function stopPlayer(rowIdOrPlayer: string | HTMLAudioElement) {
  let playerKey: string | undefined
  let audioToStop: HTMLAudioElement | undefined
  let wasPlayingPreview = false
  let audioIdToRevoke: string | undefined

  if (typeof rowIdOrPlayer === 'string') {
    playerKey = rowIdOrPlayer
    const playerEntry = activeAudioPlayers.get(playerKey)
    audioToStop = playerEntry?.audio
    audioIdToRevoke = playerEntry?.audioId
  } else {
    audioToStop = rowIdOrPlayer
    if (audioToStop === previewPlayer) {
      wasPlayingPreview = true
      // For preview, blobUrl is managed by OutputEdit's state, so we don't look in blobUrlCache by audioId
    } else {
      for (const [key, player] of activeAudioPlayers.entries()) {
        if (player.audio === audioToStop) {
          playerKey = key
          audioIdToRevoke = player.audioId
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
    if (audioToStop.loop) audioToStop.loop = false // Ensure loop is stopped

    // Revoke blob URL if it's from the cache and belongs to this specific player
    if (audioIdToRevoke && blobUrlCache.has(audioIdToRevoke)) {
      const cachedUrl = blobUrlCache.get(audioIdToRevoke)
      if (audioToStop.src === cachedUrl) {
        // Only revoke if this player is using that specific blob URL
        URL.revokeObjectURL(cachedUrl)
        blobUrlCache.delete(audioIdToRevoke)
        console.debug(
          `[PlaySoundModule] Revoked and cleared blobUrl for audioId: ${audioIdToRevoke}`
        )
      }
    } else if (wasPlayingPreview && audioToStop.src && audioToStop.src.startsWith('blob:')) {
      // For preview player, its blob URL is managed by OutputEdit's state and revoked there or on stop.
      // Here we just ensure it's no longer playing from that src.
    }

    audioToStop.removeAttribute('src') // Critical for releasing file/stream handles
    audioToStop.load() // Resets the audio element to initial state

    console.debug(
      `[PlaySoundModule] Stopped player: ${playerKey || (wasPlayingPreview ? 'preview' : 'unknown')}`
    )
  }

  if (playerKey) {
    activeAudioPlayers.delete(playerKey)
    console.debug(`[PlaySoundModule] Removed active player entry for: ${playerKey}`)
  }
}

export function stopAllPlayers(stopThePreviewPlayer = true) {
  console.debug('[PlaySoundModule] Stopping all active IO row players.')
  const playerKeys = Array.from(activeAudioPlayers.keys())
  playerKeys.forEach((key) => stopPlayer(key)) // stopPlayer handles map deletion and blob URL revocation

  if (stopThePreviewPlayer && previewPlayer && !previewPlayer.paused) {
    stopPlayer(previewPlayer) // This will also handle previewPlayer's blob URL if it's managed through cache
    console.debug('[PlaySoundModule] Stopped preview player via StopAll.')
  }
}

// Expose dev tools if needed (moved from individual files to the module orchestrator)
if (process.env.NODE_ENV === 'development') {
  // Assuming clearAllAudioFromDB is imported from './lib/db'
  // This might need to be in a useEffect in a component if window isn't available at module exec time
  // For now, direct assignment assuming this runs in renderer context early enough.
  const setupDevTools = () => {
    if (!window.IO_DEV_TOOLS) {
      ;(window as any).IO_DEV_TOOLS = {}
    }
    ;(window as any).IO_DEV_TOOLS.clearPlaySoundCache = async () => {
      console.warn('[DEV TOOLS] Clearing PlaySound IndexedDB cache via window.IO_DEV_TOOLS...')
      const { clearAllAudioFromDB } = await import('./lib/db') // Dynamic import for safety
      try {
        await clearAllAudioFromDB()
        console.log('[DEV TOOLS] PlaySound IndexedDB cache clear request successful.')
      } catch (e) {
        console.error('[DEV TOOLS] Error clearing PlaySound IndexedDB:', e)
        alert('Error clearing PlaySound cache.')
      }
    }
    console.debug('[PlaySoundModule] Development tools (clearPlaySoundCache) exposed.')
  }
  // Call setup when window is available, e.g., in a useEffect in a dummy FC or later.
  // For simplicity of this file, I'm not adding a dummy FC. Assume this works or move to a React component's effect.
  if (typeof window !== 'undefined') {
    // Basic check
    setupDevTools()
  }
}

// --- Re-export UI Components with Standard Names ---
export const OutputEdit = PlaySoundOutputEdit
export const OutputDisplay = PlaySoundOutputDisplay
export const Settings = PlaySoundSettings // If you create PlaySoundSettings.tsx

// --- useOutputActions (Renderer-Side Playback Logic) ---
export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row

  useEffect(() => {
    const outputData = output.data as PlaySoundOutputData

    const playAudioFromDb = async (audioIdToPlay: string): Promise<string | null> => {
      if (!audioIdToPlay) {
        console.warn(`[PlaySoundModule useOutputActions] No audioId provided for row ${rowId}.`)
        return null
      }
      const audioRecord = await getAudioBufferFromDB(audioIdToPlay)
      if (!audioRecord?.audioBuffer || !audioRecord.mimeType) {
        console.warn(
          `[PlaySoundModule useOutputActions] Audio data/mimeType for ID ${audioIdToPlay} not found in DB for row ${rowId}.`
        )
        return null
      }
      const blob = new Blob([audioRecord.audioBuffer], { type: audioRecord.mimeType })
      const newBlobUrl = URL.createObjectURL(blob)

      // Manage blobUrlCache for this audioId
      const oldBlobUrl = blobUrlCache.get(audioIdToPlay)
      if (oldBlobUrl) {
        URL.revokeObjectURL(oldBlobUrl)
      }
      blobUrlCache.set(audioIdToPlay, newBlobUrl)
      return newBlobUrl
    }

    const ioListener = async (event: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail === 'string' &&
        event.detail === rowId
      ) {
        const eventRowId = event.detail
        if (!outputData.audioId) {
          console.warn(
            `[PlaySoundModule useOutputActions] Row ${eventRowId} triggered, but no audioId configured.`
          )
          return
        }

        console.info(
          `[PlaySoundModule useOutputActions] Row ${eventRowId} triggered for ${outputData.originalFileName || 'Unknown Audio'}`,
          outputData
        )

        if (outputData.cancelPrevious === undefined || outputData.cancelPrevious === true) {
          activeAudioPlayers.forEach((_player, key) => {
            if (key !== eventRowId) stopPlayer(key)
          })
        }

        let playerEntry = activeAudioPlayers.get(eventRowId)

        if (playerEntry && !playerEntry.audio.paused) {
          if (playerEntry.isLooping) {
            console.debug(
              `[PlaySoundModule useOutputActions] Row ${eventRowId} is looping and re-triggered. Stopping loop.`
            )
            stopPlayer(eventRowId)
            return
          } else {
            console.debug(
              `[PlaySoundModule useOutputActions] Row ${eventRowId} is playing (not loop) and re-triggered. Restarting.`
            )
            playerEntry.audio.currentTime = 0
            playerEntry.audio.volume = outputData.volume ?? 1.0
            playerEntry.audio.loop = outputData.loop || false
            playerEntry.isLooping = outputData.loop || false
            playerEntry.audio
              .play()
              .catch((e) =>
                console.error('[PlaySoundModule useOutputActions] Error restarting audio:', e)
              )
            return
          }
        }

        const blobUrl = await playAudioFromDb(outputData.audioId)
        if (!blobUrl) {
          console.error(
            `[PlaySoundModule useOutputActions] Could not get blobUrl for audioId ${outputData.audioId} on row ${eventRowId}`
          )
          return
        }

        let audioToPlay: HTMLAudioElement
        if (playerEntry && playerEntry.audio.paused) {
          console.debug(
            `[PlaySoundModule useOutputActions] Row ${eventRowId} reusing/updating existing audio element for ${outputData.originalFileName}`
          )
          if (playerEntry.audio.src !== blobUrl) playerEntry.audio.src = blobUrl
          audioToPlay = playerEntry.audio
        } else {
          console.debug(
            `[PlaySoundModule useOutputActions] Row ${eventRowId} creating new audio element for ${outputData.originalFileName}`
          )
          if (playerEntry) stopPlayer(eventRowId) // Stop and remove any old entry for this rowId
          audioToPlay = new Audio(blobUrl)
          playerEntry = {
            audio: audioToPlay,
            rowId: eventRowId,
            isLooping: false,
            audioId: outputData.audioId,
            originalFileName: outputData.originalFileName
          }
          activeAudioPlayers.set(eventRowId, playerEntry)
        }

        audioToPlay.volume = outputData.volume ?? 1.0
        audioToPlay.loop = outputData.loop || false
        playerEntry.isLooping = audioToPlay.loop
        playerEntry.originalFileName = outputData.originalFileName
        playerEntry.audioId = outputData.audioId // Ensure audioId is current on playerEntry

        // Define listeners with stable references for this audioToPlay instance
        const onAudioError = () => {
          console.error(
            `[PlaySoundModule useOutputActions] Error with audio: ${playerEntry?.originalFileName}`,
            audioToPlay.error
          )
          stopPlayer(eventRowId)
        }
        const onAudioEnded = () => {
          console.debug(
            `[PlaySoundModule useOutputActions] Audio ended: ${playerEntry?.originalFileName}`
          )
          if (!playerEntry?.isLooping) stopPlayer(eventRowId)
        }
        const onAudioCanPlay = () =>
          console.debug(
            `[PlaySoundModule useOutputActions] Audio can play through: ${playerEntry?.originalFileName}`
          )

        // Clean up any previous, potentially identical, listeners attached via this mechanism
        if ((audioToPlay as any)._io_onerror_playSound)
          audioToPlay.removeEventListener('error', (audioToPlay as any)._io_onerror_playSound)
        if ((audioToPlay as any)._io_onended_playSound)
          audioToPlay.removeEventListener('ended', (audioToPlay as any)._io_onended_playSound)
        if ((audioToPlay as any)._io_oncanplay_playSound)
          audioToPlay.removeEventListener(
            'canplaythrough',
            (audioToPlay as any)._io_oncanplay_playSound
          )
        ;(audioToPlay as any)._io_onerror_playSound = onAudioError
        ;(audioToPlay as any)._io_onended_playSound = onAudioEnded
        ;(audioToPlay as any)._io_oncanplay_playSound = onAudioCanPlay

        audioToPlay.addEventListener('error', onAudioError)
        audioToPlay.addEventListener('ended', onAudioEnded)
        audioToPlay.addEventListener('canplaythrough', onAudioCanPlay)

        if (audioToPlay.src !== blobUrl) audioToPlay.src = blobUrl // Ensure src is set if new/changed
        audioToPlay.load() // Call load() if src was just set or to re-evaluate
        audioToPlay.play().catch((e) => {
          console.error('[PlaySoundModule useOutputActions] Error playing audio:', e)
          stopPlayer(eventRowId)
        })
      }
    }

    window.addEventListener('io_input', ioListener)
    return () => {
      window.removeEventListener('io_input', ioListener)
      console.debug(
        `[PlaySoundModule useOutputActions] cleanup for row ${rowId}. Stopping its player.`
      )
      stopPlayer(rowId)
    }
  }, [rowId, output.data]) // output.data is the key dependency
}

// No useInputActions or useGlobalActions (for timer-like things) directly in this orchestrator.
// They are part of the components if needed, or this module doesn't require them.
