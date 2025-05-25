// src/renderer/src/components/Settings/SettingsWindowBehavior.tsx
import type { FC } from 'react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material'
// WindowBehaviorIcon will be in AccordionSummary
import { useSnackbar } from 'notistack'

const ipcRenderer = window.electron?.ipcRenderer
type CloseBehavior = 'minimize' | 'quit'

const SettingsWindowBehavior: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [closeBehavior, setCloseBehavior] = useState<CloseBehavior | null>(null)
  const [isLoading, setIsLoading] = useState(!!ipcRenderer)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* ... (same data fetching logic as before) ... */
    if (ipcRenderer) {
      setIsLoading(true)
      ipcRenderer
        .invoke('get-close-button-behavior')
        .then((behavior: CloseBehavior) => {
          setCloseBehavior(behavior || 'minimize')
          setError(null)
        })
        .catch((err) => {
          setError('Failed to load close button behavior setting.')
          setCloseBehavior('minimize')
          console.error("Error 'get-close-button-behavior':", err)
        })
        .finally(() => setIsLoading(false))
    } else {
      setCloseBehavior('minimize')
    }
  }, [enqueueSnackbar]) // Added enqueueSnackbar to deps if it's used in error handling

  const handleCloseBehaviorChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    /* ... (same update logic as before) ... */
    if (!ipcRenderer) return
    const newBehavior = event.target.value as CloseBehavior
    setCloseBehavior(newBehavior)
    try {
      const result = await ipcRenderer.invoke('set-close-button-behavior', newBehavior)
      if (!result.success) {
        enqueueSnackbar(`Error: ${result.error || 'Could not update close behavior.'}`, {
          variant: 'error'
        })
        ipcRenderer.invoke('get-close-button-behavior').then((b) => setCloseBehavior(b))
      } else {
        enqueueSnackbar('Close button behavior updated.', {
          variant: 'success',
          autoHideDuration: 2000
        })
      }
    } catch (err) {
      enqueueSnackbar('Error communicating close behavior setting.', { variant: 'error' })
    }
  }

  if (!ipcRenderer) {
    return (
      <Alert severity="info">
        Window behavior settings are only available in the desktop application.
      </Alert>
    )
  }
  if (isLoading) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ justifyContent: 'center' }}>
        <CircularProgress size={20} />{' '}
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Stack>
    )
  }
  if (error) {
    return <Alert severity="warning">{error}</Alert>
  }

  return (
    // Removed top Box, Typography title, and Divider
    closeBehavior !== null && ( // Ensure closeBehavior is loaded
      <FormControl component="fieldset">
        <Typography variant="body2" component="legend" sx={{ mb: 1, fontWeight: 'medium' }}>
          When closing the main window:
        </Typography>
        <RadioGroup
          aria-label="close-button-behavior"
          name="close-button-behavior-group"
          value={closeBehavior}
          onChange={handleCloseBehaviorChange}
        >
          <FormControlLabel
            value="minimize"
            control={<Radio size="small" />}
            label="Minimize to System Tray (Recommended)"
          />
          <FormControlLabel
            value="quit"
            control={<Radio size="small" />}
            label="Quit the Application"
          />
        </RadioGroup>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Choose if IO should continue running in the background or exit completely.
        </Typography>
      </FormControl>
    )
  )
}
export default SettingsWindowBehavior
