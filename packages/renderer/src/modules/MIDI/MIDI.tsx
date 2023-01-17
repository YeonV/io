import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import type { FC } from 'react'
import { useStore } from '@/store/OLD/useStore'
import { log } from '@/utils'
import { useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'
import { WebMidi } from 'webmidi'
import { Piano, PianoOff } from '@mui/icons-material'
import Shortkey from '@/modules/Keyboard/Shortkey'
import ShortMidi from './ShortMidi'
import DisplayButtons from '@/components/DisplayButtons'
import ToggleSettings from '@/components/ToggleSettings'

type MidiConfigExample = {}

export const id = 'midi-module'

export const moduleConfig: ModuleConfig<MidiConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Midi',
      icon: 'piano',
    },
  ],
  outputs: [],
  config: {
    enabled: true,
  },
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <>
      <ShortMidi
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

export const useInputActions = (row: Row) => {
  const note = useMidi()
  useEffect(() => {
    log.info('per-row midi', row)
    if (note && note === row.input.data.value) {
      window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
    }
  }, [note])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'midi')
}

export const useMidi = () => {
  const [shortcut, setShortcut] = useState('ctrl+alt+y')
  const midi = useStore((state) => state.inputs.midi)

  const [note, setNote] = useState(null as string | null)
  useEffect(() => {
    if (midi) {
      WebMidi.enable({ sysex: true })
        .then(() => log.success('WebMidi with sysex enabled!'))
        .catch((err) => alert(err))

      WebMidi.enable()
        .then(onEnabled)
        .catch((err) => alert(err))

      function onEnabled() {
        WebMidi.inputs.forEach((input) => {
          const myInput = WebMidi.getInputByName(input.name)
          if (myInput)
            [
              myInput.addListener('noteon', (e) => {
                log.success1('MIDI-ON', e, shortcut)

                setNote(e.note.identifier)
                setShortcut(e.note.identifier)
              }),
              myInput.addListener('noteoff', (e) => {
                log.success2('MIDI-OFF', e, shortcut)

                setNote(null)
                setShortcut(e.note.identifier)
              }),
            ]
          return log.success3(input.manufacturer, input.name)
        })

        // Outputs
        WebMidi.outputs.forEach((output) =>
          log.success3(output.manufacturer, output.name)
        )
      }
    } else {
      WebMidi.disable()
    }
    return () => {
      if (midi) {
        WebMidi.disable().then(() =>
          log.success('WebMidi with sysex disabled!')
        )
      }
    }
  }, [midi])

  return note
}

export const Settings = () => {
  return (
    <>
      <ToggleSettings
        name='midi'
        iconOn={<Piano />}
        iconOff={<PianoOff color='disabled' />}
      />
    </>
  )
}
