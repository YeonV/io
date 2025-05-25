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
  Stack,
  Paper
} from '@mui/material' // Added Paper
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
    if (ipcRenderer) {
      setIsLoading(true)
      ipcRenderer
        .invoke('get-login-item-settings')
        .then((settings) => {
          if (settings && typeof settings.openAtLogin === 'boolean') {
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
      <Alert severity="info" variant="outlined" sx={{ borderColor: 'transparent' }}>
        Startup settings are only available in the desktop application.
      </Alert>
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
    )
  }

  return (
    <Stack spacing={2.5}>
      {' '}
      {/* Overall stack for this section's content */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
        <FormControlLabel
          control={<Switch checked={openAtLogin === true} onChange={handleToggleOpenAtLogin} />}
          labelPlacement="start"
          label={
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Launch automatically on system login
            </Typography>
          }
          sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
        />
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0.5, ml: 0, pl: 0, color: 'text.secondary' }}
        >
          Automatically start IO when you log into your computer.
        </Typography>
      </Paper>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 1.5,
          opacity: openAtLogin ? 1 : 0.6,
          transition: 'opacity 0.3s ease'
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={openAsHidden === true}
              onChange={handleToggleOpenAsHidden}
              disabled={!openAtLogin}
            />
          }
          labelPlacement="start"
          label={
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <StartHiddenIcon
                sx={{
                  fontSize: '1.2rem',
                  opacity: 0.8,
                  color: !openAtLogin ? 'text.disabled' : 'text.primary'
                }}
              />
              <Typography
                variant="body1"
                sx={{ fontWeight: 500, color: !openAtLogin ? 'text.disabled' : 'text.primary' }}
              >
                Start minimised to system tray
              </Typography>
            </Stack>
          }
          sx={{ justifyContent: 'space-between', ml: 0, width: '100%' }}
          disabled={!openAtLogin} // Disable the entire label interaction
        />
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 0.5, ml: 0, pl: 0, color: !openAtLogin ? 'text.disabled' : 'text.secondary' }}
        >
          If launching on login, IO will start hidden in the system tray without showing the main
          window.
        </Typography>
      </Paper>
    </Stack>
  )
}
export default SettingsStartup
