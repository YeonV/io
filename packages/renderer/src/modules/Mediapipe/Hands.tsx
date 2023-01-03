import Shortkey from '@/modules/Keyboard/Shortkey'
import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Button, Icon } from '@mui/material'
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

    const cam = useStore((state) => state.inputs.cam)


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
                    console.log("HEY", Gesture[gesture])
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

        if (cam) {
            handsEstimator.addListener(listener)
            handsEstimator.start()
            videoCanvas.style.display = 'block'
        } else {
            handsEstimator.stop()
            handsEstimator.removeListener(listener)
            videoCanvas.style.display = 'none'
        }

        return () => {
            handsEstimator.stop()
            handsEstimator.removeListener(listener)
            videoCanvas.style.display = 'none'
        }
    }, [cam])

    useRequestAnimationFrame(
        (e: any) => {
            if (results) videoScene.update(results as any)
        },
        { duration: undefined, shouldAnimate: cam }
    )
    return (
        <div style={{ textAlign: 'left', marginTop: '10px' }}>
            <Button variant='outlined'>
                {input?.data?.data?.value || ''}
            </Button>
        </div>
    )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
    console.log("HERE", input)
    return (
        <>
            {' '}
            <Icon>{camelToSnake(input.icon)}</Icon>
            <Shortkey
                value={input.data.data.value}
                trigger={() => {
                    console.log('SHORTKEY;')
                }}
            />
        </>
    )
}

export const useInputActions = (
    row: Row,
    // onChange: (data: Record<string, any>) => void
) => {
    const cam = useStore((state) => state.inputs.cam)
    const inMqtt = useStore((state) => state.inputs.mqtt)

    const videoCanvas = document.getElementById(
        'video-canvas'
    ) as HTMLCanvasElement
    const videoScene = new VideoScene(videoCanvas)
    var i: number = 0
    var currentGesture: Gesture | null = null
    var results: Hands.Results | Holistic.Results | null = null
    var hand: Hands.LandmarkList | Holistic.LandmarkList | null = null

    console.log("WHY0", row)
    useEffect(() => {
        console.log("WHY")
        const listener = (r: any) => {
            results = r
            const landmarks = r?.multiHandLandmarks[0]
            if (landmarks) {
                hand = landmarks
                const gesture = detectGesture(landmarks)
                if (gesture === currentGesture) {
                    // onChange({ currentGesture })
                    i++
                    if (i === 10) {
                        window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))

                        // const check = shortcuts.find(
                        //     (s: any) =>
                        //         s.input_type === 'cam' &&
                        //         s.shortkey === Gesture[gesture].toLowerCase()
                        // )
                        // if (check) {
                        //     window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
                        //     //   actions(check.output_type, check.action)
                        // } else {
                        //     setShortcut(Gesture[gesture].toLowerCase())
                        // }
                    }
                } else {
                    currentGesture = gesture
                    i = 0
                }
            }
        }

        const handsEstimator = new HandsEstimator()

        if (inMqtt) {
            handsEstimator.addListener(listener)
            handsEstimator.start()
            videoCanvas.style.display = 'block'
        } else {
            handsEstimator.stop()
            handsEstimator.removeListener(listener)
            videoCanvas.style.display = 'none'
        }

        return () => {
            handsEstimator.stop()
            handsEstimator.removeListener(listener)
            videoCanvas.style.display = 'none'
        }
    }, [cam, inMqtt])

    useRequestAnimationFrame(
        (e: any) => {
            if (results) videoScene.update(results as any)
        },
        { duration: undefined, shouldAnimate: cam }
    )
}
