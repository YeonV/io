import * as keyboardModule from "@/modules/Keyboard/Keyboard";
import * as mqttModule from "@/modules/MQTT/MQTT";
import * as sayModule from "@/modules/Say";
import * as restModule from "@/modules/REST/REST";
import * as ledfxModule from "@/modules/LedFx/LedFx";

export default {
    [keyboardModule.id]: keyboardModule,
    [mqttModule.id]: mqttModule,
    [sayModule.id]: sayModule,
    [restModule.id]: restModule,
    [ledfxModule.id]: ledfxModule
}
