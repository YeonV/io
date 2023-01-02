import * as keyboardModule from "@/modules/Keyboard";
import * as mqttModule from "@/modules/MQTT";
import * as sayModule from "@/modules/Say";

export default {
    [keyboardModule.id]: keyboardModule,
    [mqttModule.id]: mqttModule,
    [sayModule.id]: sayModule
}
