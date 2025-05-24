import { OutputData } from '@shared/types'
import { FC, useState } from 'react'
import {
  BlueprintDefinition,
  RestModuleCustomConfig,
  RestOutputRowData,
  RestPresetDefinition,
  SimpleInputFieldValue
} from '../Rest.types'
import { useMainStore } from '@/store/mainStore'
import { id } from '../Rest'
import { v4 as uuidv4 } from 'uuid'
import { Box, Button, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import TuneIcon from '@mui/icons-material/Tune'
import { BlueprintRunnerDialog } from './BlueprintRunnerDialog'
import RestEditor from './RestEditor'

export const RestOutputEdit: FC<{
  output: OutputData
  onChange: (data: RestOutputRowData) => void // onChange now expects full RestOutputRowData
}> = ({ output, onChange }) => {
  const currentOutputData = output.data as RestOutputRowData // Full data for the row
  const { blueprintIdUsed, blueprintInputsSnapshot } = currentOutputData

  const [restEditorOpen, setRestEditorOpen] = useState(false)

  // State for running blueprint for this specific row's "Edit Simple Inputs"
  const [blueprintToRunForEdit, setBlueprintToRunForEdit] = useState<BlueprintDefinition | null>(
    null
  )
  const [blueprintRunnerDialogOpenForEdit, setBlueprintRunnerDialogOpenForEdit] = useState(false)

  const globalBlueprints = useMainStore(
    (state) => (state.modules[id]?.config as RestModuleCustomConfig)?.blueprints || []
  )
  const globalPresets = useMainStore(
    // Needed if "save as global preset" is an option from simple edit
    (state) => (state.modules[id]?.config as RestModuleCustomConfig)?.presets || []
  )
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const handleOpenRestEditor = () => setRestEditorOpen(true)
  // const handleCloseRestEditor = () => setRestEditorOpen(false)
  const handleRestEditorChange = (newOutputDataFromEditor: RestOutputRowData) => {
    onChange(newOutputDataFromEditor) // Pass the full data up
    // RestEditor is already designed to clear its internal blueprint linkage on manual edits
  }

  const handleOpenSimpleInputEditor = () => {
    if (blueprintIdUsed) {
      const blueprint = globalBlueprints.find((bp) => bp.id === blueprintIdUsed)
      if (blueprint) {
        setBlueprintToRunForEdit(blueprint)
        setBlueprintRunnerDialogOpenForEdit(true)
      } else {
        alert(
          `Error: Blueprint definition for '${blueprintIdUsed}' not found. Please perform an advanced edit.`
        )
      }
    }
  }

  const handleBlueprintApplyToExistingRow = (
    generatedPresetConfig: Omit<RestPresetDefinition, 'id'>,
    newSnapshot: Record<string, SimpleInputFieldValue>,
    saveAsGlobalPresetChosen: boolean // Option from BlueprintRunnerDialog
  ) => {
    // Construct the new RestOutputRowData for *this specific row*
    const updatedRowOutputData: RestOutputRowData = {
      label: generatedPresetConfig.name, // Use the generated name as the row label
      host: generatedPresetConfig.url,
      options: {
        method: generatedPresetConfig.method,
        headers: generatedPresetConfig.headers,
        body: generatedPresetConfig.bodyTemplate // bodyTemplate from preset is the string body for output
      },
      blueprintIdUsed: blueprintToRunForEdit?.id, // Retain/confirm the blueprint link
      blueprintInputsSnapshot: newSnapshot // Update with the new snapshot
    }
    onChange(updatedRowOutputData) // Update the row's output data

    if (saveAsGlobalPresetChosen && blueprintToRunForEdit) {
      const newGlobalPreset: RestPresetDefinition = {
        ...generatedPresetConfig,
        id: uuidv4()
      }
      setModuleConfig(id, 'presets', [...globalPresets, newGlobalPreset])
      alert(`Global Preset "${newGlobalPreset.name}" also created!`)
    }

    setBlueprintRunnerDialogOpenForEdit(false)
    setBlueprintToRunForEdit(null)
  }

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: '1rem', width: '100%' }}
    >
      {blueprintIdUsed ? (
        <Button
          variant="outlined"
          color="info" // Use a distinct color
          startIcon={<TuneIcon />}
          onClick={handleOpenSimpleInputEditor}
          fullWidth
          sx={{ height: 56 }}
        >
          Edit Simple Inputs (Blueprint)
        </Button>
      ) : null}

      <Button
        variant={blueprintIdUsed ? 'outlined' : 'contained'} // Contained if no blueprint, outlined if blueprint (acting as "Advanced")
        color={blueprintIdUsed ? 'inherit' : 'secondary'}
        startIcon={<EditIcon />}
        onClick={handleOpenRestEditor}
        fullWidth
        sx={{ height: 56 }}
      >
        {blueprintIdUsed ? 'Advanced Edit REST Config' : 'Configure REST Call'}
      </Button>

      {/* The RestEditor dialog is now modal and controlled by restEditorOpen */}
      {restEditorOpen && (
        <RestEditor
          initialData={currentOutputData} // Pass the full current output data
          onChange={handleRestEditorChange}
          open={restEditorOpen}
          setOpen={setRestEditorOpen}
        />
      )}

      {/* Display a summary of the current config (label from RestOutputRowData) */}
      {currentOutputData.label &&
        !restEditorOpen &&
        !blueprintRunnerDialogOpenForEdit && ( // Only show if no dialogs are open
          <Typography
            variant="caption"
            sx={{ mt: 1, textAlign: 'center', color: 'text.secondary' }}
          >
            Current Label: &quot;{currentOutputData.label}&quot; ({currentOutputData.options.method}
            {currentOutputData.host.substring(0, 30)}...)
          </Typography>
        )}

      {blueprintToRunForEdit && (
        <BlueprintRunnerDialog
          open={blueprintRunnerDialogOpenForEdit}
          onClose={() => {
            setBlueprintRunnerDialogOpenForEdit(false)
            setBlueprintToRunForEdit(null)
          }}
          blueprint={blueprintToRunForEdit}
          onApply={handleBlueprintApplyToExistingRow}
          initialSnapshot={blueprintInputsSnapshot} // Pass existing snapshot for editing
        />
      )}
    </Box>
  )
}
