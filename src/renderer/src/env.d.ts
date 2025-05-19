/// <reference types="vite/client" />

import { ElectronAPI } from '@electron-toolkit/preload'

export {}

declare global {
  interface Window {
    // Expose some Api through preload script
    fs: typeof import('fs')
    ipcRenderer: import('electron').IpcRenderer
    removeLoading: () => void
    electron: ElectronAPI
    api: unknown
    IO_DEV_TOOLS?: {
      clearPlaySoundCache?: () => Promise<void>
      // Add other dev tool functions here if needed
    }
  }
}
