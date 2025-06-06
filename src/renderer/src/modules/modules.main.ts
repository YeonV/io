// THIS FILE IS AUTO-GENERATED BY scripts/sync-modules.js

import type { IOMainModulePart } from '../../../shared/types'
import alexaMain from './Alexa/Alexa.main'
import keyboardMain from './Keyboard/Keyboard.main'
import mqttMain from './Mqtt/Mqtt.main'
import restMain from './Rest/Rest.main'
import shellMain from './Shell/Shell.main'
import timeMain from './Time/Time.main'

export const mainModuleHandlers: IOMainModulePart[] = [
  alexaMain,
  keyboardMain,
  mqttMain,
  restMain,
  shellMain,
  timeMain
]
