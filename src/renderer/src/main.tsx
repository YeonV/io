import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from '@mui/material'
import theme from './styles/theme'
// import { StrictMode } from 'react'
import './styles/index.css'
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <StrictMode>
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>
  // </StrictMode>
)
if (window.removeLoading) window.removeLoading()

// console.log('fs', window.fs);
// console.log('ipcRenderer', window.ipcRenderer);

// Usage of ipcRenderer.on
if (window.electron?.ipcRenderer)
  window.electron.ipcRenderer.on('main-process-message', (_event, ..._args) => {
    // console.log('[Receive Main-process message]:', ...args);
  })
