import {
  HAND_CONNECTIONS,
  // HAND_CONNECTIONS as HC,
  // Results as ResHand,
  Results,
} from '@mediapipe/hands'
// import {
//   FACEMESH_TESSELATION,
//   POSE_CONNECTIONS,
//   Results as ResHol,
// } from '@mediapipe/holistic'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

export class VideoScene {
  constructor(private canvas: HTMLCanvasElement) {}

  // update(results: ResHand & ResHol) {
  update(results: Results) {
    console.log("ss", results)
    const canvasCtx = this.canvas?.getContext('2d')!

    canvasCtx.drawImage(
      results.image,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    )

    // HANDS
    console.log("EE", results)
    if (results.multiHandLandmarks?.[0]) {
      canvasCtx.globalCompositeOperation = 'source-over'

      drawConnectors(
        canvasCtx,
        results.multiHandLandmarks[0],
        HAND_CONNECTIONS,
        { color: '#0000ff', lineWidth: 0.2 }
      )

      drawLandmarks(canvasCtx, results.multiHandLandmarks[0], {
        color: '#00ff00',
        radius: 0.5,
      })
    }
    // HOLISTIC
    // if (results.poseLandmarks) {
    //   canvasCtx.globalCompositeOperation = 'source-over'

    //   drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
    //     color: '#00FF00',
    //     lineWidth: 1,
    //   })

    //   drawLandmarks(canvasCtx, results.poseLandmarks, {
    //     color: '#FF0000',
    //     radius: 0.5,
    //     lineWidth: 1,
    //   })

    //   drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
    //     color: '#C0C0C070',
    //     lineWidth: 1,
    //   })
    //   drawConnectors(canvasCtx, results.leftHandLandmarks, HC, {
    //     color: '#CC0000',
    //     lineWidth: 0.5,
    //   })
    //   drawLandmarks(canvasCtx, results.leftHandLandmarks, {
    //     color: '#00FF00',
    //     lineWidth: 0.1,
    //   })
    //   drawConnectors(canvasCtx, results.rightHandLandmarks, HC, {
    //     color: '#00CC00',
    //     lineWidth: 0.5,
    //   })
    //   drawLandmarks(canvasCtx, results.rightHandLandmarks, {
    //     color: '#FF0000',
    //     lineWidth: 0.05,
    //   })
    // }

    canvasCtx.restore()
  }
}
