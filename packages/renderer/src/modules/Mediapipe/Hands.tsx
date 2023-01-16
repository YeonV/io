import Shortkey from '@/modules/Keyboard/Shortkey'
import { ModuleConfig, InputData, Row, useMainStore } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Button, FormControlLabel, FormGroup, Icon, Switch, ToggleButton, Typography } from '@mui/material'
import { FC, useEffect } from 'react'
import Hands from '@mediapipe/hands'
import Holistic from '@mediapipe/holistic'
import {
  detectGesture,
  Gesture,
} from '../../modules/Mediapipe/Old/core/gesture-detector'
import { VideoScene } from './Old/video/video-scene'
import { useStore } from '@/store/OLD/useStore'
import useRequestAnimationFrame from 'use-request-animation-frame'
import { HandsEstimator } from './Old/core/hands-estimator'
import DisplayButtons from '@/components/DisplayButtons'
import { Camera, Videocam, VideocamOff } from '@mui/icons-material'
import { Stack } from '@mui/system'
import ToggleSettings from '@/components/ToggleSettings'

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

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  const edit = useMainStore((state) => state.edit)
  const cam = useStore((state) => state.inputs.cam)
  const mqtt = useStore((state) => state.inputs.mqtt)
  //   const videoCanvas = useStore((state) => state.videoCanvas)
  //   const videoScene = useStore((state) => state.videoScene)

  const videoCanvas = document.getElementById(
    'video-canvas'
  ) as HTMLCanvasElement
  const videoScene = new VideoScene(videoCanvas)

  var i: number = 0
  var currentGesture: Gesture | null = null
  var results: Hands.Results | Holistic.Results | null = null
  var hand: Hands.LandmarkList | Holistic.LandmarkList | null = null
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
                value: Gesture[gesture],
              },
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
    (e: any) => {
      if (results && videoScene) videoScene.update(results as any)
    },
    { duration: undefined, shouldAnimate: cam }
  )
  return (
    <div style={{ textAlign: 'left', marginTop: '10px', display: 'flex' }}>
      <Button variant='outlined'>{input?.data?.data?.value || ''}</Button>
    </div>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  // console.log('HERE', input)
  return (
    <>
      <DisplayButtons data={input} />
      <Shortkey
        value={input.data.data.value}
        trigger={() => {
          console.log('SHORTKEY;')
        }}
      />
    </>
  )
}

// export const useCam = () =>
// // row: Row
// // onChange: (data: Record<string, any>) => void
// {
//   const cam = useStore((state) => state.inputs.cam)
//   const inMqtt = useStore((state) => state.inputs.mqtt)

//   //   const videoCanvas = useStore((state) => state.videoCanvas)
//   //   const videoScene = useStore((state) => state.videoScene)
//   const videoCanvas = document.getElementById(
//     'video-canvas'
//   ) as HTMLCanvasElement
//   const videoScene = new VideoScene(videoCanvas)
//   var i: number = 0
//   var currentGesture: Gesture | null = null
//   var results: Hands.Results | Holistic.Results | null = null
//   var hand: Hands.LandmarkList | Holistic.LandmarkList | null = null

//   // console.log('WHY0', row)
//   useEffect(() => {
//     console.log('WHY')
//     const listener = (r: any) => {
//       results = r
//       const landmarks = r?.multiHandLandmarks[0]
//       if (landmarks) {
//         hand = landmarks
//         const gesture = detectGesture(landmarks)
//         if (gesture === currentGesture) {
//           // onChange({ currentGesture })
//           i++
//           if (i === 10) {
//             // window.dispatchEvent(
//             //   new CustomEvent(`io_input`, { detail: row.id })
//             // )

//             console.log('Fire', Gesture[gesture])
//           }
//         } else {
//           currentGesture = gesture
//           i = 0
//         }
//       }
//     }

//     const handsEstimator = new HandsEstimator()
//     if (videoCanvas) {
//       if (inMqtt) {
//         handsEstimator.addListener(listener)
//         handsEstimator.start()
//         videoCanvas.style.display = 'block'
//       } else {
//         handsEstimator.stop()
//         handsEstimator.removeListener(listener)
//         videoCanvas.style.display = 'none'
//       }
//     }

//     return () => {
//       handsEstimator.stop()
//       handsEstimator.removeListener(listener)
//       if (videoCanvas) {
//         videoCanvas.style.display = 'none'
//       }
//     }
//   }, [cam, inMqtt])

//   useRequestAnimationFrame(
//     (e: any) => {
//       if (results && videoScene) videoScene.update(results as any)
//     },
//     { duration: undefined, shouldAnimate: cam }
//   )
//   // return cam ? <>yo</> : <>no</>
// }

export const useInputActions = (row: Row) => {
  useEffect(() => {
    const listener = (e: any) => {
      console.log(e)
      if (e.detail === row.input.data.data.value) {
        window.dispatchEvent(
          new CustomEvent(`io_input`, { detail: row.id })
        )
      }
    }
    window.addEventListener('io_gesture_hands', listener)
    return () => {
      window.removeEventListener('io_gesture_hands', listener)
    }
  }, [row.input.data.data.value])

}

export const useGlobalActions = () => {
  console.log('useGlobalActions: hands')
  const cam = useStore((state) => state.inputs.cam)
  const edit = useMainStore((state) => state.edit)

  var i: number = 0
  var currentGesture: Gesture | null = null
  var results: Hands.Results | Holistic.Results | null = null
  var hand: Hands.LandmarkList | Holistic.LandmarkList | null = null

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
            window.dispatchEvent(
              new CustomEvent(`io_gesture_hands`, { detail: Gesture[gesture] })
            )

            console.log('Fire', Gesture[gesture])
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

export const Settings: FC = () => {
  return (
    <>
      <ToggleSettings name='cam' />
    </>
  )
}