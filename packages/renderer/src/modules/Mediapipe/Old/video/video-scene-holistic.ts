import mpHolistic, { HAND_CONNECTIONS, Results } from "@mediapipe/holistic";
import drawingUtils, { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

export class VideoScene {
    constructor(private canvas: HTMLCanvasElement) {
    }

    connect(
        ctx: CanvasRenderingContext2D,
        connectors:
            Array<[mpHolistic.NormalizedLandmark, mpHolistic.NormalizedLandmark]>):
        void {
        const canvas = ctx.canvas;
        for (const connector of connectors) {
            const from = connector[0];
            const to = connector[1];
            if (from && to) {
                if (from.visibility && to.visibility &&
                    (from.visibility < 0.1 || to.visibility < 0.1)) {
                    continue;
                }
                ctx.beginPath();
                ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
                ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
                ctx.stroke();
            }
        }
    }

    update(results: Results) {
        const canvasCtx = this.canvas.getContext('2d')!;

        canvasCtx.drawImage(
            results.image, 0, 0, this.canvas.width, this.canvas.height
        );

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (results.segmentationMask) {
            canvasCtx.drawImage(
                results.segmentationMask, 0, 0, this.canvas.width,
                this.canvas.height);

            const activeEffect = 'both' as 'both' | 'mask'
            // Only overwrite existing pixels.
            if (activeEffect === 'mask' || activeEffect === 'both') {
                canvasCtx.globalCompositeOperation = 'source-in';
                // This can be a color or a texture or whatever...
                canvasCtx.fillStyle = '#00FF007F';
                canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else {
                canvasCtx.globalCompositeOperation = 'source-out';
                canvasCtx.fillStyle = '#0000FF7F';
                canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Only overwrite missing pixels.
            canvasCtx.globalCompositeOperation = 'destination-atop';
            canvasCtx.drawImage(
                results.image, 0, 0, this.canvas.width, this.canvas.height);

            canvasCtx.globalCompositeOperation = 'source-over';
        } else {
            canvasCtx.drawImage(
                results.image, 0, 0, this.canvas.width, this.canvas.height);
        }

        // Connect elbows to hands. Do this first so that the other graphics will draw
        // on top of these marks.
        canvasCtx.lineWidth = 5;
        if (results.poseLandmarks) {
            if (results.rightHandLandmarks) {
                canvasCtx.strokeStyle = 'white';
                this.connect(canvasCtx, [[
                    results.poseLandmarks[mpHolistic.POSE_LANDMARKS.RIGHT_ELBOW],
                    results.rightHandLandmarks[0]
                ]]);
            }
            if (results.leftHandLandmarks) {
                canvasCtx.strokeStyle = 'white';
                this.connect(canvasCtx, [[
                    results.poseLandmarks[mpHolistic.POSE_LANDMARKS.LEFT_ELBOW],
                    results.leftHandLandmarks[0]
                ]]);
            }

            // Pose...
            drawingUtils.drawConnectors(
                canvasCtx, results.poseLandmarks, mpHolistic.POSE_CONNECTIONS,
                { color: 'white' });
            drawingUtils.drawLandmarks(
                canvasCtx,
                Object.values(mpHolistic.POSE_LANDMARKS_LEFT)
                    .map(index => results.poseLandmarks[index]),
                { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(255,138,0)' });
            drawingUtils.drawLandmarks(
                canvasCtx,
                Object.values(mpHolistic.POSE_LANDMARKS_RIGHT)
                    .map(index => results.poseLandmarks[index]),
                { visibilityMin: 0.65, color: 'white', fillColor: 'rgb(0,217,231)' });

            // Hands...
            drawingUtils.drawConnectors(
                canvasCtx, results.rightHandLandmarks, mpHolistic.HAND_CONNECTIONS,
                { color: 'white' });
            drawingUtils.drawLandmarks(canvasCtx, results.rightHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(0,217,231)',
                lineWidth: 2,
                radius: (data: drawingUtils.Data) => {
                    return drawingUtils.lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            });
            drawingUtils.drawConnectors(
                canvasCtx, results.leftHandLandmarks, mpHolistic.HAND_CONNECTIONS,
                { color: 'white' });
            drawingUtils.drawLandmarks(canvasCtx, results.leftHandLandmarks, {
                color: 'white',
                fillColor: 'rgb(255,138,0)',
                lineWidth: 2,
                radius: (data: drawingUtils.Data) => {
                    return drawingUtils.lerp(data.from!.z!, -0.15, .1, 10, 1);
                }
            });

            // Face...
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_TESSELATION,
                { color: '#C0C0C070', lineWidth: 1 });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_RIGHT_EYE,
                { color: 'rgb(0,217,231)' });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_RIGHT_EYEBROW,
                { color: 'rgb(0,217,231)' });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LEFT_EYE,
                { color: 'rgb(255,138,0)' });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LEFT_EYEBROW,
                { color: 'rgb(255,138,0)' });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_FACE_OVAL,
                { color: '#E0E0E0', lineWidth: 5 });
            drawingUtils.drawConnectors(
                canvasCtx, results.faceLandmarks, mpHolistic.FACEMESH_LIPS,
                { color: '#E0E0E0', lineWidth: 5 });

            canvasCtx.restore();
        }
    }

}
