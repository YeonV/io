// src/renderer/src/modules/MIDI/ShortMidi.tsx

import { useEffect, useState } from 'react'
import { Stack, TextField, Typography } from '@mui/material'
import { log } from '@/utils'
import { useMainStore } from '@/store/mainStore'
import type { ModuleConfig } from '@shared/types'
import { MidiModuleCustomConfig } from './MidiM'

const ShortMidi = ({
  value = 'C4',
  onChange = () => {}
}: {
  value: string
  onChange?: (noteIdentifier: string) => void
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [capturedNote, setCapturedNote] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Get the MIDI module's runtime active state with correct typing
  const midiModuleConfigFromStore = useMainStore((state) => state.modules['midi-module']?.config)

  // Perform the type assertion
  const midiModuleSpecificConfig = midiModuleConfigFromStore as
    | ModuleConfig<MidiModuleCustomConfig>['config']
    | undefined

  const midiActive = midiModuleSpecificConfig?.midiActive ?? false

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  useEffect(() => {
    if (!midiActive) {
      setIsCapturing(false)
      setCapturedNote(null)
      return
    }

    setIsCapturing(true)
    log.info('ShortMidi: Edit mode active, listening for io_midi_event...')

    const midiCaptureListener = (event: CustomEvent) => {
      const detail = event.detail
      if (
        typeof detail === 'object' &&
        detail !== null &&
        detail.type === 'noteon' &&
        detail.noteIdentifier
      ) {
        log.info(`ShortMidi: Captured MIDI noteon - ${detail.noteIdentifier}`)
        setCapturedNote(detail.noteIdentifier)
        setDisplayValue(detail.noteIdentifier)
        onChange(detail.noteIdentifier)
      }
    }

    window.addEventListener('io_midi_event', midiCaptureListener as EventListener)

    return () => {
      log.info('ShortMidi: Cleaning up io_midi_event listener.')
      window.removeEventListener('io_midi_event', midiCaptureListener as EventListener)
      setIsCapturing(false)
    }
  }, [midiActive, onChange])

  return (
    <Stack
      direction="column"
      gap={1}
      style={{
        flexGrow: 1,
        marginTop: '1rem'
      }}
    >
      <Typography sx={{ color: !midiActive ? 'error.main' : 'text.secondary' }}>
        {midiActive
          ? isCapturing
            ? 'Press a MIDI key to set trigger...'
            : 'Captured MIDI Note'
          : 'MIDI Listening is Inactive.'}
      </Typography>
      <TextField
        value={capturedNote || displayValue || ''}
        slotProps={{
          input: {
            readOnly: true,
            style: { fontFamily: 'monospace' }
          }
        }}
        sx={{ width: '100%' }}
        disabled={!midiActive}
        variant="outlined"
      />
    </Stack>
  )
}

export default ShortMidi
