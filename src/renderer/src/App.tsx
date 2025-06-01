import { useEffect, useMemo, useState } from 'react'
import Home from './pages/Home'
import { useMainStore } from '@/store/mainStore'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { HashRouter, Routes, Route } from 'react-router-dom'
import pkg from '../../../package.json'
import ErrorBoundary from './components/utils/ErrorBoundary'

import Deck from './pages/Deck'
import { SnackbarProvider } from 'notistack'
import { useShallow } from 'zustand/react/shallow'
import IntegrationSettingsPage from './pages/integrations/IntegrationSettingsPage'

const ipcRenderer = window.electron?.ipcRenderer || false

const App = () => {
  const themeChoice = useMainStore((state) => state.ui.themeChoice)
  const { primaryLight, primaryDark, secondaryDark, secondaryLight } = useMainStore(
    useShallow((state) => state.ui.themeColors)
  )

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
    // console.log(
    //   `[App.tsx] Creating MUI theme with mode: ${currentMode} (Choice: ${themeChoice}, OS Dark: ${osShouldUseDark})`
    // )

    return createTheme({
      components: {
        /* ... component defaults ... */
      },
      palette: {
        primary: {
          main:
            pkg.env.VITRON_PRIMARY_COLOR === 'default'
              ? currentMode === 'dark'
                ? primaryDark
                : primaryLight
              : pkg.env.VITRON_PRIMARY_COLOR
        },
        secondary: {
          main:
            pkg.env.VITRON_SECONDARY_COLOR === 'default'
              ? currentMode === 'dark'
                ? secondaryDark
                : secondaryLight
              : pkg.env.VITRON_SECONDARY_COLOR
        },
        mode: currentMode
      }
    })
  }, [themeChoice, osShouldUseDark, primaryLight, primaryDark, secondaryLight, secondaryDark])

  return (
    <ThemeProvider theme={muiTheme}>
      <ErrorBoundary>
        <SnackbarProvider maxSnack={3}>
          <HashRouter>
            <Routes>
              {window.location.pathname === '/deck/' ? (
                <Route path="/" element={<Deck />} />
              ) : window.location.pathname.startsWith('/integrations') ? (
                <Route path="/" element={<IntegrationSettingsPage />} />
              ) : (
                <>
                  <Route path="/" element={<Home />} />
                  <Route path="/deck" element={<Deck />} />
                  <Route
                    path="/integrations/:integrationName"
                    element={<IntegrationSettingsPage />}
                  />
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
