// src/renderer/src/components/Settings/SettingsStartup.tsx
import type { FC } from 'react'
import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material'
import { VisibilityOff as StartHiddenIcon } from '@mui/icons-material' // LoginIcon will be in AccordionSummary
import { useSnackbar } from 'notistack'

const ipcRenderer = window.electron?.ipcRenderer

const SettingsStartup: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [openAtLogin, setOpenAtLogin] = useState<boolean | null>(null)
  const [openAsHidden, setOpenAsHidden] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(!!ipcRenderer)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* ... (same data fetching logic as before) ... */
    if (ipcRenderer) {
      setIsLoading(true)
      ipcRenderer
        .invoke('get-login-item-settings')
        .then((settings) => {
          /* ... */ if (settings && typeof settings.openAtLogin === 'boolean') {
            setOpenAtLogin(settings.openAtLogin)
            setOpenAsHidden(settings.openAsHidden || false)
            setError(null)
          } else {
            setError('Could not retrieve startup settings.')
            setOpenAtLogin(false)
            setOpenAsHidden(false)
          }
        })
        .catch((err) => {
          setError('Failed to load startup settings.')
          setOpenAtLogin(false)
          setOpenAsHidden(false)
          console.error("Error 'get-login-item-settings':", err)
        })
        .finally(() => setIsLoading(false))
    } else {
      setOpenAtLogin(false)
      setOpenAsHidden(false)
    }
  }, [enqueueSnackbar])

  const updateLoginSettings = async (newOpenAtLogin: boolean, newOpenAsHiddenSetting?: boolean) => {
    /* ... (same update logic as before) ... */
    if (!ipcRenderer) return
    const effectiveOpenAsHidden = newOpenAtLogin
      ? newOpenAsHiddenSetting !== undefined
        ? newOpenAsHiddenSetting
        : (openAsHidden ?? true)
      : false
    try {
      const result = await ipcRenderer.invoke('set-login-item-settings', {
        openAtLogin: newOpenAtLogin,
        openAsHidden: effectiveOpenAsHidden
      })
      if (!result.success) {
        enqueueSnackbar(`Error: ${result.error || 'Could not update startup settings.'}`, {
          variant: 'error'
        })
        ipcRenderer.invoke('get-login-item-settings').then((s) => {
          setOpenAtLogin(s.openAtLogin)
          setOpenAsHidden(s.openAsHidden)
        })
      } else {
        enqueueSnackbar('Startup settings updated.', { variant: 'success', autoHideDuration: 2000 })
        setOpenAtLogin(result.newSettings.openAtLogin)
        setOpenAsHidden(result.newSettings.openAsHidden)
      }
    } catch (err) {
      enqueueSnackbar('Error communicating startup settings.', { variant: 'error' })
    }
  }

  const handleToggleOpenAtLogin = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    /* ... (same) ... */ setOpenAtLogin(checked)
    if (!checked && openAsHidden) setOpenAsHidden(false)
    updateLoginSettings(checked, checked ? (openAsHidden ?? true) : false)
  }
  const handleToggleOpenAsHidden = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    /* ... (same) ... */ setOpenAsHidden(checked)
    if (openAtLogin) updateLoginSettings(true, checked)
  }

  if (!ipcRenderer) {
    return (
      <Alert severity="info">Startup settings are only available in the desktop application.</Alert>
    )
  }

  if (isLoading) {
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ minHeight: '70px', justifyContent: 'center' }}
      >
        <CircularProgress size={20} />{' '}
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Stack>
    )
  }
  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 0 }}>
        {error}
      </Alert>
    ) // Removed mb:2, parent accordion has padding
  }

  return (
    // Removed top Box, Typography title, and Divider - these are now in AccordionSummary
    <Stack spacing={1.5}>
      {' '}
      {/* Use Stack for consistent spacing of items */}
      <Box>
        <FormControlLabel
          control={<Switch checked={openAtLogin === true} onChange={handleToggleOpenAtLogin} />}
          label="Launch automatically on system login"
        />
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0, ml: 4.5, color: 'text.secondary' }}
        >
          Automatically start IO when you log into your computer.
        </Typography>
      </Box>
      <Box
        sx={{ opacity: openAtLogin ? 1 : 0.5, pl: 2, pointerEvents: openAtLogin ? 'auto' : 'none' }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={openAsHidden === true}
              onChange={handleToggleOpenAsHidden}
              disabled={!openAtLogin}
            />
          }
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {' '}
              <StartHiddenIcon sx={{ fontSize: '1.1rem', opacity: 0.7 }} />{' '}
              <span>Start minimised to system tray</span>{' '}
            </Stack>
          }
        />
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0, ml: 6.5, color: 'text.secondary' }}
        >
          If launching on login, IO will start hidden in the system tray.
        </Typography>
      </Box>
    </Stack>
  )
}
export default SettingsStartup
