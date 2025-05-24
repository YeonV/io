import { Paper, Typography } from '@mui/material'

const SettingsGeneral = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        General Settings
      </Typography>
      <Typography variant="body2">
        Configure general application behavior. (More settings coming soon!)
      </Typography>
      {/* Example: Start on Login, Minimize to Tray, etc. (would require main process integration) */}
    </Paper>
  )
}

export default SettingsGeneral
