import {Landmark} from "@mediapipe/hands";

export function getLength({x, y, z}: Landmark): number {
    return Math.sqrt(x*x + y*y + z*z);
}