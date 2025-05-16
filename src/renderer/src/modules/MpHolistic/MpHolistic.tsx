// src/renderer/src/modules/Mediapipe/Holistic.tsx

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
  FormControlLabel, // For potential Switch in Settings if preferred
  Switch, // For potential Switch in Settings if preferred
  Typography
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
// Note: Holistic doesn't use 'detectGesture' or 'Gesture' enum from Hands in your provided code.
// If it needs its own detection, that logic would be separate.
// For now, we focus on camera activation and data flow.
import { VideoScene } from './video-scene-holistic' // Assuming this path
import { HolisticEstimator, HolisticListener } from './holistic-estimator' // Assuming HolisticListener type
import { log } from '@/utils'
import useRequestAnimationFrame from 'use-request-animation-frame'
import type * as MediapipeHolistic from '@mediapipe/holistic' // Type import
import DisplayButtons from '@/components/Row/DisplayButtons'
import { Info, Videocam, VideocamOff } from '@mui/icons-material' // Icons for toggle

// --- Define Custom Config for this Module ---
export interface HolisticModuleCustomConfig {
  cameraActive: boolean
  // Add other holistic-specific global settings here if needed
}

// --- Module ID and Configuration ---
export const id = 'mpholistic-module'

export const moduleConfig: ModuleConfig<HolisticModuleCustomConfig> = {
  menuLabel: 'A.I.',
  inputs: [
    { name: 'Holistic Pose', icon: 'accessibility_new' } // More specific name
  ],
  outputs: [],
  config: {
    enabled: true,
    cameraActive: false // Camera is OFF by default
  }
}

// --- InputEdit: UI for configuring a Holistic input row ---
export const InputEdit: FC<{
  input: InputData // input.data.value might store a target pose/state string
  onChange: (data: { value: string }) => void // To update the target
}> = ({ input, onChange }) => {
  const holisticModuleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const holisticConfig = holisticModuleFullConfig as
    | (ModuleDefaultConfig & HolisticModuleCustomConfig)
    | undefined
  const cameraActive = holisticConfig?.cameraActive ?? false
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoSceneRef = useRef<VideoScene | null>(null)
  const holisticEstimatorRef = useRef<HolisticEstimator | null>(null)

  // State for any data captured or displayed during edit
  const [capturedPoseInfo, setCapturedPoseInfo] = useState<string | null>(null)

  useEffect(() => {
    if (!cameraActive) {
      setCapturedPoseInfo(null) // Clear any live display when camera off
    }

    if (videoCanvasRef.current && !videoSceneRef.current) {
      videoSceneRef.current = new VideoScene(videoCanvasRef.current)
    }
    if (!holisticEstimatorRef.current) {
      holisticEstimatorRef.current = new HolisticEstimator()
    }

    const estimator = holisticEstimatorRef.current
    const canvas = videoCanvasRef.current

    // Your existing listener logic for Holistic results
    const listener: HolisticListener = (results: MediapipeHolistic.Results | null) => {
      if (!results) return
      if (videoSceneRef.current) videoSceneRef.current.update(results as any)

      const poseLandmarks = results?.poseLandmarks // Holistic provides poseLandmarks
      if (poseLandmarks && poseLandmarks.length > 0) {
        // TODO: Implement logic to detect specific poses or conditions
        // For now, maybe just log or display some info
        const noseX = poseLandmarks[0]?.x // Example: get nose x-coordinate
        if (noseX !== undefined) {
          const poseDesc = `Nose X: ${noseX.toFixed(2)}`
          setCapturedPoseInfo(poseDesc)
          // If you had a way to define a "target pose" and detect it:
          // const currentPose = detectSpecificHolisticPose(poseLandmarks);
          // if (currentPose) {
          //   onChange({ value: currentPose }); // Update row config
          // }
        }
      } else {
        setCapturedPoseInfo(null)
      }
    }

    if (cameraActive && canvas && estimator) {
      log.info('Holistic InputEdit: Camera active, starting estimator.')
      estimator.addListener(listener)
      try {
        estimator.start()
      } catch (err) {
        log.error('Holistic InputEdit: Error starting estimator', err)
      }
      canvas.style.display = 'block'
    } else {
      log.info('Holistic InputEdit: Camera inactive, stopping estimator.')
      estimator?.stop()
      if (canvas) canvas.style.display = 'none'
    }

    return () => {
      log.info('Holistic InputEdit: Cleaning up estimator.')
      estimator?.removeListener(listener)
      estimator?.stop()
      if (canvas) canvas.style.display = 'none'
    }
  }, [cameraActive, onChange]) // Removed `input.data.value` from deps unless onChange uses it to clear

  const handleToggleCameraActive = () => {
    if (holisticConfig) {
      setModuleConfig(id, 'cameraActive', !holisticConfig.cameraActive)
    }
  }

  useRequestAnimationFrame(() => {}, { duration: undefined, shouldAnimate: cameraActive })

  let displayButtonText = input.data.value || 'Define Target'
  if (cameraActive) {
    displayButtonText = capturedPoseInfo || input.data.value || 'Detecting...'
  } else if (!input.data.value) {
    displayButtonText = 'Camera is inactive'
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          color={displayButtonText === 'Camera is inactive' ? 'error' : 'primary'}
          sx={{
            minWidth: 150,
            justifyContent: 'center',
            fontFamily: 'monospace',
            flexGrow: 1,
            height: '56px',
            textTransform: 'none' // No uppercase for pose info
          }}
          title={input.data.value || 'Target Pose/Condition'}
        >
          {displayButtonText}
        </Button>

        <Tooltip title="Configure the specific pose or condition to trigger this row. (WIP)">
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
          width: cameraActive ? 200 : 0,
          border: cameraActive ? '2px solid dodgerblue' : '2px dashed #8883',
          borderRadius: '4px',
          objectFit: 'cover',
          display: cameraActive ? 'block' : 'none',
          margin: '0 auto',
          transition: 'width 0.3s ease-in-out'
        }}
      />
    </Box>
  )
}

