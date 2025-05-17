// src/preload/index.ts
// No fs import for exposure

import { contextBridge, ipcRenderer as preloadIpcRenderer } from 'electron' // Import ipcRenderer for preload's own use
import { electronAPI } from '@electron-toolkit/preload'
import { Titlebar, TitlebarColor } from 'custom-electron-titlebar'
import { domReady } from './utils.js'
import { useLoading } from './loading.js'
import pkg from '../../package.json' with { type: 'json' }

const { appendLoading, removeLoading } = useLoading()

;(async () => {
  await domReady()
  appendLoading()
})()

const api = {
  getStoreState: () => preloadIpcRenderer.invoke('get-main-store-state')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI) // Exposes electronAPI.ipcRenderer
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('removeLoading', removeLoading)
  } catch (error) {
    console.error('Error in contextBridge:', error)
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
      // Use the imported ipcRenderer for preload's synchronous call
      const darkmode = preloadIpcRenderer.sendSync('get-darkmode')
      new Titlebar({
        backgroundColor: TitlebarColor.fromHex(darkmode === 'yes' ? '#202124' : '#eeeeee')
        // Ensure you have other necessary titlebar options here if needed
        // e.g., icons, menu
      })
      console.log('Preload: Custom titlebar initialized.')
    } catch (e) {
      console.error('Preload: Error initializing titlebar or getting darkmode:', e)
    }
  }
})
