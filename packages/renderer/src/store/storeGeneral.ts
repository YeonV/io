/* eslint-disable no-param-reassign */
import produce from 'immer';


const storeGeneral = (set: any) => ({  
  shortcuts: [
    {shortkey: "ctrl+alt+y", action: "Hacked by Blade"}
  ] as any,
  addShortcut: (shortcut: string, action: string): void => set(produce((state:any) => { state.shortcuts = [...state.shortcuts, {shortkey: shortcut, action: action}] }), false, "add/shortcut"),
});

export default storeGeneral;