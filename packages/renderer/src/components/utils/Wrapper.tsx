import { log } from '@/utils'
import { DarkMode, LightMode, Save, Settings } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material'
import { Component, ErrorInfo, ReactNode } from 'react'
import styles from '@/styles/app.module.scss'
import logo from '@/assets/icon.png'
import logoTitle from '@/assets/logo-cropped.svg'
import pkg from '../../../../../package.json'
import { useStore } from '@/store/OLD/useStore'

const ipcRenderer = window.ipcRenderer || false

const Wrapper = ({ children }: any) => {
  const darkMode = useStore((state) => state.ui.darkMode)
  const setDarkMode = useStore((state) => state.ui.setDarkMode)

  const toggleDarkmode = () => {
    if (ipcRenderer) {
      ipcRenderer.sendSync('toggle-darkmode', 'try')
    }
    setDarkMode(!darkMode)
  }
  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        color: 'text.primary',
        overflowX: 'hidden',
      }}
      className={styles.app}
    >
      <div
        className={styles.appWrapper}
        style={{
          margin: '0 auto',
          minHeight:
            ipcRenderer && pkg.env.VITRON_CUSTOM_TITLEBAR
              ? 'calc(100vh - 30px)'
              : '100vh',
        }}
      >
        {window.location.pathname !== '/deck/' ? (
          <header className={styles.logos}>
            <img
              src={logo}
              style={{ width: '100px', filter: 'invert(0)' }}
              alt='logoIO'
            />
            <div className={styles.imgBox}>
              <img
                src={logoTitle}
                style={{ width: '480px', filter: 'invert(0)' }}
                alt='InputOutput'
              />
            </div>
          </header>
        ) : (
          <div></div>
        )}
        <main style={{ width: '100%', maxWidth: 960 }}>
          {children}

          {!ipcRenderer && window.location.pathname !== '/deck/' && (
            <Typography variant='body2' color='#666' sx={{ mt: 5 }}>
              If you are accessing this site via httpS, but want to communicate
              with your local network (mqtt, http, ws), you need to allow
              insecure content in your browser's site settings either via lock
              icon next to the url or copy:
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
          }}
        >
          <div style={{ flexBasis: '100px' }}></div>
          <Typography>hacked by Blade </Typography>
          <div style={{ flexBasis: '100px' }}>
            <IconButton
              onClick={() => {
                // setDarkMode(!darkMode)
                toggleDarkmode()
              }}
              sx={{ opacity: 0.3 }}
            >
              {darkMode ? (
                <LightMode color='primary' />
              ) : (
                <DarkMode color='primary' />
              )}
            </IconButton>
          </div>
        </footer>
      </div>
    </Box>
  )
}

export default Wrapper
