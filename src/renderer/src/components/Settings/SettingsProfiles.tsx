// src/renderer/src/components/Settings/SettingsProfiles.tsx
import type { FC } from 'react'
import { Paper, Typography, Box } from '@mui/material'
import { ProfileManagerContent } from './ProfileManagerContent' // Import the core content

const SettingsProfiles: FC = () => {
  return (
    <Paper
      sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      {/* Optional: Title for this specific settings pane, if needed */}
      {/* <Typography variant="h6" sx={{ p: 2, pb: 1, borderBottom:1, borderColor:'divider' }}>
        Profile Management
      </Typography> */}

      {/* Directly embed the ProfileManagerContent */}
      {/* ProfileManagerContent is designed to fill height if its parent is flex column with overflow hidden */}
      <ProfileManagerContent />
    </Paper>
  )
}

export default SettingsProfiles
