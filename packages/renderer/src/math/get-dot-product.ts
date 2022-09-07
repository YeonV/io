import {Landmark} from "@mediapipe/hands";

export function getDotProduct(a: Landmark, b: Landmark): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}