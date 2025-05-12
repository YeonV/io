import type { FC } from 'react'
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig, InputData, Row } from '@shared/types'
import { Button, IconButton, List, ListItem, ListSubheader, Tooltip } from '@mui/material'
import { useEffect } from 'react'
import { detectGesture, Gesture } from '../../modules/Mediapipe/Old/core/gesture-detector'
import { VideoScene } from './Old/video/video-scene'
import { useStore } from '@/store/OLD/useStore'
import { HandsEstimator } from './Old/core/hands-estimator'
import { log } from '@/utils'
import useRequestAnimationFrame from 'use-request-animation-frame'
import Hands from '@mediapipe/hands'
import Holistic from '@mediapipe/holistic'
import Shortkey from '@/modules/Keyboard/Shortkey'
import DisplayButtons from '@/components/Row/DisplayButtons'
import ToggleSettings from '@/components/ToggleSettings'
import { Info } from '@mui/icons-material'

type HandsConfigExample = {}

export const id = 'hands-module'

export const moduleConfig: ModuleConfig<HandsConfigExample> = {
  menuLabel: 'A.I.',
  inputs: [
    {
      name: 'Hands',
      icon: 'sign_language'
    }
  ],
  outputs: [],
  config: {
    enabled: true
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  const cam = useStore((state) => state.inputs.cam)
  // const mqtt = useStore((state) => state.inputs.mqtt)

  const videoCanvas = document.getElementById('video-canvas-hands') as HTMLCanvasElement
  const videoScene = new VideoScene(videoCanvas)

  let i: number = 0
  let currentGesture: Gesture | null = null
  let results: Hands.Results | Holistic.Results | null = null
  let hand: Hands.LandmarkList | Holistic.LandmarkList | null = null

  useEffect(() => {
    const listener = (r: any) => {
      results = r
      const landmarks = r?.multiHandLandmarks[0]
      if (landmarks) {
        hand = landmarks
        const gesture = detectGesture(landmarks)
        if (gesture === currentGesture) {
          i++
          if (i === 10) {
            onChange({
              data: {
                value: Gesture[gesture]
              }
            })
          }
        } else {
          currentGesture = gesture
          i = 0
        }
      }
    }

    const handsEstimator = new HandsEstimator()

    if (videoCanvas) {
      if (cam) {
        handsEstimator.addListener(listener)
        handsEstimator.start()
        videoCanvas.style.display = 'block'
      } else {
        handsEstimator.stop()
        handsEstimator.removeListener(listener)
        videoCanvas.style.display = 'none'
      }
    }

    return () => {
      handsEstimator.stop()
      handsEstimator.removeListener(listener)
      if (videoCanvas) {
        videoCanvas.style.display = 'none'
      }
    }
  }, [cam])

  useRequestAnimationFrame(
    (_e: any) => {
      if (results && videoScene) videoScene.update(results as any)
    },
    { duration: undefined, shouldAnimate: cam }
  )
  return (
    <div style={{ textAlign: 'left', marginTop: '10px', display: 'flex' }}>
      <ToggleSettings name="cam" variant="switch" />
      <Tooltip title="Use Camera">
        <Button variant="outlined">{input?.data?.data?.value || ''}</Button>
      </Tooltip>
      <Tooltip
        title={
          <List>
            <ListSubheader>Possible Options</ListSubheader>
            <ListItem>VULCAN</ListItem>
            <ListItem>PAPER</ListItem>
            <ListItem>THUMB</ListItem>
            <ListItem>ROCK</ListItem>
            <ListItem>SCISSORS</ListItem>
            <ListItem>PINKY</ListItem>
            <ListItem>INDEX</ListItem>
            <ListItem>METAL</ListItem>
          </List>
        }
      >
        <IconButton>
          <Info />
        </IconButton>
      </Tooltip>
      <canvas
        style={{
          height: 150,
          width: 150,
          position: 'absolute',
          bottom: 0,
          border: '2px solid #0dbedc00'
        }}
        id="video-canvas-hands"
      />
    </div>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  // console.log('HERE', input)
  return (
    <>
      <DisplayButtons data={input} />
      <Shortkey value={input.data.data.value} />
    </>
  )
}

export const useInputActions = (row: Row) => {
  useEffect(() => {
    const listener = (e: any) => {
      // console.log(e)
      if (e.detail === row.input.data.data.value) {
        window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
      }
    }
    window.addEventListener('io_gesture_hands', listener)
    return () => {
      window.removeEventListener('io_gesture_hands', listener)
    }
  }, [row.input.data.data.value])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'hands')
  const cam = useStore((state) => state.inputs.cam)
  const edit = useMainStore((state) => state.edit)

  let i: number = 0
  let currentGesture: Gesture | null = null
  let results: Hands.Results | Holistic.Results | null = null
  let hand: Hands.LandmarkList | Holistic.LandmarkList | null = null

  useEffect(() => {
    const listener = (r: any) => {
      results = r
      const landmarks = r?.multiHandLandmarks[0]
      if (landmarks) {
        hand = landmarks
        const gesture = detectGesture(landmarks)
        if (gesture === currentGesture) {
          i++
          if (i === 10) {
            window.dispatchEvent(new CustomEvent(`io_gesture_hands`, { detail: Gesture[gesture] }))
            log.success1('Fire Gesture', Gesture[gesture])
          }
        } else {
          currentGesture = gesture
          i = 0
        }
      }
    }

    const handsEstimator = new HandsEstimator()
    if (cam && !edit) {
      handsEstimator.addListener(listener)
      handsEstimator.start()
    } else {
      handsEstimator.stop()
      handsEstimator.removeListener(listener)
    }
    // }

    return () => {
      handsEstimator.stop()
      handsEstimator.removeListener(listener)
    }
  }, [cam, edit])
}

export const Settings = () => {
  return (
    <>
      <ToggleSettings name="cam" />
    </>
  )
}
