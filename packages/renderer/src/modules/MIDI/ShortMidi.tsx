import { useEffect, useState } from 'react'
import { Button, Stack, TextField } from '@mui/material'
import { useMidi } from './MIDI'
import { useStore } from '@/store/OLD/useStore'

const ShortMidi = ({
  edit = false,
  value = 'C1',
  onChange = () => {},
}: {
  edit?: boolean
  value: string
  onChange?: (value: string) => void
}) => {
  const [shortcut, setShortcut] = useState(value)
  // const edit = useMainStore((state) => state.edit)

  const [key, setKey] = useState('')
  const note = useMidi()
  const midi = useStore((state) => state.inputs.midi)

  useEffect(() => {
    if (note && midi) {
      setKey(note)
      setShortcut(note)
    } else {
      setKey('')
    }
  }, [note, midi])

  useEffect(() => {
    if (shortcut !== value && midi) {
      onChange(shortcut)
    }
  }, [shortcut, onChange, value, midi])

  return edit ? (
    <>
      <Stack
        direction={'row'}
        gap={2}
        style={{
          position: 'relative',
          flexGrow: 1,
          marginTop: '1rem',
        }}
      >
        <TextField
          label='Trigger'
          InputLabelProps={{ shrink: true }}
          value={''}
          style={{ width: '100%' }}
          // onKeyDown={(e) => {
          //   console.log('YES', e)
          // }}
          // onKeyUp={(e) => {
          //   console.log(e)
          // }}
        />
        <Stack
          direction={'row'}
          gap={2}
          style={{ position: 'absolute', left: 20, top: 15 }}
        >
          {shortcut.split('+').map((s: any, i: number) => (
            <Button
              style={{ pointerEvents: 'none' }}
              key={i}
              variant={key ? 'contained' : 'outlined'}
            >
              {s}
            </Button>
          ))}
        </Stack>
      </Stack>
    </>
  ) : (
    <Stack direction={'row'} gap={2}>
      {shortcut.split('+').map((s: any, i: number) => (
        <Button key={i} variant={key ? 'contained' : 'outlined'}>
          {s}
        </Button>
      ))}
    </Stack>
  )
}

export default ShortMidi
