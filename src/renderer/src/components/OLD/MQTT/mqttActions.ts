// import { MqttContext } from "@/pages/example/Example";
// import { useContext } from "react";

import mqttService from './mqttService'

const actions = async (otype: string, opayload: any, _clienta?: any) => {
  if (otype === 'mqtt') {
    const client = mqttService.getClient(console.log)
    if (client) {
      // console.log("payload", opayload)
      client.publish('homeassistant/sensor/gesturesensor/state', opayload)
      // client.publish('blade/gestures', opayload);
    }
  }
}

export default actions
