import DisplayButtons from '@/components/Row/DisplayButtons'
import { useMainStore } from '@/store/mainStore'
import { Sync } from '@mui/icons-material'
import {
  TextField,
  useMediaQuery,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  Typography
} from '@mui/material'
import type { ModuleConfig, InputData } from '@shared/types'
// import type { ModuleConfig, InputData, Row } from '@shared/types'
// REMOVE: import { useMainStore } from '@/store/mainStore'; // Not needed here directly anymore
import type { FC } from 'react'
import { useEffect } from 'react'
import Shortkey from '../Keyboard/Shortkey'
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
  // Need onChange to update BOTH deviceName and the new separateOffAction flag
  onChange: (data: { value: string; separateOffAction: boolean }) => void
}> = ({ input, onChange }) => {
  // Extract current values from input.data, providing defaults
  const deviceName = input.data.value ?? '' // Assuming 'value' holds the device name
  const separateOffAction = input.data.separateOffAction ?? false // Default to false

  const handleDeviceNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ value: event.target.value, separateOffAction }) // Keep separateOffAction state
  }

  const handleSeparateActionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ value: deviceName, separateOffAction: event.target.checked }) // Keep deviceName state
  }

  return (
    <>
      <TextField
        fullWidth
        label="Alexa Device Name" // More specific label
        value={deviceName}
        onChange={handleDeviceNameChange}
        sx={{ mt: 2 }}
        inputProps={{ style: { paddingLeft: '20px' } }}
        variant="outlined"
        // Add helper text?
        helperText="The exact name Alexa recognizes (case-sensitive)."
      />
      {/* Add the new Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={separateOffAction}
            onChange={handleSeparateActionChange}
            name="separateOffAction"
          />
        }
        label='Configure separate action for "Off" command'
        sx={{ mt: 1, display: 'block' }} // Make it block for alignment
      />
    </>
  )
}

// --- InputDisplay Component ---
// Might need update if we store data differently later, but okay for now
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  // Display the device name from input.data.value
  const displayValue = input.data.value ?? 'No Name'
  return (
    <>
      {/* Pass data down - DisplayButtons needs to know what to show */}
      <DisplayButtons data={{ ...input, name: input.data.value || input.name }} />
      {/* Maybe show (On/Off specific) if data.triggerState exists? */}
      {input.data.triggerState && (
        <Typography variant="caption" sx={{ ml: 1, fontStyle: 'italic' }}>
          ({input.data.triggerState})
        </Typography>
      )}
      {/* Remove Shortkey display here? It doesn't make sense for Alexa */}
      {desktop && <Shortkey value={displayValue} />}
    </>
  )
}

// --- useInputActions Hook ---
// This hook is called PER ROW. It's NOT suitable for the central listener.
// The central listener needs to know about ALL Alexa rows.
// We will implement the central listener logic elsewhere (likely Home.tsx initially).
// This hook might not be needed at all for Alexa anymore, or could potentially
// be used for row-specific cleanup if necessary. Let's comment it out for now.

// export const useInputActions = (row: Row) => {
//   useEffect(() => {
//     // We move the listener logic out of here
//     // The listener needs to map incoming IPC events to row IDs
//     // based on deviceName and triggerState, which this hook scope doesn't easily have access to.
//     console.log(`useInputActions called for Alexa row ${row.id}, but listener is handled globally.`)
//     return () => {
//       // Cleanup if needed
//     }
//   }, []) // Empty dependency array, runs once per row mount
// }

// --- useGlobalActions Hook ---
// This is where we initialize the connection/emulation with the main process.
// It might ALSO be where we put the central listener, as it runs once per module activation.
export const useGlobalActions = () => {
  // Get Zustand functions directly if needed, or rely on listeners in Home.tsx
  // const rows = useMainStore((state) => state.rows); // Avoid direct reads in hooks if possible

  useEffect(() => {
    console.log('Alexa useGlobalActions: Setting up emulation.')
    if (ipcRenderer) {
      // This part is still needed to tell the main process WHICH devices to emulate
      // BUT we need to get the list of device names from the store here.
      // This is tricky because Zustand hooks shouldn't be called conditionally/in effects directly.
      // Option 1: Trigger IPC from Home.tsx where rows state is available.
      // Option 2: Use useMainStore.getState() here (less reactive, but simpler for setup)

      // Using getState() for simplicity during setup:
      const allRows = useMainStore.getState().rows
      const alexaDeviceNames = Object.values(allRows)
        .filter((r) => r.inputModule === id) // Filter for Alexa rows
        .map((r) => r.input.data.value) // Get the deviceName (stored in 'value')
        .filter((name, index, self) => name && self.indexOf(name) === index) // Unique, non-empty names

      if (alexaDeviceNames.length > 0) {
        console.log('Emulating Alexa devices:', alexaDeviceNames)
        // SendSync might be okay for setup, but consider async if it blocks
        try {
          ipcRenderer.sendSync('emulate-alexa-devices', alexaDeviceNames)
        } catch (error) {
          console.error('Error sending emulate-alexa-devices sync:', error)
        }
      } else {
        console.log('No Alexa devices configured for emulation.')
      }

      // SETUP THE CENTRAL LISTENER: This hook is a good place for the IPC listener
      const handleAlexaDeviceEvent = (
        _event: any,
        data: { device: string; state: 'on' | 'off' }
      ) => {
        console.log(`Alexa event received: ${data.device} -> ${data.state}`)
        const currentRows = useMainStore.getState().rows // Get latest rows

        // Find the matching row based on deviceName and triggerState
        const targetRow = Object.values(currentRows).find(
          (row) =>
            row.inputModule === id && // Is an Alexa row
            row.input.data.value === data.device && // Matches device name
            (row.input.data.triggerState === data.state || // Matches specific state OR
              row.input.data.triggerState === 'any') // Matches if configured for 'any' state
        )

        if (targetRow) {
          console.log(`Match found! Triggering row: ${targetRow.id}`)
          // Dispatch the standard io_input event with the target row's ID
          window.dispatchEvent(new CustomEvent('io_input', { detail: targetRow.id }))
        } else {
          console.log(`No matching row found for ${data.device} (${data.state})`)
        }
      }

      ipcRenderer.on('alexa-device', handleAlexaDeviceEvent)
      console.log("Alexa 'alexa-device' IPC listener attached.")

      // Cleanup function
      return () => {
        console.log('Cleaning up Alexa useGlobalActions: Removing listener.')
        if (ipcRenderer) {
          ipcRenderer.removeListener('alexa-device', handleAlexaDeviceEvent)
        }
        // Potentially tell main process to STOP emulating devices? Needs IPC handler.
        // ipcRenderer.send('stop-emulating-alexa-devices', alexaDeviceNames);
      }
    } else {
      console.warn('IPC Renderer not available for Alexa module.')
    }
  }, [])

  return null // Or return undefined, hook doesn't need to render anything
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
