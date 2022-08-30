import produce from 'immer'

export const storeUI = (set:any) => ({
  darkMode: true,
  setDarkMode: (dark: boolean):void => set(produce((state:any) => { state.ui.darkMode = dark }), false, "ui/darkmode"),    
})
