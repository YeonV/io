import { produce } from 'immer'

export const storeUI = () => ({
  darkMode: true
})
export const storeUIActions = (set: any) => ({
  setDarkMode: (dark: boolean): void =>
    set(
      produce((state: any) => {
        state.ui.darkMode = dark
      }),
      false,
      'ui/darkmode'
    )
})
