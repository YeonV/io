// src/preload/index.ts
import { contextBridge, ipcRenderer as preloadIpcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Titlebar, TitlebarColor } from 'custom-electron-titlebar' // Assuming this is your import
import { domReady } from './utils'
import { useLoading } from './loading'
import pkg from '../../package.json' with { type: 'json' }

const { appendLoading, removeLoading } = useLoading()

let customTitlebarInstance: Titlebar | null = null // Hold instance for updates

;(async () => {
  await domReady()
  appendLoading()
})()

const api = {
  getStoreState: () => preloadIpcRenderer.invoke('get-main-store-state')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('removeLoading', removeLoading)
  } catch (error) {
    console.error('Preload: Error in contextBridge:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.removeLoading = removeLoading
  // @ts-ignore (define in dts)
  window.api = api
}

window.addEventListener('DOMContentLoaded', () => {
  if (pkg.env.VITRON_CUSTOM_TITLEBAR) {
    try {
      // Get initial theme state directly from main process
      // The 'get-initial-theme-info' now returns an object
      const initialThemeInfo = preloadIpcRenderer.sendSync('get-initial-theme-info') as {
        userPreference: 'light' | 'dark' | 'system'
        shouldUseDarkColors: boolean
      }

      const isInitiallyDark = initialThemeInfo.shouldUseDarkColors
      console.log(`[Preload] Initial theme for title bar: ${isInitiallyDark ? 'dark' : 'light'}`)

      customTitlebarInstance = new Titlebar({
        backgroundColor: TitlebarColor.fromHex(isInitiallyDark ? '#202124' : '#eeeeee')
        // Ensure other necessary options are here (icons, menu, etc.)
        // Example:
        // itemBackgroundColor: TitlebarColor.fromHex(isInitiallyDark ? '#333333' : '#f0f0f0'),
        // svgColor: TitlebarColor.fromHex(isInitiallyDark ? '#ffffff' : '#000000'),
        // menuPosition: 'left', // or 'bottom'
        // ...
      })
      console.log('[Preload] Custom titlebar initialized.')

      // Listen for theme updates from main process to dynamically change title bar color
      preloadIpcRenderer.on('update-titlebar-theme', (_event, { isDark }: { isDark: boolean }) => {
        if (customTitlebarInstance) {
          console.log(
            `[Preload] Received 'update-titlebar-theme'. Setting to: ${isDark ? 'dark' : 'light'}`
          )
          customTitlebarInstance.updateBackground(
            TitlebarColor.fromHex(isDark ? '#202124' : '#eeeeee')
          )
          // You might need to update other colors too if your titlebar uses them:
          // customTitlebarInstance.updateItemBGColor(TitlebarColor.fromHex(isDark ? '#333333' : '#f0f0f0'));
          // customTitlebarInstance.updateIcon(TitlebarColor.fromHex(isDark ? '#ffffff' : '#000000'));
        }
      })
      console.log("[Preload] Listener for 'update-titlebar-theme' attached.")
    } catch (e) {
      console.error('[Preload] Error initializing titlebar or setting up theme listener:', e)
    }
  }
})
