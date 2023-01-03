import {Camera} from "@mediapipe/camera_utils";
import {Hands, Results} from "@mediapipe/hands";

export type HandsListener = (results: Results | null) => void;

export class HandsEstimator {
    private camera: Camera;
    private listeners: HandsListener[] = [];
    private hands: Hands;

    constructor(height = 360, width = 640) {
        const videoElement = document.createElement('video');

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.notifyListeners(results));

        this.camera = new Camera(videoElement, {
            onFrame: () => this.hands.send({image: videoElement}),
            width,
            height
        });
    }

    start() {
        this.camera.start()
    }

    stop() {
        this.camera.stop()
    }

    addListener(listener: HandsListener) {
        this.listeners.push(listener)
    }

    removeListener(listener: HandsListener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1)
    }

    private notifyListeners(results: Results) {
        this.listeners.forEach(fn => fn(results));
    }
}
