import type { ModuleConfig, InputData, Row } from '@shared/types'
import type { FC } from 'react'
import { useEffect } from 'react'
import { useMainStore } from '@/store/mainStore'
import { Sync } from '@mui/icons-material'
import {
  TextField,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  Typography,
  Button,
  Box
} from '@mui/material'
import IoIcon from '@/components/IoIcon/IoIcon'
import { debouncedTrigger } from '@/utils'

const ipcRenderer = window.electron?.ipcRenderer || false

// --- Module Config ---
export const id = 'alexa-module'
export const moduleConfig: ModuleConfig<{}> = {
  menuLabel: 'Input Device',
  inputs: [{ name: 'Alexa', icon: 'graphic_eq' }],
  outputs: [],
  config: { enabled: !!ipcRenderer }
}

// --- InputEdit Component ---
export const InputEdit: FC<{
  input: InputData
  onChange: (data: { value: string; separateOffAction: boolean }) => void
}> = ({ input, onChange }) => {
  const deviceName = input.data.value ?? ''
  const separateOffAction = input.data.separateOffAction ?? false

  const handleDeviceNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ value: event.target.value, separateOffAction })
  }

  const handleSeparateActionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ value: deviceName, separateOffAction: event.target.checked })
  }

  return (
    <>
      <TextField
        fullWidth
        label="Alexa Device Name"
        value={deviceName}
        onChange={handleDeviceNameChange}
        sx={{ mt: '4px' }}
        variant="outlined"
        slotProps={{
          htmlInput: { style: { paddingLeft: '20px' } }
        }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={separateOffAction}
            onChange={handleSeparateActionChange}
            name="separateOffAction"
          />
        }
        label='Configure separate action for "Off" command'
        sx={{
          mt: 1,
          width: '100%',
          justifyContent: 'flex-start',
          marginLeft: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: '0.875rem'
          }
        }}
      />
    </>
  )
}

// --- InputDisplay Component ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  const deviceName = input.data.value ?? 'No Name'
  const moduleName = input.name
  const iconName = input.icon
  const triggerState = input.data.triggerState

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      {/* Button 1 (Module or Device Name) */}
      <Button
        size="small"
        disabled
        variant="outlined"
        sx={{ fontSize: 10, minWidth: '45px', justifyContent: 'flex-start', flexShrink: 0 }}
        startIcon={<IoIcon name={iconName} />}
      >
        {desktop ? moduleName : deviceName}
      </Button>
      {/* State Indicator - styled as a button */}
      {triggerState && triggerState !== 'any' && (
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          disabled
          sx={{
            fontSize: 12,
            flexShrink: 0,
            marginLeft: 0
          }}
        >
          {triggerState}
        </Button>
      )}

      {/* Device Name (Desktop Only) */}
      {desktop && (
        <Button
          size="small"
          color="inherit"
          variant="outlined"
          disabled
          sx={{
            fontSize: 12,
            textTransform: 'unset',
            flexGrow: 1,
            justifyContent: 'flex-start',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {deviceName}
        </Button>
      )}
    </Box>
  )
}

// --- useInputActions Hook ---
// This hook is called PER ROW.
export const useInputActions = (row: Row) => {
  console.log(`useInputActions called for Alexa row ${row.id}, but listener is handled globally.`)
}

// --- useGlobalActions Hook ---
export const useGlobalActions = () => {
  useEffect(() => {
    console.log('Alexa useGlobalActions: Setting up emulation.')
    if (ipcRenderer) {
      const allRows = useMainStore.getState().rows
      const alexaDeviceNames = Object.values(allRows)
        .filter((r) => r.inputModule === id)
        .map((r) => r.input.data.value)
        .filter((name, index, self) => name && self.indexOf(name) === index)

      if (alexaDeviceNames.length > 0) {
        console.log('Emulating Alexa devices:', alexaDeviceNames)
        try {
          ipcRenderer.send('emulate-alexa-devices', alexaDeviceNames)
        } catch (error) {
          console.error('Error sending emulate-alexa-devices sync:', error)
        }
      } else {
        console.log('No Alexa devices configured for emulation.')
      }

      const handleAlexaDeviceEvent = (
        _event: any,
        data: { device: string; state: 'on' | 'off' }
      ) => {
        console.log(`Alexa event received: ${data.device} -> ${data.state}`)
        const currentRows = useMainStore.getState().rows

        const targetRow = Object.values(currentRows).find(
          (row) =>
            row.inputModule === id &&
            row.input.data.value === data.device &&
            (row.input.data.triggerState === data.state || row.input.data.triggerState === 'any')
        )

        if (targetRow) {
          console.log(`Match found! Triggering row: ${targetRow.id}`)
          debouncedTrigger(targetRow.id)
        } else {
          console.log(`No matching row found for ${data.device} (${data.state})`)
        }
      }

      ipcRenderer.on('alexa-device', handleAlexaDeviceEvent)
      console.log("Alexa 'alexa-device' IPC listener attached.")

      return () => {
        console.log('Cleaning up Alexa useGlobalActions: Removing listener.')
        if (ipcRenderer) {
          ipcRenderer.removeListener('alexa-device', handleAlexaDeviceEvent)
        }
      }
    } else {
      console.warn('IPC Renderer not available for Alexa module.')
      return () => {
        // No cleanup needed when ipcRenderer is not available
      }
    }
  }, [])

  return null
}

// --- Settings Component ---
export const Settings = () => {
  return localStorage.getItem('io-restart-needed') === 'yes' ? (
    <ToggleButton
      size="large"
      value="restart"
      sx={{ '& .MuiSvgIcon-root': { fontSize: 50 } }}
      selected={localStorage.getItem('io-restart-needed') === 'yes'}
      onChange={() => {
        ipcRenderer?.sendSync('restart-app')
        localStorage.setItem('io-restart-needed', 'no')
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 90,
          height: 90,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" color={'#999'}>
          Restart
        </Typography>
        <Sync />
        <Typography variant="caption" color={'#999'}>
          Sync Alexa
        </Typography>
      </div>
    </ToggleButton>
  ) : (
    <></>
  )
}
