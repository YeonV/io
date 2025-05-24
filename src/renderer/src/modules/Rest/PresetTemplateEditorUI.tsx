// src/renderer/src/modules/REST/PresetTemplateEditorUI.tsx
import type { FC } from 'react'
import {
  Box,
  TextField, // Standard TextField for fields not needing placeholders, or as fallback
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Stack,
  Paper,
  Divider
} from '@mui/material'
import type { BlueprintDefinition, SimpleInputField, RestPresetDefinition } from './Rest.types' // Adjust path
import { Placeholder, PlaceholderEnabledInput } from '@/components/PlaceholderEnabledInput'
import { HeadersTemplateEditor } from './HeadersTemplateEditor'
// We'll need a HeadersTemplateEditor component soon for headersTemplate
// import { HeadersTemplateEditor } from './HeadersTemplateEditor';

interface PresetTemplateEditorUIProps {
  templateData: BlueprintDefinition['presetTemplate']
  onTemplateDataChange: (updatedTemplateData: BlueprintDefinition['presetTemplate']) => void
  availableSimpleInputs: SimpleInputField[] // To pass to PlaceholderEnabledInput
}

// Convert SimpleInputField[] to Placeholder[] for PlaceholderEnabledInput
const mapSimpleInputsToPlaceholders = (simpleInputs: SimpleInputField[]): Placeholder[] => {
  return simpleInputs.map((si) => ({
    id: si.id,
    label: si.label || si.id, // Use label if available, else id
    description: si.helpText || `Inserts value of '${si.id}' input.`
  }))
}

export const PresetTemplateEditorUI: FC<PresetTemplateEditorUIProps> = ({
  templateData,
  onTemplateDataChange,
  availableSimpleInputs
}) => {
  const placeholderOptions = mapSimpleInputsToPlaceholders(availableSimpleInputs)

  const handleChange = (
    field: keyof BlueprintDefinition['presetTemplate'],
    value: any // string | Record<string, string> | RestPresetDefinition['method']
  ) => {
    onTemplateDataChange({
      ...templateData,
      [field]: value
    })
  }

  return (
    <Box sx={{ pt: 1 }}>
      {' '}
      {/* Add some padding if used directly in ToggleEditorView */}
      <Stack spacing={3}>
        {/* Section 1: Generated Preset Metadata Templates */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
            Generated Preset Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PlaceholderEnabledInput
                label="Preset Name Template *"
                value={templateData.nameTemplate || ''}
                onChange={(val) => handleChange('nameTemplate', val)}
                availablePlaceholders={placeholderOptions}
                fullWidth
                size="small"
                required
                helperText="Name for the generated preset. E.g., 'API Call for {{blueprintInput.customerName}}'"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <PlaceholderEnabledInput
                label="Preset Icon Template (Optional)"
                value={templateData.iconTemplate || ''}
                onChange={(val) => handleChange('iconTemplate', val)}
                availablePlaceholders={placeholderOptions}
                fullWidth
                size="small"
                placeholder="e.g., mdi:api or {{blueprintInput.iconChoice}}"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <PlaceholderEnabledInput
                label="Preset Description Template (Optional)"
                value={templateData.descriptionTemplate || ''}
                onChange={(val) => handleChange('descriptionTemplate', val)}
                availablePlaceholders={placeholderOptions}
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="e.g., Fetches data for {{blueprintInput.itemId}} from the API."
              />
            </Grid>
          </Grid>
        </Paper>

        <Divider />

        {/* Section 2: REST Call Configuration Templates */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
            REST Request Configuration
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel id="preset-method-label">HTTP Method</InputLabel>
                <Select
                  labelId="preset-method-label"
                  label="HTTP Method"
                  value={templateData.method || 'GET'}
                  onChange={(e) =>
                    handleChange('method', e.target.value as RestPresetDefinition['method'])
                  }
                >
                  <MenuItem value={'GET'}>GET</MenuItem>
                  <MenuItem value={'POST'}>POST</MenuItem>
                  <MenuItem value={'PUT'}>PUT</MenuItem>
                  <MenuItem value={'DELETE'}>DELETE</MenuItem>
                  <MenuItem value={'PATCH'}>PATCH</MenuItem>
                  <MenuItem value={'HEAD'}>HEAD</MenuItem>
                  <MenuItem value={'OPTIONS'}>OPTIONS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 9 }}>
              <PlaceholderEnabledInput
                label="URL Template *"
                value={templateData.urlTemplate || ''}
                onChange={(val) => handleChange('urlTemplate', val)}
                availablePlaceholders={placeholderOptions}
                fullWidth
                required
                size="small"
                placeholder="https://api.example.com/resource/{{blueprintInput.resourceId}}"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mt: 0, mb: 1, fontWeight: 'medium' }}>
                Headers Template (Key-Value Pairs)
              </Typography>
              <HeadersTemplateEditor
                value={templateData.headersTemplate || {}} // Pass current headers, default to empty object
                onChange={(newHeaders) => handleChange('headersTemplate', newHeaders)}
                availablePlaceholders={placeholderOptions}
              />
            </Grid>

            {(templateData.method === 'POST' ||
              templateData.method === 'PUT' ||
              templateData.method === 'PATCH') && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ mt: 1, mb: 0.5, fontWeight: 'medium' }}>
                  Body Template Template
                </Typography>
                <PlaceholderEnabledInput
                  label="Body Content Template"
                  value={templateData.bodyTemplateTemplate || ''}
                  onChange={(val) => handleChange('bodyTemplateTemplate', val)}
                  availablePlaceholders={placeholderOptions}
                  fullWidth
                  multiline
                  rows={6}
                  size="small"
                  helperText="Enter the request body. Use placeholders for dynamic content. For JSON, ensure valid structure."
                  placeholder={`{
  "id": "{{blueprintInput.itemId}}",
  "data": "some static text or {{blueprintInput.otherValue}}"
}`}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      </Stack>
    </Box>
  )
}
