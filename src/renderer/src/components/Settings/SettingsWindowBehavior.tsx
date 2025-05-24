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
  Divider,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material'
import { CloseFullscreenOutlined as WindowBehaviorIcon } from '@mui/icons-material' // Example icon
import { useSnackbar } from 'notistack'

const ipcRenderer = window.electron?.ipcRenderer
type CloseBehavior = 'minimize' | 'quit'

const SettingsWindowBehavior: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [closeBehavior, setCloseBehavior] = useState<CloseBehavior | null>(null) // null for loading
  const [isLoading, setIsLoading] = useState(!!ipcRenderer)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ipcRenderer) {
      setIsLoading(true)
      ipcRenderer
        .invoke('get-close-button-behavior')
        .then((behavior: CloseBehavior) => {
          setCloseBehavior(behavior || 'minimize') // Default if undefined
          setError(null)
        })
        .catch((err) => {
          setError('Failed to load close button behavior setting.')
          setCloseBehavior('minimize') // Default safely
          console.error("Error 'get-close-button-behavior':", err)
        })
        .finally(() => setIsLoading(false))
    } else {
      setCloseBehavior('minimize') // Default for web where it's less relevant
    }
  }, [])

  const handleCloseBehaviorChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!ipcRenderer) return
    const newBehavior = event.target.value as CloseBehavior
    setCloseBehavior(newBehavior) // Optimistic UI update

    try {
      const result = await ipcRenderer.invoke('set-close-button-behavior', newBehavior)
      if (!result.success) {
        enqueueSnackbar(`Error: ${result.error || 'Could not update close behavior.'}`, {
          variant: 'error'
        })
        // Revert UI or re-fetch
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
      <Box>
        <Typography
          variant="subtitle1"
          component="div"
          sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
        >
          <WindowBehaviorIcon sx={{ mr: 1, color: 'text.disabled' }} /> Window Behavior
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Alert severity="info">
          Window behavior settings are only available in the desktop application.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Typography
        variant="subtitle1"
        component="div"
        sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
      >
        <WindowBehaviorIcon sx={{ mr: 1, color: 'text.secondary' }} /> Window Behavior
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {isLoading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />{' '}
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        </Stack>
      )}
      {error && !isLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && closeBehavior !== null && (
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
      )}
    </Box>
  )
}

export default SettingsWindowBehavior
