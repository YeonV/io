// src/renderer/src/modules/Gamepad/Gamepad.main.ts
import { ipcMain } from 'electron';
import type { IOMainModulePart, Row } from '../../../../shared/types';
import type { MainModuleDeps } from '../../../../main/moduleLoader'; // Adjusted path
import type { GamepadInputData } from './Gamepad.types';

// --- Conceptual Gamepad Library Wrapper ---
// This is a placeholder for a real gamepad library.
// In a real scenario, you'd import and use an actual npm package.
const electronGamepadWrapper = {
  _listeners: { button: [], connect: [], disconnect: [] } as { button: any[], connect: any[], disconnect: any[] },
  _gamepads: [] as { index: number; id: string; numButtons: number; buttons: { pressed: boolean }[] }[],
  _isMonitoring: false,
  _buttonCaptureCallback: null as ((data: { gamepadIndex: number; buttonId: number; buttonName: string }) => void) | null,
  _isCapturing: false,
  _captureGamepadIndex: -1,

  list: function() {
    return this._gamepads.map(g => ({ index: g.index, id: g.id, numButtons: g.numButtons }));
  },
  on: function(event: 'button' | 'connect' | 'disconnect', callback: (...args: any[]) => void) {
    this._listeners[event].push(callback);
    // Simulate initial connect events for already connected devices upon first 'connect' listener
    if (event === 'connect' && this._isMonitoring && this._gamepads.length > 0) {
        this._gamepads.forEach(gp => callback(gp));
    }
  },
  emit: function(event: string, ...args: any[]) {
    (this._listeners[event] || []).forEach(listener => listener(...args));
  },
  startMonitoring: function() { // Simulate library initialization
    this._isMonitoring = true;
    console.log(`Main (Gamepad): Conceptual library monitoring started.`);
    // Simulate finding one gamepad for testing
    if (this._gamepads.length === 0) {
        const testGamepad = { index: 0, id: 'Test Gamepad (Virtual)', numButtons: 16, buttons: Array(16).fill({pressed: false}) };
        this._gamepads.push(testGamepad);
        this.emit('connect', testGamepad);
    }
    // Simulate button press for capture testing (press button 5 on gamepad 0 after 5s)
    /*
    setTimeout(() => {
        if (this._isCapturing && this._captureGamepadIndex === 0) {
            console.log(`Main (Gamepad): Simulating button 5 press for capture on Gamepad 0.`);
            if (this._buttonCaptureCallback) {
                this._buttonCaptureCallback({ gamepadIndex: 0, buttonId: 5, buttonName: 'Button 5'});
            }
            this._isCapturing = false;
            this._buttonCaptureCallback = null;
        }
    }, 7000);
    */
  },
  shutdown: function() {
    this._isMonitoring = false;
    this._gamepads = [];
    console.log(`Main (Gamepad): Conceptual library shutdown.`);
  },
  startCapture: function(gamepadIndex: number, callback: (data: { gamepadIndex: number; buttonId: number; buttonName: string }) => void) {
    if (this._gamepads.find(g => g.index === gamepadIndex)) {
        this._isCapturing = true;
        this._captureGamepadIndex = gamepadIndex;
        this._buttonCaptureCallback = callback;
        console.log(`Main (Gamepad): Started button capture for gamepad ${gamepadIndex}.`);
        // Simulate a button press for capture if not using the timeout above
        // For actual library, you'd listen for the next button event.
    } else {
        console.warn(`Main (Gamepad): Cannot start capture, gamepad ${gamepadIndex} not found.`);
    }
  },
  stopCapture: function() {
    this._isCapturing = false;
    this._buttonCaptureCallback = null;
    this._captureGamepadIndex = -1;
    console.log(`Main (Gamepad): Stopped button capture.`);
  },
  // Simulate a button press event from the library
  _simulateButtonPress: function(gamepadIndex: number, buttonIndex: number, isPressed: boolean) {
    if (this._isCapturing && this._captureGamepadIndex === gamepadIndex && isPressed && this._buttonCaptureCallback) {
        this._buttonCaptureCallback({ gamepadIndex, buttonId: buttonIndex, buttonName: `Button ${buttonIndex}` });
        this.stopCapture(); // Stop after one capture
        return; // Don't process as a row trigger during capture
    }
    if (!this._isCapturing) { // Only emit for row triggers if not in general capture mode
        this.emit('button', gamepadIndex, buttonIndex, isPressed);
    }
  }
};
// --- End Conceptual Gamepad Library Wrapper ---

const GAMEPAD_MODULE_ID = 'gamepad-module';
// Store active listeners for rows: { [rowId: string]: { gamepadIndex: number, buttonId: number, listener: Function } }
const activeRowListeners: Record<string, { gamepadIndex: number; buttonId: number; originalListener: (...args: any[]) => void }> = {};


