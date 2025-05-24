// src/renderer/src/components/Settings/SettingsGeneral.tsx
import { Paper, Typography, Divider } from '@mui/material'
import { type FC } from 'react'
import SettingsStartup from './SettingsStartup'
import SettingsWindowBehavior from './SettingsWindowBehavior'
import SettingsData from './SettingsData'

const SettingsGeneral: FC = () => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        General Application Settings
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Configure core application behaviors and data management.
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <SettingsStartup />
      <SettingsWindowBehavior />
      <SettingsData />

      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Settings for &quot;Close Button Action&quot;, &quot;Update Checks&quot; will appear here.
      </Typography>
    </Paper>
  )
}

export default SettingsGeneral
