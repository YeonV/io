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
  Stack,
  Paper,
  Chip
} from '@mui/material'

import { useSnackbar } from 'notistack'

const ipcRenderer = window.electron?.ipcRenderer
type CloseBehavior = 'minimize' | 'quit'

const SettingsWindowBehavior: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [closeBehavior, setCloseBehavior] = useState<CloseBehavior | null>(null)
  const [isLoading, setIsLoading] = useState(!!ipcRenderer)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  const handleCloseBehaviorChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
    closeBehavior !== null && (
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <Typography variant="body1" component="legend" sx={{ mb: 1.5, fontWeight: 500 }}>
          When closing the main window:
        </Typography>
        <RadioGroup
          aria-label="close-button-behavior"
          name="close-button-behavior-group"
          value={closeBehavior}
          onChange={handleCloseBehaviorChange}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              pb: 0,
              mb: 1.5,
              borderRadius: 1.5,
              bgcolor: closeBehavior === 'minimize' ? 'action.selected' : 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => handleCloseBehaviorChange({ target: { value: 'minimize' } } as any)}
          >
            <FormControlLabel
              value="minimize"
              control={<Radio size="small" sx={{ py: 0 }} />}
              labelPlacement="start" // <<< MOVES RADIO TO THE RIGHT
              label={
                <Box sx={{ textAlign: 'left', width: '100%' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Minimize to System Tray{' '}
                    <Chip
                      label="Recommended"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', height: '18px', ml: 0.5 }}
                    />
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mt: 0.5, color: 'text.secondary' }}
                  >
                    IO continues running in the background. Access it from the system tray icon.
                  </Typography>
                </Box>
              }
              sx={{
                width: '100%',
                ml: 0,
                justifyContent: 'space-between',
                flexDirection: 'row-reverse' /* Puts control (Radio) last */
              }}
            />
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              pb: 0,
              borderRadius: 1.5,
              bgcolor: closeBehavior === 'quit' ? 'action.selected' : 'transparent',
              cursor: 'pointer'
            }}
            onClick={() => handleCloseBehaviorChange({ target: { value: 'quit' } } as any)}
          >
            <FormControlLabel
              value="quit"
              control={<Radio size="small" sx={{ py: 0 }} />}
              labelPlacement="start" // <<< MOVES RADIO TO THE RIGHT
              label={
                <Box sx={{ textAlign: 'left', width: '100%' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Quit the Application
                  </Typography>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mt: 0.5, color: 'text.secondary' }}
                  >
                    Closing the window will exit IO completely.
                  </Typography>
                </Box>
              }
              sx={{
                width: '100%',
                ml: 0,
                justifyContent: 'space-between',
                flexDirection: 'row-reverse'
              }}
            />
          </Paper>
        </RadioGroup>
      </FormControl>
    )
  )
}
export default SettingsWindowBehavior
