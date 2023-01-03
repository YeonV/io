import * as keyboardModule from "@/modules/Keyboard";
import * as mqttModule from "@/modules/MQTT";
import * as sayModule from "@/modules/Say";
import * as restModule from "@/modules/REST";
import * as ledfxModule from "@/modules/LedFx";

export default {
    [keyboardModule.id]: keyboardModule,
    [mqttModule.id]: mqttModule,
    [sayModule.id]: sayModule,
    [restModule.id]: restModule,
    [ledfxModule.id]: ledfxModule
}
