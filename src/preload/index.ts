import fs from 'fs'
import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Titlebar, TitlebarColor } from 'custom-electron-titlebar'
import { domReady } from './utils.js'
import { useLoading } from './loading.js'
import pkg from '../../package.json' assert { type: 'json' }

const { appendLoading, removeLoading } = useLoading()

;(async () => {
  await domReady()
  appendLoading()
})()

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('fs', fs)
    contextBridge.exposeInMainWorld('removeLoading', removeLoading)
    contextBridge.exposeInMainWorld('ipcRenderer', withPrototype(ipcRenderer))

    // contextBridge.exposeInMainWorld('store', withPrototype(store))

    // `exposeInMainWorld` can't detect attributes and methods of `prototype`, manually patching it.
  } catch (error) {
    console.error(error)
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
  // Title bar implementation
  if (pkg.env.VITRON_CUSTOM_TITLEBAR) {
    const darkmode = ipcRenderer.sendSync('get-darkmode')
    new Titlebar({
      backgroundColor: TitlebarColor.fromHex(darkmode === 'yes' ? '#202124' : '#eeeeee')
    })
  }
})

function withPrototype(obj: Record<string, any>) {
  const protos = Object.getPrototypeOf(obj)

  for (const [key, value] of Object.entries(protos)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) continue

    if (typeof value === 'function') {
      // Some native APIs, like `NodeJS.EventEmitter['on']`, don't work in the Renderer process. Wrapping them into a function.
      obj[key] = function (...args: any) {
        return value.call(obj, ...args)
      }
    } else {
      obj[key] = value
    }
  }
  return obj
}
