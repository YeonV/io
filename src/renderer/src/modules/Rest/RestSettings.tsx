import type { FC } from 'react'
import { useState } from 'react'
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
  ListItemIcon,
  ListItemButton
} from '@mui/material'
import {
  AddCircleOutline,
  Delete,
  Edit,
  Extension as BlueprintIcon,
  Download as ExportIcon,
  DeleteForever as DeleteBlueprintIcon
} from '@mui/icons-material'
import { v4 as uuidv4 } from 'uuid'
import { useMainStore } from '@/store/mainStore'
import type {
  RestPresetDefinition,
  BlueprintDefinition,
  RestModuleCustomConfig,
  SimpleInputFieldValue
} from './Rest.types'
import { id as restModuleId } from './Rest'
import { RestPresetDialog } from './RestPresetDialog'
import { BlueprintRunnerDialog } from './BlueprintRunnerDialog'
import IoIcon from '@/components/IoIcon/IoIcon'
import { useSnackbar } from 'notistack'
import { BlueprintDefinitionEditorDialog } from './BlueprintDefinitionEditorDialog'

const useRestModuleConfig = () => {
  return useMainStore(
    (state) => state.modules[restModuleId]?.config as RestModuleCustomConfig | undefined
  )
}

export const RestSettings: FC = () => {
  const moduleCfg = useRestModuleConfig()
  const presets = moduleCfg?.presets || []
  const blueprints = moduleCfg?.blueprints || []
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)
  const { enqueueSnackbar } = useSnackbar()
  const [blueprintEditorOpen, setBlueprintEditorOpen] = useState(false)
  const [editingBlueprintDef, setEditingBlueprintDef] = useState<BlueprintDefinition | null>(null)

  const [managePresetsDialogOpen, setManagePresetsDialogOpen] = useState(false)
  const [addEditPresetDialogOpen, setAddEditPresetDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<RestPresetDefinition | null>(null)

  const [selectBlueprintDialogOpen, setSelectBlueprintDialogOpen] = useState(false)
  const [runningBlueprint, setRunningBlueprint] = useState<BlueprintDefinition | null>(null)
  const [blueprintRunnerDialogOpen, setBlueprintRunnerDialogOpen] = useState(false)

  const openAddPresetDialog = () => {
    setEditingPreset(null)
    setAddEditPresetDialogOpen(true)
    setManagePresetsDialogOpen(false)
  }
  const openEditPresetDialog = (preset: RestPresetDefinition) => {
    setEditingPreset(preset)
    setAddEditPresetDialogOpen(true)
    setManagePresetsDialogOpen(false)
  }
  const handleDeletePreset = (presetIdToDelete: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = presets.filter((p) => p.id !== presetIdToDelete)
      setModuleConfig(restModuleId, 'presets', updatedPresets)
    }
  }
  const handleSavePresetCallback = (presetToSave: RestPresetDefinition) => {
    let updatedPresets
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

  const handleSaveBlueprintDefinition = (blueprintToSave: BlueprintDefinition) => {
    const currentBlueprints =
      (useMainStore.getState().modules[restModuleId]?.config as RestModuleCustomConfig)
        ?.blueprints || []
    let updatedBlueprints
    const existingIndex = currentBlueprints.findIndex((bp) => bp.id === blueprintToSave.id)

    if (existingIndex > -1) {
      updatedBlueprints = [...currentBlueprints]
      updatedBlueprints[existingIndex] = blueprintToSave
      enqueueSnackbar(`Blueprint "${blueprintToSave.name}" updated!`, { variant: 'success' })
    } else {
      updatedBlueprints = [...currentBlueprints, blueprintToSave]
      enqueueSnackbar(`Blueprint "${blueprintToSave.name}" created!`, { variant: 'success' })
    }
    setModuleConfig(restModuleId, 'blueprints', updatedBlueprints)
    setBlueprintEditorOpen(false)
  }

  return (
    <Paper
      elevation={2}
      sx={{ p: 2, minWidth: 285, display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      <Typography variant="overline">REST Settings</Typography>
      <Button
        startIcon={<BlueprintIcon />}
        onClick={handleOpenSelectBlueprintDialog}
        variant="outlined"
        size="small"
        color="info"
        sx={{ height: 41 }}
        fullWidth
      >
        Blueprints ({blueprints.length})
      </Button>

      {/* Presets Section */}
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

      {/* Dialog for Managing Presets */}
      <Dialog
        open={managePresetsDialogOpen}
        onClose={() => setManagePresetsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Manage REST Call Presets
          <Button
            startIcon={<AddCircleOutline />}
            onClick={openAddPresetDialog}
            variant="text"
            size="small"
            sx={{ height: 41 }}
          >
            New Preset
          </Button>
        </DialogTitle>
        <DialogContent>
          <List dense>
            {presets.map((preset) => (
              <ListItem
                key={preset.id}
                secondaryAction={
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Edit Preset">
                      <IconButton size="small" onClick={() => openEditPresetDialog(preset)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Preset">
                      <IconButton size="small" onClick={() => handleDeletePreset(preset.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
                sx={{ '&:hover': { bgcolor: 'action.hover' } }}
              >
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {preset.icon && (
                        <IoIcon
                          name={preset.icon}
                          style={{ marginRight: '4px', opacity: 0.8, fontSize: '1.2rem' }}
                        />
                      )}
                      <Typography component="span" variant="body1">
                        {preset.name}
                      </Typography>
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
                      </Typography>
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
          <Button onClick={() => setManagePresetsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reusable Dialog for Adding/Editing a single Preset */}
      <RestPresetDialog
        open={addEditPresetDialogOpen}
        onClose={() => setAddEditPresetDialogOpen(false)}
        onSave={handleSavePresetCallback}
        initialPreset={editingPreset}
      />

      {/* Dialog for Selecting a Blueprint */}
      <Dialog
        open={selectBlueprintDialogOpen}
        onClose={() => setSelectBlueprintDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          Select a Blueprint to Generate a Preset
          {/* New Button to Create Blueprint Definition */}
          <Button
            startIcon={<AddCircleOutline />}
            onClick={() => {
              setEditingBlueprintDef(null)
              setBlueprintEditorOpen(true)
            }}
            variant="text"
            size="small"
            sx={{ height: 41 }}
          >
            New Blueprint
          </Button>
        </DialogTitle>
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
                        edge="end"
                        aria-label="edit blueprint definition"
                        onClick={() => {
                          setEditingBlueprintDef(bp)
                          setBlueprintEditorOpen(true)
                          setSelectBlueprintDialogOpen(false)
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
                disablePadding
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
          <Button onClick={() => setSelectBlueprintDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for Running the selected Blueprint */}
      {runningBlueprint && (
        <BlueprintRunnerDialog
          open={blueprintRunnerDialogOpen}
          onClose={handleBlueprintRunnerDialogClose}
          blueprint={runningBlueprint}
          onApply={handleBlueprintApplyAndCreatePreset}
        />
      )}
      {blueprintEditorOpen && (
        <BlueprintDefinitionEditorDialog
          open={blueprintEditorOpen}
          onClose={() => {
            setBlueprintEditorOpen(false)
            setEditingBlueprintDef(null)
          }}
          initialBlueprint={editingBlueprintDef}
          onSave={handleSaveBlueprintDefinition}
        />
      )}
    </Paper>
  )
}
