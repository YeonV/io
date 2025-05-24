import type { ModuleConfig, InputData, Row, OutputData } from '@shared/types'
import { useCallback, useEffect, type FC } from 'react'
// import { log } from '@/utils'; // Using console now
import { Box, Typography, useMediaQuery } from '@mui/material'
import DisplayButtons from '@/components/Row/DisplayButtons'
import Shortkey from './Shortkey' // Your working Shortkey component
import { type KeyboardOutputData } from './Keyboard.types' // Assuming you created this
import { useHotkeys } from 'react-hotkeys-hook' // NEW IMPORT
import { isElectron } from '@/utils/isElectron' // NEW IMPORT
import { useRowActivation } from '@/hooks/useRowActivation' // For isActive check

// type KeyboardConfigExample = {}; // Not used, can remove

export const id = 'keyboard-module'

export const moduleConfig: ModuleConfig</* KeyboardConfigExample */ any> = {
  // Use any if no custom config
  menuLabel: 'Input Device',
  description: 'local/global keyboard shortcuts & key press simulation',
  inputs: [
    {
      name: 'Keyboard',
      icon: 'keyboard',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ],
  outputs: [
    {
      name: 'Press Keys',
      icon: 'keyboard',
      editable: true
    }
  ],
  config: {
    enabled: true
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: { value: string }) => void
}> = ({ input, onChange }) => {
  return (
    <Shortkey
      edit
      value={input.data.value || ''}
      onChange={(value) => {
        onChange({ value })
      }}
    />
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={{ ...input, name: input.name || 'Kbd Shortcut' }} />
      {desktop && <Shortkey value={input.data.value || ''} />}
    </Box>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Partial<KeyboardOutputData>) => void
}> = ({ output, onChange }) => {
  const currentData = output.data as Partial<KeyboardOutputData>
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="caption" color="textSecondary" gutterBottom>
        Keys to Press:
      </Typography>
      <Shortkey
        edit
        value={currentData.shortcut || ''}
        onChange={(shortcut) => {
          onChange({ shortcut })
        }}
      />
    </Box>
  )
}

export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  // const data = output.data as KeyboardOutputData; // Not used directly here
  const desktop = useMediaQuery('(min-width:980px)')
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons
        data={{ ...output, name: output.label || output.name || 'Press Keys' }}
        variant="text" // Assuming DisplayButtons handles this variant
      />
      {/* If you want to display the shortcut in OutputDisplay too: */}
      {desktop && <Shortkey value={(output.data as KeyboardOutputData).shortcut || ''} />}
    </Box>
  )
}

export const useInputActions = (row: Row) => {
  const { id: rowId, input } = row
  const shortcut = input.data.value as string | undefined
  const { isActive } = useRowActivation(row) // Check if the row should be active

  // For react-hotkeys-hook, format needs to be slightly different (e.g., "ctrl+alt+a")
  // Your Shortkey component already produces this format.
  // Electron's globalShortcut uses "Control+Alt+A". We need to ensure consistency or map.
  // Let's assume `shortcut` from `input.data.value` is in "ctrl+alt+a" format.

  const callback = useCallback(() => {
    if (isActive) {
      // Double check isActive within the callback
      console.log(`[Keyboard Web] Hotkey "${shortcut}" pressed for row ${rowId}`)
      window.dispatchEvent(new CustomEvent('io_input', { detail: rowId }))
    } else {
      console.debug(`[Keyboard Web] Hotkey "${shortcut}" pressed for INACTIVE row ${rowId}`)
    }
  }, [rowId, shortcut, isActive]) // isActive is important here

  // Register hotkey only in web environment and if active
  // `useHotkeys` needs to be called unconditionally, but its callback can be conditional.
  // Or, we can conditionally call useHotkeys. Let's try conditional call.

  if (!isElectron() && shortcut && shortcut.trim() !== '') {
    useHotkeys(
      shortcut,
      callback,
      {
        enabled: isActive, // Enable/disable based on isActive
        preventDefault: true, // Often good for app-like shortcuts
        enableOnFormTags: true // Or false, depending on if you want them in inputs
      },
      [isActive, callback] // Dependencies for the hotkey registration itself
    )
  }

  useEffect(() => {
    if (isElectron()) {
      // In Electron, main process handles global shortcuts and sends 'trigger-row' IPC.
      // Home.tsx listens for 'trigger-row' and dispatches 'io_input'.
      // So, this hook does nothing for Electron input side.
      // console.debug(`[Keyboard Electron] Row ${rowId}: Input actions managed by main process.`);
    } else if (shortcut && isActive) {
      console.debug(`[Keyboard Web] Row ${rowId}: Hotkey "${shortcut}" is active.`)
    } else if (shortcut && !isActive) {
      console.debug(`[Keyboard Web] Row ${rowId}: Hotkey "${shortcut}" is INACTIVE.`)
    }
    // No cleanup needed here for react-hotkeys-hook as it handles its own.
  }, [rowId, shortcut, isActive]) // Log when active status changes
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const outputData = row.output.data as KeyboardOutputData
    const shortcutToSend = outputData.shortcut

    if (!shortcutToSend) return

    const ioListener = (event: Event) => {
      // Changed to Event
      if (event instanceof CustomEvent && event.detail === row.id) {
        console.info(
          `[Keyboard Output] Row ${row.id} triggered. Sending shortcut: "${shortcutToSend}" to main process (if Electron).`
        )
        if (isElectron() && window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('keyboard-press-keys', {
            shortcut: shortcutToSend
          })
        } else if (!isElectron()) {
          console.warn(
            `[Keyboard Output Web] Cannot send global key press "${shortcutToSend}" in web mode. This output is Electron-only.`
          )
          // Here you could try to simulate key presses *within the current web page* if that's ever a use case,
          // but it won't affect other apps or OS media.
        } else {
          console.warn(`[Keyboard Output] ipcRenderer not available for row ${row.id}.`)
        }
      }
    }

    window.addEventListener('io_input', ioListener)
    return () => {
      window.removeEventListener('io_input', ioListener)
    }
  }, [row.id, row.output.data])
}

export const useGlobalActions = () => {
  // console.debug('[Keyboard] useGlobalActions');
  // No global actions needed for keyboard module in renderer usually.
}
