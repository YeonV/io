// src/renderer/src/components/Row/IoRow.tsx
import { FC, useMemo, useState } from 'react'
import {
  Stack,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  Box,
  Switch
} from '@mui/material'
import { Delete, Help, PlayArrow } from '@mui/icons-material'
import type { ModuleId, Row } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useRowActivation } from '@/hooks/useRowActivation'

const InputActionRunner: FC<{ moduleId?: ModuleId | null; row: Row }> = ({ moduleId, row }) => {
  const hookToRun = useMemo(
    () =>
      moduleId
        ? (moduleImplementations[moduleId as keyof ModuleImplementationMap] as any)?.useInputActions
        : undefined,
    [moduleId]
  )

  if (hookToRun) {
    hookToRun(row)
  }
  return null
}

const OutputActionRunner: FC<{ moduleId?: ModuleId | null; row: Row }> = ({ moduleId, row }) => {
  const hookToRun = useMemo(
    () =>
      moduleId
        ? (moduleImplementations[moduleId as keyof ModuleImplementationMap] as any)
            ?.useOutputActions
        : undefined,
    [moduleId]
  )

  if (hookToRun) {
    hookToRun(row)
  }
  return null
}

const IoRow: FC<{ row: Row }> = ({ row }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  const mobile = useMediaQuery('(max-width:600px)')
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const deleteRowAction = useMainStore((state) => state.deleteRow)
  const toggleRowEnabledAction = useMainStore((state) => state.toggleRowEnabled)
  const { isEnabled } = useRowActivation(row)

  const handleToggleEnable = () => {
    toggleRowEnabledAction(row.id)
  }

  const handlePopupClickOpen = () => setOpenDeleteDialog(true)
  const handlePopupClose = () => setOpenDeleteDialog(false)
  const handleDelete = () => {
    deleteRowAction(row)
    setOpenDeleteDialog(false)
  }

  const SelectedModuleInputDisplay = useMemo(
    () =>
      row.inputModule
        ? (moduleImplementations[row.inputModule as keyof ModuleImplementationMap] as any)
            ?.InputDisplay
        : undefined,
    [row.inputModule]
  )
  const SelectedModuleOutputDisplay = useMemo(
    () =>
      row.outputModule
        ? (moduleImplementations[row.outputModule as keyof ModuleImplementationMap] as any)
            ?.OutputDisplay
        : undefined,
    [row.outputModule]
  )

  const handleManualTrigger = () => {
    window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
  }

  return (
    <>
      <InputActionRunner moduleId={row.inputModule} row={row} />
      <OutputActionRunner moduleId={row.outputModule} row={row} />

      <Stack
        direction={mobile ? 'column' : 'row'}
        sx={{
          borderTop: mobile ? 0 : '1px solid #666',
          width: mobile ? '95%' : '100%',
          margin: mobile ? '1rem auto' : 0,
          borderRadius: mobile ? '10px' : 0,
          overflow: mobile ? 'hidden' : 'unset',
          bgcolor: 'background.paper',
          mb: mobile ? 2 : 0,
          opacity: isEnabled === false ? 0.5 : 1
        }}
      >
        {/* Input Section */}
        <Box
          sx={{
            flexBasis: desktop ? '50%' : 'calc(50% - 48px)',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            padding: mobile ? '10px 0 10px 10px' : '0 0 0 10px',
            borderRight: !mobile ? '1px solid #666' : 'none',
            borderBottom: '1px solid #666'
          }}
        >
          {SelectedModuleInputDisplay ? (
            <SelectedModuleInputDisplay input={row.input} />
          ) : (
            <Help fontSize="large" sx={{ color: 'text.disabled' }} />
          )}
        </Box>

        {/* Output Section & Actions */}
        <Box
          sx={{
            flexBasis: desktop ? '50%' : '100%',
            display: 'flex',
            alignItems: 'center',
            padding: mobile ? '10px 10px 10px 10px' : '0 10px 0 10px',
            justifyContent: 'space-between',
            borderBottom: '1px solid #666'
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              pointerEvents: 'none'
            }}
          >
            {SelectedModuleOutputDisplay ? (
              <SelectedModuleOutputDisplay output={row.output} />
            ) : (
              <Help fontSize="large" sx={{ color: 'text.disabled' }} />
            )}
          </Box>
          {/* Action Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <IconButton
              color="primary"
              sx={{ mr: 0.5 }}
              onClick={handleManualTrigger}
              title="Manually Trigger Row"
            >
              <PlayArrow />
            </IconButton>
            <IconButton
              color="primary"
              sx={{ mr: 0 }}
              onClick={handlePopupClickOpen}
              title="Delete Row"
            >
              <Delete />
            </IconButton>
            <Switch
              checked={row.enabled === undefined ? true : row.enabled}
              onChange={handleToggleEnable}
              size="small"
              title={row.enabled ? 'Disable Row' : 'Enable Row'}
            />
          </Box>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={handlePopupClose}
          aria-labelledby="delete-dialog-title"
        >
          <DialogTitle id="delete-dialog-title">Delete this IO Row?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this row? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePopupClose}>Cancel</Button>
            <Button onClick={handleDelete} color="error" autoFocus>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </>
  )
}

export default IoRow
