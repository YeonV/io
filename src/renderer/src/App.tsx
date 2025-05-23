import { useEffect, useMemo, useState } from 'react'
import Home from './pages/Home'
import { useMainStore } from '@/store/mainStore'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { HashRouter, Routes, Route } from 'react-router-dom'
import pkg from '../../../package.json'
import ErrorBoundary from './components/utils/ErrorBoundary'

import Deck from './pages/Deck'
import { SnackbarProvider } from 'notistack'

const ipcRenderer = window.electron?.ipcRenderer || false

const App = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)

  const [osShouldUseDark, setOsShouldUseDark] = useState(() => {
    if (ipcRenderer) {
      const initialInfo = ipcRenderer.sendSync('get-initial-theme-info') as {
        userPreference: 'light' | 'dark' | 'system'
        shouldUseDarkColors: boolean
      }
      return initialInfo.shouldUseDarkColors
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || true
  })

  useEffect(() => {
    if (!ipcRenderer) return
    const handleSystemThemeChange = (
      _event: any,
      { shouldUseDarkColors }: { shouldUseDarkColors: boolean }
    ) => {
      console.log(
        '[App.tsx] Received system-theme-changed-in-main, shouldUseDarkColors:',
        shouldUseDarkColors
      )
      setOsShouldUseDark(shouldUseDarkColors)
    }

    ipcRenderer.on('system-theme-changed-in-main', handleSystemThemeChange)
    return () => {
      ipcRenderer.removeListener('system-theme-changed-in-main', handleSystemThemeChange)
    }
  }, [])

  const muiTheme = useMemo(() => {
    let currentMode: 'light' | 'dark'
    if (themeChoice === 'system') {
      currentMode = osShouldUseDark ? 'dark' : 'light'
    } else {
      currentMode = themeChoice
    }
    console.log(
      `[App.tsx] Creating MUI theme with mode: ${currentMode} (Choice: ${themeChoice}, OS Dark: ${osShouldUseDark})`
    )

    return createTheme({
      components: {
        /* ... component defaults ... */
      },
      palette: {
        primary: {
          main:
            pkg.env.VITRON_PRIMARY_COLOR === 'default'
              ? currentMode === 'dark'
                ? '#CCC'
                : '#333'
              : pkg.env.VITRON_PRIMARY_COLOR
        },
        secondary: {
          main:
            pkg.env.VITRON_SECONDARY_COLOR === 'default'
              ? currentMode === 'dark'
                ? '#999'
                : '#666'
              : pkg.env.VITRON_SECONDARY_COLOR
        },
        mode: currentMode
      }
    })
  }, [themeChoice, osShouldUseDark])

  return (
    <ThemeProvider theme={muiTheme}>
      <ErrorBoundary>
        <SnackbarProvider maxSnack={3}>
          <HashRouter>
            <Routes>
              {window.location.pathname === '/deck/' ? (
                <Route path="/" element={<Deck />} />
              ) : (
                <>
                  <Route path="/" element={<Home />} />
                  <Route path="/deck" element={<Deck />} />
                </>
              )}
            </Routes>
          </HashRouter>
        </SnackbarProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
