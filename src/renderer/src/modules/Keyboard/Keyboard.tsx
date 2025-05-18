import type { ModuleConfig, InputData, Row, OutputData } from '@shared/types'
import { useEffect, type FC } from 'react'
import { log } from '@/utils'
import { Box, Typography, useMediaQuery } from '@mui/material'
import DisplayButtons from '@/components/Row/DisplayButtons'
import Shortkey from '@/modules/Keyboard/Shortkey'
import { KeyboardOutputData } from './Keyboard.types'

type KeyboardConfigExample = {}

export const id = 'keyboard-module'

export const moduleConfig: ModuleConfig<KeyboardConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Keyboard',
      icon: 'keyboard'
    }
  ],
  outputs: [
    {
      name: 'Keyboard',
      icon: 'keyboard'
    }
  ],
  config: {
    enabled: true
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <>
      <Shortkey
        value={input.data.value}
        onChange={(value) => {
          onChange({ value })
        }}
        edit
      />
    </>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  return (
    <>
      <DisplayButtons data={input} />
      {desktop && <Shortkey value={input.data.value} />}
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Partial<KeyboardOutputData>) => void
}> = ({ output, onChange }) => {
  const currentData = output.data as Partial<KeyboardOutputData>
  return (
    <Box sx={{ mt: 1 }}>
      {' '}
      {/* Added margin top for spacing */}
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
      {/* 
        Later, you could add a dropdown here for special keys:
        <Select value={currentData.specialKey || ''} onChange={...}>
          <MenuItem value="MediaPlayPause">Play/Pause</MenuItem>
          <MenuItem value="MediaNextTrack">Next Track</MenuItem>
          ...
        </Select>
        And then the Shortkey component could be disabled if a specialKey is selected,
        or Shortkey could be one mode and "Special Key" another via tabs/radio.
      */}
    </Box>
  )
}

export const OutputDisplay: FC<{ output: OutputData }> = ({ output }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons
        data={{ ...output, name: output.label || output.name || 'Press Keys' }}
        variant="text"
      />
    </Box>
  )
}

export const useInputActions = (row: Row) => {
  log.info('per-row keyboard', row)
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const outputData = row.output.data as KeyboardOutputData
    const shortcutToSend = outputData.shortcut

    if (!shortcutToSend) return // Nothing to send

    const ioListener = (event: CustomEvent) => {
      if (event.detail === row.id) {
        // This row's input was triggered
        console.info(
          `Keyboard Output: Row ${row.id} triggered. Sending shortcut: "${shortcutToSend}" to main process.`
        )
        if (window.electron?.ipcRenderer) {
          window.electron.ipcRenderer.send('keyboard-press-keys', {
            shortcut: shortcutToSend
            // Potentially add other options here if needed (e.g., modifiers, key up/down)
          })
        } else {
          console.warn(`Keyboard Output: ipcRenderer not available for row ${row.id}.`)
        }
      }
    }

    window.addEventListener('io_input', ioListener as EventListener)
    return () => {
      window.removeEventListener('io_input', ioListener as EventListener)
    }
  }, [row.id, row.output.data]) // Re-run if row.id or shortcut changes
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'keyboard')
}
