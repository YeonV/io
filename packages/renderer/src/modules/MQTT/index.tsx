import type { ModuleConfig } from "@/mock-store";

type MqttConnection = {
  host: string;
  id: string;
};

type MqttConfigExample = {
  connections: MqttConnection[];
};

export const id = "mqtt-module";

export const moduleConfig: ModuleConfig<MqttConfigExample> = {
  menuLabel: "MQTT",
  inputs: [
    {
      icon: "mail",
      name: "mqtt",
    },
  ],
  outputs: [
    {
      icon: "mail",
      name: "mqtt",
    },
  ],
  config: {
    enabled: true,
    connections: [
      { id: "mqtt-local", host: "mqqt://localhost:1883" },
      { id: "remote-hass", host: "mqtt://hass.blade.io:1883" },
    ],
  },
};
