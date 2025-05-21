// src/renderer/src/modules/Gamepad/Gamepad.tsx
import type { ModuleConfig, InputData, Row, OutputData } from '@shared/types';
import type { FC } from 'react';
import type { GamepadInputData } from './Gamepad.types';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Select, MenuItem, Button, FormControl, InputLabel, FormHelperText, CircularProgress, SelectChangeEvent } from '@mui/material';
import { isElectron } from '@/utils/isElectron';
import { useRowActivation } from '@/hooks/useRowActivation';

export const id = 'gamepad-module';

export const moduleConfig: ModuleConfig<any> = { // Using 'any' for custom config for now
  menuLabel: 'Gamepad',
  inputs: [
    {
      name: 'Button Press',
      icon: 'gamepad', // Assuming an icon mapping exists or will be added
      editable: true,
      supportedContexts: ['electron', 'web'],
    },
    // Potentially add 'Axis Movement' or 'Trigger Threshold' inputs later
  ],
  outputs: [
    // No outputs defined for this module initially
  ],
  config: {
    enabled: true,
    // any other global settings for the gamepad module could go here
  },
};

export const InputEdit: FC<{
  input: InputData;
  onChange: (data: Partial<GamepadInputData>) => void;
}> = ({ input, onChange }) => {
  const currentData = (input.data || {}) as Partial<GamepadInputData>;
  const [gamepadsInfo, setGamepadsInfo] = useState<{ id: string; index: number }[]>([]);
  const [selectedGamepadIndex, setSelectedGamepadIndex] = useState<number | undefined>(currentData.gamepadIndex);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureMessage, setCaptureMessage] = useState<string>('Select a gamepad and click "Record Button".');
  const initialButtonStates = useRef<boolean[]>([]);
  const animationFrameId = useRef<number | null>(null);

  const updateGamepadList = useCallback(async () => {
    if (isElectron()) {
      try {
        const electronGamepads = await window.electron.ipcRenderer.invoke('gamepad:get-gamepads');
        setGamepadsInfo(electronGamepads || []);
        if (selectedGamepadIndex !== undefined) {
          const selectedStillConnected = (electronGamepads || []).some((gp: { index: number }) => gp.index === selectedGamepadIndex);
          if (!selectedStillConnected) {
            setSelectedGamepadIndex(undefined);
            onChange({
              gamepadIndex: undefined,
              gamepadName: undefined,
              buttonId: undefined,
              buttonName: undefined,
            });
            setCaptureMessage("Previously selected gamepad (Electron) disconnected. Please select another.");
          }
        }
      } catch (error) {
        console.error("Error fetching gamepads via IPC:", error);
        setGamepadsInfo([]);
      }
    } else {
      // Web API logic
      const detectedGamepads = navigator.getGamepads().filter(gp => gp !== null) as Gamepad[];
      const newGamepadsInfo = detectedGamepads.map(gp => ({
        id: gp.id,
        index: gp.index,
      }));
      setGamepadsInfo(newGamepadsInfo);

      if (selectedGamepadIndex !== undefined) {
        const selectedStillConnected = newGamepadsInfo.some(gp => gp.index === selectedGamepadIndex);
      if (!selectedStillConnected) {
        setSelectedGamepadIndex(undefined);
        onChange({
          gamepadIndex: undefined,
          gamepadName: undefined,
          buttonId: undefined,
          buttonName: undefined,
        });
        setCaptureMessage("Previously selected gamepad (Web) disconnected. Please select another.");
      }
    }
  }, [selectedGamepadIndex, onChange]);

  useEffect(() => {
    if (isElectron()) {
      const handleConnectionChange = (_event: any, args: { gamepads: { id: string; index: number }[] }) => {
        console.log('[Gamepad Electron] Connection change event:', args);
        setGamepadsInfo(args.gamepads || []);
         // Check if selected gamepad is still connected
        if (selectedGamepadIndex !== undefined) {
            const selectedStillConnected = (args.gamepads || []).some(gp => gp.index === selectedGamepadIndex);
            if (!selectedStillConnected) {
                setSelectedGamepadIndex(undefined);
                onChange({
                    gamepadIndex: undefined,
                    gamepadName: undefined,
                    buttonId: undefined,
                    buttonName: undefined,
                });
                setCaptureMessage("Selected gamepad disconnected via IPC. Please select another.");
            }
        }
      };
      // Specific listener for IPC connection changes
      const ipcListener = (args: { gamepads: {id: string, index: number}[]}) => handleConnectionChange(null, args);
      window.electron.ipcRenderer.on('gamepad:connection-change', ipcListener);
      updateGamepadList(); // Initial fetch for Electron

      return () => {
        window.electron.ipcRenderer.removeListener('gamepad:connection-change', ipcListener);
      };
    } else {
      // Web API event listeners
      updateGamepadList(); // Initial scan for Web
      window.addEventListener('gamepadconnected', updateGamepadList);
      window.addEventListener('gamepaddisconnected', updateGamepadList);

      return () => {
        window.removeEventListener('gamepadconnected', updateGamepadList);
        window.removeEventListener('gamepaddisconnected', updateGamepadList);
        // No need to cancel animationFrameId here as it's related to capturing, not list updates
      };
    }
  }, [updateGamepadList, selectedGamepadIndex, onChange, isElectron()]); // Added isElectron() and other deps

  const pollGamepadForCapture = useCallback(() => {
    if (!isCapturing || selectedGamepadIndex === undefined || isElectron()) { // Ensure not in Electron
      setIsCapturing(false); // Stop if conditions change
      return;
    }

    const gamepad = navigator.getGamepads()[selectedGamepadIndex]; // Safe due to checks in pollGamepadForCapture
    if (!gamepad) { // Should ideally not happen if pollGamepadForCapture is well-guarded
      setCaptureMessage("Gamepad became unavailable during web capture.");
      setIsCapturing(false);
      return;
    }

    gamepad.buttons.forEach((button, buttonIndex) => {
      if (button.pressed && !initialButtonStates.current[buttonIndex]) {
        const gamepadName = gamepad.id || `Gamepad ${gamepad.index}`;
        const buttonName = `Button ${buttonIndex}`;
        onChange({
          gamepadIndex: selectedGamepadIndex,
          gamepadName: gamepadName,
          buttonId: buttonIndex,
          buttonName: buttonName,
        });
        setCaptureMessage(`Captured (Web): ${gamepadName.substring(0,20)}... - ${buttonName}`);
        setIsCapturing(false); // This will trigger cleanup in the capturing useEffect
        // No need to cancel animationFrameId here, the capturing useEffect's cleanup will handle it
        return; 
      }
    });

    // Continue polling only if still capturing (might have been set to false by button press)
    if (isCapturing) { 
      animationFrameId.current = requestAnimationFrame(pollGamepadForCapture);
    }
  }, [isCapturing, selectedGamepadIndex, onChange]); // isElectron() is implicitly handled by the calling useEffect

  useEffect(() => {
    let ipcButtonCapturedListener: ((_event: any, capturedData: GamepadInputData) => void) | null = null;

    if (isCapturing && selectedGamepadIndex !== undefined) {
      if (isElectron()) {
        ipcButtonCapturedListener = (_event: any, capturedData: GamepadInputData) => {
          onChange(capturedData);
          setCaptureMessage(`Captured (Electron): ${capturedData.gamepadName?.substring(0,20)}... - ${capturedData.buttonName}`);
          setIsCapturing(false); // This will trigger cleanup
        };

        window.electron.ipcRenderer.once('gamepad:button-captured-ipc', ipcButtonCapturedListener);
        window.electron.ipcRenderer.send('gamepad:start-button-capture-ipc', { gamepadIndex: selectedGamepadIndex });
        setCaptureMessage(`Press button on Gamepad ${selectedGamepadIndex} (Electron)...`);
      } else { // Web API path
        const gamepad = navigator.getGamepads()[selectedGamepadIndex];
        if (!gamepad) {
          setCaptureMessage("Error: Selected gamepad not found for capture (Web).");
          setIsCapturing(false);
          return; // Early exit, no cleanup needed for this path yet as polling hasn't started
        }
        initialButtonStates.current = gamepad.buttons.map(b => b.pressed);
        setCaptureMessage("Press a button on the selected gamepad (Web)...");
        animationFrameId.current = requestAnimationFrame(pollGamepadForCapture);
      }
    }

    // Cleanup function for this effect
    return () => {
      if (isElectron()) {
        // If capturing was active in Electron, tell main to stop
        if (isCapturing && selectedGamepadIndex !== undefined) { // Only send stop if we actually started
             window.electron.ipcRenderer.send('gamepad:stop-button-capture-ipc');
        }
        // Remove listener if it was attached
        if (ipcButtonCapturedListener) {
          window.electron.ipcRenderer.removeListener('gamepad:button-captured-ipc', ipcButtonCapturedListener);
        }
      } else {
        // Web: cancel animation frame if it's active
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
          animationFrameId.current = null;
        }
      }
    };
  }, [isCapturing, selectedGamepadIndex, pollGamepadForCapture, onChange]); // Added onChange

  const handleGamepadSelectChange = (event: SelectChangeEvent<number>) => {
    const newIndex = event.target.value as number;
    setSelectedGamepadIndex(newIndex);
    const selectedGp = gamepadsInfo.find(gp => gp.index === newIndex);
    onChange({
      gamepadIndex: newIndex,
      gamepadName: selectedGp ? selectedGp.id : undefined,
      buttonId: undefined, // Clear button selection when gamepad changes
      buttonName: undefined,
    });
    setCaptureMessage("Gamepad selected. Click 'Record Button' to capture.");
    if (isCapturing) { // If was capturing, stop it, which will trigger cleanup in the useEffect
        setIsCapturing(false);
    }
  };

  const handleRecordButtonClick = () => {
    if (selectedGamepadIndex !== undefined) {
      setIsCapturing(true);
      // Message will be set by the useEffect hook based on context
    }
  };

  return (
    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth disabled={isCapturing}>
        <InputLabel id="gamepad-select-label">Select Gamepad ({isElectron() ? 'Electron' : 'Web'})</InputLabel>
        <Select
          labelId="gamepad-select-label"
          value={selectedGamepadIndex !== undefined ? selectedGamepadIndex : ''}
          label="Select Gamepad"
          onChange={handleGamepadSelectChange}
        >
          {gamepadsInfo.length > 0 ? (
            gamepadsInfo.map(gp => (
              <MenuItem key={gp.index} value={gp.index}>
                {`Gamepad ${gp.index}: ${gp.id.substring(0, 30)}...`}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No gamepads connected</MenuItem>
          )}
        </Select>
      </FormControl>

      <Button
        variant="contained"
        onClick={handleRecordButtonClick}
        disabled={selectedGamepadIndex === undefined || isCapturing}
        startIcon={isCapturing ? <CircularProgress size={20} color="inherit" /> : null}
      >
        {isCapturing ? "Capturing..." : "Record Button"}
      </Button>

      <FormHelperText sx={{ textAlign: 'center', minHeight: '1.5em' }}>{captureMessage}</FormHelperText>

      <Box sx={{ border: '1px dashed grey', p: 1, borderRadius: 1 }}>
        <Typography variant="caption" display="block">Current Configuration:</Typography>
        <Typography variant="caption" display="block">Gamepad Index: {currentData.gamepadIndex ?? 'N/A'}</Typography>
        <Typography variant="caption" display="block">Gamepad Name: {currentData.gamepadName ? `${currentData.gamepadName.substring(0,30)}...` : 'N/A'}</Typography>
        <Typography variant="caption" display="block">Button ID: {currentData.buttonId ?? 'N/A'}</Typography>
        <Typography variant="caption" display="block">Button Name: {currentData.buttonName ?? 'N/A'}</Typography>
      </Box>
    </Box>
  );
};

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const displayData = (input.data || {}) as Partial<GamepadInputData>;
  let displayText = "Not configured";

  if (displayData.gamepadName && displayData.buttonName) {
    const gamepadDisplayName = displayData.gamepadName.length > 15 
      ? `${displayData.gamepadName.substring(0, 15)}...` 
      : displayData.gamepadName;
    displayText = `${gamepadDisplayName} - ${displayData.buttonName}`;
  } else if (displayData.gamepadName) {
     const gamepadDisplayName = displayData.gamepadName.length > 20
      ? `${displayData.gamepadName.substring(0, 20)}...`
      : displayData.gamepadName;
    displayText = `${gamepadDisplayName} - (No button)`;
  }


  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <Typography variant="body2" component="span" sx={{ fontWeight: 'medium', flexShrink: 0 }}>
        {input.name || 'Gamepad Button'}
      </Typography>
      <Typography 
        variant="caption" 
        component="span" 
        sx={{ 
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
          textAlign: 'left', // Ensure text aligns left when it's short
        }}
      >
        ({displayText})
      </Typography>
    </Box>
  );
};

