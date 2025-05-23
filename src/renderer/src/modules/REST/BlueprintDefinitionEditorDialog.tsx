// src/renderer/src/modules/REST/BlueprintDefinitionEditorDialog.tsx
import type { FC } from 'react'
import { useEffect, useState, useCallback } from 'react' // Added useCallback
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Typography,
  Grid,
  Alert,
  Box
} from '@mui/material'
// JSONInput locale - path might need adjustment if ToggleEditorView is in a different dir

import { v4 as uuidv4 } from 'uuid'
import type { BlueprintDefinition, SimpleInputField } from './REST.types'
import { SimpleInputFieldListEditor } from './SimpleInputFieldListEditor' // UI editor for simple inputs
import { ToggleEditorView } from '@/components/ToggleEditorView/ToggleEditorView'
import { PresetTemplateEditorUI } from './PresetTemplateEditorUI'

// Default empty/template structures for new blueprints
const newBlueprintBaseTemplate: Omit<BlueprintDefinition, 'id' | 'name' | 'description' | 'icon'> =
  {
    creatorInfo: { name: 'My IO User' },
    simpleInputs: [
      {
        id: 'exampleInput',
        label: 'Example Input Field',
        type: 'text',
        required: true,
        helpText: 'Describe this input.',
        placeholder: 'Enter value here'
      }
    ],
    presetTemplate: {
      nameTemplate: 'Preset for {{blueprintInput.exampleInput}}',
      iconTemplate: 'mdi:cogs',
      descriptionTemplate: 'Generated from blueprint using {{blueprintInput.exampleInput}}.',
      urlTemplate: 'https://api.example.com/{{blueprintInput.exampleInput}}',
      method: 'GET',
      headersTemplate: {
        'Content-Type': 'application/json'
      },
      bodyTemplateTemplate: ''
    }
  }

interface BlueprintDefinitionEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (blueprint: BlueprintDefinition) => void
  initialBlueprint?: BlueprintDefinition | null
}

