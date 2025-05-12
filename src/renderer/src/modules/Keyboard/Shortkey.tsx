// src/renderer/src/modules/Keyboard/Shortkey.tsx
import { useEffect, useState } from 'react'
import { Button, Stack, TextField, Typography, useMediaQuery } from '@mui/material'
// No need for useHotkeys import anymore

const Shortkey = ({
  edit = false,
  value = '', // Use empty string as default? Or keep ctrl+alt+y?
  onChange = () => {}
}: {
  edit?: boolean
  value: string // The source of truth for the shortcut string
  onChange?: (value: string) => void
}) => {
  // Internal state primarily for visual feedback during capture
  const [isCapturing, setIsCapturing] = useState(false) // Track active capture state
  const [ctrl, setCtrl] = useState(false)
  const [alt, setAlt] = useState(false)
  const [shift, setShift] = useState(false)
  const [win, setWin] = useState(false)
  const [lastKey, setLastKey] = useState('') // Track the non-modifier key visually

  const isMac = navigator.userAgent.includes('Mac')
  const desktop = useMediaQuery('(min-width:980px)')

  // Function to parse the shortcut string into parts for display
  const getShortcutParts = (shortcutString: string): string[] => {
    return shortcutString ? shortcutString.toLowerCase().split('+') : []
  }

  // --- Key Capture Logic ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!edit) return // Only capture if in edit mode

    e.preventDefault()
    setIsCapturing(true) // Indicate capture is active

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

    const pressedKey = e.key.toLowerCase()
    let finalKey = ''

    // Filter out modifier keys themselves if pressed alone or with others
    if (!['control', 'alt', 'shift', 'meta'].includes(pressedKey)) {
      finalKey = pressedKey
      setLastKey(finalKey) // Update visual feedback
    } else {
      setLastKey('') // Clear visual key if only modifier was pressed
    }

    // Construct the shortcut string if a non-modifier key was pressed
    let newShortcut = ''
    if (finalKey) {
      newShortcut = [...pressedModifiers, finalKey].join('+')
    } else {
      // If only modifiers are held, display them but don't trigger onChange yet
      // Maybe show "Press a key..."?
      newShortcut = pressedModifiers.join('+') // Show modifiers held
    }

    // Call onChange only if a valid combo (modifier + key or just key) is formed
    // And it's different from the original value prop
    if (finalKey && newShortcut !== value) {
      onChange(newShortcut)
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!edit) return
    // Reset visual state
    if (!e.ctrlKey) setCtrl(false)
    if (!e.altKey) setAlt(false)
    if (!e.shiftKey) setShift(false)
    if (!e.metaKey) setWin(false)
    // Maybe clear lastKey if modifier released? Or wait for full release?
    setLastKey('') // Clear key visual on any keyup?
    setIsCapturing(false) // Capture ends on key up
  }

  const handleBlur = () => {
    if (!edit) return
    // Reset visual state if user clicks away during capture
    setIsCapturing(false)
    setCtrl(false)
    setAlt(false)
    setShift(false)
    setWin(false)
    setLastKey('')
  }

  // --- Render ---
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
  ) // Show live capture OR prop value

  return edit ? (
    // --- Edit Mode ---
    <div style={{ position: 'relative', flexGrow: 1, marginTop: '1rem' }}>
      <TextField
        label={isCapturing ? 'Capturing...' : 'Press Keys To Set Trigger'}
        // placeholder={value || 'Click here and press keys'} // Show current value as placeholder
        value={''} // Input is just for focus/events
        style={{ width: '100%' }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur} // Reset visual state on blur
        InputLabelProps={{ shrink: true }}
      />
      {/* Visual feedback stack */}
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
                // Highlight based on current key down state during capture
                (part === 'ctrl' && ctrl) ||
                (part === 'alt' && alt) ||
                (part === 'shift' && shift) ||
                (part === 'cmd' && win) ||
                (part === 'win' && win) ||
                (part === lastKey && lastKey) // Highlight the last non-modifier key
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
    // --- Display Mode ---
    <Stack direction={'row'} gap={1} sx={{ color: '#666', pointerEvents: 'none' }}>
      {/* Render based on displayParts derived from the 'value' prop */}
      {displayParts.length > 0 ? (
        displayParts.map((part, i) => (
          <Button
            key={i}
            size="medium" // Keep original size for display?
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
      {/* Remove mobile specific button logic if not needed */}
    </Stack>
  )
}

export default Shortkey
