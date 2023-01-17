import Shortkey from '@/modules/Keyboard/Shortkey'
import { ModuleConfig, InputData, Row, useMainStore } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import {
    Button,
    FormControlLabel,
    FormGroup,
    Icon,
    Switch,
    ToggleButton,
    Typography,
} from '@mui/material'
import type { FC } from 'react'
import { useEffect } from 'react'
import Hands from '@mediapipe/hands'
import Holistic from '@mediapipe/holistic'
import {
    detectGesture,
    Gesture,
} from '../../modules/Mediapipe/Old/core/gesture-detector'
import { VideoScene } from './Old/video/video-scene-holistic'
import { useStore } from '@/store/OLD/useStore'
import useRequestAnimationFrame from 'use-request-animation-frame'
import { HolisticEstimator } from './Old/core/holistic-estimator'
import DisplayButtons from '@/components/DisplayButtons'
import { Camera, Videocam, VideocamOff } from '@mui/icons-material'
import { Stack } from '@mui/system'
import ToggleSettings from '@/components/ToggleSettings'
import { log } from '@/utils'

type HolisticConfigExample = {}

export const id = 'holistic-module'

export const moduleConfig: ModuleConfig<HolisticConfigExample> = {
    menuLabel: 'A.I.',
    inputs: [
        {
            name: 'Holistic',
            icon: 'man2',
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
    const cam = useStore((state) => state.inputs.cam)
    // const mqtt = useStore((state) => state.inputs.mqtt)
    //   const videoCanvas = useStore((state) => state.videoCanvas)
    //   const videoScene = useStore((state) => state.videoScene)

    const videoCanvas = document.getElementById(
        'video-canvas-holistic'
    ) as HTMLCanvasElement
    const videoScene = new VideoScene(videoCanvas)

    var i: number = 0
    var currentGesture: Gesture | null = null
    var results: Hands.Results | Holistic.Results | null = null
    var hand: Hands.LandmarkList | Holistic.LandmarkList | null = null
    useEffect(() => {
        const listener = (r: any) => {
            results = r
            const landmarks = r?.poseLandmarks
            if (landmarks && landmarks.length) {
                hand = landmarks
                // console.log(landmarks)
                // const gesture = detectGesture(landmarks)
                // if (gesture === currentGesture) {
                //     i++
                //     if (i === 10) {
                //         onChange({
                //             data: {
                //                 value: Gesture[gesture],
                //             },
                //         })
                //     }
                // } else {
                //     currentGesture = gesture
                //     i = 0
                // }
            }
        }

        const holisticEstimator = new HolisticEstimator()

        if (videoCanvas) {
            if (cam) {
                holisticEstimator.addListener(listener)
                holisticEstimator.start()
                videoCanvas.style.display = 'block'
            } else {
                holisticEstimator.stop()
                holisticEstimator.removeListener(listener)
                videoCanvas.style.display = 'none'
            }
        }

        return () => {
            holisticEstimator.stop()
            holisticEstimator.removeListener(listener)
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
            <ToggleSettings name='cam' variant='switch' />
            <Button variant='outlined'>{input?.data?.data?.value || ''}</Button>
            <canvas style={{
                height: 150,
                width: 150,
                position: 'absolute',
                bottom: 0,
                border: '2px solid #0dbedc00'
            }}
                id="video-canvas-holistic" />
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
        window.addEventListener('io_gesture_holistic', listener)
        return () => {
            window.removeEventListener('io_gesture_holistic', listener)
        }
    }, [row.input.data.data.value])
}

// export const useGlobalActions = () => {
//     log.info1('useGlobalActions:', 'holistic')
//     const cam = useStore((state) => state.inputs.cam)
//     const edit = useMainStore((state) => state.edit)

//     var i: number = 0
//     var currentGesture: Gesture | null = null
//     var results: Holistic.Results | Holistic.Results | null = null
//     var hand: Holistic.LandmarkList | Holistic.LandmarkList | null = null

//     useEffect(() => {
//         const listener = (r: any) => {
//             results = r
//             const landmarks = r?.multiHandLandmarks[0]
//             if (landmarks) {
//                 hand = landmarks
//                 // console.log(landmarks)
//                 // const gesture = detectGesture(landmarks)
//                 // if (gesture === currentGesture) {
//                 //     i++
//                 //     if (i === 10) {
//                 //         window.dispatchEvent(
//                 //             new CustomEvent(`io_gesture_holistic`, { detail: Gesture[gesture] })
//                 //         )
//                 //         log.success1('Fire Gesture', Gesture[gesture])
//                 //     }
//                 // } else {
//                 //     currentGesture = gesture
//                 //     i = 0
//                 // }
//             }
//         }

//         const holisticEstimator = new HolisticEstimator()
//         if (cam && !edit) {
//             holisticEstimator.addListener(listener)
//             holisticEstimator.start()
//         } else {
//             holisticEstimator.stop()
//             holisticEstimator.removeListener(listener)
//         }
//         // }

//         return () => {
//             holisticEstimator.stop()
//             holisticEstimator.removeListener(listener)
//         }
//     }, [cam, edit])
// }

export const Settings = () => {
    return (
        <>
            <ToggleSettings name='cam' />
        </>
    )
}
