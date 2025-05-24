// src/renderer/src/components/Footer.tsx
import { DarkMode, DeleteSweep, GridView, LightMode } from '@mui/icons-material'
import { Button, IconButton, Tooltip, Typography } from '@mui/material'
import Settings from './Settings/Settings'
import { nuke } from './utils/nuke'
import { useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'

const ipcRenderer = window.electron?.ipcRenderer || false

const Footer = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)
  const setThemeChoice = useMainStore((state) => state.setThemeChoice)
  // For displaying current effective mode based on system if themeChoice is 'system'
  const [osShouldUseDark, setOsShouldUseDark] = useState(() => {
    // Similar to App.tsx
    if (window.electron?.ipcRenderer) {
      const initialInfo = window.electron.ipcRenderer.sendSync('get-initial-theme-info')
      return initialInfo.shouldUseDarkColors
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || true
  })
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return
    const handleSystemThemeChange = (
      _event: any,
      { shouldUseDarkColors }: { shouldUseDarkColors: boolean }
    ) => {
      setOsShouldUseDark(shouldUseDarkColors)
    }
    window.electron.ipcRenderer.on('system-theme-changed-in-main', handleSystemThemeChange)
    return () => {
      window.electron.ipcRenderer.removeListener(
        'system-theme-changed-in-main',
        handleSystemThemeChange
      )
    }
  }, [])

  const effectiveDarkMode = useMemo(() => {
    if (themeChoice === 'system') {
      return osShouldUseDark
    }
    return themeChoice === 'dark'
  }, [themeChoice, osShouldUseDark])

  const handleToggleTheme = () => {
    const newChoice = effectiveDarkMode ? 'light' : 'dark'
    setThemeChoice(newChoice)
  }

  const getThemeIcon = () => {
    // Icon shows the *opposite* of current effective mode, i.e., what it will switch TO
    return effectiveDarkMode ? <LightMode color="secondary" /> : <DarkMode color="secondary" />
  }

  const getTooltipTitle = () => {
    return effectiveDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
  }
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0
      }}
    >
      <div style={{ flexBasis: '150px' }}></div>
      <Typography>hacked by Blade </Typography>
      <div style={{ flexBasis: '250px' }}>
        {/* DEV ONLY - NUKE BUTTON */}
        {process.env.NODE_ENV === 'development' &&
          ipcRenderer && ( // Show only in dev + Electron
            <Tooltip title="DEV ONLY: Reset All App Data">
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={nuke}
                startIcon={<DeleteSweep />}
                sx={{ mr: 1, fontSize: '0.7rem' }}
              >
                Nuke All
              </Button>
            </Tooltip>
          )}
        {process.env.NODE_ENV === 'development' && (
          <IconButton
            onClick={() => {
              window.open(
                `${location.protocol}//${location.hostname}:1337/deck`,
                '_blank',
                'noopener,noreferrer'
              )
            }}
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            <GridView color="secondary" />
          </IconButton>
        )}
        <Tooltip title={getTooltipTitle()}>
          <IconButton
            onClick={handleToggleTheme}
            color="secondary"
            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
          >
            {getThemeIcon()}
          </IconButton>
        </Tooltip>
        <Settings />
      </div>
    </footer>
  )
}

export default Footer
