// src/renderer/src/components/Row/IoRow.tsx
import { FC, MouseEvent, useMemo, useState } from 'react'
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
  Switch,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material'
import { Delete, Help, MoreVert, Edit as EditIcon, PlayCircleOutline } from '@mui/icons-material'
import type { ModuleId, Row } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'
import { useRowActivation } from '@/hooks/useRowActivation'
import IoNewRow, { PrefillData } from './IoNewRow'

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
  const [anchorElMenu, setAnchorElMenu] = useState<null | HTMLElement>(null) // For the 3-dot menu
  const openMenu = Boolean(anchorElMenu)

  const [isEditingRow, setIsEditingRow] = useState(false) // State to control IoNewRow for editing
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const deleteRowAction = useMainStore((state) => state.deleteRow)
  const toggleRowEnabledAction = useMainStore((state) => state.toggleRowEnabled)
  const { isEnabled, isActive } = useRowActivation(row)

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorElMenu(event.currentTarget)
  }
  const handleMenuClose = () => {
    setAnchorElMenu(null)
  }

  const handleToggleEnable = () => {
    toggleRowEnabledAction(row.id)
  }

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true)
    handleMenuClose()
  }
  const handleConfirmDelete = () => {
    deleteRowAction(row)
    setOpenDeleteDialog(false) // Already closed by handleDeleteClick if menu was open
  }
  const handleCloseDeleteDialog = () => setOpenDeleteDialog(false)

  const handleManualTrigger = () => {
    window.dispatchEvent(new CustomEvent('io_input', { detail: row.id }))
    handleMenuClose()
  }

  // --- Determine if Edit option should be available ---
  const inputModuleDef = useMemo(
    () => (row.inputModule ? moduleImplementations[row.inputModule] : undefined),
    [row.inputModule]
  )
  const outputModuleDef = useMemo(
    () => (row.outputModule ? moduleImplementations[row.outputModule] : undefined),
    [row.outputModule]
  )

  // Get the static config part from mainStore for the module
  const inputModuleStaticConfig = useMainStore((state) =>
    row.inputModule ? state.modules[row.inputModule] : undefined
  )
  const outputModuleStaticConfig = useMainStore((state) =>
    row.outputModule ? state.modules[row.outputModule] : undefined
  )

  const isInputEditable = useMemo(() => {
    // Check if the Input definition in the module's static config says it's editable
    const inputTypeDefinition = inputModuleStaticConfig?.inputs.find(
      (inp) => inp.name === row.input.name
    )
    return inputTypeDefinition?.editable === true && !!inputModuleDef?.InputEdit
  }, [inputModuleStaticConfig, row.input.name, inputModuleDef])

  const isOutputEditable = useMemo(() => {
    const outputTypeDefinition = outputModuleStaticConfig?.outputs.find(
      (out) => out.name === row.output.name
    )
    return outputTypeDefinition?.editable === true && !!outputModuleDef?.OutputEdit
  }, [outputModuleStaticConfig, row.output.name, outputModuleDef])

  const canEditRow = isInputEditable || isOutputEditable

  const handleEditClick = () => {
    setIsEditingRow(true)
    handleMenuClose()
  }
  const handleEditComplete = () => {
    setIsEditingRow(false)
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

  if (isEditingRow) {
    return (
      <IoNewRow
        key={`edit-${row.id}`}
        edit={row} // Pass the current row data to IoNewRow for editing
        onComplete={handleEditComplete} // Callback when editing is finished (Save or Cancel in IoNewRow)
        // startNewPrefilledRow is not used in edit mode, pass a dummy function
        startNewPrefilledRow={(_prefill: PrefillData) => {
          console.warn(
            "startNewPrefilledRow called in edit mode - this shouldn't happen for Alexa logic from edit."
          )
        }}
        // initialPrefill is not used in edit mode
        initialPrefill={undefined}
      />
    )
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
            padding: mobile ? '0px 0 0px 0px' : '0 0 0 10px',
            borderRight: !mobile ? '1px solid #666' : 'none',
            borderBottom: mobile ? 0 : '1px solid #666'
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
            padding: mobile ? '0px 0px 20px 0px' : '0 10px 0 10px',
            justifyContent: 'space-between',
            borderBottom: mobile ? 0 : '1px solid #666'
          }}
        >
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary'
            }}
          >
            {SelectedModuleOutputDisplay ? (
              <SelectedModuleOutputDisplay output={row.output} rowId={row.id} />
            ) : (
              <Help fontSize="large" sx={{ color: 'text.disabled' }} />
            )}
          </Box>
          {/* Actions: Switch + 3-dot Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, ml: 1 }}>
            <Tooltip title={isEnabled ? 'Disable Row' : 'Enable Row'}>
              <Switch
                checked={isEnabled} // Use isEnabled from useRowActivation for visual consistency
                onChange={handleToggleEnable}
                size="small"
                // disabled={!isActive && isEnabled === false && activeProfileId !== null} // More nuanced disable for the switch itself
              />
            </Tooltip>
            <IconButton
              aria-label="more actions"
              id={`actions-menu-button-${row.id}`}
              aria-controls={openMenu ? `actions-menu-${row.id}` : undefined}
              aria-expanded={openMenu ? 'true' : undefined}
              aria-haspopup="true"
              onClick={handleMenuOpen}
              size="small"
            >
              <MoreVert />
            </IconButton>
            <Menu
              id={`actions-menu-${row.id}`}
              MenuListProps={{ 'aria-labelledby': `actions-menu-button-${row.id}` }}
              anchorEl={anchorElMenu}
              open={openMenu}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleManualTrigger} disabled={!isActive}>
                
                {/* Disable if row isn't active */}
                <ListItemIcon>
                  <PlayCircleOutline fontSize="small" />
                </ListItemIcon>
                <ListItemText>Trigger Manually</ListItemText>
              </MenuItem>
              {canEditRow && ( // Conditionally render Edit option
                <MenuItem onClick={handleEditClick}>
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Edit Row</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <Delete fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText>Delete Row</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Stack>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog} /* ... */>
        <DialogTitle>Delete this IO Row?</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default IoRow
