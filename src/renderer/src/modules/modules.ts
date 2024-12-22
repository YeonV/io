import * as keyboardModule from '@/modules/Keyboard/Keyboard'
import * as pianoModule from '@/modules/MIDI/MIDI'
import * as mqttModule from '@/modules/MQTT/MQTT'
import * as sayModule from '@/modules/Say/Say'
import * as restModule from '@/modules/REST/REST'
import * as ledfxModule from '@/modules/LedFx/LedFx'
import * as handsModule from '@/modules/Mediapipe/Hands'
import * as poseModule from '@/modules/Mediapipe/Pose'
import * as faceDetectModule from '@/modules/Mediapipe/FaceDetect'
import * as faceMeshModule from '@/modules/Mediapipe/FaceMesh'
import * as holisticModule from '@/modules/Mediapipe/Holistic'
import * as objectronModule from '@/modules/Mediapipe/Objectron'
import * as alexaModule from '@/modules/Alexa/Alexa'
import * as shellModule from '@/modules/Shell/Shell'
import * as hassModule from '@/modules/HomeAssistant/HomeAssistant'
import * as wledModule from '@/modules/Wled/Wled'
import * as alertModule from '@/modules/Alert/Alert'

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
