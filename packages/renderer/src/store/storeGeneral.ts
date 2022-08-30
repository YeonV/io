/* eslint-disable no-param-reassign */
import produce from 'immer';


const storeGeneral = (set: any) => ({  
  shortcuts: [
    {shortkey: "ctrl+alt+y", action: "Hacked by Blade"}
  ] as any,
  addShortcut: (shortcut: string, action: string, type: string): void => set(produce((state:any) => { state.shortcuts = [...state.shortcuts, {shortkey: shortcut, action: action, type: type}] }), false, "add/shortcut"),
  removeShortcut: (shortcut: string, type: string): void => set(produce((state:any) => { state.shortcuts = state.shortcuts.filter((s: any)=> s.shortkey !== shortcut )}), false, "remove/shortcut"),
});

export default storeGeneral;