const gamepadMainModule: IOMainModulePart = {
  moduleId: GAMEPAD_MODULE_ID,

  initialize: async (deps: MainModuleDeps) => {
    console.log(`Main (${GAMEPAD_MODULE_ID}): Initializing.`);
    electronGamepadWrapper.startMonitoring();

    electronGamepadWrapper.on('connect', (gamepadInfo) => {
      console.log(`Main (${GAMEPAD_MODULE_ID}): Gamepad connected:`, gamepadInfo);
      deps.getMainWindow()?.webContents.send('gamepad:connection-change', {
        type: 'connected',
        gamepads: electronGamepadWrapper.list()
      });
    });

    electronGamepadWrapper.on('disconnect', (gamepadIndex) => {
      console.log(`Main (${GAMEPAD_MODULE_ID}): Gamepad disconnected: Index ${gamepadIndex}`);
      // Clean up listeners for this gamepad
      Object.keys(activeRowListeners).forEach(rowId => {
        if (activeRowListeners[rowId].gamepadIndex === gamepadIndex) {
          // No direct unregister needed with this conceptual wrapper, just stop using it.
          // For a real library, you might unregister specific button listeners.
          delete activeRowListeners[rowId];
        }
      });
      deps.getMainWindow()?.webContents.send('gamepad:connection-change', {
        type: 'disconnected',
        gamepads: electronGamepadWrapper.list()
      });
    });

    ipcMain.handle('gamepad:get-gamepads', () => {
      return electronGamepadWrapper.list();
    });

    ipcMain.on('gamepad:start-button-capture-ipc', (_event, { gamepadIndex }: { gamepadIndex: number }) => {
      electronGamepadWrapper.startCapture(gamepadIndex, (captureData) => {
        deps.getMainWindow()?.webContents.send('gamepad:button-captured-ipc', captureData);
      });
    });
    
    ipcMain.on('gamepad:stop-button-capture-ipc', () => {
      electronGamepadWrapper.stopCapture();
    });

    // Initial row setup
    const storeInstance = deps.getStore();
    if (storeInstance) {
      const rows = storeInstance.get('rows');
      if (rows) {
        gamepadMainModule.onRowsUpdated?.(rows, deps);
      }
    }
    console.log(`Main (${GAMEPAD_MODULE_ID}): Initialized IPC listeners.`);
  },

  onRowsUpdated: (rows: Record<string, Row>, deps: MainModuleDeps) => {
    console.log(`Main (${GAMEPAD_MODULE_ID}): Rows updated.`);
    // Clear existing listeners by effectively emptying activeRowListeners for this module's logic
    // With the conceptual wrapper, we don't have explicit unregistration of button events,
    // so we'll just rebuild activeRowListeners.
    Object.keys(activeRowListeners).forEach(rowId => delete activeRowListeners[rowId]);

    Object.values(rows).forEach((row: Row) => {
      const config = row.input.data as Partial<GamepadInputData>;
      let isRowActive = row.enabled ?? true;
      if (deps.activeProfileInfo.includedRowIds !== null) {
        isRowActive = isRowActive && deps.activeProfileInfo.includedRowIds.includes(row.id);
      }

      if (
        row.inputModule === GAMEPAD_MODULE_ID &&
        isRowActive &&
        typeof config.gamepadIndex === 'number' &&
        typeof config.buttonId === 'number' // Assuming buttonId is the index for the conceptual library
      ) {
        console.log(`Main (${GAMEPAD_MODULE_ID}): Setting up listener for Row ${row.id}, Gamepad ${config.gamepadIndex}, Button ${config.buttonId}`);
        // This listener is conceptual. A real library would have a way to add/remove these.
        activeRowListeners[row.id] = {
          gamepadIndex: config.gamepadIndex,
          buttonId: config.buttonId as number,
          originalListener: (gpIdx, btnIdx, isPressed) => { // Listener that will be attached to the gamepad library event
            if (gpIdx === config.gamepadIndex && btnIdx === config.buttonId && isPressed) {
              // Check again if row is still active at the moment of event
              // This requires re-fetching or having up-to-date active state.
              // For simplicity, we assume the initial check was sufficient or state is passed.
              console.log(`Main (${GAMEPAD_MODULE_ID}): Gamepad event for Row ${row.id} - Triggering.`);
              deps.getMainWindow()?.webContents.send('trigger-row', { id: row.id });
            }
          }
        };
      }
    });
     // With the current conceptual wrapper, this just means activeRowListeners is up-to-date.
     // The actual 'button' event handler needs to check this map.
  },

  // This is where the global button handler logic using activeRowListeners would live
  // if not directly handled by the conceptual wrapper's 'on' method structure.
  // For this example, we'll make the 'button' event handler smarter.
  // Let's refine the conceptual wrapper's 'on' for 'button' or add a central dispatcher here.

  // For simplicity, the conceptual wrapper's 'emit' will call all 'button' listeners.
  // We need to adjust the 'button' event listener in initialize or add a new one.

  // Re-defining the 'button' listener for the conceptual wrapper to use activeRowListeners:
  // This needs to be setup once. Let's assume initialize clears old listeners and sets this one.
  // This is a bit tricky with the current conceptual wrapper structure.
  // A better conceptual wrapper would allow adding/removing specific button listeners.

  // Let's assume the wrapper's 'on' method itself handles multiple listeners correctly,
  // and onRowsUpdated just manages the 'activeRowListeners' data structure.
  // The actual triggering logic will be a single global handler that consults this map.
  // This part is a bit hand-wavy due to the conceptual library.

  // Add a central dispatcher if not handled by the library directly
  // This should be set up once in initialize.
  // electronGamepadWrapper.on('button', (gamepadIndex, buttonIndex, isPressed) => {
  //   Object.values(activeRowListeners).forEach(listenerInfo => {
  //     if (listenerInfo.gamepadIndex === gamepadIndex && listenerInfo.buttonId === buttonIndex && isPressed) {
  //       listenerInfo.originalListener(gamepadIndex, buttonIndex, isPressed);
  //     }
  //   });
  // });
  // The above should be part of initialize and cleared in cleanup. For now, the emit in _simulateButtonPress
  // will call all button listeners, and the listeners themselves (in activeRowListeners) will check conditions.

  cleanup: () => {
    console.log(`Main (${GAMEPAD_MODULE_ID}): Cleaning up.`);
    electronGamepadWrapper.shutdown();
    ipcMain.removeHandler('gamepad:get-gamepads');
    ipcMain.removeAllListeners('gamepad:start-button-capture-ipc');
    ipcMain.removeAllListeners('gamepad:stop-button-capture-ipc');
    Object.keys(activeRowListeners).forEach(rowId => delete activeRowListeners[rowId]);
  },
};

