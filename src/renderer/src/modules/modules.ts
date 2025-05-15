// @ts-nocheck
import * as keyboardModule from './Keyboard/Keyboard.js'
import * as midiModule from './MIDI/MIDI.js'
import * as mqttModule from './MQTT/MQTT.js'
import * as sayModule from './Say/Say.js'
import * as restModule from './REST/REST.js'
import * as ledfxModule from './LedFx/LedFx.js'
import * as handsModule from './Mediapipe/Hands.js'
import * as poseModule from './Mediapipe/Pose.js'
import * as faceDetectModule from './Mediapipe/FaceDetect.js'
import * as faceMeshModule from './Mediapipe/FaceMesh.js'
import * as holisticModule from './Mediapipe/Holistic.js'
import * as objectronModule from './Mediapipe/Objectron.js'
import * as alexaModule from './Alexa/Alexa.js'
import * as shellModule from './Shell/Shell.js'
import * as hassModule from './HomeAssistant/HomeAssistant.js'
import * as wledModule from './Wled/Wled.js'
import * as alertModule from './Alert/Alert.js'
import * as dummyModule from './Dummy/Dummy.js'

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
  [midiModule.id]: midiModule,
  [alexaModule.id]: alexaModule,
  [shellModule.id]: shellModule,
  [hassModule.id]: hassModule,
  [wledModule.id]: wledModule,
  [alertModule.id]: alertModule,
  [dummyModule.id]: dummyModule
}