// --- InputDisplay: UI for showing configured Holistic input in a row ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={input} />
      <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic' }}>
        {input.data.value || 'Any Pose Event'} {/* Display configured condition */}
      </Typography>
    </Box>
  )
}

// --- useGlobalActions (Commented out, but structured for future use) ---
/*
export const useGlobalActions = () => {
  const holisticModuleFullConfig = useMainStore((state) => state.modules[id]?.config);
  const holisticConfig = holisticModuleFullConfig as (ModuleDefaultConfig & HolisticModuleCustomConfig) | undefined;
  const moduleEnabled = holisticConfig?.enabled;
  const cameraActive = holisticConfig?.cameraActive;
  const isAppEditing = useMainStore((state) => state.edit);
  const holisticEstimatorRef = useRef<HolisticEstimator | null>(null);

  useEffect(() => {
    if (!moduleEnabled || !cameraActive || isAppEditing) {
      log.info('Holistic Global: Stopping estimator.');
      holisticEstimatorRef.current?.stop();
      return;
    }

    log.info('Holistic Global: Initializing HolisticEstimator...');
    if (!holisticEstimatorRef.current) {
      holisticEstimatorRef.current = new HolisticEstimator();
    }
    const estimator = holisticEstimatorRef.current;

    const listener: HolisticListener = (results: MediapipeHolistic.Results | null) => {
      if (!results) return;
      const poseLandmarks = results?.poseLandmarks;
      if (poseLandmarks && poseLandmarks.length > 0) {
        // TODO: Implement global pose detection logic
        // Example: const specificPose = detectSpecificGlobalPose(poseLandmarks);
        // if (specificPose) {
        //   log.success(`Holistic Global: Firing event for: ${specificPose}`);
        //   window.dispatchEvent(new CustomEvent('io_holistic_event', { detail: specificPose }));
        // }
      }
    };

    estimator.addListener(listener);
    try {
      estimator.start();
      log.info('Holistic Global: Estimator started.');
    } catch (err) {
      log.error('Holistic Global: Error starting estimator', err);
    }

    return () => {
      log.info('Holistic Global: Cleaning up. Stopping estimator.');
      estimator?.removeListener(listener);
      estimator?.stop();
    };
  }, [moduleEnabled, cameraActive, isAppEditing]);

  return null;
};
*/

// --- useInputActions: Reacts to a global 'io_holistic_event' ---
export const useInputActions = (row: Row) => {
  useEffect(() => {
    const holisticEventListener = (event: CustomEvent) => {
      const detectedEventDetail = event.detail as string // Or whatever your event detail structure is
      if (detectedEventDetail && detectedEventDetail === row.input.data.value) {
        log.info(
          `Holistic Row ${row.id}: Matched event "${detectedEventDetail}". Triggering action.`
        )
        window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
      }
    }

    // Ensure row.input.data.value is defined before attaching
    if (row.input.data.value) {
      log.info(
        `Holistic Row ${row.id}: Attaching 'io_holistic_event' listener for value ${row.input.data.value}`
      )
      window.addEventListener('io_holistic_event', holisticEventListener as EventListener)
    }

    return () => {
      if (row.input.data.value) {
        log.info(`Holistic Row ${row.id}: Removing 'io_holistic_event' listener.`)
        window.removeEventListener('io_holistic_event', holisticEventListener as EventListener)
      }
    }
  }, [row.id, row.input.data.value])
}

// --- Settings: UI for enabling/disabling Camera for this module ---
export const Settings: FC = () => {
  const holisticModuleFullConfig = useMainStore((state) => state.modules[id]?.config)
  const holisticConfig = holisticModuleFullConfig as
    | (ModuleDefaultConfig & HolisticModuleCustomConfig)
    | undefined
  const cameraActive = holisticConfig?.cameraActive ?? false
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const handleToggleCameraActive = () => {
    if (holisticConfig) {
      setModuleConfig(id, 'cameraActive', !holisticConfig.cameraActive)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1,
        p: 1,
        border: '1px solid #555',
        borderRadius: 1,
        minWidth: 200
      }}
    >
      <Typography variant="overline">Holistic Model Settings</Typography>
      {cameraActive ? <Videocam /> : <VideocamOff color="disabled" />}
      <FormControlLabel
        control={<Switch checked={cameraActive} onChange={handleToggleCameraActive} size="small" />}
        label={cameraActive ? 'Camera: Active' : 'Camera: Inactive'}
      />
      {cameraActive && (
        <Typography variant="caption" color="textSecondary">
          Holistic model processing is running.
        </Typography>
      )}
      {!cameraActive && (
        <Typography variant="caption" color="textSecondary">
          Enable camera for holistic tracking.
        </Typography>
      )}
    </Box>
  )
}