// This is a bit of a hack to make the conceptual library work with the onRowsUpdated logic.
// In a real scenario, the library would manage individual event listeners better.
// This single listener checks against the dynamically updated activeRowListeners.
electronGamepadWrapper.on('button', (gamepadIndex: number, buttonIndex: number, isPressed: boolean) => {
  if (!isPressed) return; // Only care about presses for now

  Object.values(activeRowListeners).forEach(listenerInfo => {
    if (listenerInfo.gamepadIndex === gamepadIndex && listenerInfo.buttonId === buttonIndex) {
      // The originalListener itself contains the full logic including sending 'trigger-row'
      // For this structure, we directly call what the originalListener would do.
      // This implies the originalListener was more of a placeholder for the actual action.
      // Let's simplify: when a button match happens, trigger the associated row.
      // The row's full ID is not directly here, we need to find it.
      for (const rowId in activeRowListeners) {
        if (activeRowListeners[rowId].gamepadIndex === gamepadIndex && activeRowListeners[rowId].buttonId === buttonIndex) {
           // This is a critical part: need access to 'deps' or main window here.
           // This global listener doesn't have 'deps'. This is a flaw in this simple conceptual design.
           // A better design would pass 'deps' to the event handler or make it accessible.
           // For now, we assume it can somehow send 'trigger-row'.
           // This highlights the complexity of managing dynamic listeners without proper library support.
           console.log(`Main (${GAMEPAD_MODULE_ID}): Gamepad event for Row (ID find needed) - Gamepad ${gamepadIndex}, Button ${buttonIndex}. Triggering.`);
           // This is where `getMainWindow().webContents.send('trigger-row', { id: rowId })` would go.
           // This is a structural problem with this simple conceptual wrapper.
           // The main window reference isn't available here.
           // The `initialize` function should store `deps.getMainWindow` if needed by global handlers.
           // Let's assume it's available via a global or a passed-in reference.
           // This part would need a proper solution in a real implementation.
           const mainWindow = (global as any).getMainWindowForGamepad?.(); // Fictitious global accessor
           if (mainWindow && mainWindow.webContents) {
             mainWindow.webContents.send('trigger-row', { id: rowId });
           } else {
             console.error(`Main (${GAMEPAD_MODULE_ID}): Main window not available to send trigger-row.`);
           }
           break; // Found and triggered the row
        }
      }
    }
  });
});
// Make getMainWindow available globally for the conceptual hack above
// THIS IS NOT PRODUCTION CODE - just for the conceptual wrapper to function in this subtask.
(global as any).getMainWindowForGamepad = null;
if (gamepadMainModule.initialize) {
    const originalInitialize = gamepadMainModule.initialize;
    gamepadMainModule.initialize = async (deps: MainModuleDeps) => {
        (global as any).getMainWindowForGamepad = deps.getMainWindow;
        await originalInitialize(deps);
    }
}


export default gamepadMainModule;
