// src/renderer/src/modules/Keyboard/Keyboard.main.ts
import type { IOMainModulePart } from '@shared/types'
import { MainModuleDeps } from '@/main/moduleLoader' // Adjust path as needed

let robotjs: any = null
let robotjsAvailable = false
let robotjsError: string | null = null
let isRobotJsInitialized = false // Flag to ensure init runs once

// Asynchronous initialization function
async function initializeRobotJS() {
  if (isRobotJsInitialized) return
  isRobotJsInitialized = true // Attempt initialization only once

  try {
    // Use dynamic import()
    const robotjsModule = await import('robotjs')
    robotjs = robotjsModule // Or robotjsModule.default if it's a default export
    // It's common for CJS modules wrapped as ESM to have main exports on .default
    // If robotjs is pure CJS and your TS/bundler handles it, direct assignment might work.
    // Test what robotjsModule contains. If it has keyTap directly, use robotjsModule.
    // If keyTap is on robotjsModule.default.keyTap, use robotjsModule.default.
    // For 'robotjs', it's typically a CJS module so often it's the direct module object.

    // Simple test to see if it actually loaded and is usable
    if (typeof robotjs.getMousePos !== 'function') {
      // Pick a simple, known function
      throw new Error("Loaded 'robotjs' module does not appear to be valid.")
    }

    robotjsAvailable = true
    console.log('[Keyboard.main] RobotJS loaded successfully via dynamic import.')
  } catch (e: any) {
    robotjsAvailable = false
    robotjsError = e.message || 'Unknown error loading RobotJS via dynamic import.'
    console.warn(
      `[Keyboard.main] WARNING: RobotJS dynamic import failed. Keystroke output disabled. Error: ${robotjsError}`
    )
  }
}

const keyboardMainModule: IOMainModulePart = {
  moduleId: 'keyboard-module',

  initialize: async (deps: MainModuleDeps) => {
    // Make initialize async
    const { ipcMain, getMainWindow } = deps

    // Await the RobotJS initialization before setting up IPC handlers that depend on it
    await initializeRobotJS()

    ipcMain.handle('keyboard-get-status', () => {
      // This now reflects the outcome of the async initialization
      return { available: robotjsAvailable, error: robotjsError }
    })

    ipcMain.handle(
      'keyboard-press-keys',
      async (_event, args: { keys: string[]; modifiers?: string[] }) => {
        if (!robotjsAvailable || !robotjs) {
          // Check both flag and module presence
          return {
            success: false,
            error: `RobotJS is not available. Keystroke simulation disabled. (${robotjsError || 'Module not loaded'})`
          }
        }
        // ... (rest of your press-keys logic using robotjs.keyTap etc. - same as before)
        const { keys, modifiers = [] } = args
        if (!keys || keys.length === 0) return { success: false, error: 'No keys specified.' }
        try {
          const firstKey = keys[0]
          const remainingKeys = keys.slice(1)
          if (modifiers.length > 0) {
            robotjs.keyTap(
              firstKey,
              modifiers.map((m) => m.toLowerCase())
            )
          } else {
            robotjs.keyTap(firstKey)
          }
          for (const key of remainingKeys) {
            robotjs.keyTap(key)
          }
          console.log(`[Keyboard.main] Pressed keys: ${modifiers.join('+')}+${keys.join(', ')}`)
          return { success: true }
        } catch (error: any) {
          console.error('[Keyboard.main] Error pressing keys:', error)
          return { success: false, error: error.message }
        }
      }
    )

    ipcMain.handle('keyboard-type-string', async (_event, args: { text: string }) => {
      if (!robotjsAvailable || !robotjs) {
        return {
          success: false,
          error: `RobotJS is not available. Keystroke simulation disabled. (${robotjsError || 'Module not loaded'})`
        }
      }
      // ... (rest of your type-string logic using robotjs.typeString - same as before)
      const { text } = args
      if (typeof text !== 'string')
        return { success: false, error: 'Text to type must be a string.' }
      try {
        robotjs.typeString(text)
        console.log(`[Keyboard.main] Typed string: ${text}`)
        return { success: true }
      } catch (error: any) {
        console.error('[Keyboard.main] Error typing string:', error)
        return { success: false, error: error.message }
      }
    })

    console.log(`[Keyboard.main] Initialized (async). RobotJS available: ${robotjsAvailable}`)
  },

  cleanup: async () => {
    // cleanup might also be async if needed
    ipcMain.removeHandler('keyboard-press-keys')
    ipcMain.removeHandler('keyboard-type-string')
    ipcMain.removeHandler('keyboard-get-status')
    console.log('[Keyboard.main] Cleaned up keyboard IPC handlers.')
    // No specific cleanup for robotjs module itself unless it provides one
    isRobotJsInitialized = false // Allow re-init if module system reloads
    robotjs = null
  }
}

export default keyboardMainModule
