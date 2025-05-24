import { useMainStore } from '@/store/mainStore'
import { FormControlLabel, Paper, Switch, Typography } from '@mui/material'

const ipcRenderer = window.electron?.ipcRenderer || false

const SettingsAppearance = () => {
  const darkMode = useMainStore((state) => state.ui.darkMode)
  const setDarkMode = useMainStore((state) => state.setDarkMode)

  const toggleDarkmodeSystem = () => {
    if (ipcRenderer) {
      ipcRenderer.sendSync('toggle-darkmode', 'try') // Request system theme toggle
      // Main process should ideally emit an event if system theme *actually* changed,
      // or we can just toggle UI and assume system followed if successful.
      // For now, just toggle UI state.
      const currentSystemDarkMode = ipcRenderer.sendSync('get-darkmode') === 'yes'
      setDarkMode(currentSystemDarkMode)
    } else {
      // Web fallback: just toggle local theme
      setDarkMode(!darkMode)
    }
  }
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={darkMode === true} // Handle null initial state
            onChange={toggleDarkmodeSystem}
          />
        }
        label={`Dark Mode ${darkMode === null ? '(System Default)' : darkMode ? '(On)' : '(Off)'}`}
      />
      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
        Toggles the application&apos;s theme. Attempts to sync with system theme in Electron.
      </Typography>
      {/* Other appearance settings: Font size, compact mode, etc. */}
    </Paper>
  )
}

export default SettingsAppearance
