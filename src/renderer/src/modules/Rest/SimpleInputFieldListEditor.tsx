// src/renderer/src/modules/REST/SimpleInputFieldListEditor.tsx
import type { FC } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Box, Button, Typography, Stack, Alert } from '@mui/material'
import { AddCircleOutline as AddIcon } from '@mui/icons-material'
import type { SimpleInputField } from './Rest.types' // Adjust path if needed
import { SimpleInputFieldItem } from './SimpleInputFieldItem' // Adjust path if needed
import { v4 as uuidv4 } from 'uuid' // For generating unique keys for new fields if needed

interface SimpleInputFieldListEditorProps {
  value: SimpleInputField[] // The array of fields from the parent (BlueprintDefinitionEditorDialog)
  onChange: (updatedFields: SimpleInputField[]) => void // Callback to parent with the full updated array
}

// Helper to create a new, empty SimpleInputField
const createNewSimpleInputField = (existingIds: string[]): SimpleInputField => {
  let newId = `inputField${existingIds.length + 1}`
  let count = 1
  while (existingIds.includes(newId)) {
    newId = `inputField${existingIds.length + 1}_${count++}`
  }
  return {
    id: newId, // Basic unique ID generation
    label: '',
    type: 'text',
    required: false
    // No defaultValue, options, helpText, placeholder by default for a brand new one
  }
}

export const SimpleInputFieldListEditor: FC<SimpleInputFieldListEditorProps> = ({
  value: fieldsFromProps, // Rename to avoid confusion with internal state
  onChange
}) => {
  // Internal state to manage the list. This allows for local reordering/temp states
  // before propagating the full list up. Or, we can directly manipulate fieldsFromProps
  // and call onChange on every modification. For simplicity, let's try direct propagation first.
  // If performance becomes an issue with many fields, we can buffer.

  const handleAddField = () => {
    const existingIds = fieldsFromProps.map((f) => f.id)
    const newField = createNewSimpleInputField(existingIds)
    onChange([...fieldsFromProps, newField])
  }

  const handleDeleteField = (indexToDelete: number) => {
    onChange(fieldsFromProps.filter((_, index) => index !== indexToDelete))
  }

  const handleUpdateField = (indexToUpdate: number, updatedFieldData: SimpleInputField) => {
    const newFields = [...fieldsFromProps]
    if (newFields[indexToUpdate]) {
      newFields[indexToUpdate] = updatedFieldData
      onChange(newFields)
    }
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fieldsFromProps]
    const fieldToMove = newFields[index]
    if (!fieldToMove) return

    if (direction === 'up' && index > 0) {
      newFields.splice(index, 1) // Remove from current position
      newFields.splice(index - 1, 0, fieldToMove) // Insert at new position
      onChange(newFields)
    } else if (direction === 'down' && index < newFields.length - 1) {
      newFields.splice(index, 1)
      newFields.splice(index + 1, 0, fieldToMove)
      onChange(newFields)
    }
  }

  return (
    <Box>
      {/* <Typography variant="h6" gutterBottom>Simple Input Fields</Typography> // Title might be in parent */}
      {fieldsFromProps.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No simple input fields defined yet. Click &quot;Add Input Field&quot; to begin.
        </Alert>
      )}
      <Stack spacing={0}>
        {' '}
        {/* Let Paper in Item provide spacing */}
        {fieldsFromProps.map((field, index) => (
          <SimpleInputFieldItem
            key={field.id || `field-${index}`} // Use field.id if stable, fallback to index for new unsaved
            field={field}
            index={index}
            onChange={handleUpdateField}
            onDelete={handleDeleteField}
            onMoveUp={handleMoveField.bind(null, index, 'up')} // Partially apply for direction
            onMoveDown={handleMoveField.bind(null, index, 'down')}
            isFirst={index === 0}
            isLast={index === fieldsFromProps.length - 1}
          />
        ))}
      </Stack>
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddField}
        variant="outlined"
        size="medium"
        sx={{ mt: fieldsFromProps.length > 0 ? 2 : 0, display: 'flex', mx: 'auto' }} // Center button
      >
        Add Input Field
      </Button>
    </Box>
  )
}
