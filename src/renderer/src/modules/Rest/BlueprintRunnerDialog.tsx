// src/renderer/src/modules/REST/BlueprintRunnerDialog.tsx
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Checkbox,
  FormControlLabel,
  Typography,
  Box,
  Tooltip,
  Switch // For boolean inputs
} from '@mui/material'
import type { BlueprintDefinition, SimpleInputFieldValue, RestPresetDefinition } from './Rest.types'
import { InfoOutlined } from '@mui/icons-material'

// Placeholder substitution utility
function substitutePlaceholders(
  template: string | undefined,
  inputs: Record<string, SimpleInputFieldValue>
): string | undefined {
  if (template === undefined) return undefined
  let result = template
  for (const key in inputs) {
    const placeholder = `{{blueprintInput.${key}}}`
    // Ensure value is a string for replacement; handle boolean/number appropriately
    let valueToSubstitute = inputs[key]
    if (typeof valueToSubstitute === 'boolean') {
      valueToSubstitute = valueToSubstitute ? 'true' : 'false'
    } else if (typeof valueToSubstitute === 'number') {
      valueToSubstitute = String(valueToSubstitute)
    }
    // If value is undefined or null, replace with empty string to remove placeholder
    result = result.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(valueToSubstitute ?? '')
    )
  }
  // Remove any unfulfilled placeholders (e.g. if an optional input was not provided)
  result = result.replace(/\{\{blueprintInput\.[a-zA-Z0-9_]+\}\}/g, '')
  return result
}

