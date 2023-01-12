import Shortkey from '@/modules/Keyboard/Shortkey'
import { useStore } from '@/store/OLD/useStore'
import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Icon } from '@mui/material'
import Button from '@mui/material/Button'
import { FC, useEffect, useState } from 'react'
import { WebMidi } from 'webmidi'
import ShortMidi from './ShortMidi'
import ModuleButton from '@/components/ModuleButton'

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
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  // const note = useMidi()

  // useEffect(() => {
  //   onChange({ note })
  // }, [note])

  return (
    <>
      {/* <Button>{note}</Button> */}
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
  console.log(input)
  return (
    <>
      <ModuleButton data={input} />
      <Shortkey
        value={input.data.value}
        trigger={() => {
          console.log('SHORTKEY;')
        }}
      />
    </>
  )
}

export const useInputActions = (row: Row) => {
  const note = useMidi()
  useEffect(() => {
    if (note && note === row.input.data.value) {
      window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
    }
  }, [note])
}

export const useMidi = () => {
  const [shortcut, setShortcut] = useState('ctrl+alt+y')
  const midi = useStore((state) => state.inputs.midi)

  const [note, setNote] = useState(null as string | null)
  useEffect(() => {
    if (midi) {
      WebMidi.enable({ sysex: true })
        .then(() => console.log('WebMidi with sysex enabled!'))
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
                console.log('MIDI-ON', e, shortcut)

                setNote(e.note.identifier)
                setShortcut(e.note.identifier)
              }),
              myInput.addListener('noteoff', (e) => {
                console.log('MIDI-OFF', e, shortcut)

                setNote(null)
                setShortcut(e.note.identifier)
              }),
            ]
          return console.log(input.manufacturer, input.name)
        })

        // Outputs
        WebMidi.outputs.forEach((output) =>
          console.log(output.manufacturer, output.name)
        )
      }
    }
    return () => {
      if (midi) {
        WebMidi.enable({ sysex: true })
          .then(() => console.log('WebMidi with sysex enabled!'))
          .catch((err) => alert(err))

        WebMidi.enable()
          .then(onEnabled)
          .catch((err) => alert(err))

        function onEnabled() {
          WebMidi.inputs.forEach((input) => {
            const myInput = WebMidi.getInputByName(input.name)
            if (myInput)
              [
                myInput.removeListener('noteon'),
                myInput.removeListener('noteoff'),
              ]
            return console.log(input.manufacturer, input.name)
          })

          // Outputs
        }
      }
    }
  }, [midi])

  return note
}
