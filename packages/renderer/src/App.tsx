import { useMemo } from 'react'
import Home from './pages/Home'
import { useStore } from './store/OLD/useStore'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { HashRouter, Routes, Route } from 'react-router-dom'
import pkg from '../../../package.json'
import ErrorBoundary from './components/utils/ErrorBoundary'
import Wrapper from './components/utils/Wrapper'
import Deck from './pages/Deck'
import { SnackbarProvider } from 'notistack'

const App = () => {
  const darkMode = useStore((state) => state.ui.darkMode)

  const theme = useMemo(
    () =>
      createTheme({
        components: {
          MuiButton: {
            defaultProps: {
              variant: 'contained',
              size: 'small',
            },
          },
          MuiChip: {
            defaultProps: {
              variant: 'outlined',
              sx: {
                m: 0.3,
              },
            },
          },
        },
        palette: {
          primary: {
            main:
              pkg.env.VITRON_PRIMARY_COLOR === 'default'
                ? '#888'
                : pkg.env.VITRON_PRIMARY_COLOR,
          },
          secondary: {
            main:
              pkg.env.VITRON_SECONDARY_COLOR === 'default'
                ? '#333'
                : pkg.env.VITRON_SECONDARY_COLOR,
          },
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  )

  return (
    <ThemeProvider theme={theme}>
      <ErrorBoundary>
        <SnackbarProvider maxSnack={3}>
          <HashRouter>
            <Routes>
              {window.location.pathname === '/deck/' ? (
                <Route path='/' element={<Deck />} />
              ) : (
                <>
                  <Route path='/' element={<Home />} />
                  <Route path='/deck' element={<Deck />} />
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