function substituteObjectPlaceholders(
  templateObj: Record<string, string> | undefined,
  inputs: Record<string, SimpleInputFieldValue>
): Record<string, string> | undefined {
  if (!templateObj) return undefined
  const result: Record<string, string> = {}
  for (const key in templateObj) {
    const substitutedValue = substitutePlaceholders(templateObj[key], inputs)
    if (substitutedValue !== undefined) {
      // Only add if substitution results in a value
      result[key] = substitutedValue
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

interface BlueprintRunnerDialogProps {
  open: boolean
  onClose: () => void
  blueprint: BlueprintDefinition | null // Null when not ready or error
  // Callback with the generated (un-ID'd) preset data and the input snapshot
  onApply: (
    generatedPresetConfig: Omit<RestPresetDefinition, 'id'>,
    inputSnapshot: Record<string, SimpleInputFieldValue>,
    saveAsGlobalPreset: boolean
  ) => void
  initialSnapshot?: Record<string, SimpleInputFieldValue> // For re-editing
}

export const BlueprintRunnerDialog: FC<BlueprintRunnerDialogProps> = ({
  open,
  onClose,
  blueprint,
  onApply,
  initialSnapshot
}) => {
  const [inputValues, setInputValues] = useState<Record<string, SimpleInputFieldValue>>({})
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saveAsGlobalPreset, setSaveAsGlobalPreset] = useState(true) // Default to also saving

  useEffect(() => {
    if (open && blueprint) {
      // Initialize form values from blueprint defaults or initialSnapshot
      const initialFormValues: Record<string, SimpleInputFieldValue> = {}
      blueprint.simpleInputs.forEach((inputField) => {
        if (initialSnapshot && initialSnapshot[inputField.id] !== undefined) {
          initialFormValues[inputField.id] = initialSnapshot[inputField.id]
        } else if (inputField.defaultValue !== undefined) {
          initialFormValues[inputField.id] = inputField.defaultValue
        } else {
          // Set a sensible empty default based on type if no defaultValue or snapshot
          switch (inputField.type) {
            case 'text':
            case 'url':
              initialFormValues[inputField.id] = ''
              break
            case 'number':
              initialFormValues[inputField.id] = 0 // Or handle NaN/empty string appropriately
              break
            case 'boolean':
              initialFormValues[inputField.id] = false
              break
            case 'select':
              initialFormValues[inputField.id] = inputField.options?.[0]?.value ?? ''
              break
            default:
              initialFormValues[inputField.id] = ''
          }
        }
      })
      setInputValues(initialFormValues)
      setFormErrors({}) // Reset errors
      // Potentially reset saveAsGlobalPreset, or make it sticky / configurable
      setSaveAsGlobalPreset(true)
    }
  }, [open, blueprint, initialSnapshot])

  const handleInputChange = (id: string, value: SimpleInputFieldValue) => {
    setInputValues((prev) => ({ ...prev, [id]: value }))
    if (formErrors[id]) {
      setFormErrors((prev) => ({ ...prev, [id]: '' })) // Clear error on change
    }
  }

  const validateForm = (): boolean => {
    if (!blueprint) return false
    const errors: Record<string, string> = {}
    let isValid = true
    blueprint.simpleInputs.forEach((field) => {
      const value = inputValues[field.id]
      if (field.required) {
        if (value === undefined || value === null || String(value).trim() === '') {
          errors[field.id] = `${field.label} is required.`
          isValid = false
        }
      }
      if (field.type === 'url' && value && !String(value).match(/^https?:\/\/.+/)) {
        if (String(value).trim() !== '') {
          // Only error if not empty and not a valid URL
          errors[field.id] = `${field.label} must be a valid URL (e.g., http://example.com).`
          isValid = false
        }
      }
      // Add other type-specific validations if needed (e.g., number range)
    })
    setFormErrors(errors)
    return isValid
  }

  const handleApplyAction = () => {
    if (!blueprint || !validateForm()) {
      return
    }

    // Substitute placeholders in the blueprint's presetTemplate
    const generatedPresetConfig: Omit<RestPresetDefinition, 'id'> = {
      name:
        substitutePlaceholders(blueprint.presetTemplate.nameTemplate, inputValues) ||
        'Generated Preset',
      icon: substitutePlaceholders(blueprint.presetTemplate.iconTemplate, inputValues),
      description: substitutePlaceholders(
        blueprint.presetTemplate.descriptionTemplate,
        inputValues
      ),
      url: substitutePlaceholders(blueprint.presetTemplate.urlTemplate, inputValues) || '', // URL is critical
      method: blueprint.presetTemplate.method, // Method is usually fixed
      headers: substituteObjectPlaceholders(blueprint.presetTemplate.headersTemplate, inputValues),
      bodyTemplate: substitutePlaceholders(
        blueprint.presetTemplate.bodyTemplateTemplate,
        inputValues
      )
    }

    if (!generatedPresetConfig.url) {
      alert(
        'Blueprint error: Resulting URL is empty after processing inputs. Please check Blueprint definition or inputs.'
      )
      return
    }

    onApply(generatedPresetConfig, inputValues, saveAsGlobalPreset)
    onClose()
  }

  if (!blueprint) {
    // This case should ideally be handled by the parent (not opening the dialog if no blueprint)
    // but as a fallback:
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography>Blueprint data not available.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: (e) => {
          e.preventDefault()
          handleApplyAction()
        }
      }}
    >
      <DialogTitle>
        Configure: {blueprint.name}
        {blueprint.icon && (
          <Typography component="span" sx={{ ml: 1 }}>
            <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', opacity: 0.6 }} />{' '}
            {/* Replace with IoIcon if desired */}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {blueprint.description}
        </Typography>
        <Stack spacing={2.5}>
          {blueprint.simpleInputs.map((field) => (
            <Box key={field.id}>
              {field.type === 'text' && (
                <TextField
                  label={field.label}
                  value={(inputValues[field.id] as string) || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  fullWidth
                  required={field.required}
                  size="small"
                  placeholder={field.placeholder}
                  error={!!formErrors[field.id]}
                  helperText={formErrors[field.id] || field.helpText}
                />
              )}
              {field.type === 'url' && (
                <TextField
                  label={field.label}
                  type="url"
                  value={(inputValues[field.id] as string) || ''}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  fullWidth
                  required={field.required}
                  size="small"
                  placeholder={field.placeholder || 'https://example.com'}
                  error={!!formErrors[field.id]}
                  helperText={formErrors[field.id] || field.helpText}
                />
              )}
              {field.type === 'number' && (
                <TextField
                  label={field.label}
                  type="number"
                  value={(inputValues[field.id] as number) ?? ''} // Handle undefined/null for number input
                  onChange={(e) => handleInputChange(field.id, parseFloat(e.target.value))} // Or parseInt
                  fullWidth
                  required={field.required}
                  size="small"
                  placeholder={field.placeholder}
                  error={!!formErrors[field.id]}
                  helperText={formErrors[field.id] || field.helpText}
                />
              )}
              {field.type === 'boolean' && (
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!inputValues[field.id]} // Ensure boolean
                        onChange={(e) => handleInputChange(field.id, e.target.checked)}
                        size="small"
                      />
                    }
                    labelPlacement="start"
                    label={
                      <Typography
                        variant="body2"
                        sx={{ mr: 1, color: formErrors[field.id] ? 'error.main' : 'text.primary' }}
                      >
                        {field.label}
                        {field.required ? ' *' : ''}
                      </Typography>
                    }
                    sx={{ justifyContent: 'space-between', ml: 0, mr: 'auto', width: '100%' }}
                  />
                  {(formErrors[field.id] || field.helpText) && (
                    <FormHelperText error={!!formErrors[field.id]} sx={{ ml: '14px' }}>
                      {formErrors[field.id] || field.helpText}
                    </FormHelperText>
                  )}
                </>
              )}
              {field.type === 'select' && field.options && (
                <FormControl
                  fullWidth
                  size="small"
                  required={field.required}
                  error={!!formErrors[field.id]}
                >
                  <InputLabel id={`blueprint-select-${field.id}-label`}>{field.label}</InputLabel>
                  <Select
                    labelId={`blueprint-select-${field.id}-label`}
                    label={field.label}
                    value={inputValues[field.id] !== undefined ? String(inputValues[field.id]) : ''}
                    onChange={(e) =>
                      handleInputChange(field.id, e.target.value as SimpleInputFieldValue)
                    }
                  >
                    {field.options.map((opt) => (
                      <MenuItem key={String(opt.value)} value={String(opt.value)}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {(formErrors[field.id] || field.helpText) && (
                    <FormHelperText>{formErrors[field.id] || field.helpText}</FormHelperText>
                  )}
                </FormControl>
              )}
            </Box>
          ))}
          <FormControlLabel
            control={
              <Checkbox
                checked={saveAsGlobalPreset}
                onChange={(e) => setSaveAsGlobalPreset(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Also save as a new Global REST Preset
                <Tooltip title="If checked, this configured REST call will also be added to your list of reusable global presets.">
                  <InfoOutlined
                    fontSize="small"
                    sx={{ ml: 0.5, verticalAlign: 'middle', opacity: 0.7 }}
                  />
                </Tooltip>
              </Typography>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          Apply to Row Configuration
        </Button>
      </DialogActions>
    </Dialog>
  )
}
