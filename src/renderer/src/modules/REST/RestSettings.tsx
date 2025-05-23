// src/renderer/src/modules/REST/RestSettings.tsx
import type { FC, DragEvent } from 'react' // Added DragEvent
import { useState, useCallback } from 'react' // Added useCallback
import {
  Button,
  Paper,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Stack,
  Divider,
  ListItemIcon,
  ListItemButton,
  Box // Added Box for dropzone
} from '@mui/material'
import {
  AddCircleOutline,
  Delete,
  Edit,
  Extension as BlueprintIcon,
  // ChevronRight as ChevronRightIcon,
  Download as ExportIcon, // Added ExportIcon
  UploadFile as UploadFileIcon, // For dropzone visual
  DeleteForever as DeleteBlueprintIcon
} from '@mui/icons-material'
import { v4 as uuidv4 } from 'uuid'
import { useMainStore } from '@/store/mainStore'
import type {
  RestPresetDefinition,
  BlueprintDefinition,
  RestModuleCustomConfig,
  SimpleInputFieldValue
} from './REST.types'
import { id as restModuleId } from './REST'
import { RestPresetDialog } from './RestPresetDialog'
import { BlueprintRunnerDialog } from './BlueprintRunnerDialog'
import IoIcon from '@/components/IoIcon/IoIcon'
import { useSnackbar } from 'notistack' // Added for feedback
import { BlueprintDefinitionEditorDialog } from './BlueprintDefinitionEditorDialog'

const useRestModuleConfig = () => {
  /* ... (same as before) ... */
  return useMainStore(
    (state) => state.modules[restModuleId]?.config as RestModuleCustomConfig | undefined
  )
}

