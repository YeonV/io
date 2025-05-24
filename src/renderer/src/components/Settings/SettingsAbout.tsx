import { Button, Paper, Typography } from '@mui/material'
import { useState } from 'react'
import pkg from '../../../../../package.json' with { type: 'json' }

const ipcRenderer = window.electron?.ipcRenderer || false

const SettingsAbout = () => {
  const [versions] = useState(window.electron.process.versions)
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        About IO
      </Typography>
      <Typography variant="body1" gutterBottom>
        InputOutput Automation Hub
      </Typography>
      <Typography variant="body2">Version: {pkg.version}</Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Electron: {ipcRenderer ? versions?.electron || 'N/A' : 'N/A (Running in Web Mode)'} <br />
        Chromium: {ipcRenderer ? versions?.chrome || 'N/A' : 'N/A'} <br />
        Node.js: {ipcRenderer ? versions?.node || 'N/A' : 'N/A'} <br />
        V8: {ipcRenderer ? versions?.v8 || 'N/A' : 'N/A'}
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Created with ❤️ by Blade (YeonV).
      </Typography>
      <Button
        sx={{ mt: 2 }}
        variant="outlined"
        onClick={() =>
          ipcRenderer &&
          ipcRenderer.send('open-link-external', `https://github.com/${pkg.author}/${pkg.name}`)
        }
      >
        GitHub Repository
      </Button>
    </Paper>
  )
}

export default SettingsAbout
