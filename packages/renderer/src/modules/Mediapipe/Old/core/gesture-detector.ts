import {LandmarkList} from "@mediapipe/hands";
import {transformToXYPlane} from "../math/transform-to-x-y-plane";
import {HandLandmarks} from "./hand-landmarks";
import { log } from '@/utils'

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
function thumbStreched(landmarks: LandmarkList, ): boolean {
    return (Math.abs(landmarks[4].x - landmarks[6].x) < Math.abs(landmarks[6].x - landmarks[14].x)) ||
        (Math.abs(landmarks[4].y - landmarks[6].y) < Math.abs(landmarks[6].y - landmarks[14].y));
}
// function thumbStreched(landmarks: LandmarkList): boolean {
//     return Math.abs(landmarks[4].x - landmarks[8].x) > 2 * Math.max(Math.abs(landmarks[8].x - landmarks[12].x), Math.abs(landmarks[12].x - landmarks[16].x), Math.abs(landmarks[16].x - landmarks[20].x));
// }

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

    // const isThumbStreched = thumbStreched(landmarks);
    const isThumbStreched = thumbStreched(landmarks);
    // const isThumbStreched = isFingerStretched(landmarks, thumb);
    const isIndexStreched = isFingerStretched(landmarks, index);
    const isMiddleStreched = isFingerStretched(landmarks, middle);
    const isRingStreched = isFingerStretched(landmarks, ring);
    const isPinkyStreched = isFingerStretched(landmarks, pinky);

    console.log(isThumbStreched)
    
    /*
        const distanceTipThumbIndex = Math.abs(landmarks[HandLandmarks.Thumb_tip].x - HandLandmarks.Index_finger_tip)
        const distanceTipThumbMiddle = Math.abs(landmarks[HandLandmarks.Thumb_tip].x - HandLandmarks.Middle_finger_tip)
        const distanceTipThumbRing = Math.abs(landmarks[HandLandmarks.Thumb_tip].x - HandLandmarks.Ring_finger_tip)
        const distanceTipThumbPinky = Math.abs(landmarks[HandLandmarks.Thumb_tip].x - HandLandmarks.Pinky_tip)
        const distanceTipIndexMiddle = Math.abs(landmarks[HandLandmarks.Index_finger_tip].x - HandLandmarks.Middle_finger_tip)
        const distanceTipMiddleRing = Math.abs(landmarks[HandLandmarks.Middle_finger_tip].x - HandLandmarks.Ring_finger_tip)
        const distanceTipRingPinky = Math.abs(landmarks[HandLandmarks.Ring_finger_tip].x - HandLandmarks.Pinky_tip)
    */


    if (isIndexStreched && isMiddleStreched && isRingStreched && isPinkyStreched) {
        if (isVulcan(landmarks)) {
            log.success2("AI:Hands", "VULCAN")
            return Gesture.Vulcan;    
        } else {
            log.success2("AI:Hands", "PAPER")
            return Gesture.Paper;
        }
    }

    if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched)  {    
        if (isThumbStreched) {
            log.success2("AI:Hands", "Thumbs")
            return Gesture.ThumbsUp;    
        } else {
            log.success2("AI:Hands", "ROCK")
            return Gesture.Rock;
        }
    }

    if (!isIndexStreched && isMiddleStreched && !isRingStreched && !isPinkyStreched)  {
        log.success2("AI:Hands", "FUCK YOU")
        return Gesture.Fuckyou;
    }
    // if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched && !isThumbStreched)  {
    //     log.success2("AI:Hands", "ROCK")
    //     return Gesture.Rock;
    // }

    // if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched && isThumbStreched) {
    //     log.success2("AI:Hands", "Thumbs Up")
    //     return Gesture.Rock;
    // }

    if (isIndexStreched && isMiddleStreched) {
        log.success2("AI:Hands", "SCISSORS")
        return Gesture.Scissors;
    }
    return Gesture.Unknown;
}
