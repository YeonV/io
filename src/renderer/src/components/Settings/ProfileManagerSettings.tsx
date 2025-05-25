// src/renderer/src/components/Settings/ProfileManagerSettings.tsx
import type { FC } from 'react'
import { useState, useMemo } from 'react'
import { useMainStore } from '@/store/mainStore'
import {
  Box,
  Button,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, // Keep Dialog for the widget's "Manage" button
  SelectChangeEvent
} from '@mui/material'
import { Settings as SettingsIcon } from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon'
import { ProfileManagerContent } from './ProfileManagerContent' // Import the new content component

// Props might be needed if the parent settings page (SettingsProfiles.tsx) needs to pass anything.
// For now, assuming it's self-contained for the Home widget.
// export interface ProfileManagerSettingsProps {
//   isEmbedded?: boolean; // Example prop if behavior needs to change when embedded
// }

export const ProfileManagerSettings: FC = () => {
  const profiles = useMainStore((state) => state.profiles)
  const activeProfileId = useMainStore((state) => state.activeProfileId)
  const setActiveProfile = useMainStore((state) => state.setActiveProfile)

  const [manageProfilesDialogOpen, setManageProfilesDialogOpen] = useState(false)

  const sortedProfiles = useMemo(
    () => Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name)),
    [profiles]
  )

  const handleSetActiveProfile = (event: SelectChangeEvent<string>) => {
    setActiveProfile(event.target.value || null)
  }

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        minWidth: 285, // Keep minWidth for Home widget
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        height: '100%', // Ensure it can take full height if parent allows
        boxSizing: 'border-box'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="overline">Active Profile</Typography>
      </Box>
      <FormControl fullWidth size="small">
        <Select
          value={activeProfileId || ''}
          onChange={handleSetActiveProfile}
          displayEmpty
          sx={{ '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
        >
          <MenuItem value="">
            <em>None (All Rows Active)</em>
          </MenuItem>
          {sortedProfiles.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              <ListItemIcon sx={{ minWidth: 32, mr: 0.5 }}>
                <IoIcon name={p.icon || 'people'} />
              </ListItemIcon>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        startIcon={<SettingsIcon />}
        onClick={() => setManageProfilesDialogOpen(true)}
        variant="outlined"
        size="small"
        sx={{ height: 41, mt: 'auto' /* Push to bottom if space allows */ }}
        fullWidth
      >
        Manage Profiles ({sortedProfiles.length})
      </Button>

      {/* Dialog for the Home Widget to show ProfileManagerContent */}
      <Dialog
        open={manageProfilesDialogOpen}
        onClose={() => setManageProfilesDialogOpen(false)}
        fullWidth
        maxWidth="md" // Or your preferred size for profile management
        PaperProps={{ sx: { height: 'auto', maxHeight: 'min(800px, 75vh)' } }} // Example fixed height for dialog
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Manage IO Profiles
          <Button onClick={() => setManageProfilesDialogOpen(false)} size="small">
            Close
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 /* Let content manage its padding */ }}>
          {/* Render the reusable content component */}
          <ProfileManagerContent />
        </DialogContent>
        {/* Actions might be redundant if ProfileManagerContent has its own, or keep a simple Close */}
        {/* <DialogActions> <Button onClick={() => setManageProfilesDialogOpen(false)}>Close</Button> </DialogActions> */}
      </Dialog>
    </Paper>
  )
}

export default ProfileManagerSettings