// Placeholder for Output Edit/Display if we add outputs later
// export const OutputEdit: FC<...> = (...) => { ... };
// export const OutputDisplay: FC<...> = (...) => { ... };

export const useInputActions = (row: Row) => {
  const { id: rowId, input } = row;
  const { isActive } = useRowActivation(row);
  const config = input.data as Partial<GamepadInputData>;

  const prevButtonState = useRef<boolean>(false);
  const animationFrameId = useRef<number | null>(null);

  const pollGamepad = useCallback(() => {
    if (!isActive || isElectron() || typeof config.gamepadIndex !== 'number' || typeof config.buttonId !== 'number') {
      // Stop polling if not active, in Electron, or config is invalid
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      return;
    }

    const gamepads = navigator.getGamepads();
    if (config.gamepadIndex === undefined || config.gamepadIndex < 0 || config.gamepadIndex >= gamepads.length) {
      animationFrameId.current = requestAnimationFrame(pollGamepad); // Keep polling if gamepad temporarily disconnected
      return;
    }

    const gamepad = gamepads[config.gamepadIndex];
    if (!gamepad) {
      animationFrameId.current = requestAnimationFrame(pollGamepad); // Keep polling
      return;
    }

    if (config.buttonId === undefined || config.buttonId < 0 || config.buttonId >= gamepad.buttons.length) {
      animationFrameId.current = requestAnimationFrame(pollGamepad); // Keep polling if buttonId out of bounds (config error)
      return;
    }

    const button = gamepad.buttons[config.buttonId as number]; // Cast as number after check
    const currentButtonState = button.pressed;

    if (currentButtonState && !prevButtonState.current) {
      console.log(`[Gamepad Web] Button ${config.buttonId} on Gamepad ${config.gamepadIndex} pressed for row ${rowId}`);
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }));
    }

    prevButtonState.current = currentButtonState;
    animationFrameId.current = requestAnimationFrame(pollGamepad);
  }, [isActive, rowId, config.gamepadIndex, config.buttonId]); // Add all dependencies used in pollGamepad

  useEffect(() => {
    if (isActive && !isElectron() && typeof config.gamepadIndex === 'number' && typeof config.buttonId === 'number') {
      // Start polling when the hook is active, in web, and configured
      console.debug(`[Gamepad Web] Starting polling for row ${rowId}, Gamepad ${config.gamepadIndex} Button ${config.buttonId}`);
      prevButtonState.current = false; // Reset on start/config change
      animationFrameId.current = requestAnimationFrame(pollGamepad);
    } else {
      // Stop polling if not active or in Electron or not configured
      if (animationFrameId.current) {
        console.debug(`[Gamepad Web] Stopping polling for row ${rowId}`);
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      // Cleanup: stop polling when the component unmounts or dependencies change
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [isActive, config.gamepadIndex, config.buttonId, pollGamepad, rowId]); // pollGamepad is a dependency of useEffect

  // No specific logic for Electron context here, as main process handles it.
  // A console.debug could be added for clarity if needed.
  useEffect(() => {
     if (isElectron()) {
         // console.debug(`[Gamepad Electron] Row ${rowId}: Input actions managed by main process.`);
     }
  }, [rowId]);
};

export const useOutputActions = (row: Row) => {
  // No outputs for now
  console.debug(`[Gamepad] useOutputActions for row ${row.id} - No outputs defined`);
};

export const useGlobalActions = () => {
  // Global logic, e.g., listening for gamepad connect/disconnect if done in renderer for web.
  console.debug('[Gamepad] useGlobalActions - Placeholder');
};
