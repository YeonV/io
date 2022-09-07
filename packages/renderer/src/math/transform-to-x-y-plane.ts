import {Landmark, LandmarkList} from "@mediapipe/hands";
import {getAngleBetween} from "./get-angle-between";
import {HandLandmarks} from "../core/hand-landmarks";
import {rotateX, rotateY, rotateZ} from "./rotate";


function centerWrist(landmarks: LandmarkList): LandmarkList {
    const wrist = landmarks[0];

    return landmarks.map(landmark => {
        return {
            x: landmark.x - wrist.x,
            y: landmark.y - wrist.y,
            z: landmark.z - wrist.z,
            visibility: landmark.visibility
        }
    })
}

function rotateZAxis(landmarks: LandmarkList): LandmarkList {
    const xAxis: Landmark = {x: 1, y: 0, z: 0};

    const pinkyKnuckle = landmarks[HandLandmarks.Pinky_mcp];

    const direction = pinkyKnuckle.y < 0 ? 1 : -1;

    const rotation = getAngleBetween(xAxis, {
        x: pinkyKnuckle.x,
        y: pinkyKnuckle.y,
        z: 0
    });

    return landmarks.map(landmark => rotateZ(landmark, direction * rotation));
}

function rotateYAxis(landmarks: LandmarkList): LandmarkList {
    const xAxis: Landmark = {x: 1, y: 0, z: 0};

    const pinkyKnuckle = landmarks[HandLandmarks.Pinky_mcp];

    const direction = pinkyKnuckle.x < 0 ? 1 : -1;

    const rotation = getAngleBetween(xAxis, {
        x: pinkyKnuckle.x,
        y: 0,
        z: pinkyKnuckle.z
    });

    return landmarks.map(landmark => rotateY(landmark, direction * rotation));
}

function rotateXAxis(landmarks: LandmarkList): LandmarkList {
    const yAxis: Landmark = {x: 0, y: 1, z: 0};

    const indexKnuckle = landmarks[HandLandmarks.Index_finger_mcp];

    const direction = indexKnuckle.z < 0 ? 1 : -1;

    const rotation = getAngleBetween(yAxis, {
        x: 0,
        y: indexKnuckle.y,
        z: indexKnuckle.z
    });

    return landmarks.map(landmark => rotateX(landmark, direction * rotation));
}

export function transformToXYPlane(landmarks: LandmarkList): LandmarkList {
    const centered = centerWrist(landmarks);
    const zRotated = rotateZAxis(centered);
    const yRotated = rotateYAxis(zRotated);
    const xRotated = rotateXAxis(yRotated);

    return xRotated;
}