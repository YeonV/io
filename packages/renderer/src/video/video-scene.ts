import {HAND_CONNECTIONS, Results} from "@mediapipe/hands";
import {drawConnectors, drawLandmarks} from "@mediapipe/drawing_utils";

export class VideoScene {
    constructor(private canvas: HTMLCanvasElement) {
    }

    update(results: Results) {
        const canvasCtx = this.canvas.getContext('2d')!;

        canvasCtx.drawImage(
            results.image, 0, 0, this.canvas.width, this.canvas.height
        );

        if (results.multiHandLandmarks[0]) {
            canvasCtx.globalCompositeOperation = 'source-over';

            drawConnectors(
                canvasCtx,
                results.multiHandLandmarks[0],
                HAND_CONNECTIONS,
                {color: '#0000ff', lineWidth: .2}
            );

            drawLandmarks(
                canvasCtx,
                results.multiHandLandmarks[0],
                {color: '#00ff00', radius: .5}
            );
        }
        
        canvasCtx.restore();
    }
}