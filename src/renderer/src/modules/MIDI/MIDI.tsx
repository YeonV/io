// src/renderer/src/modules/MIDI/MIDI.tsx

import type { ModuleConfig, InputData, Row } from '@shared/types'
import type { FC } from 'react'
import { log } from '@/utils'
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  Switch,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Input, NoteMessageEvent, WebMidi, Input as WebMidiInput } from 'webmidi'
import ShortMidi from './ShortMidi'
import DisplayButtons from '@/components/Row/DisplayButtons'
import { useMainStore } from '@/store/mainStore'
import { Piano, PianoOff } from '@mui/icons-material'
import { useRowActivation } from '@/hooks/useRowActivation'

// --- Define the custom part of the config for THIS module ---
export interface MidiModuleCustomConfig {
  selectedInputId?: string
  midiActive: boolean
}

// --- Module ID and Configuration ---
export const id = 'midi-module'

export const moduleConfig: ModuleConfig<MidiModuleCustomConfig> = {
  menuLabel: 'Input Device',
  inputs: [{ name: 'MIDI Note', icon: 'piano' }], // Changed name for clarity
  outputs: [],
  config: {
    enabled: true, // This module is available in dropdowns by default
    selectedInputId: undefined,
    midiActive: false
  }
}

// --- InputEdit: UI for configuring a MIDI input row ---
export const InputEdit: FC<{
  input: InputData
  onChange: (data: { value: string }) => void // ShortMidi should just return the note string
}> = ({ input, onChange }) => {
  const midiModuleConfigFromStore = useMainStore((state) => state.modules[id]?.config)
  const midiModuleSpecificConfig = midiModuleConfigFromStore as
    | ModuleConfig<MidiModuleCustomConfig>['config']
    | undefined
  const midiActive = midiModuleSpecificConfig?.midiActive ?? false

  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const handleToggleMidiActive = () => {
    if (midiModuleSpecificConfig) {
      setModuleConfig(id, 'midiActive', !midiModuleSpecificConfig.midiActive)
      log.info(`MIDI active toggled to: ${!midiModuleSpecificConfig.midiActive} from InputEdit`)
    } else {
      log.error('MIDI InputEdit: Cannot toggle midiActive, module config not found.')
    }
  }

  return (
    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction={'row'} alignItems={'flex-end'} gap={1}>
        <ShortMidi
          value={input.data.value}
          onChange={(noteIdentifier) => {
            onChange({ value: noteIdentifier })
          }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleToggleMidiActive}
          sx={{ minWidth: '40px', height: '56px' }}
        >
          {midiActive ? <PianoOff /> : <Piano color="error" />}
        </Button>
      </Stack>
    </Box>
  )
}

// --- InputDisplay: UI for showing configured MIDI input in a row ---
export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
      <DisplayButtons data={input} /> {/* Shows module icon + "MIDI Note" */}
      <Typography variant="body2" sx={{ color: '#888', fontStyle: 'italic' }}>
        {input.data.value || 'Any Note'} {/* Display the configured note like "C4" */}
      </Typography>
    </Box>
  )
}

// --- useGlobalActions: Central MIDI Logic (WebMidi initialization & event dispatching) ---
export const useGlobalActions = () => {
  const midiModuleConfigFromStore = useMainStore((state) => state.modules[id]?.config)

  const midiModuleSpecificConfig = midiModuleConfigFromStore as
    | ModuleConfig<MidiModuleCustomConfig>['config']
    | undefined

  const moduleEnabled = midiModuleSpecificConfig?.enabled
  const midiActive = midiModuleSpecificConfig?.midiActive
  const selectedInputDeviceId = midiModuleSpecificConfig?.selectedInputId

  // const { isActive } = useRowActivation(row)
  useEffect(() => {
    if (!moduleEnabled || !midiActive) {
      log.info(
        'MIDI: Global actions - Module disabled or MIDI not active. Ensuring WebMidi is off.'
      )
      if (WebMidi.enabled) {
        WebMidi.inputs.forEach((input) => {
          input.removeListener('noteon')
          input.removeListener('noteoff')
        })
        WebMidi.disable().then(() => log.info('MIDI: WebMidi disabled by useGlobalActions.'))
      }
      return
    }

    log.info('MIDI: Global actions - Initializing WebMidi...')
    WebMidi.enable({ sysex: false })
      .then(() => {
        log.success('MIDI: WebMidi enabled globally!')

        const onNoteEvent = (event: NoteMessageEvent) => {
          log.info1(
            `MIDI Event from ${(event.target as Input).name}: ${event.type} - ${event.note.identifier}, Vel: ${event.note.attack}`
          )
          window.dispatchEvent(
            new CustomEvent('io_midi_event', {
              detail: {
                type: event.type,
                noteIdentifier: event.note.identifier,
                noteNumber: event.note.number,
                velocity: event.note.attack,
                channel: event.message.channel,
                deviceId: (event.target as Input).id,
                deviceName: (event.target as Input).name
              }
            })
          )
        }

        WebMidi.inputs.forEach((input) => {
          input.removeListener('noteon')
          input.removeListener('noteoff')
        })

        const attachListenersToInput = (input: WebMidiInput) => {
          log.info(`MIDI: Attaching listeners to ${input.name} (ID: ${input.id})`)
          input.addListener('noteon', onNoteEvent)
          input.addListener('noteoff', onNoteEvent)
        }

        if (selectedInputDeviceId) {
          const selectedInput = WebMidi.getInputById(selectedInputDeviceId)
          if (selectedInput) {
            attachListenersToInput(selectedInput)
          } else {
            log.info1(
              `MIDI: Selected input ID ${selectedInputDeviceId} not found. Listening to all.`
            )
            WebMidi.inputs.forEach(attachListenersToInput)
          }
        } else {
          log.info('MIDI: No specific input selected, listening to all available inputs.')
          WebMidi.inputs.forEach(attachListenersToInput)
        }
      })
      .catch((err) => log.error('MIDI: Error enabling WebMidi globally:', err))

    return () => {
      log.info('MIDI: Cleaning up global actions. Removing listeners.')
      if (WebMidi.enabled) {
        // Only try to remove if it might have been enabled
        WebMidi.inputs.forEach((input) => {
          input.removeListener('noteon')
          input.removeListener('noteoff')
        })
      }
    }
  }, [moduleEnabled, midiActive, selectedInputDeviceId])

  return null
}

