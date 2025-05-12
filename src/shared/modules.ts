// @ts-nocheck
import * as keyboardModule from '../renderer/src/modules/Keyboard/Keyboard.ts'
import * as pianoModule from '../renderer/src/modules/MIDI/MIDI.ts'
import * as mqttModule from '../renderer/src/modules/MQTT/MQTT.ts'
import * as sayModule from '../renderer/src/modules/Say/Say.ts'
import * as restModule from '../renderer/src/modules/REST/REST.ts'
import * as ledfxModule from '../renderer/src/modules/LedFx/LedFx.ts'
import * as handsModule from '../renderer/src/modules/Mediapipe/Hands.ts'
import * as poseModule from '../renderer/src/modules/Mediapipe/Pose.ts'
import * as faceDetectModule from '../renderer/src/modules/Mediapipe/FaceDetect.ts'
import * as faceMeshModule from '../renderer/src/modules/Mediapipe/FaceMesh.ts'
import * as holisticModule from '../renderer/src/modules/Mediapipe/Holistic.ts'
import * as objectronModule from '../renderer/src/modules/Mediapipe/Objectron.ts'
import * as alexaModule from '../renderer/src/modules/Alexa/Alexa.ts'
import * as shellModule from '../renderer/src/modules/Shell/Shell.ts'
import * as hassModule from '../renderer/src/modules/HomeAssistant/HomeAssistant.ts'
import * as wledModule from '../renderer/src/modules/Wled/Wled.ts'
import * as alertModule from '../renderer/src/modules/Alert/Alert.ts'

export default {
  [keyboardModule.id]: keyboardModule,
  [mqttModule.id]: mqttModule,
  [sayModule.id]: sayModule,
  [restModule.id]: restModule,
  [ledfxModule.id]: ledfxModule,
  [handsModule.id]: handsModule,
  [poseModule.id]: poseModule,
  [faceDetectModule.id]: faceDetectModule,
  [faceMeshModule.id]: faceMeshModule,
  [holisticModule.id]: holisticModule,
  [objectronModule.id]: objectronModule,
  [pianoModule.id]: pianoModule,
  [alexaModule.id]: alexaModule,
  [shellModule.id]: shellModule,
  [hassModule.id]: hassModule,
  [wledModule.id]: wledModule,
  [alertModule.id]: alertModule
}
