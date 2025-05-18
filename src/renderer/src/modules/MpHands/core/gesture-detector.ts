import { LandmarkList } from '@mediapipe/hands'
import { transformToXYPlane } from '../math/transform-to-x-y-plane'
import { HandLandmarks } from './hand-landmarks'
import { log } from '@/utils'

export enum Gesture {
  Unknown,
  Rock,
  ThumbsUp,
  ThumbsDown,
  ThumbsLeft,
  ThumbsRight,
  Fuckyou,
  Paper,
  Scissors,
  Vulcan,
  Pinky,
  Index,
  Metal
}

const fingers = {
  thumb: [
    HandLandmarks.Thumb_cmc,
    HandLandmarks.Thumb_mcp,
    HandLandmarks.Thumb_ip,
    HandLandmarks.Thumb_tip
  ],
  index: [
    HandLandmarks.Index_finger_mcp,
    HandLandmarks.Index_finger_pip,
    HandLandmarks.Index_finger_dip,
    HandLandmarks.Index_finger_tip
  ],
  middle: [
    HandLandmarks.Middle_finger_mcp,
    HandLandmarks.Middle_finger_pip,
    HandLandmarks.Middle_finger_dip,
    HandLandmarks.Middle_finger_tip
  ],
  ring: [
    HandLandmarks.Ring_finger_mcp,
    HandLandmarks.Ring_finger_pip,
    HandLandmarks.Ring_finger_dip,
    HandLandmarks.Ring_finger_tip
  ],
  pinky: [
    HandLandmarks.Pinky_mcp,
    HandLandmarks.Pinky_pip,
    HandLandmarks.Pinky_dip,
    HandLandmarks.Pinky_tip
  ]
}

const distance = (pointA: { x: number; y: number }, pointB: { x: number; y: number }) => {
  return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2)
}

function isFingerStretched(
  landmarks: LandmarkList,
  finger: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
): boolean {
  const f = fingers[finger]
  if (finger === 'thumb') {
    return (
      // distance(landmarks[f[3]], landmarks[fingers.index[0]]) >
      //   distance(landmarks[f[2]], landmarks[f[3]]) &&
      landmarks[f[0]].x < landmarks[f[1]].x &&
      landmarks[f[1]].x < landmarks[f[3]].x &&
      distance(landmarks[f[2]], landmarks[fingers.index[0]]) > 0.1
    )
  }
  return (
    (landmarks[f[0]].x < landmarks[f[1]].x && landmarks[f[1]].x < landmarks[f[3]].x) ||
    (landmarks[f[0]].y < landmarks[f[1]].y && landmarks[f[1]].y < landmarks[f[3]].y)
  )
}

function isVulcan(landmarks: LandmarkList): boolean {
  return (
    (2 * Math.abs(landmarks[12].x - landmarks[8].x) < Math.abs(landmarks[16].x - landmarks[12].x) &&
      2 * Math.abs(landmarks[20].x - landmarks[16].x) <
        Math.abs(landmarks[16].x - landmarks[12].x)) ||
    (2 * Math.abs(landmarks[12].y - landmarks[8].y) < Math.abs(landmarks[16].y - landmarks[12].y) &&
      2 * Math.abs(landmarks[20].y - landmarks[16].y) < Math.abs(landmarks[16].y - landmarks[12].y))
  )
}

export function detectGesture(landmarks: LandmarkList | null): Gesture {
  if (!landmarks) {
    return Gesture.Unknown
  }

  landmarks = transformToXYPlane(landmarks)

  const isThumbStreched = isFingerStretched(landmarks, 'thumb')
  const isIndexStreched = isFingerStretched(landmarks, 'index')
  const isMiddleStreched = isFingerStretched(landmarks, 'middle')
  const isRingStreched = isFingerStretched(landmarks, 'ring')
  const isPinkyStreched = isFingerStretched(landmarks, 'pinky')

  if (isIndexStreched && isMiddleStreched && isRingStreched && isPinkyStreched) {
    if (isVulcan(landmarks)) {
      log.success2('AI:Hands', 'VULCAN')
      return Gesture.Vulcan
    } else {
      log.success2('AI:Hands', 'PAPER')
      return Gesture.Paper
    }
  }

  if (!isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched) {
    if (isThumbStreched) {
      log.success2('AI:Hands', 'THUMB')
      return Gesture.ThumbsUp
    }
    log.success2('AI:Hands', 'ROCK')
    return Gesture.Rock
  }

  if (!isIndexStreched && isMiddleStreched && !isRingStreched && !isPinkyStreched) {
    log.success2('AI:Hands', 'FUCK YOU')
    return Gesture.Fuckyou
  }

  if (isIndexStreched && isMiddleStreched) {
    log.success2('AI:Hands', 'SCISSORS')
    return Gesture.Scissors
  }

  if (!isIndexStreched && !isMiddleStreched && !isRingStreched && isPinkyStreched) {
    log.success2('AI:Hands', 'PINKY')
    return Gesture.Pinky
  }
  if (isIndexStreched && !isMiddleStreched && !isRingStreched && !isPinkyStreched) {
    log.success2('AI:Hands', 'INDEX')
    return Gesture.Index
  }
  if (isIndexStreched && !isMiddleStreched && !isRingStreched && isPinkyStreched) {
    log.success2('AI:Hands', 'METAL')
    return Gesture.Metal
  }

  return Gesture.Unknown
}