export const RestSettings: FC = () => {
  const moduleCfg = useRestModuleConfig()
  const presets = moduleCfg?.presets || []
  const blueprints = moduleCfg?.blueprints || []
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)
  const { enqueueSnackbar } = useSnackbar() // For user feedback
  const [blueprintEditorOpen, setBlueprintEditorOpen] = useState(false)
  const [editingBlueprintDef, setEditingBlueprintDef] = useState<BlueprintDefinition | null>(null)

  // --- Global Drag State Integration ---
  // We don't directly set isWindowBeingDraggedOver here, but we can react to it
  // or use it to change local dropzone appearance.
  // For now, this component will manage its own local dropzone state.
  const setIsWindowBeingDraggedOverGlobal = useMainStore(
    (state) => state.setIsWindowBeingDraggedOver
  )
  const setDropMessageGlobal = useMainStore((state) => state.setDropMessage)

  // State for Preset Management
  const [managePresetsDialogOpen, setManagePresetsDialogOpen] = useState(false)
  const [addEditPresetDialogOpen, setAddEditPresetDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<RestPresetDefinition | null>(null)

  // State for Blueprint Usage & Management
  const [selectBlueprintDialogOpen, setSelectBlueprintDialogOpen] = useState(false)
  const [runningBlueprint, setRunningBlueprint] = useState<BlueprintDefinition | null>(null)
  const [blueprintRunnerDialogOpen, setBlueprintRunnerDialogOpen] = useState(false)
  const [isDraggingOverBlueprintZone, setIsDraggingOverBlueprintZone] = useState(false)

  // --- Preset Management Functions --- (Same as before)
  const openAddPresetDialog = () => {
    /* ... */ setEditingPreset(null)
    setAddEditPresetDialogOpen(true)
    setManagePresetsDialogOpen(false)
  }
  const openEditPresetDialog = (preset: RestPresetDefinition) => {
    /* ... */ setEditingPreset(preset)
    setAddEditPresetDialogOpen(true)
    setManagePresetsDialogOpen(false)
  }
  const handleDeletePreset = (presetIdToDelete: string) => {
    /* ... */ if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = presets.filter((p) => p.id !== presetIdToDelete)
      setModuleConfig(restModuleId, 'presets', updatedPresets)
    }
  }
  const handleSavePresetCallback = (presetToSave: RestPresetDefinition) => {
    /* ... */ let updatedPresets
    const existingIndex = presets.findIndex((p) => p.id === presetToSave.id)
    if (existingIndex > -1) {
      updatedPresets = [...presets]
      updatedPresets[existingIndex] = presetToSave
    } else {
      updatedPresets = [...presets, { ...presetToSave, id: presetToSave.id || uuidv4() }]
    }
    setModuleConfig(restModuleId, 'presets', updatedPresets)
    setAddEditPresetDialogOpen(false)
  }

  // --- Blueprint Functions ---
  const handleOpenSelectBlueprintDialog = () => {
    setSelectBlueprintDialogOpen(true)
  }
  const handleBlueprintSelectedToRun = (blueprint: BlueprintDefinition) => {
    setRunningBlueprint(blueprint)
    setBlueprintRunnerDialogOpen(true)
    setSelectBlueprintDialogOpen(false)
  }
  const handleBlueprintRunnerDialogClose = () => {
    setBlueprintRunnerDialogOpen(false)
    setRunningBlueprint(null)
  }
  const handleBlueprintApplyAndCreatePreset = (
    /* params same as before */
    generatedPresetConfig: Omit<RestPresetDefinition, 'id'>,
    _inputSnapshot: Record<string, SimpleInputFieldValue>,
    saveAsGlobalPreset: boolean
  ) => {
    if (saveAsGlobalPreset) {
      const newGlobalPreset: RestPresetDefinition = { ...generatedPresetConfig, id: uuidv4() }
      setModuleConfig(restModuleId, 'presets', [...presets, newGlobalPreset])
      enqueueSnackbar(`Global Preset "${newGlobalPreset.name}" created successfully!`, {
        variant: 'success'
      })
    } else {
      enqueueSnackbar(
        `Blueprint processed: ${generatedPresetConfig.name}. (Not saved as global preset)`,
        { variant: 'info' }
      )
    }
  }

  const handleExportBlueprint = (blueprint: BlueprintDefinition) => {
    try {
      const blueprintJson = JSON.stringify(blueprint, null, 2)
      const blob = new Blob([blueprintJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Sanitize name for filename: replace spaces and special chars
      const fileName = `${blueprint.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'untitled'}.ioBlueprint`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      enqueueSnackbar(`Blueprint "${blueprint.name}" exported as ${fileName}`, {
        variant: 'success'
      })
    } catch (error) {
      console.error('Error exporting blueprint:', error)
      enqueueSnackbar('Failed to export blueprint.', { variant: 'error' })
    }
  }
  const handleDeleteBlueprint = (blueprintIdToDelete: string) => {
    const blueprintToDelete = blueprints.find((bp) => bp.id === blueprintIdToDelete)
    if (!blueprintToDelete) return

    if (
      window.confirm(
        `Are you sure you want to delete the Blueprint: "${blueprintToDelete.name}"? This action cannot be undone.`
      )
    ) {
      const updatedBlueprints = blueprints.filter((bp) => bp.id !== blueprintIdToDelete)
      setModuleConfig(restModuleId, 'blueprints', updatedBlueprints)
      enqueueSnackbar(`Blueprint "${blueprintToDelete.name}" deleted.`, { variant: 'info' })
    }
  }

  // --- Actual Blueprint File Drop Handling ---
  const processDroppedBlueprintFile = useCallback(
    async (file: File) => {
      if (!file || !file.name.endsWith('.ioBlueprint')) {
        enqueueSnackbar('Invalid file type. Please drop an .ioBlueprint file.', {
          variant: 'warning'
        })
        return
      }
      console.debug('[RestSettings] Processing dropped .ioBlueprint file:', file.name)

      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const fileContent = e.target?.result as string
          const parsedData = JSON.parse(fileContent) as BlueprintDefinition

          if (
            !parsedData.id ||
            !parsedData.name ||
            !Array.isArray(parsedData.simpleInputs) ||
            !parsedData.presetTemplate
          ) {
            throw new Error('Invalid .ioBlueprint: Missing required fields.')
          }

          const currentBlueprints =
            (useMainStore.getState().modules[restModuleId]?.config as RestModuleCustomConfig)
              ?.blueprints || []
          if (currentBlueprints.some((bp) => bp.id === parsedData.id)) {
            enqueueSnackbar(
              `Blueprint ID "${parsedData.id}" (${parsedData.name}) already exists. Import skipped.`,
              { variant: 'warning', autoHideDuration: 5000 }
            )
            return
          }

          setModuleConfig(restModuleId, 'blueprints', [...currentBlueprints, parsedData])
          enqueueSnackbar(`Blueprint "${parsedData.name}" imported! Opening for configuration...`, {
            variant: 'success'
          })

          // Auto-run the newly imported blueprint
          setRunningBlueprint(parsedData)
          setBlueprintRunnerDialogOpen(true)
        } catch (parseError: any) {
          console.error('[RestSettings] Error parsing/processing blueprint file:', parseError)
          enqueueSnackbar(
            `Blueprint Import Error: ${parseError.message || 'Invalid file content.'}`,
            { variant: 'error' }
          )
        }
      }
      reader.onerror = () => enqueueSnackbar('Error reading blueprint file.', { variant: 'error' })
      reader.readAsText(file)
    },
    [enqueueSnackbar, setModuleConfig] // Removed getRestModuleBlueprints, access via getState()
  )

  const handleSaveBlueprintDefinition = (blueprintToSave: BlueprintDefinition) => {
    const currentBlueprints =
      (useMainStore.getState().modules[restModuleId]?.config as RestModuleCustomConfig)
        ?.blueprints || []
    let updatedBlueprints
    const existingIndex = currentBlueprints.findIndex((bp) => bp.id === blueprintToSave.id)

    if (existingIndex > -1) {
      // Editing existing
      updatedBlueprints = [...currentBlueprints]
      updatedBlueprints[existingIndex] = blueprintToSave
      enqueueSnackbar(`Blueprint "${blueprintToSave.name}" updated!`, { variant: 'success' })
    } else {
      // Adding new
      updatedBlueprints = [...currentBlueprints, blueprintToSave] // ID is already set in editor for new
      enqueueSnackbar(`Blueprint "${blueprintToSave.name}" created!`, { variant: 'success' })
    }
    setModuleConfig(restModuleId, 'blueprints', updatedBlueprints)
    setBlueprintEditorOpen(false) // Close editor on save
  }
  const handleBlueprintDropZoneDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation() // This local drop zone handles it
      setIsDraggingOverBlueprintZone(false)
      setIsWindowBeingDraggedOverGlobal(false) // Also clear global state
      setDropMessageGlobal(null)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processDroppedBlueprintFile(e.dataTransfer.files[0])
      }
    },
    [processDroppedBlueprintFile, setIsWindowBeingDraggedOverGlobal, setDropMessageGlobal]
  )
  const handleBlueprintDropZoneDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingOverBlueprintZone(true)
      setDropMessageGlobal('Drop .ioBlueprint file here to import') // Update global message
      e.dataTransfer.dropEffect = 'copy'
    },
    [setDropMessageGlobal]
  )
  const handleBlueprintDropZoneDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Check if leaving to outside the dropzone or window
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOverBlueprintZone(false)
      // Don't clear global message here, FiledropProvider's document listener will handle it if leaving window
    }
  }, [])

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      {/* Presets Section (Same as before) */}
      <Typography variant="overline">REST Call Presets</Typography>
      <Button
        startIcon={<Edit />}
        onClick={() => setManagePresetsDialogOpen(true)}
        variant="outlined"
        size="small"
        sx={{ height: 41 }}
        fullWidth
      >
        Manage Presets ({presets.length})
      </Button>
      <Button
        startIcon={<AddCircleOutline />}
        onClick={openAddPresetDialog}
        variant="outlined"
        size="small"
        sx={{ height: 41 }}
        fullWidth
      >
        Create New Preset Manually
      </Button>

      <Divider sx={{ my: 1.5 }} />

      {/* Blueprints Section */}
      <Typography variant="overline">Blueprints (Generate Presets)</Typography>
      <Button
        startIcon={<BlueprintIcon />}
        onClick={handleOpenSelectBlueprintDialog}
        variant="outlined"
        size="small"
        color="info" // Changed color slightly for visual distinction
        sx={{ height: 41 }}
        fullWidth
      >
        Use a Blueprint ({blueprints.length})
      </Button>
      {/* New Button to Create Blueprint Definition */}
      <Button
        startIcon={<AddCircleOutline />} // Or a more specific "design" icon
        onClick={() => {
          setEditingBlueprintDef(null) // Null for new
          setBlueprintEditorOpen(true)
        }}
        variant="outlined"
        size="small"
        // color="success" // Optional: different color
        sx={{ height: 41, mt: 1 }} // Added margin top
        fullWidth
      >
        Create New Blueprint Definition
      </Button>
      {/* Local Drop Zone for Blueprints */}
      <Box
        onDrop={handleBlueprintDropZoneDrop}
        onDragOver={handleBlueprintDropZoneDragOver}
        onDragLeave={handleBlueprintDropZoneDragLeave}
        sx={{
          mt: 1,
          p: 2,
          border: `2px dashed ${isDraggingOverBlueprintZone ? 'primary.main' : 'grey.500'}`,
          borderRadius: 1,
          textAlign: 'center',
          bgcolor: isDraggingOverBlueprintZone ? 'action.hover' : 'transparent',
          transition: 'border-color 0.2s, background-color 0.2s',
          cursor: 'default' // Default cursor, changes via dropEffect
        }}
      >
        <UploadFileIcon
          sx={{
            color: isDraggingOverBlueprintZone ? 'primary.main' : 'text.secondary',
            fontSize: 30,
            mb: 0.5
          }}
        />
        <Typography
          variant="caption"
          color={isDraggingOverBlueprintZone ? 'primary.main' : 'text.secondary'}
        >
          {isDraggingOverBlueprintZone
            ? 'Drop .ioBlueprint file to import!'
            : 'Drag & Drop .ioBlueprint file here'}
        </Typography>
      </Box>

      {/* Dialog for Managing Presets (Updated ListItem for better display) */}
      <Dialog
        open={managePresetsDialogOpen}
        onClose={() => setManagePresetsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Manage REST Call Presets</DialogTitle>
        <DialogContent>
          <List dense>
            {presets.map((preset) => (
              <ListItem
                key={preset.id}
                secondaryAction={
                  /* ... Edit/Delete buttons ... */ <Stack direction="row" spacing={0.5}>
                    {' '}
                    <Tooltip title="Edit Preset">
                      <IconButton size="small" onClick={() => openEditPresetDialog(preset)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>{' '}
                    <Tooltip title="Delete Preset">
                      <IconButton size="small" onClick={() => handleDeletePreset(preset.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>{' '}
                  </Stack>
                }
                sx={{ '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {' '}
                      {preset.icon && (
                        <IoIcon
                          name={preset.icon}
                          style={{ marginRight: '4px', opacity: 0.8, fontSize: '1.2rem' }}
                        />
                      )}{' '}
                      <Typography component="span" variant="body1">
                        {preset.name}
                      </Typography>{' '}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          ml: 1,
                          flexShrink: 1,
                          minWidth: 100,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={preset.url}
                      >
                        ({preset.method} {preset.url})
                      </Typography>{' '}
                    </Stack>
                  }
                  secondary={preset.description}
                  secondaryTypographyProps={{ noWrap: true, textOverflow: 'ellipsis' }}
                />
              </ListItem>
            ))}
            {presets.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No presets defined."
                  secondary="Click 'Create New' or use a Blueprint."
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          {' '}
          <Button onClick={openAddPresetDialog} startIcon={<AddCircleOutline />}>
            Create New Manually
          </Button>{' '}
          <Button onClick={() => setManagePresetsDialogOpen(false)}>Close</Button>{' '}
        </DialogActions>
      </Dialog>

      {/* Reusable Dialog for Adding/Editing a single Preset (Existing) */}
      <RestPresetDialog
        open={addEditPresetDialogOpen}
        onClose={() => setAddEditPresetDialogOpen(false)}
        onSave={handleSavePresetCallback}
        initialPreset={editingPreset}
      />

      {/* Dialog for Selecting a Blueprint (Added Export Button) */}
      <Dialog
        open={selectBlueprintDialogOpen}
        onClose={() => setSelectBlueprintDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Select a Blueprint to Generate a Preset</DialogTitle>
        <DialogContent>
          <List>
            {blueprints.map((bp) => (
              <ListItem
                key={bp.id}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    {/* New Edit Blueprint Button */}
                    <Tooltip title="Edit Blueprint Definition">
                      <IconButton
                        edge="end" // Keep edge consistent if others have it
                        aria-label="edit blueprint definition"
                        onClick={() => {
                          setEditingBlueprintDef(bp) // Pass the selected blueprint
                          setBlueprintEditorOpen(true)
                          setSelectBlueprintDialogOpen(false) // Close selection dialog
                        }}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Export Blueprint">
                      <IconButton
                        edge="end"
                        aria-label="export"
                        onClick={() => handleExportBlueprint(bp)}
                      >
                        <ExportIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Blueprint">
                      <IconButton
                        edge="end"
                        aria-label="delete blueprint"
                        onClick={() => handleDeleteBlueprint(bp.id)}
                      >
                        <DeleteBlueprintIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
                disablePadding // Allow ListItemButton to take full width for click
              >
                <ListItemButton onClick={() => handleBlueprintSelectedToRun(bp)}>
                  {bp.icon && (
                    <ListItemIcon>
                      <IoIcon name={bp.icon} />
                    </ListItemIcon>
                  )}
                  <ListItemText
                    primary={bp.name}
                    secondary={bp.description}
                    sx={{ maxWidth: 342 }}
                  />
                  {/* <ChevronRightIcon sx={{ ml: 0.5, opacity: 0.7 }} /> */}
                </ListItemButton>
              </ListItem>
            ))}
            {blueprints.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="No blueprints available."
                  secondary="Import .ioBlueprint files."
                />
              </ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          {' '}
          <Button onClick={() => setSelectBlueprintDialogOpen(false)}>Cancel</Button>{' '}
        </DialogActions>
      </Dialog>

      {/* Dialog for Running the selected Blueprint (BlueprintRunnerDialog - Existing) */}
      {runningBlueprint && (
        <BlueprintRunnerDialog
          open={blueprintRunnerDialogOpen}
          onClose={handleBlueprintRunnerDialogClose}
          blueprint={runningBlueprint}
          onApply={handleBlueprintApplyAndCreatePreset}
        />
      )}
      {blueprintEditorOpen && ( // Ensure this is outside any other dialog that might not always be in the DOM
        <BlueprintDefinitionEditorDialog
          open={blueprintEditorOpen}
          onClose={() => {
            setBlueprintEditorOpen(false)
            setEditingBlueprintDef(null) // Clear editing state on close
          }}
          initialBlueprint={editingBlueprintDef}
          onSave={handleSaveBlueprintDefinition}
        />
      )}
    </Paper>
  )
}