export const BlueprintDefinitionEditorDialog: FC<BlueprintDefinitionEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  initialBlueprint
}) => {
  // Metadata fields
  const [bpId, setBpId] = useState('')
  const [bpName, setBpName] = useState('')
  const [bpDescription, setBpDescription] = useState('')
  const [bpIcon, setBpIcon] = useState('')

  // State for SimpleInputs: object array and its string representation
  const [simpleInputsData, setSimpleInputsData] = useState<SimpleInputField[]>([])
  const [simpleInputsString, setSimpleInputsString] = useState('[]')

  // State for PresetTemplate: object and its string representation
  const [presetTemplateData, setPresetTemplateData] = useState<
    BlueprintDefinition['presetTemplate']
  >(
    newBlueprintBaseTemplate.presetTemplate // Initial non-null default
  )
  const [presetTemplateString, setPresetTemplateString] = useState('{}')

  const [overallError, setOverallError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setOverallError(null)
      if (initialBlueprint) {
        setBpId(initialBlueprint.id)
        setBpName(initialBlueprint.name)
        setBpDescription(initialBlueprint.description || '')
        setBpIcon(initialBlueprint.icon || '')

        const initialSimpleInputs = initialBlueprint.simpleInputs || []
        setSimpleInputsData([...initialSimpleInputs]) // Ensure new array instance for child
        setSimpleInputsString(JSON.stringify(initialSimpleInputs, null, 2))

        const initialPresetTemplate =
          initialBlueprint.presetTemplate || newBlueprintBaseTemplate.presetTemplate
        setPresetTemplateData({ ...initialPresetTemplate }) // Ensure new object instance
        setPresetTemplateString(JSON.stringify(initialPresetTemplate, null, 2))
      } else {
        setBpId(uuidv4())
        setBpName('')
        setBpDescription('')
        setBpIcon('')

        setSimpleInputsData([...newBlueprintBaseTemplate.simpleInputs])
        setSimpleInputsString(JSON.stringify(newBlueprintBaseTemplate.simpleInputs, null, 2))

        setPresetTemplateData({ ...newBlueprintBaseTemplate.presetTemplate })
        setPresetTemplateString(JSON.stringify(newBlueprintBaseTemplate.presetTemplate, null, 2))
      }
    }
  }, [open, initialBlueprint])

  const handleSaveAction = () => {
    setOverallError(null)
    if (!bpId.trim() || !bpName.trim()) {
      setOverallError('Blueprint ID and Name are required.')
      return
    }

    // At this point, simpleInputsData and presetTemplateData should be the source of truth
    // if the user was in UI mode. If they were in Code mode, ToggleEditorView
    // should have updated these object states upon a successful "Save & Switch" or
    // if Code mode was clean when switching.
    // We still need a final validation of the object structures.

    if (!Array.isArray(simpleInputsData)) {
      // Basic check
      setOverallError("'Simple Inputs' data is not a valid array. Please check the editor view.")
      return
    }
    // TODO: Deeper validation for each SimpleInputField in simpleInputsData array

    if (
      typeof presetTemplateData !== 'object' ||
      presetTemplateData === null ||
      !presetTemplateData.nameTemplate ||
      !presetTemplateData.urlTemplate ||
      !presetTemplateData.method
    ) {
      setOverallError(
        "'Preset Template' data is invalid or missing required fields (nameTemplate, urlTemplate, method). Please check the editor view."
      )
      return
    }

    const blueprintToSave: BlueprintDefinition = {
      id: bpId.trim(),
      name: bpName.trim(),
      description: bpDescription.trim(),
      icon: bpIcon.trim() || undefined,
      creatorInfo: initialBlueprint?.creatorInfo || newBlueprintBaseTemplate.creatorInfo, // Retain or default
      simpleInputs: simpleInputsData,
      presetTemplate: presetTemplateData
    }
    onSave(blueprintToSave)
    onClose()
  }

  // Validation function for SimpleInputs string -> object
  const validateSimpleInputsString = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) {
        return { isValid: false, error: 'Simple Inputs must be a JSON array.' }
      }
      // TODO: Add more granular validation for each item in the array against SimpleInputField type
      return { isValid: true, parsedObject: parsed as SimpleInputField[] }
    } catch (e: any) {
      return { isValid: false, error: e.message }
    }
  }, [])

  // Validation function for PresetTemplate string -> object
  const validatePresetTemplateString = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      if (typeof parsed !== 'object' || parsed === null) {
        return { isValid: false, error: 'Preset Template must be a JSON object.' }
      }
      if (!parsed.nameTemplate || !parsed.urlTemplate || !parsed.method) {
        return {
          isValid: false,
          error: 'Preset Template is missing required fields: nameTemplate, urlTemplate, or method.'
        }
      }
      return { isValid: true, parsedObject: parsed as BlueprintDefinition['presetTemplate'] }
    } catch (e: any) {
      return { isValid: false, error: e.message }
    }
  }, [])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault()
          handleSaveAction()
        }
      }}
    >
      <DialogTitle>{initialBlueprint ? 'Edit' : 'Create New'} Blueprint Definition</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {overallError && (
            <Alert severity="error" onClose={() => setOverallError(null)} sx={{ mb: 2 }}>
              {overallError}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Blueprint Metadata
          </Typography>
          {/* --- Metadata Grid (same as before) --- */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                label="Blueprint ID *"
                value={bpId}
                onChange={(e) => setBpId(e.target.value)}
                fullWidth
                required
                size="small"
                disabled={!!initialBlueprint}
                helperText={initialBlueprint ? 'ID cannot be changed.' : 'Unique identifier.'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                label="Blueprint Name *"
                value={bpName}
                onChange={(e) => setBpName(e.target.value)}
                fullWidth
                required
                size="small"
                autoFocus={!initialBlueprint}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Icon (Optional)"
                value={bpIcon}
                onChange={(e) => setBpIcon(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g., mdi:cogs"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description (Optional)"
                value={bpDescription}
                onChange={(e) => setBpDescription(e.target.value)}
                multiline
                rows={2}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <ToggleEditorView<SimpleInputField[]>
            title="Simple Input Fields Configuration"
            objectData={simpleInputsData}
            stringData={simpleInputsString}
            onObjectChange={setSimpleInputsData} // UI Editor changes object state
            onStringChange={setSimpleInputsString} // Code Editor changes string state
            jsonInputId="blueprint-simpleinputs-json-editor"
            jsonInputHeight="300px"
            validateStringToObject={validateSimpleInputsString}
            // validateObjectToString can be simpler if SimpleInputFieldListEditor ensures valid objects
            validateObjectToString={(obj) => ({
              isValid: true,
              stringifiedObject: JSON.stringify(obj, null, 2)
            })}
          >
            {(
              currentData,
              setData,
              setUiDirty // Children is the UI Editor
            ) => (
              <SimpleInputFieldListEditor
                value={currentData}
                onChange={(newFields) => {
                  setData(newFields) // Update ToggleEditorView's internal object
                  setUiDirty(true) // Signal that UI has made a change
                }}
              />
            )}
          </ToggleEditorView>

          <ToggleEditorView<BlueprintDefinition['presetTemplate']>
            title="REST Preset Template Configuration"
            objectData={presetTemplateData}
            stringData={presetTemplateString}
            onObjectChange={setPresetTemplateData}
            onStringChange={setPresetTemplateString}
            jsonInputId="blueprint-presettemplate-json-editor"
            jsonInputHeight="400px"
            validateStringToObject={validatePresetTemplateString}
            validateObjectToString={(obj) => ({
              isValid: true,
              stringifiedObject: JSON.stringify(obj, null, 2)
            })}
          >
            {(currentData, setData, setUiDirty) => (
              // This is where the Phase 2, Part 2 GUI for PresetTemplate will go.
              // For now, a placeholder or message.
              // <Box sx={{ p: 2, border: '1px dashed grey', borderRadius: 1, textAlign: 'center' }}>
              //   <Typography variant="body2" color="text.secondary">
              //     Structured UI for Preset Template editor coming soon!
              //     <br />
              //     Please use the &quot;Code&quot; view for now to edit the Preset Template JSON.
              //   </Typography>
              //   <Typography variant="caption" component="div" sx={{ mt: 1 }}>
              //     (Current Template Name: {currentData.nameTemplate})
              //   </Typography>
              // </Box>
              <PresetTemplateEditorUI
                templateData={currentData} // currentData is BlueprintDefinition['presetTemplate']
                onTemplateDataChange={(newTemplateData) => {
                  setData(newTemplateData) // Update ToggleEditorView's internal object
                  setUiDirty(true) // Signal that UI has made a change
                }}
                availableSimpleInputs={simpleInputsData} // Pass the defined simpleInputs
              />
            )}
          </ToggleEditorView>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {initialBlueprint ? 'Save Blueprint Changes' : 'Create Blueprint'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
