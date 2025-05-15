// src/main/devTools.ts
import { is } from '@electron-toolkit/utils'
import { app } from 'electron'
import { installExtension, REDUX_DEVTOOLS } from 'electron-devtools-installer'

export async function installDevTools(): Promise<void> {
  if (!app.isPackaged && is.dev) {
    // 'app' needs to be imported from 'electron' here
    try {
      console.log('Main (devTools): Installing DevTools...')
      await installExtension([REDUX_DEVTOOLS])
      console.log('Main (devTools): DevTools installed.')
    } catch (err) {
      console.error('Main (devTools): Error installing DevTools:', err)
    }
  }
}
