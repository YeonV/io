// src/renderer/src/components/utils/Wrapper.tsx

import { Box, Typography, useTheme } from '@mui/material'
import styles from '@/styles/app.module.css'
import logo from '@/assets/icon.png'
import logoTitle from '@/assets/logo-cropped.svg'
import pkg from '../../../../../package.json'
import FiledropProvider from './FiledropProvider'
import Footer from '../Footer'

const ipcRenderer = window.electron?.ipcRenderer || false

const Wrapper = ({ children }: any) => {
  const theme = useTheme()

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
            <img
              src={logo}
              style={{
                width: '100px',
                filter: `invert(${theme.palette.mode === 'dark' ? '0' : '1'})`
              }}
              alt="logoIO"
            />
            <div className={styles.imgBox}>
              <img
                src={logoTitle}
                style={{
                  width: '480px',
                  filter: `invert(${theme.palette.mode === 'dark' ? '0' : '1'})`
                }}
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
          <div />
          <Footer />
        </div>
      </Box>
    </FiledropProvider>
  )
}

export default Wrapper
