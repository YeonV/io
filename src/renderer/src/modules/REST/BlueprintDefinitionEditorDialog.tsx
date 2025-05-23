// src/renderer/src/modules/REST/BlueprintDefinitionEditorDialog.tsx
import type { FC } from 'react'
import { useEffect, useState, useMemo } from 'react'
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
  Box,
  Link
} from '@mui/material'
import JSONInput from 'react-json-editor-ajrm'
import locale from './en' // Assuming common locale for JSONInput
import { v4 as uuidv4 } from 'uuid'
import type { BlueprintDefinition, SimpleInputField } from './REST.types' // Assuming path

// Default empty/template structures for new blueprints
const newBlueprintBaseTemplate: Omit<BlueprintDefinition, 'id' | 'name' | 'description' | 'icon'> =
  {
    creatorInfo: { name: 'My IO User' }, // Default creator
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
      bodyTemplateTemplate: '' // Empty for GET, or example: '{ "key": "{{blueprintInput.exampleInput}}" }'
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
  // For creator info, we might simplify or omit for MVP editor

  // JSON string states for the complex parts
  const [simpleInputsJsonString, setSimpleInputsJsonString] = useState('')
  const [presetTemplateJsonString, setPresetTemplateJsonString] = useState('')

  const [jsonError, setJsonError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setJsonError(null) // Clear errors on open
      if (initialBlueprint) {
        setBpId(initialBlueprint.id)
        setBpName(initialBlueprint.name)
        setBpDescription(initialBlueprint.description || '')
        setBpIcon(initialBlueprint.icon || '')
        setSimpleInputsJsonString(JSON.stringify(initialBlueprint.simpleInputs || [], null, 2))
        setPresetTemplateJsonString(JSON.stringify(initialBlueprint.presetTemplate || {}, null, 2))
      } else {
        // New blueprint: prefill with a unique ID and base template
        setBpId(uuidv4()) // Generate new ID
        setBpName('')
        setBpDescription('')
        setBpIcon('')
        setSimpleInputsJsonString(JSON.stringify(newBlueprintBaseTemplate.simpleInputs, null, 2))
        setPresetTemplateJsonString(
          JSON.stringify(newBlueprintBaseTemplate.presetTemplate, null, 2)
        )
      }
    }
  }, [open, initialBlueprint])

  const handleSaveAction = () => {
    setJsonError(null)
    if (!bpId.trim() || !bpName.trim()) {
      setJsonError('Blueprint ID and Name are required.')
      return
    }

    let parsedSimpleInputs: SimpleInputField[]
    let parsedPresetTemplate: BlueprintDefinition['presetTemplate']

    try {
      parsedSimpleInputs = JSON.parse(simpleInputsJsonString)
      if (!Array.isArray(parsedSimpleInputs))
        throw new Error("'Simple Inputs' must be a JSON array.")
      // TODO: Add deeper validation for SimpleInputField structure if needed
    } catch (e: any) {
      setJsonError(
        `Error in 'Simple Inputs' JSON: ${e.message}. Please correct the JSON structure.`
      )
      return
    }

    try {
      parsedPresetTemplate = JSON.parse(presetTemplateJsonString)
      if (typeof parsedPresetTemplate !== 'object' || parsedPresetTemplate === null) {
        throw new Error("'Preset Template' must be a JSON object.")
      }
      // Basic check for required template fields
      if (
        !parsedPresetTemplate.nameTemplate ||
        !parsedPresetTemplate.urlTemplate ||
        !parsedPresetTemplate.method
      ) {
        throw new Error(
          "'Preset Template' is missing required fields: nameTemplate, urlTemplate, or method."
        )
      }
    } catch (e: any) {
      setJsonError(
        `Error in 'Preset Template' JSON: ${e.message}. Please correct the JSON structure.`
      )
      return
    }

    const blueprintToSave: BlueprintDefinition = {
      id: bpId.trim(),
      name: bpName.trim(),
      description: bpDescription.trim() || '',
      icon: bpIcon.trim() || undefined,
      // creatorInfo could be added here if we have fields for it
      simpleInputs: parsedSimpleInputs,
      presetTemplate: parsedPresetTemplate
    }
    onSave(blueprintToSave)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg" // Allow wider dialog for JSON editors
      fullWidth
      PaperProps={{
        component: 'form', // Not strictly needed if Button type="button"
        onSubmit: (e) => {
          e.preventDefault()
          handleSaveAction()
        }
      }}
    >
      <DialogTitle>
        {initialBlueprint ? 'Edit' : 'Create New'} Blueprint Definition (Advanced)
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {jsonError && (
            <Alert severity="error" onClose={() => setJsonError(null)} sx={{ mb: 2 }}>
              {jsonError}
            </Alert>
          )}

          <Typography variant="h6" gutterBottom>
            Blueprint Metadata
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ sm: 3, xs: 12 }}>
              <TextField
                label="Blueprint ID *"
                value={bpId}
                onChange={(e) => setBpId(e.target.value)}
                fullWidth
                required
                size="small"
                disabled={!!initialBlueprint} // ID usually not editable after creation
                helperText={
                  initialBlueprint
                    ? 'ID cannot be changed.'
                    : 'Unique identifier (auto-generated for new).'
                }
              />
            </Grid>
            <Grid size={{ sm: 5, xs: 12 }}>
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
            <Grid size={{ sm: 4, xs: 12 }}>
              <TextField
                label="Icon (Optional)"
                value={bpIcon}
                onChange={(e) => setBpIcon(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g., mdi:cogs or an emoji"
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

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Simple Input Fields (JSON Array)
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              Define the array of input fields the user will see. Each object in the array must
              conform to the <code>SimpleInputField</code> structure. Refer to{' '}
              <Link
                href="YOUR_DOCS_LINK_HERE_FOR_SimpleInputField_STRUCTURE"
                target="_blank"
                rel="noopener"
              >
                documentation
              </Link>{' '}
              for details.
            </Typography>
            <JSONInput
              id="blueprint-simpleinputs-editor"
              // placeholder={simpleInputsForEditor} // Using viewArray to show the live content
              placeholder={JSON.parse(simpleInputsJsonString || '[]')}
              onBlur={(data: { jsObject?: any; json?: string; text?: string; error?: any }) => {
                // Use onBlur for final state update
                if (data.json !== undefined && !data.error) {
                  setSimpleInputsJsonString(JSON.stringify(data.jsObject || [], null, 2)) // Update with formatted string
                } else if (data.error) {
                  // JSONInput usually shows error internally. Set local error if needed.
                  setJsonError(
                    `Error in Simple Inputs JSON: ${data.error.reason || 'Invalid syntax'}`
                  )
                }
              }}
              locale={locale}
              colors={{ background: '#1e1e1e', default: '#e0e0e0' /* ... more colors ... */ }}
              style={{
                outerBox: { width: '100%' },
                body: { fontSize: '13px' },
                container: { border: '1px solid #444', borderRadius: '4px' }
              }}
              height="250px"
              width="100%"
              confirmGood={false}
              reset={false}
            />
          </Box>

          <Box sx={{ my: 2 }}>
            <Typography variant="h6" gutterBottom>
              Preset Template (JSON Object)
            </Typography>
            <Typography variant="caption" component="div" sx={{ mb: 1 }}>
              Define the template for the REST Preset. Use placeholders like{' '}
              <code>{'{{blueprintInput.yourSimpleInputId}}'}</code> in string values. Ensure{' '}
              <code>nameTemplate</code>, <code>urlTemplate</code>, and <code>method</code> are
              present. Refer to{' '}
              <Link
                href="YOUR_DOCS_LINK_HERE_FOR_PresetTemplate_STRUCTURE"
                target="_blank"
                rel="noopener"
              >
                documentation
              </Link>{' '}
              for details.
            </Typography>
            <JSONInput
              id="blueprint-presettemplate-editor"
              // placeholder={presetTemplateForEditor}
              placeholder={JSON.parse(presetTemplateJsonString || '{}')} // Use parsed string for placeholder
              onBlur={(data: { jsObject?: any; json?: string; text?: string; error?: any }) => {
                // Use onBlur
                if (data.json !== undefined && !data.error) {
                  setPresetTemplateJsonString(JSON.stringify(data.jsObject || {}, null, 2)) // Update with formatted string
                } else if (data.error) {
                  setJsonError(
                    `Error in Preset Template JSON: ${data.error.reason || 'Invalid syntax'}`
                  )
                }
              }}
              locale={locale}
              colors={{ background: '#1e1e1e', default: '#e0e0e0' /* ... more colors ... */ }}
              style={{
                outerBox: { width: '100%' },
                body: { fontSize: '13px' },
                container: { border: '1px solid #444', borderRadius: '4px' }
              }}
              height="350px"
              width="100%"
              confirmGood={false}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {' '}
          {/* type="submit" works with PaperProps form */}
          {initialBlueprint ? 'Save Blueprint Changes' : 'Create Blueprint'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
