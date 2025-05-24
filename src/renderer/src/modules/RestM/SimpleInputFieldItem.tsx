// src/renderer/src/modules/REST/SimpleInputFieldItem.tsx
import type { FC, ChangeEvent } from 'react'
import { useState, useEffect } from 'react'
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Switch,
  FormControlLabel,
  Typography,
  Stack,
  Grid,
  Button,
  Divider,
  Tooltip,
  Paper
} from '@mui/material'
import {
  Delete as DeleteIcon,
  AddCircleOutline as AddOptionIcon,
  RemoveCircleOutline as RemoveOptionIcon,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material'
import type { SimpleInputField, SimpleInputFieldValue } from './RestM.types' // Adjust path if needed

interface SimpleInputFieldItemProps {
  field: SimpleInputField
  index: number
  onChange: (index: number, updatedField: SimpleInputField) => void
  onDelete: (index: number) => void
  onMoveUp?: (index: number) => void
  onMoveDown?: (index: number) => void
  isFirst?: boolean
  isLast?: boolean
}

const inputFieldTypes: SimpleInputField['type'][] = ['text', 'url', 'number', 'boolean', 'select']

export const SimpleInputFieldItem: FC<SimpleInputFieldItemProps> = ({
  field,
  index,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) => {
  // Internal state to manage edits before propagating, or directly call onChange
  // For simplicity here, we'll directly call onChange for each field change.
  // A more complex setup might buffer changes.

  const handleFieldChange = (prop: keyof SimpleInputField, value: any) => {
    onChange(index, { ...field, [prop]: value })
  }

  const handleOptionChange = (optIndex: number, optProp: 'label' | 'value', optValue: string) => {
    const newOptions = [...(field.options || [])]
    if (newOptions[optIndex]) {
      newOptions[optIndex] = { ...newOptions[optIndex], [optProp]: optValue }
      handleFieldChange('options', newOptions)
    }
  }

  const handleAddOption = () => {
    const newOptions = [...(field.options || []), { label: '', value: '' }]
    handleFieldChange('options', newOptions)
  }

  const handleRemoveOption = (optIndex: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== optIndex)
    handleFieldChange('options', newOptions)
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2, position: 'relative' }}>
      <Stack spacing={2}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: -1 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Input Field #{index + 1} Configuration
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {onMoveUp && (
              <Tooltip title="Move Up">
                <IconButton size="small" onClick={() => onMoveUp(index)} disabled={isFirst}>
                  <ArrowUpward fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
            {onMoveDown && (
              <Tooltip title="Move Down">
                <IconButton size="small" onClick={() => onMoveDown(index)} disabled={isLast}>
                  <ArrowDownward fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete this input field">
              <IconButton size="small" onClick={() => onDelete(index)} color="error">
                <DeleteIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <Divider />

        <Grid container spacing={2} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Field ID (key)"
              value={field.id || ''}
              onChange={(e) => handleFieldChange('id', e.target.value.replace(/\s+/g, '_'))} // Basic sanitization
              fullWidth
              required
              size="small"
              helperText="Unique key for this input (e.g., 'repoPath', 'userName'). No spaces."
              placeholder="myInputFieldId"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              label="Label (display name)"
              value={field.label || ''}
              onChange={(e) => handleFieldChange('label', e.target.value)}
              fullWidth
              required
              size="small"
              helperText="User-friendly name shown in the form."
              placeholder="GitHub Repository"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel id={`field-type-label-${index}`}>Type</InputLabel>
              <Select
                labelId={`field-type-label-${index}`}
                label="Type"
                value={field.type || 'text'}
                onChange={(e) =>
                  handleFieldChange('type', e.target.value as SimpleInputField['type'])
                }
              >
                {inputFieldTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {field.type !== 'boolean' && ( // Default value not typical for boolean switch
            <Grid size={{ xs: 12, md: field.type === 'select' ? 12 : 6 }}>
              <TextField
                label="Default Value (Optional)"
                value={field.defaultValue !== undefined ? String(field.defaultValue) : ''}
                onChange={(e) => {
                  let val: SimpleInputFieldValue = e.target.value
                  if (field.type === 'number') val = parseFloat(e.target.value) || 0
                  // Booleans handled by switch, select by its options
                  handleFieldChange('defaultValue', val)
                }}
                fullWidth
                size="small"
                type={field.type === 'number' ? 'number' : 'text'}
                placeholder={
                  field.type === 'select'
                    ? 'Enter one of the option values'
                    : 'Optional initial value'
                }
              />
            </Grid>
          )}

          {(field.type === 'text' || field.type === 'url' || field.type === 'number') && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Placeholder (Optional)"
                value={field.placeholder || ''}
                onChange={(e) => handleFieldChange('placeholder', e.target.value)}
                fullWidth
                size="small"
                helperText="Hint text within the input field."
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Help Text (Optional)"
              value={field.helpText || ''}
              onChange={(e) => handleFieldChange('helpText', e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={1}
              maxRows={3}
              helperText="Additional guidance displayed below the input field."
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!field.required}
                  onChange={(e) => handleFieldChange('required', e.target.checked)}
                  size="small"
                />
              }
              label="Required Field"
            />
          </Grid>
          {field.type === 'boolean' && ( // Default value for boolean is via checked state
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={field.defaultValue === true} // Explicitly check for true
                    onChange={(e) => handleFieldChange('defaultValue', e.target.checked)}
                    size="small"
                  />
                }
                label="Default Value (for Boolean)"
              />
            </Grid>
          )}

          {field.type === 'select' && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mt: 1, mb: 1, fontWeight: 'medium' }}>
                Select Options:
              </Typography>
              <Stack spacing={1.5}>
                {(field.options || []).map((opt, optIndex) => (
                  <Stack direction="row" spacing={1} key={optIndex} alignItems="center">
                    <TextField
                      label={`Opt ${optIndex + 1} Label`}
                      value={opt.label}
                      onChange={(e) => handleOptionChange(optIndex, 'label', e.target.value)}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label={`Opt ${optIndex + 1} Value`}
                      value={String(opt.value)} // Ensure value is string for TextField
                      onChange={(e) => handleOptionChange(optIndex, 'value', e.target.value)}
                      size="small"
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton
                      onClick={() => handleRemoveOption(optIndex)}
                      size="small"
                      color="warning"
                    >
                      <RemoveOptionIcon />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  startIcon={<AddOptionIcon />}
                  onClick={handleAddOption}
                  size="small"
                  variant="text"
                >
                  Add Option
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Stack>
    </Paper>
  )
}
