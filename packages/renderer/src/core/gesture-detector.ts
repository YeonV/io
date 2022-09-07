import {LandmarkList} from "@mediapipe/hands";
import {transformToXYPlane} from "../math/transform-to-x-y-plane";
import {HandLandmarks} from "./hand-landmarks";

export enum Gesture {
    Unknown,
    Rock,
    ThumbsUp,
    Fuckyou,
    Paper,
    Scissors,
    Vulcan
}




function isFingerStretched(landmarks: LandmarkList, finger: number[]): boolean {
    return landmarks[finger[0]].x < landmarks[finger[1]].x && landmarks[finger[1]].x < landmarks[finger[3]].x;
}
function isThumbStreched(landmarks: LandmarkList): boolean {
    return Math.abs(landmarks[4].x - landmarks[8].x) > 2 * Math.max(Math.abs(landmarks[8].x - landmarks[12].x), Math.abs(landmarks[12].x - landmarks[16].x), Math.abs(landmarks[16].x - landmarks[20].x));
}

function isVulcan(landmarks: LandmarkList): boolean {
    return ((2 * Math.abs(landmarks[12].x - landmarks[8].x) < Math.abs(landmarks[16].x - landmarks[12].x)) && (2 * Math.abs(landmarks[20].x - landmarks[16].x) < Math.abs(landmarks[16].x - landmarks[12].x))) || 
        ((2 * Math.abs(landmarks[12].y - landmarks[8].y) < Math.abs(landmarks[16].y - landmarks[12].y)) && (2 * Math.abs(landmarks[20].y - landmarks[16].y) < Math.abs(landmarks[16].y - landmarks[12].y)));
}

export function detectGesture(landmarks: LandmarkList | null): Gesture {
    if (!landmarks) {
        return Gesture.Unknown;
    }

    landmarks = transformToXYPlane(landmarks);

    const thumb = [HandLandmarks.Thumb_cmc, HandLandmarks.Thumb_mcp, HandLandmarks.Thumb_ip, HandLandmarks.Thumb_tip];
    const index = [HandLandmarks.Index_finger_mcp, HandLandmarks.Index_finger_pip, HandLandmarks.Index_finger_dip, HandLandmarks.Index_finger_tip];
    const middle = [HandLandmarks.Middle_finger_mcp, HandLandmarks.Middle_finger_pip, HandLandmarks.Middle_finger_dip, HandLandmarks.Middle_finger_tip];
    const ring = [HandLandmarks.Ring_finger_mcp, HandLandmarks.Ring_finger_pip, HandLandmarks.Ring_finger_dip, HandLandmarks.Ring_finger_tip];
    const pinky = [HandLandmarks.Pinky_mcp, HandLandmarks.Pinky_pip, HandLandmarks.Pinky_dip, HandLandmarks.Pinky_tip];

    const isIndexStreched = isFingerStretched(landmarks, index);
    const isMiddleStreched = isFingerStretched(landmarks, middle);
    const isRingStreched = isFingerStretched(landmarks, ring);
    const isPinkyStreched = isFingerStretched(landmarks, pinky);

    if (isIndexStreched && isMiddleStreched && isRingStreched && isPinkyStreched) {
        if (isVulcan(landmarks)) {
            console.log("VULCAN")
            return Gesture.Vulcan;    
        } else {
            console.log("PAPER")
            return Gesture.Paper;
        }
    }

    if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched)  {    
        // if (isThumbStreched(landmarks)) {
            console.log("Thumbs")
            return Gesture.ThumbsUp;    
        // } else {
        //     console.log("ROCK")
        //     return Gesture.Rock;
        // }
    }

    if (!isIndexStreched && isMiddleStreched && !isRingStreched && !isPinkyStreched)  {
        console.log("FUCK YOU")
        return Gesture.Fuckyou;
    }
    // if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched && !isThumbStreched)  {
    //     console.log("ROCK")
    //     return Gesture.Rock;
    // }

    // if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched && isThumbStreched) {
    //     console.log("Thumbs Up")
    //     return Gesture.Rock;
    // }

    if (isIndexStreched && isMiddleStreched) {
        console.log("SCISSORS")
        return Gesture.Scissors;
    }
    return Gesture.Unknown;
}
