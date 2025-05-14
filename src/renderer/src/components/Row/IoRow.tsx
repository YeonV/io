// src/renderer/src/components/Row/IoRow.tsx
import { FC, useMemo, useState } from 'react'
import {
  Stack,
  IconButton,
  Card,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useMediaQuery,
  Box // Added Box for better layout control
} from '@mui/material'
import { Delete, Help, PlayArrow } from '@mui/icons-material'
import type { Row } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'

const IoRow: FC<{ row: Row }> = ({ row }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  const mobile = useMediaQuery('(max-width:600px)')
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const deleteRowAction = useMainStore((state) => state.deleteRow)

  const handlePopupClickOpen = () => setOpenDeleteDialog(true)
  const handlePopupClose = () => setOpenDeleteDialog(false)
  const handleDelete = () => {
    deleteRowAction(row)
    setOpenDeleteDialog(false)
  }

  // --- Get Implementations from Registry ---
  const InputActionsHook = useMemo(
    () =>
      row.inputModule
        ? (moduleImplementations[row.inputModule as keyof ModuleImplementationMap] as any)
            ?.useInputActions
        : undefined,
    [row.inputModule]
  )
  const OutputActionsHook = useMemo(
    () =>
      row.outputModule
        ? (moduleImplementations[row.outputModule as keyof ModuleImplementationMap] as any)
            ?.useOutputActions
        : undefined,
    [row.outputModule]
  )
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

  // --- Call Action Hooks (if they exist) ---
  // These hooks are called at the top level of the component, which is correct.
  if (InputActionsHook) {
    InputActionsHook(row)
  }
  if (OutputActionsHook) {
    OutputActionsHook(row)
  }

  const handleManualTrigger = () => {
    window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
  }

  return (
    <Stack
      direction={mobile ? 'column' : 'row'}
      sx={{
        borderTop: mobile ? 0 : '1px solid #666',
        width: mobile ? '95%' : '100%',
        margin: mobile ? '1rem auto' : 0,
        borderRadius: mobile ? '10px' : 0, // Use theme spacing or numbers
        overflow: mobile ? 'hidden' : 'unset',
        bgcolor: 'background.paper', // Add background for Card-like appearance if needed
        mb: mobile ? 2 : 0 // Spacing between rows on mobile
      }}
    >
      {/* Input Section */}
      <Box
        sx={{
          flexBasis: desktop ? '50%' : 'calc(50% - 48px)', // Or use theme.spacing
          minHeight: '50px', // Ensure consistent height
          display: 'flex',
          alignItems: 'center',
          padding: mobile ? '10px 0 10px 10px' : '0 0 0 10px', // Adjusted padding
          borderRight: !mobile ? '1px solid #666' : 'none', // Separator on desktop
          borderBottom: '1px solid #666'
        }}
      >
        {SelectedModuleInputDisplay ? (
          <SelectedModuleInputDisplay input={row.input} />
        ) : (
          <Help fontSize="large" sx={{ color: 'text.disabled' }} />
        )}
        {/* Spacer for mobile if actions were on right, but actions are below now */}
        {/* {mobile && <Box sx={{ width: '96px', flexShrink: 0 }} />} */}
      </Box>

      {/* Output Section & Actions */}
      <Box
        sx={{
          flexBasis: desktop ? '50%' : '100%', // Full width on mobile if below input
          display: 'flex',
          alignItems: 'center',
          padding: mobile ? '10px 10px 10px 10px' : '0 10px 0 10px', // Consistent padding
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
  )
}

export default IoRow
