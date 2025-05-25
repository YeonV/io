// src/renderer/src/components/Settings/SettingsData.tsx
import {
  Typography,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack
} from '@mui/material'
import { DeleteSweep as ClearIcon, WarningAmberOutlined as WarningIcon } from '@mui/icons-material'
import { useState, type FC } from 'react'
import { useMainStore } from '@/store/mainStore'
import { id as restModuleId } from '@/modules/Rest/Rest'
import { nuke as nukeAllAppData } from '../utils/nuke' // Path relative to components/Settings/
import { clearAllAudioFromDB } from '@/modules/PlaySound/lib/db'
import { useSnackbar } from 'notistack'

const SettingsData: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const setModuleConfigValue = useMainStore((state) => state.setModuleConfigValue)

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')

  const openConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setConfirmAction(() => action)
    setConfirmDialogOpen(true)
  }
  const handleClearRowHistory = () => {
    openConfirmation('Clear History?', '...', () => {
      useMainStore.setState(
        (state) => ({ ...state, rowHistory: [] }),
        false,
        'clearRowHistory/manual'
      )
      enqueueSnackbar('Row history cleared.', { variant: 'success' })
      setConfirmDialogOpen(false)
    })
  }
  const handleClearRestData = () => {
    openConfirmation('Clear REST Data?', '...', () => {
      setModuleConfigValue(restModuleId, 'presets', [])
      setModuleConfigValue(restModuleId, 'blueprints', [])
      enqueueSnackbar('REST data cleared.', { variant: 'success' })
      setConfirmDialogOpen(false)
    })
  }
  const handleClearSoundCache = () => {
    openConfirmation('Clear Sounds?', '...', async () => {
      try {
        await clearAllAudioFromDB()
        enqueueSnackbar('Sound cache cleared.', { variant: 'success' })
      } catch (e) {
        enqueueSnackbar('Failed to clear sound cache.', { variant: 'error' })
      }
      setConfirmDialogOpen(false)
    })
  }
  const handleNukeAllData = () => {
    openConfirmation('NUKE ALL DATA?', 'WARNING: ...', () => {
      nukeAllAppData()
      setConfirmDialogOpen(false)
    })
  }

  return (
    // Removed top Typography title and Divider
    <>
      <Stack spacing={2} alignItems="flex-start">
        <Button
          variant="outlined"
          color="warning"
          startIcon={<ClearIcon />}
          onClick={handleClearRowHistory}
          size="small"
        >
          Clear Row History
        </Button>
        {/* ... other clear buttons ... */}
        <Button
          variant="outlined"
          color="warning"
          startIcon={<ClearIcon />}
          onClick={handleClearRestData}
          size="small"
        >
          Clear REST Presets & Blueprints
        </Button>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<ClearIcon />}
          onClick={handleClearSoundCache}
          size="small"
        >
          Clear Cached Sounds
        </Button>

        <Box
          sx={{
            mt: '16px !important',
            pt: 2,
            borderTop: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            width: '100%'
          }}
        >
          {/* Use !important for mt if Stack spacing overrides */}
          <Button
            variant="contained"
            color="error"
            startIcon={<WarningIcon />}
            onClick={handleNukeAllData}
            size="small"
          >
            Reset All Application Data (NUKE)
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'error.light' }}>
            Resets the entire application. All your data will be lost.
          </Typography>
        </Box>
      </Stack>
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <WarningIcon color="warning" sx={{ mr: 1 }} /> {confirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (confirmAction) confirmAction()
            }}
            color={confirmTitle.toLowerCase().includes('nuke') ? 'error' : 'warning'}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
export default SettingsData
