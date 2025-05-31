// src/renderer/src/components/Footer.tsx
import { DarkMode, DeleteSweep, GridView, LightMode, SwitchAccount } from '@mui/icons-material'
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material'
import Settings from './Settings/Settings'
import { nuke } from './utils/nuke'
import { useEffect, useMemo, useState } from 'react'
import { useMainStore } from '@/store/mainStore'
import IoIcon from './IoIcon/IoIcon'
import ProfileManagerContent from './Settings/ProfileManagerContent'

const ipcRenderer = window.electron?.ipcRenderer || false

const Footer = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)
  const setThemeChoice = useMainStore((state) => state.setThemeChoice)
  const profiles = useMainStore((state) => state.profiles)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)
  const desktop = useMediaQuery('(min-width:980px)')

  const [manageProfilesDialogOpen, setManageProfilesDialogOpen] = useState(false)

  const sortedProfiles = useMemo(
    () => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  )

  const handleSetActiveProfile = (event: SelectChangeEvent<string>) => {
    setActiveProfile(event.target.value || null)
  }

  const [osShouldUseDark, setOsShouldUseDark] = useState(() => {
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
      <div style={{ flexBasis: '40%', display: 'flex' }}>
        <Select
          size="small"
          value={activeProfileId || ''}
          onChange={handleSetActiveProfile}
          displayEmpty
          sx={{ color: '#666', '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
          renderValue={(value) => {
            if (!value) return <em>None (All Rows Active)</em>
            const profile = profiles[value]
            return (
              <span style={{ display: 'flex', alignItems: 'center', color: '#666' }}>
                <IoIcon name={profile.icon || 'people'} style={{ marginRight: 8 }} />
                {desktop
                  ? profile.name
                  : profile.name.substring(0, 20) + (profile.name.length > 20 ? '...' : '')}
              </span>
            )
          }}
        >
          <MenuItem value="">
            <em>None (All Rows Active)</em>
          </MenuItem>
          {sortedProfiles.map((p) => (
            <MenuItem key={p.id} value={p.id} color="inherit">
              <ListItemIcon sx={{ minWidth: 32, mr: 0.5 }}>
                <IoIcon name={p.icon || 'people'} />
              </ListItemIcon>
              {p.name}
            </MenuItem>
          ))}
        </Select>
        <IconButton
          onClick={() => setManageProfilesDialogOpen(true)}
          // sx={{ height: 41, mt: 'auto' /* Push to bottom if space allows */ }}
        >
          <SwitchAccount color="secondary" />
        </IconButton>
      </div>
      <div>
        <Typography>hacked by Blade </Typography>
      </div>
      <div
        style={{
          display: 'flex',
          flexBasis: '40%',
          justifyContent: 'flex-end',
          paddingRight: 8
        }}
      >
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
      <Dialog
        open={manageProfilesDialogOpen}
        onClose={() => setManageProfilesDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { height: 'auto', maxHeight: 'min(800px, 75vh)' } }}
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Manage IO Profiles
          <Button onClick={() => setManageProfilesDialogOpen(false)} size="small">
            Close
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <ProfileManagerContent />
        </DialogContent>
      </Dialog>
    </footer>
  )
}

export default Footer
