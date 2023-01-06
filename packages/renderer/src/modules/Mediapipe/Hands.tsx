import Shortkey from '@/modules/Keyboard/Shortkey'
import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Button, Icon } from '@mui/material'
import { FC, useEffect, useRef } from 'react'
import {
  detectGesture,
  Gesture,
} from '../../modules/Mediapipe/Old/core/gesture-detector'
import { HandsEstimator, HandsListener } from './Old/core/hands-estimator'
import create from 'zustand'
import { VideoScene } from './Old/video/video-scene'
import useRequestAnimationFrame from 'use-request-animation-frame'
import Hands from '@mediapipe/hands'
import { useStore } from '@/store/OLD/useStore'
import Webcam from 'react-webcam'

type HandsConfigExample = {}

export const id = 'hands-module'

export const moduleConfig: ModuleConfig<HandsConfigExample> = {
  menuLabel: 'A.I.',
  inputs: [
    {
      name: 'Hands',
      icon: 'sign_language',
    },
  ],
  outputs: [],
  config: {
    enabled: true,
  },
}

type GestureState = {
  gesture: Gesture
  results: Hands.Results | null
  setResults: (result: Hands.Results | null) => void
  setGesture: (gesture: Gesture) => void
}

const useGestureStore = create<GestureState>()((set, get) => {
  return {
    results: null as Hands.Results | null,
    setResults: (results) => {
      set((state) => ({
        ...state,
        results,
      }))
    },
    gesture: Gesture.Unknown,
    setGesture: (gesture: Gesture) => {
      set((state) => ({
        ...state,
        gesture,
      }))
    },
  }
})

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  const gesture = useGestureStore((state) => state.gesture)
  useEffect(() => {
    if (Gesture[gesture] !== input.data?.value) {
      onChange({
        value: Gesture[gesture],
      })
    }
  }, [gesture])

  const cam = useStore((state) => state.inputs.cam)
  const videoCanvas = document.getElementById(
    'video-canvas'
  ) as HTMLCanvasElement
  const videoScene = new VideoScene(videoCanvas)
  const results = useGestureStore((state) => state.results)

  // useEffect(() => {
  //   console.log('useEffect hide show video')
  //   if (videoCanvas) {
  //     if (cam) {
  //       videoCanvas.style.display = 'block'
  //     } else {
  //       videoCanvas.style.display = 'none'
  //     }
  //   }
  //   // return () => {
  //   //   if (videoCanvas) {
  //   //     videoCanvas.style.display = 'none'
  //   //   }
  //   // }
  // }, [cam, videoCanvas])

  useRequestAnimationFrame(
    (e: any) => {
      console.log('y', results)
      if (cam && videoScene) videoScene.update(results!)
    },
    { duration: undefined, shouldAnimate: cam }
  )
  const webcamRef = useRef(null)
  const canvasRef = useRef(null)

  return (
    <>
      <div style={{ textAlign: 'left', marginTop: '10px' }}>
        <Button variant='outlined'>{input.data?.value || ''}</Button>
      </div>
      {cam && <Webcam ref={webcamRef} />}
      <canvas
        ref={canvasRef}
        style={{
          height: '150px',
          width: '150px',
          position: 'absolute',
          bottom: 0,
          border: '2px solid #0dbedc',
        }}
        id='video-canvas'
      ></canvas>
    </>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  return (
    <>
      {' '}
      <Icon>{camelToSnake(input.icon)}</Icon>
      <Shortkey
        value={input.data.value}
        trigger={() => {
          console.log('SHORTKEY;')
        }}
      />
    </>
  )
}

export const useInputActions = (row: Row) => {
  const gesture = useGestureStore((state) => state.gesture)

  useEffect(() => {
    if (Gesture[gesture] === row.input.data.value) {
      window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
    }
  }, [gesture])
}

export const Widget = () => {
  const setGesture = useGestureStore((state) => state.setGesture)
  const setResults = useGestureStore((state) => state.setResults)
  const cam = useStore((state) => state.inputs.cam)

  useEffect(() => {
    let lastGesture: Gesture = Gesture.Unknown
    let i = 0
    const handsEstimator = new HandsEstimator()

    const listener: HandsListener = (results) => {
      // console.log('results in widget useEffect', results)
      setResults(results)
      const landmarks = results?.multiHandLandmarks[0]
      if (landmarks) {
        const gesture = detectGesture(landmarks)
        if (gesture === lastGesture) {
          i++
          if (i === 10) {
            setGesture(gesture)
          }
        } else {
          lastGesture = gesture
          i = 0
        }
      }
    }

    if (cam) {
      handsEstimator.addListener(listener)
      handsEstimator.start()
    } else {
      handsEstimator.stop()
      handsEstimator.removeListener(listener)
    }

    return () => {
      handsEstimator.stop()
      handsEstimator.removeListener(listener)
    }
  }, [cam])

  return (
    <div>
      {/* <canvas
        style={{
          height: '150px',
          width: '150px',
          position: 'absolute',
          bottom: 0,
          border: '2px solid #0dbedc',
          display: 'none',
        }}
        id='video-canvas'
      ></canvas> */}
    </div>
  )
}
