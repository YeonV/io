import { useMemo } from 'react'
import Home from './pages/Home'
import { useStore } from './store/OLD/useStore'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { HashRouter, Routes, Route } from 'react-router-dom'
import pkg from '../../../package.json'

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
          mode: darkMode ? 'dark' : 'light',
        },
      }),
    [darkMode]
  )
  return (
    <ThemeProvider theme={theme}>
      <HashRouter>
        <Routes>
          <Route path='/' element={<Home />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
