import { useEffect, useState } from 'react'
import { Button, Input, MenuItem, Select, Stack } from '@mui/material'
import { useHotkeys } from 'react-hotkeys-hook'
import { Keyboard, Piano } from '@mui/icons-material'
import { useStore } from '@/store/OLD/useStore'
import { useMidi } from './MIDI'

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

  const [key, setKey] = useState('')
  const note = useMidi()

  useEffect(() => {
    if (note) {
      setKey(note)
      setShortcut(note)
    } else {
      setKey('')
    }
  }, [note])

  useEffect(() => {
    if (shortcut !== value) {
      onChange(shortcut)
    }
  }, [shortcut, onChange, value])

  return edit ? (
    <>
      <Stack
        direction={'row'}
        gap={2}
        style={{
          position: 'relative',
          flexGrow: 1,
          marginTop: '20px',
          marginRight: '10px',
        }}
      >
        <Input
          value={''}
          style={{ width: '100%', height: 46 }}
          onKeyDown={(e) => {
            console.log('YES', e)
          }}
          onKeyUp={(e) => {
            console.log(e)
          }}
        />
        <Stack
          direction={'row'}
          gap={2}
          style={{ position: 'absolute', left: 0, top: -7 }}
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
