/* eslint-disable no-param-reassign */
import produce from 'immer';


const storeGeneral = (set: any) => ({  
  shortcuts: [
    {shortkey: "ctrl+alt+y", action: "Hacked by Blade", input_type: "keyboard", output_type: "alert"}
  ] as any,
  inputs: {
    midi: false,
    cam: false,
    mqtt: false
  },
  outputs: {
    mqtt: false
  },
  mqttData: {
    host: 'ws://192.168.1.47:1884',
    username: 'blade',
    password: '',
    topic: 'blade/gestures'
  },
  toggleInput: (type: string): void => set(produce((state:any) => { state.inputs[type] =  !state.inputs[type]}), false, "toggle/input"),
  setInput: (type: string, val: boolean): void => set(produce((state:any) => { state.inputs[type] =  val}), false, "set/output"),
  toggleOutput: (type: string): void => set(produce((state:any) => { state.outputs[type] =  !state.outputs[type]}), false, "toggle/output"),
  setOutput: (type: string, val: boolean): void => set(produce((state:any) => { state.outputs[type] =  val}), false, "set/input"),
  setMqttData: (type: string, val: boolean): void => set(produce((state:any) => { state.mqttData[type] =  val}), false, "set/mqttData"),
  addShortcut: (shortcut: string, action: string, input_type: string, output_type: string): void => set(produce((state:any) => { state.shortcuts = [...state.shortcuts, {shortkey: shortcut, action: action, output_type: output_type, input_type: input_type}] }), false, "add/shortcut"),
  removeShortcut: (shortcut: string, type: string): void => set(produce((state:any) => { state.shortcuts = state.shortcuts.filter((s: any)=> s.shortkey !== shortcut )}), false, "remove/shortcut"),
});

export default storeGeneral;