import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    IO_DEV_TOOLS?: {
      clearPlaySoundCache?: () => Promise<void>
      // Add other dev tool functions here if needed
    }
  }
}

export {}
