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
  Divider
} from '@mui/material'
import { Login as LoginIcon, VisibilityOffOutlined as StartHiddenIcon } from '@mui/icons-material'
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
            setOpenAsHidden(settings.openAsHidden || false) // settings.openAsHidden might be macOS specific
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
  }, [])

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
        // Re-fetch to get actual state if update failed
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
    setOpenAtLogin(checked) // Optimistic
    if (!checked && openAsHidden) setOpenAsHidden(false)
    updateLoginSettings(checked, checked ? (openAsHidden ?? true) : false)
  }

  const handleToggleOpenAsHidden = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setOpenAsHidden(checked) // Optimistic
    if (openAtLogin) updateLoginSettings(true, checked)
  }

  if (!ipcRenderer) {
    return (
      <Box>
        <Typography
          variant="subtitle1"
          component="div"
          sx={{ fontWeight: 'medium', mb: 1, display: 'flex', alignItems: 'center' }}
        >
          <LoginIcon sx={{ mr: 1, color: 'text.disabled' }} /> Application Startup
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Alert severity="info">
          Startup settings are only available in the desktop application.
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
        <LoginIcon sx={{ mr: 1, color: 'text.secondary' }} /> Application Startup
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {isLoading && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: '70px' }}>
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

      {!isLoading && !error && (
        <>
          <Box>
            <FormControlLabel
              control={<Switch checked={openAtLogin === true} onChange={handleToggleOpenAtLogin} />}
              label="Launch automatically on system login"
            />
            <Typography
              variant="caption"
              display="block"
              sx={{ mt: 0, ml: 4.5, color: 'text.secondary', mb: 1.5 }}
            >
              Automatically start IO when you log into your computer.
            </Typography>
          </Box>
          <Box
            sx={{
              opacity: openAtLogin ? 1 : 0.5,
              pl: 2,
              mt: 0,
              pointerEvents: openAtLogin ? 'auto' : 'none'
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
              label={
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <StartHiddenIcon sx={{ fontSize: '1.1rem', opacity: 0.7 }} />
                  <span>Start minimised to system tray</span>
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
        </>
      )}
    </Box>
  )
}

export default SettingsStartup
