import { Camera } from '@mediapipe/camera_utils'
import { Holistic, Results } from '@mediapipe/holistic'

export type HolisticListener = (results: Results | null) => void

export class HolisticEstimator {
  private camera: Camera
  private listeners: HolisticListener[] = []
  private holistic: Holistic

  constructor(height = 360, width = 640) {
    const videoElement = document.createElement('video')

    this.holistic = new Holistic({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      }
    })

    this.holistic.setOptions({
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    this.holistic.onResults((results) => this.notifyListeners(results))

    this.camera = new Camera(videoElement, {
      onFrame: () => this.holistic.send({ image: videoElement }),
      width,
      height
    })
  }

  start() {
    this.camera.start()
  }

  stop() {
    this.camera.stop()
  }

  addListener(listener: HolisticListener) {
    this.listeners.push(listener)
  }

  removeListener(listener: HolisticListener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1)
  }

  private notifyListeners(results: Results) {
    this.listeners.forEach((fn) => fn(results))
  }
}
