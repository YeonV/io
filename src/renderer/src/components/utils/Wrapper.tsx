import { DarkMode, DeleteSweep, GridView, LightMode } from '@mui/icons-material'
import { Box, Button, IconButton, Tooltip, Typography } from '@mui/material'
import styles from '@/styles/app.module.css'
import logo from '@/assets/icon.png'
import logoTitle from '@/assets/logo-cropped.svg'
import pkg from '../../../../../package.json'
import { useMainStore } from '@/store/mainStore'
import FiledropProvider from './FiledropProvider'
import { nuke } from './nuke'
import Settings from '../Settings/Settings'

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

  return (
    <FiledropProvider>
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
            minHeight:
              ipcRenderer && pkg.env.VITRON_CUSTOM_TITLEBAR ? 'calc(100vh - 30px)' : '100vh'
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
          <main style={{ width: '100%', maxWidth: 960, marginBottom: '50px' }}>
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
              justifyContent: 'space-between',
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0
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
                  sx={{ opacity: 0.3 }}
                >
                  <GridView color="primary" />
                </IconButton>
              )}
              <Settings />
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
    </FiledropProvider>
  )
}

export default Wrapper
