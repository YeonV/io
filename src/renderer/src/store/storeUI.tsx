// src/renderer/src/store/storeUI.tsx
import { ModuleId } from '@shared/module-ids'
import { produce } from 'immer'

const ipcRenderer = window.electron?.ipcRenderer || false

export const storeUI = () => ({
  themeColors: {
    primaryLight: '#333333',
    primaryDark: '#CCCCCC',
    secondaryLight: '#666666',
    secondaryDark: '#999999'
  },
  themeChoice: 'system' as 'system' | 'dark' | 'light',
  homeWidgets: {} as Record<ModuleId, boolean>
})
export const storeUIActions = (set: any) => ({
  setThemeChoice: (choice) => {
    // Renamed and updated action
    set(
      produce((state: any) => {
        state.ui.themeChoice = choice
      }),
      false,
      `ui/setThemeChoice/${choice}`
    )
    // Send preference to main process
    if (ipcRenderer) {
      ipcRenderer.send('set-app-theme-preference', choice)
    }
  },
  setThemeColors: (key: string, color: string) => {
    set(
      produce((state: any) => {
        state.ui.themeColors = {
          ...state.ui.themeColors,
          [key]: color
        }
      }),
      false,
      'setThemeColors'
    )
  },
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
