import { ModuleId } from '@shared/module-ids'
import { produce } from 'immer'

export const storeUI = () => ({
  darkMode: true,
  homeWidgets: {} as Record<ModuleId, boolean>
})
export const storeUIActions = (set: any) => ({
  setDarkMode: (dark: boolean): void =>
    set(
      produce((state: any) => {
        state.ui.darkMode = dark
      }),
      false,
      'ui/darkmode'
    ),
  setHomeWidgets: (newHomeWidgets: Record<ModuleId, boolean>) => {
    set(
      produce((state: any) => {
        state.ui.homeWidgets = newHomeWidgets
      }),
      false,
      'setHomeWidgets'
    )
  }
})
