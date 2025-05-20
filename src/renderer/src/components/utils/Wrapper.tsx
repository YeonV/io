// import { log } from '@/utils'
import {
  // CalendarViewDay,
  DarkMode,
  DeleteSweep,
  // Dashboard,
  // Deck,
  GridView,
  LightMode
  // Save,
  // Settings,
  // SettingsSharp,
} from '@mui/icons-material'
import {
  Box,
  Button,
  // Button,
  // CircularProgress,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material'
// import { Component, ErrorInfo, ReactNode } from 'react'
import styles from '@/styles/app.module.css'
import logo from '@/assets/icon.png'
import logoTitle from '@/assets/logo-cropped.svg'
import pkg from '../../../../../package.json'
import { useMainStore } from '@/store/mainStore'

// import { Link } from 'react-router-dom'

const ipcRenderer = window.electron?.ipcRenderer || false

const Wrapper = ({ children }: any) => {
  const darkMode = useMainStore((state) => state.ui.darkMode)
  const setDarkMode = useMainStore((state) => state.setDarkMode)

  const toggleDarkmode = () => {
    if (ipcRenderer) {
      ipcRenderer.sendSync('toggle-darkmode', 'try')
    }
    setDarkMode(!darkMode)
  }

  const handleNukeEverything = async () => {
    if (
      !window.confirm(
        'EXTREME DANGER ZONE!\n\nThis will:\n' +
          "- Clear main app's Zustand persisted state (localStorage).\n" +
          "- Clear Deck's localStorage.\n" +
          "- Clear PlaySound module's IndexedDB audio cache.\n" +
          '- Request main process to clear electron-store.\n\n' +
          'The app will then attempt to reload. Are you ABSOLUTELY sure?'
      )
    ) {
      return
    }

    console.warn('[DEV NUKE] Initiating full data reset...')

    // 1. Clear PlaySound Module's IndexedDB (Renderer-side)
    try {
      // We need access to clearAllAudioFromDB, so either import it or make it global for dev
      // For simplicity here, let's assume it's available or PlaySound module handles an event
      if (window.IO_DEV_TOOLS && typeof window.IO_DEV_TOOLS.clearPlaySoundCache === 'function') {
        await window.IO_DEV_TOOLS.clearPlaySoundCache()
        console.log('[DEV NUKE] PlaySound IndexedDB cache cleared.')
      } else {
        console.warn(
          '[DEV NUKE] IO_DEV_TOOLS.clearPlaySoundCache not found. Skipping IndexedDB clear.'
        )
        alert(
          'PlaySound IndexedDB clear function not found. Manual clear might be needed via DevTools > Application.'
        )
      }
    } catch (e) {
      console.error('[DEV NUKE] Error clearing PlaySound IndexedDB:', e)
    }

    // 2. Clear Main App's Zustand Persisted State (localStorage)
    // The key is 'io-v2-storage' from mainStore.ts persist config
    localStorage.removeItem('io-v2-storage')
    console.log('[DEV NUKE] Main app (io-v2-storage) localStorage cleared.')

    // 3. Clear Deck's LocalStorage
    // The key is 'io-deck-v1-storage' from deckStore.ts persist config
    localStorage.removeItem('io-deck-v1-storage')
    console.log('[DEV NUKE] Deck (io-deck-v1-storage) localStorage cleared.')

    // 4. Request Main Process to Clear electron-store
    if (ipcRenderer) {
      try {
        const success = await ipcRenderer.invoke('dev:clear-electron-store')
        if (success) {
          console.log('[DEV NUKE] electron-store cleared by main process.')
        } else {
          console.error('[DEV NUKE] Main process reported failure to clear electron-store.')
          alert('Failed to clear main process store. See main console.')
        }
      } catch (e) {
        console.error("[DEV NUKE] Error invoking 'dev:clear-electron-store':", e)
        alert('Error communicating with main process to clear its store.')
      }
    } else {
      console.warn('[DEV NUKE] ipcRenderer not available, cannot clear electron-store from main.')
    }

    // 5. Hard Reload the application
    alert('Nuke complete! App will now reload to a fresh state.')
    window.location.reload()
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden'
      }}
      className={styles.app}
    >
      <div
        className={styles.appWrapper}
        style={{
          margin: '0 auto',
          justifyContent: 'space-between',
          minHeight: ipcRenderer && pkg.env.VITRON_CUSTOM_TITLEBAR ? 'calc(100vh - 30px)' : '100vh'
        }}
      >
        <header className={styles.logos}>
          <img src={logo} style={{ width: '100px', filter: 'invert(0)' }} alt="logoIO" />
          <div className={styles.imgBox}>
            <img
              src={logoTitle}
              style={{ width: '480px', filter: 'invert(0)' }}
              alt="InputOutput"
            />
          </div>
        </header>
        <main style={{ width: '100%', maxWidth: 960 }}>
          {children}

          {!ipcRenderer && (
            <Typography variant="body2" color="#666" sx={{ mt: 5 }}>
              If you are accessing this site via httpS, but want to communicate with your local
              network (mqtt, http, ws), you need to allow insecure content in your browser&apos;s
              site settings either via lock icon next to the url or copy:
              <br />
              <code>{`chrome://settings/content/siteDetails?site=${encodeURIComponent(
                window.location.href.replace(/\/+$/, '')
              )}`}</code>
            </Typography>
          )}
        </main>
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ flexBasis: '150px' }}></div>
          <Typography>hacked by Blade </Typography>
          <div style={{ flexBasis: '225px' }}>
            {/* DEV ONLY - NUKE BUTTON */}
            {process.env.NODE_ENV === 'development' &&
              ipcRenderer && ( // Show only in dev + Electron
                <Tooltip title="DEV ONLY: Reset All App Data">
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleNukeEverything}
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
                sx={{ opacity: 0.3 }}
              >
                <GridView color="primary" />
              </IconButton>
            )}
            <IconButton
              onClick={() => {
                // setDarkMode(!darkMode)
                toggleDarkmode()
              }}
              sx={{ opacity: 0.3 }}
            >
              {darkMode ? <LightMode color="primary" /> : <DarkMode color="primary" />}
            </IconButton>
          </div>
        </footer>
      </div>
    </Box>
  )
}

export default Wrapper
