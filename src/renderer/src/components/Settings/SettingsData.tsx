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
  Stack,
  Paper,
  Grid
} from '@mui/material' // Added Grid
import { DeleteSweep as ClearIcon, WarningAmberOutlined as WarningIcon } from '@mui/icons-material'
import { useState, type FC } from 'react'
import { useMainStore } from '@/store/mainStore'
import { id as restModuleId } from '@/modules/Rest/Rest'
import { nuke as nukeAllAppData } from '../utils/nuke'
import { clearAllAudioFromDB } from '@/modules/PlaySound/lib/db'
import { useSnackbar } from 'notistack'

interface DataClearAction {
  id: string
  label: string
  description: string
  actionFn: () => void
  buttonColor?: 'warning' | 'error'
  buttonVariant?: 'outlined' | 'contained'
}

const SettingsData: FC = () => {
  const { enqueueSnackbar } = useSnackbar()
  const setModuleConfigValue = useMainStore((state) => state.setModuleConfigValue)

  const [confirmDialogOpen, setConfirmDialogOpen] =
    useState(false) /* ... (same confirm dialog state) ... */
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const openConfirmation = (title: string, message: string, action: () => void) => {
    /* ... (same) ... */ setConfirmTitle(title)
    setConfirmMessage(message)
    setConfirmAction(() => action)
    setConfirmDialogOpen(true)
  }

  const dataClearActions: DataClearAction[] = [
    {
      id: 'clearHistory',
      label: 'Clear Row Trigger History',
      description: 'Removes all entries from the row trigger history log.',
      actionFn: () => {
        useMainStore.setState(
          (state) => ({ ...state, rowHistory: [] }),
          false,
          'clearRowHistory/manual'
        )
        enqueueSnackbar('Row history cleared.', { variant: 'success' })
      },
      buttonColor: 'warning',
      buttonVariant: 'outlined'
    },
    {
      id: 'clearRestData',
      label: 'Clear REST Presets & Blueprints',
      description: 'Deletes all saved REST presets and imported/created blueprints.',
      actionFn: () => {
        setModuleConfigValue(restModuleId, 'presets', [])
        setModuleConfigValue(restModuleId, 'blueprints', [])
        enqueueSnackbar('REST data cleared.', { variant: 'success' })
      },
      buttonColor: 'warning',
      buttonVariant: 'outlined'
    },
    {
      id: 'clearSoundCache',
      label: 'Clear Cached Sounds (PlaySound)',
      description: 'Removes all audio files cached by the PlaySound module.',
      actionFn: async () => {
        try {
          await clearAllAudioFromDB()
          enqueueSnackbar('Sound cache cleared.', { variant: 'success' })
        } catch (e) {
          enqueueSnackbar('Failed to clear sound cache.', { variant: 'error' })
        }
      },
      buttonColor: 'warning',
      buttonVariant: 'outlined'
    },
    {
      id: 'nukeAll',
      label: 'Reset All Application Data (NUKE)',
      description:
        'Resets the entire application to its default state. All your data (rows, profiles, settings) will be lost. This action is irreversible.',
      actionFn: () => nukeAllAppData(),
      buttonColor: 'error',
      buttonVariant: 'contained'
    }
  ]

  return (
    <>
      <Stack spacing={2}>
        {dataClearActions.map((item) => (
          <Paper key={item.id} variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.description}
                </Typography>
              </Box>
              <Button
                variant={item.buttonVariant || 'outlined'}
                color={item.buttonColor || 'warning'}
                startIcon={item.buttonColor === 'error' ? <WarningIcon /> : <ClearIcon />}
                onClick={() =>
                  openConfirmation(
                    item.buttonColor === 'error'
                      ? `Confirm ${item.label}`
                      : `Confirm ${item.label}`,
                    item.buttonColor === 'error'
                      ? `${item.description} Are you absolutely sure?`
                      : `Are you sure you want to ${item.label.toLowerCase()}? This cannot be undone.`,
                    () => {
                      item.actionFn()
                      setConfirmDialogOpen(false)
                    }
                  )
                }
                size="small"
                sx={{ ml: 2, flexShrink: 0 }} // Prevent button from shrinking too much
              >
                {item.buttonColor === 'error' ? 'Reset' : 'Clear'}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* Confirmation Dialog (same as before) */}
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
