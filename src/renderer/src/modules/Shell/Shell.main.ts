// src/main/modules/shell.main.ts
import { type IpcMain, type BrowserWindow, ipcMain } from 'electron'
import { exec } from 'child_process' // Import exec directly
import { IOMainModulePart } from '../../../../shared/types.js'

// Define the interface for the dependencies this main part will receive
interface ShellMainInitDeps {
  ipcMain: IpcMain
  getMainWindow: () => BrowserWindow | null
}

const SHELL_MODULE_ID = 'shell-module'

const shellMainModule: IOMainModulePart = {
  moduleId: SHELL_MODULE_ID,

  initialize: (deps: ShellMainInitDeps) => {
    const { ipcMain, getMainWindow } = deps
    console.log(`Main (${SHELL_MODULE_ID}): Initializing IPC handler for 'run-shell'.`)

    const runShellListener = async (event: Electron.IpcMainEvent, commandToRun: string) => {
      const currentMainWindow = getMainWindow()
      if (!commandToRun) {
        console.warn(`Main (${SHELL_MODULE_ID}): 'run-shell' IPC received with no command.`)
        event.returnValue = 'Error: No command provided to run-shell.' // For sendSync
        return
      }

      console.log(`Main (${SHELL_MODULE_ID}): Executing shell command: ${commandToRun}`)
      exec(commandToRun, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Main (${SHELL_MODULE_ID}): Error executing "${commandToRun}": ${error.message}`
          )
          currentMainWindow?.webContents.send('run-shell-answer', { error: error.message })
          event.returnValue = `Error: ${error.message}`
          return
        }
        if (stderr) {
          console.warn(`Main (${SHELL_MODULE_ID}): Stderr for "${commandToRun}": ${stderr}`)
          currentMainWindow?.webContents.send('run-shell-answer', {
            result: stdout,
            errorOutput: stderr
          })
          event.returnValue = `Stderr: ${stderr}`
          return
        }
        console.log(`Main (${SHELL_MODULE_ID}): Stdout for "${commandToRun}": ${stdout}`)
        currentMainWindow?.webContents.send('run-shell-answer', { result: stdout })
        event.returnValue = `Shell command "${commandToRun}" executed.`
      })
    }

    // Use ipcMain.on for sendSync compatibility from renderer if still used,
    // or ipcMain.handle if renderer uses invoke.
    // For now, assuming 'run-shell' might be sendSync from renderer.
    ipcMain.on('run-shell', runShellListener)
  },

  cleanup: () => {
    console.log(`Main (${SHELL_MODULE_ID}): Cleaning up 'run-shell' IPC handler.`)
    ipcMain.removeAllListeners('run-shell')
  }
}

export default shellMainModule // Export the module part object