// --- Settings: UI for enabling/disabling MIDI listening and selecting input device ---
export const Settings: FC = () => {
  const midiModuleConfigFromStore = useMainStore((state) => state.modules[id]?.config)

  const midiModuleConfig = midiModuleConfigFromStore as
    | ModuleConfig<MidiModuleCustomConfig>['config']
    | undefined

  const midiActive = midiModuleConfig?.midiActive ?? false
  const selectedInputId = midiModuleConfig?.selectedInputId

  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const [availableInputs, setAvailableInputs] = useState<WebMidiInput[]>([])

  useEffect(() => {
    if (midiActive) {
      const initAndFetchInputs = () => {
        if (!WebMidi.enabled) {
          WebMidi.enable({ sysex: false })
            .then(() => {
              log.info('MIDI Settings: WebMidi enabled for fetching inputs.')
              setAvailableInputs(WebMidi.inputs)
            })
            .catch((err) => log.error('MIDI Settings: WebMidi enable failed', err))
        } else {
          setAvailableInputs(WebMidi.inputs)
        }
      }
      initAndFetchInputs()
      const onConnected = () => setTimeout(() => setAvailableInputs(WebMidi.inputs), 100)
      const onDisconnected = () => setTimeout(() => setAvailableInputs(WebMidi.inputs), 100)
      WebMidi.addListener('connected', onConnected)
      WebMidi.addListener('disconnected', onDisconnected)
      return () => {
        WebMidi.removeListener('connected', onConnected)
        WebMidi.removeListener('disconnected', onDisconnected)
      }
    } else {
      setAvailableInputs([])
    }
  }, [midiActive])

  const handleToggleMidiActive = () => {
    if (midiModuleConfig) {
      setModuleConfig(id, 'midiActive', !midiModuleConfig.midiActive)
    }
  }

  const handleDeviceSelectChange = (event: SelectChangeEvent<string>) => {
    const deviceId = event.target.value as string
    setModuleConfig(id, 'selectedInputId', deviceId === '' ? undefined : deviceId)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 1,
        p: 1,
        border: '1px solid #555',
        borderRadius: 1,
        minWidth: 200
      }}
    >
      <Typography variant="overline">MIDI Input</Typography>
      <FormControlLabel
        control={<Switch checked={midiActive} onChange={handleToggleMidiActive} size="small" />}
        label={midiActive ? 'Listening Active' : 'Listening Inactive'}
      />

      {midiActive && (
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <InputLabel id={`midi-input-select-label-${id}`}>Device</InputLabel>
          <Select
            labelId={`midi-input-select-label-${id}`}
            value={selectedInputId || ''}
            label="Device"
            onChange={handleDeviceSelectChange}
          >
            <MenuItem value="">
              <em>All Devices</em>
            </MenuItem>
            {availableInputs.map((inputDevice) => (
              <MenuItem key={inputDevice.id} value={inputDevice.id}>
                {inputDevice.name} {inputDevice.manufacturer ? `(${inputDevice.manufacturer})` : ''}
              </MenuItem>
            ))}
          </Select>
          {availableInputs.length === 0 && <FormHelperText>No MIDI inputs found.</FormHelperText>}
        </FormControl>
      )}
    </Box>
  )
}

// --- useInputActions: Reacts to the global 'io_midi_event' ---
export const useInputActions = (row: Row) => {
  const { isActive, inactiveReason } = useRowActivation(row)
  useEffect(() => {
    if (!isActive) {
      log.info(`Row ${row.id} actions not running. Reason: ${inactiveReason}.`)
      return () => {} // Return empty cleanup if disabled from the start
    }
    const midiEventListener = (event: CustomEvent) => {
      const detail = event.detail
      if (typeof detail !== 'object' || detail === null || !detail.noteIdentifier) {
        return
      }
      if (detail.type === 'noteon') {
        if (detail.noteIdentifier === row.input.data.value) {
          log.info(`MIDI Row ${row.id}: Matched note ${detail.noteIdentifier}. Triggering action.`)
          window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
        }
      }
    }

    log.info2(
      `MIDI Row ${row.id}: Attaching 'io_midi_event' listener for note ${row.input.data.value}`
    )
    window.addEventListener('io_midi_event', midiEventListener as EventListener)

    return () => {
      log.info2(`MIDI Row ${row.id}: Removing 'io_midi_event' listener.`)
      window.removeEventListener('io_midi_event', midiEventListener as EventListener)
    }
  }, [row.id, row.input.data.value])
}
