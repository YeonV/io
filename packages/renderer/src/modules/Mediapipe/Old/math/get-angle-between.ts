import {Landmark} from "@mediapipe/hands";
import {getDotProduct} from "./get-dot-product";
import {getLength} from "./get-length";

export function getAngleBetween(a: Landmark, b: Landmark): number {
    return Math.acos(getDotProduct(a, b) / (getLength(a) * getLength(b)))
}
