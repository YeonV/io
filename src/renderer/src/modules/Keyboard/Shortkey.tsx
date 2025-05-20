import { useState } from 'react'
import { Button, Stack, TextField, Typography } from '@mui/material'

const mapCodeToKeyName = (code: string): string | null => {
  if (code.startsWith('Key')) return code.substring(3).toLowerCase() // KeyQ -> q
  if (code.startsWith('Digit')) return code.substring(5) // Digit2 -> 2
  if (code.startsWith('Numpad')) return `numpad_${code.substring(6).toLowerCase()}` // Numpad2 -> numpad_2

  // Add more mappings as needed based on https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values
  // and what robotjs expects for non-alphanumeric keys
  switch (code) {
    case 'Backquote':
      return '`' // Or 'grave' depending on what robotjs needs
    case 'Minus':
      return '-'
    case 'Equal':
      return '='
    case 'BracketLeft':
      return '['
    case 'BracketRight':
      return ']'
    case 'Backslash':
      return '\\'
    case 'Semicolon':
      return ';'
    case 'Quote':
      return "'"
    case 'Comma':
      return ','
    case 'Period':
      return '.'
    case 'Slash':
      return '/'
    case 'Space':
      return 'space' // robotjs uses 'space'
    case 'Enter':
      return 'enter' // robotjs uses 'enter'
    case 'Tab':
      return 'tab'
    case 'Escape':
      return 'escape'
    case 'Backspace':
      return 'backspace'
    case 'Delete':
      return 'delete'
    // Add Arrow keys, F-keys etc. if needed, mapping to robotjs names
    // e.g. case 'ArrowUp': return 'up'; robotjs might use 'up' or 'arrow_up'
    // For F-keys, robotjs uses 'f1', 'f2', etc.
    case 'F1':
      return 'f1'
    case 'F2':
      return 'f2'
    /* ... up to F12 ... */ case 'F12':
      return 'f12'
    default:
      // If it's a single character that event.key would produce and it's not a modifier,
      // and we don't have a code mapping, it might be a special symbol not easily mapped.
      // For now, return null if unmapped by 'code' to encourage using mapped keys.
      return null
  }
}

const Shortkey = ({
  edit = false,
  value = '',
  onChange = () => {}
}: {
  edit?: boolean
  value: string
  onChange?: (value: string) => void
}) => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [ctrl, setCtrl] = useState(false)
  const [alt, setAlt] = useState(false)
  const [shift, setShift] = useState(false)
  const [win, setWin] = useState(false)
  const [lastKey, setLastKey] = useState('')

  const isMac = navigator.userAgent.includes('Mac')

  const getShortcutParts = (shortcutString: string): string[] => {
    return shortcutString ? shortcutString.toLowerCase().split('+') : []
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!edit) return

    e.preventDefault()
    setIsCapturing(true)

    const pressedModifiers: string[] = []
    if (e.ctrlKey) {
      pressedModifiers.push('ctrl')
      setCtrl(true)
    }
    if (e.altKey) {
      pressedModifiers.push('alt')
      setAlt(true)
    }
    if (e.shiftKey) {
      pressedModifiers.push('shift')
      setShift(true)
    }
    if (e.metaKey) {
      pressedModifiers.push(isMac ? 'cmd' : 'win')
      setWin(true)
    }

    console.log(e)
    const pressedKey = mapCodeToKeyName(e.code)
    // const pressedKey = e.key.toLowerCase()
    let finalKey = ''

    if (pressedKey && !['control', 'alt', 'shift', 'meta'].includes(pressedKey)) {
      finalKey = pressedKey
      setLastKey(finalKey)
    } else {
      setLastKey('')
    }

    let newShortcut = ''
    if (finalKey) {
      newShortcut = [...pressedModifiers, finalKey].join('+')
    } else {
      newShortcut = pressedModifiers.join('+')
    }

    if (finalKey && newShortcut !== value) {
      onChange(newShortcut)
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!edit) return

    if (!e.ctrlKey) setCtrl(false)
    if (!e.altKey) setAlt(false)
    if (!e.shiftKey) setShift(false)
    if (!e.metaKey) setWin(false)

    setLastKey('')
    setIsCapturing(false)
  }

  const handleBlur = () => {
    if (!edit) return

    setIsCapturing(false)
    setCtrl(false)
    setAlt(false)
    setShift(false)
    setWin(false)
    setLastKey('')
  }

  const displayParts = getShortcutParts(
    edit && isCapturing
      ? [
          ...(ctrl ? ['ctrl'] : []),
          ...(alt ? ['alt'] : []),
          ...(shift ? ['shift'] : []),
          ...(win ? [isMac ? 'cmd' : 'win'] : []),
          ...(lastKey ? [lastKey] : [])
        ].join('+')
      : value
  )

  return edit ? (
    <div style={{ position: 'relative', flexGrow: 1, marginTop: '1rem' }}>
      <TextField
        label={isCapturing ? 'Capturing...' : 'Press Keys To Set Trigger'}
        value={''}
        style={{ width: '100%' }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        slotProps={{
          inputLabel: { shrink: true }
        }}
      />
      <Stack
        direction={'row'}
        gap={1}
        sx={{ position: 'absolute', left: 10, top: 15, pointerEvents: 'none' }}
      >
        {displayParts.length > 0 ? (
          displayParts.map((part, i) => (
            <Button
              key={i}
              size="small"
              variant={
                (part === 'ctrl' && ctrl) ||
                (part === 'alt' && alt) ||
                (part === 'shift' && shift) ||
                (part === 'cmd' && win) ||
                (part === 'win' && win) ||
                (part === lastKey && lastKey)
                  ? 'contained'
                  : 'outlined'
              }
              sx={{ textTransform: 'capitalize', fontSize: '0.75rem', p: '2px 6px', minWidth: 0 }}
            >
              {part}
            </Button>
          ))
        ) : (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>...</Typography>
        )}
      </Stack>
    </div>
  ) : (
    <Stack direction={'row'} gap={1} sx={{ color: '#666', pointerEvents: 'none' }}>
      {displayParts.length > 0 ? (
        displayParts.map((part, i) => (
          <Button
            key={i}
            size="medium"
            sx={{ fontSize: '12px', textTransform: 'capitalize' }}
            color={'inherit'}
            variant={'outlined'}
          >
            {part}
          </Button>
        ))
      ) : (
        <Typography sx={{ fontSize: '12px', color: 'text.disabled' }}>Not Set</Typography>
      )}
    </Stack>
  )
}

export default Shortkey
