// src/renderer/src/components/Settings/ProfileEditorDialog.tsx
import type { FC } from 'react'
import { useState, useEffect, useMemo } from 'react'
import {
  Button,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemText,
  ListItemIcon,
  Paper,
  TextField,
  Checkbox,
  Stack,
  ListItemButton
} from '@mui/material'
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material'
import IoIcon from '../IoIcon/IoIcon' // Adjust path if IoIcon is elsewhere
import type { ProfileEditorDialogProps } from './ProfileManagerSettings.types' // Keep types co-located or move

export const ProfileEditorDialog: FC<ProfileEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  initialProfile,
  allRows
}) => {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('people')
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (initialProfile) {
        setName(initialProfile.name || '')
        setIcon(initialProfile.icon || 'people')
        setSelectedRowIds([...initialProfile.includedRowIds]) // Create new array instance
        setCurrentProfileId(initialProfile.id)
      } else {
        setName('')
        setIcon('people')
        setSelectedRowIds([])
        setCurrentProfileId(null)
      }
    }
  }, [open, initialProfile])

  const handleRowToggle = (rowId: string) =>
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    )

  const handleSaveDialog = () => {
    if (!name.trim()) {
      alert('Profile name is required.')
      return
    }
    onSave({
      id: currentProfileId || undefined,
      name: name.trim(),
      icon: icon.trim() || 'people',
      includedRowIds: selectedRowIds
    })
    onClose()
  }

  const sortedRowsArray = useMemo(
    () =>
      Object.values(allRows).sort((a, b) => {
        const nameA = a.output.label || a.output.name || `Row ${a.id.substring(0, 4)}`
        const nameB = b.output.label || b.output.name || `Row ${b.id.substring(0, 4)}`
        return nameA.localeCompare(nameB)
      }),
    [allRows]
  )

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (e) => {
            e.preventDefault()
            handleSaveDialog()
          }
        }
      }}
    >
      <DialogTitle>{initialProfile ? 'Edit' : 'Create New'} Profile</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Profile Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Profile Icon (MUI or MDI Icon Name)" // Updated helper text
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            fullWidth
            helperText="e.g., work, home, mdi:coffee"
            InputProps={{ startAdornment: <IoIcon name={icon} style={{ marginRight: 8 }} /> }}
          />
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
            Include Rows in this Profile:
          </Typography>
          {Object.keys(allRows).length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
              No rows configured yet to include in a profile.
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto' }}>
              <List dense disablePadding>
                {sortedRowsArray.map((row) => (
                  <ListItemButton key={row.id} onClick={() => handleRowToggle(row.id)} dense>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={selectedRowIds.includes(row.id)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                        icon={<RadioButtonUnchecked fontSize="small" />}
                        checkedIcon={<CheckCircle color="primary" fontSize="small" />}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        row.output.label || row.output.name || `Row ${row.id.substring(0, 8)}`
                      }
                      secondary={`${row.input.data.name || row.inputModule.replace('-module', '')} → ${row.output.name || row.outputModule.replace('-module', '')}`}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          Save Profile
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProfileEditorDialog // Default export if it's the main thing in this file
