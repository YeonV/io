// src/renderer/src/modules/Mediapipe/Hands.tsx

import type { FC } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, InputData, Row, ModuleDefaultConfig } from '@shared/types'
import {
  Button,
  IconButton,
  List,
  ListItem,
  ListSubheader,
  Tooltip,
  Box,
  Typography,
  Paper
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { detectGesture, Gesture } from './core/gesture-detector'
import { VideoScene } from './video/video-scene'
import { HandsEstimator, HandsListener } from './core/hands-estimator' // Assuming HandsListener is an exported type for the listener fn
import { log } from '@/utils'
import useRequestAnimationFrame from 'use-request-animation-frame'
import type * as MediapipeHands from '@mediapipe/hands'
import DisplayButtons from '@/components/Row/DisplayButtons'
import { Info, Videocam, VideocamOff } from '@mui/icons-material'

export interface HandsModuleCustomConfig {
  cameraActive: boolean
}

export const id = 'mphands-module'

export const moduleConfig: ModuleConfig<HandsModuleCustomConfig> = {
  menuLabel: 'A.I.',
  inputs: [{ name: 'Hand Gesture', icon: 'sign_language' }],
  outputs: [],
  config: {
    enabled: true,
    cameraActive: false
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: { value: string }) => void
}> = ({ input, onChange }) => {
  const handsModuleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const handsConfig = handsModuleFullConfig as
    | (ModuleDefaultConfig & HandsModuleCustomConfig)
    | undefined
  const cameraActive = handsConfig?.cameraActive ?? false
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoSceneRef = useRef<VideoScene | null>(null)
  const handsEstimatorRef = useRef<HandsEstimator | null>(null)

  const [detectedGestureForDisplay, setDetectedGestureForDisplay] = useState<string | null>(null)

  useEffect(() => {
    if (!cameraActive) {
      setDetectedGestureForDisplay(null)
    }

    if (videoCanvasRef.current && !videoSceneRef.current) {
      videoSceneRef.current = new VideoScene(videoCanvasRef.current)
    }
    if (!handsEstimatorRef.current) {
      handsEstimatorRef.current = new HandsEstimator()
    }
    const estimator = handsEstimatorRef.current
    const canvas = videoCanvasRef.current
    let i = 0
    let currentGestureEnum: Gesture | null = null
    const listener: HandsListener = (results: MediapipeHands.Results | null) => {
      if (!results) return
      if (videoSceneRef.current) videoSceneRef.current.update(results as any)
      const landmarks = results?.multiHandLandmarks?.[0]
      if (landmarks) {
        const gesture = detectGesture(landmarks)
        if (gesture === currentGestureEnum) {
          i++
          if (i === 10) {
            const gestureString = Gesture[gesture]
            log.info(`Hands InputEdit: Detected gesture for config: ${gestureString}`)
            setDetectedGestureForDisplay(gestureString) // Update display
            onChange({ value: gestureString }) // Update row config
            i = 0
            currentGestureEnum = null
          }
        } else {
          currentGestureEnum = gesture
          i = 0
        }
      }
    }

    if (cameraActive && canvas && estimator) {
      log.info('Hands InputEdit: Camera active, starting estimator.')
      estimator.addListener(listener)
      try {
        estimator.start() // Call start directly
      } catch (err) {
        log.error('Hands InputEdit: Error starting estimator', err)
      }
      canvas.style.display = 'block'
    } else {
      log.info('Hands InputEdit: Camera inactive, stopping estimator.')
      estimator?.stop()
      if (canvas) canvas.style.display = 'none'
    }

    return () => {
      log.info('Hands InputEdit: Cleaning up estimator.')
      estimator?.removeListener(listener)
      estimator?.stop()
      if (canvas) canvas.style.display = 'none'
    }
  }, [cameraActive, onChange])

  const handleToggleCameraActive = () => {
    if (handsConfig) {
      setModuleConfig(id, 'cameraActive', !handsConfig.cameraActive)
    }
  }

  useRequestAnimationFrame(() => {}, { duration: undefined, shouldAnimate: cameraActive })

  // Determine text for the main gesture button
  let gestureButtonText: string

  if (cameraActive) {
    // If camera is active, show what's being detected,
    // or fallback to the configured value, or "Detecting..."
    gestureButtonText = detectedGestureForDisplay || input.data.value || 'Detecting...'
  } else {
    // If camera is inactive, show the configured value,
    // or "Camera is inactive" if nothing is configured yet.
    gestureButtonText = input.data.value || 'Camera is inactive'
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          color={gestureButtonText === 'Camera is inactive' ? 'error' : 'primary'}
          sx={{
            minWidth: 150,
            justifyContent: 'center',
            fontFamily: 'monospace',
            flexGrow: 1,
            height: '56px',
            textTransform: 'uppercase'
          }}
          // disabled={!cameraActive && !input.data.value}
        >
          {gestureButtonText}
        </Button>

        {/* Info Tooltip */}
        <Tooltip
          title={
            <List dense sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
              <ListSubheader sx={{ bgcolor: 'background.paper' }}>Available Gestures</ListSubheader>
              {Object.values(Gesture)
                .filter((value) => typeof value === 'string')
                .map((g) => (
                  <ListItem key={g} dense disableGutters>
                    <Typography variant="caption">{g}</Typography>
                  </ListItem>
                ))}
            </List>
          }
        >
          <IconButton size="small" sx={{ height: '56px' }}>
            <Info />
          </IconButton>
        </Tooltip>
        <Button
          variant="outlined"
          size="small"
          onClick={handleToggleCameraActive}
          sx={{ minWidth: '40px', height: '56px', padding: '6px 8px' }}
          title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {cameraActive ? <VideocamOff /> : <Videocam color="error" />}
        </Button>
      </Box>

      <canvas
        ref={videoCanvasRef}
        style={{
          height: 150,
          width: cameraActive ? 200 : 0, // Make width 0 when inactive to hide and not take space
          border: cameraActive ? '2px solid green' : '2px dashed #8883', // More subtle inactive
          borderRadius: '4px',
          objectFit: 'cover',
          display: cameraActive ? 'block' : 'none', // Also control display
          margin: '0 auto', // Center the canvas
          transition: 'width 0.3s ease-in-out' // Smooth hide/show
        }}
      />
    </Box>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={input} /> {/* Shows module icon + "Hand Gesture" */}
      <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic' }}>
        {input.data.value || 'Any Gesture'} {/* Display configured gesture */}
      </Typography>
    </Box>
  )
}

export const useGlobalActions = () => {
  const handsModuleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const handsConfig = handsModuleFullConfig as
    | (ModuleDefaultConfig & HandsModuleCustomConfig)
    | undefined
  const moduleEnabled = handsConfig?.enabled
  const cameraActive = handsConfig?.cameraActive
  const isAppEditing = useMainStore((state) => state.edit)
  const handsEstimatorRef = useRef<HandsEstimator | null>(null)

  useEffect(() => {
    if (!moduleEnabled || !cameraActive || isAppEditing) {
      log.info('Hands Global: Stopping estimator.')
      handsEstimatorRef.current?.stop()
      return
    }

    log.info('Hands Global: Initializing HandsEstimator...')
    if (!handsEstimatorRef.current) {
      handsEstimatorRef.current = new HandsEstimator()
    }
    const estimator = handsEstimatorRef.current
    let i = 0
    let currentGestureEnum: Gesture | null = null

    // Define the listener with a null check for results
    const listener: HandsListener = (results: MediapipeHands.Results | null) => {
      // Adjusted type to allow null
      if (!results) return // Guard against null results

      const landmarks = results?.multiHandLandmarks?.[0]
      if (landmarks) {
        const gesture = detectGesture(landmarks)
        if (gesture === currentGestureEnum) {
          i++
          if (i === 10) {
            const gestureString = Gesture[gesture]
            log.success(`Hands Global: Firing event for: ${gestureString}`)
            window.dispatchEvent(new CustomEvent('io_gesture_hands', { detail: gestureString }))
            i = 0
            currentGestureEnum = null
          }
        } else {
          currentGestureEnum = gesture
          i = 0
        }
      }
    }

    estimator.addListener(listener)
    try {
      estimator.start() // Call start directly
      log.info('Hands Global: Estimator started and listener attached.')
    } catch (err) {
      log.error('Hands Global: Error starting estimator', err)
    }

    return () => {
      log.info('Hands Global: Cleaning up. Stopping estimator.')
      estimator?.removeListener(listener)
      estimator?.stop()
    }
  }, [moduleEnabled, cameraActive, isAppEditing])

  return null
}

export const useInputActions = (row: Row) => {
  useEffect(() => {
    const gestureListener = (event: CustomEvent) => {
      const detectedGestureString = event.detail as string
      // row.input.data.value should store the target gesture string (e.g., "VULCAN")
      if (detectedGestureString && detectedGestureString === row.input.data.value) {
        log.info(
          `Hands Row ${row.id}: Matched gesture "${detectedGestureString}". Triggering action.`
        )
        window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
      }
    }

    log.info1(
      `Hands Row ${row.id}: Attaching 'io_gesture_hands' listener for gesture ${row.input.data.value}`
    )
    window.addEventListener('io_gesture_hands', gestureListener as EventListener)

    return () => {
      log.info1(`Hands Row ${row.id}: Removing 'io_gesture_hands' listener.`)
      window.removeEventListener('io_gesture_hands', gestureListener as EventListener)
    }
  }, [row.id, row.input.data.value]) // Dependencies
}

export const Settings: FC = () => {
  const handsModuleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const handsConfig = handsModuleFullConfig as
    | (ModuleDefaultConfig & HandsModuleCustomConfig)
    | undefined
  const cameraActive = handsConfig?.cameraActive ?? false
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const handleToggleCameraActive = () => {
    if (handsConfig) {
      setModuleConfig(id, 'cameraActive', !handsConfig.cameraActive)
    }
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 250,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        boxsizing: 'border-box',
        marginTop: '0'
      }}
    >
      <Typography variant="overline">Hand Gesture Settings</Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={handleToggleCameraActive}
        sx={{
          minWidth: '40px',
          width: '100%',
          height: '40px',
          padding: '6px 8px',
          color: cameraActive ? 'green' : 'red'
        }}
        title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
        startIcon={<Videocam color="inherit" />}
      >
        {cameraActive ? 'Camera: Active' : 'Camera: Inactive'}
      </Button>

      {/* Add other global settings for Hands module here if needed */}
      {/* <canvas
        // This canvas is for global preview in settings, similar to InputEdit
        // It should only be active if cameraActive is true.
        // Need to manage its VideoScene and estimator instance separately or share carefully.
        // For simplicity, it might be better NOT to have a live preview in global settings
        // unless absolutely necessary, to avoid multiple camera streams / estimator conflicts.
        // Let's comment out the global preview canvas for now.
        ref={useRef<HTMLCanvasElement | null>(null)} // Needs its own ref and logic
        style={{
          height: 100,
          width: 133,
          border: '1px dashed grey',
          display: cameraActive ? 'block' : 'none'
        }}
      /> */}
      <Box sx={{ height: 40 }}>
        {cameraActive && (
          <Typography variant="caption" color="textSecondary">
            Gesture detection is running.
          </Typography>
        )}
        {!cameraActive && (
          <Typography variant="caption" color="textSecondary">
            Enable camera to detect hand gestures.
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
