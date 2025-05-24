import type { FC } from 'react'
import { Box, Button, Stack, Alert } from '@mui/material'
import { AddCircleOutline as AddIcon } from '@mui/icons-material'
import type { SimpleInputField } from '../Rest.types'
import { SimpleInputFieldItem } from './SimpleInputFieldItem'

interface SimpleInputFieldListEditorProps {
  value: SimpleInputField[]
  onChange: (updatedFields: SimpleInputField[]) => void
}

const createNewSimpleInputField = (existingIds: string[]): SimpleInputField => {
  let newId = `inputField${existingIds.length + 1}`
  let count = 1
  while (existingIds.includes(newId)) {
    newId = `inputField${existingIds.length + 1}_${count++}`
  }
  return {
    id: newId,
    label: '',
    type: 'text',
    required: false
  }
}

export const SimpleInputFieldListEditor: FC<SimpleInputFieldListEditorProps> = ({
  value: fieldsFromProps,
  onChange
}) => {
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
      newFields.splice(index, 1)
      newFields.splice(index - 1, 0, fieldToMove)
      onChange(newFields)
    } else if (direction === 'down' && index < newFields.length - 1) {
      newFields.splice(index, 1)
      newFields.splice(index + 1, 0, fieldToMove)
      onChange(newFields)
    }
  }

  return (
    <Box>
      {fieldsFromProps.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No simple input fields defined yet. Click &quot;Add Input Field&quot; to begin.
        </Alert>
      )}
      <Stack spacing={0}>
        {/* Let Paper in Item provide spacing */}
        {fieldsFromProps.map((field, index) => (
          <SimpleInputFieldItem
            key={field.id || `field-${index}`}
            field={field}
            index={index}
            onChange={handleUpdateField}
            onDelete={handleDeleteField}
            onMoveUp={handleMoveField.bind(null, index, 'up')}
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
        sx={{ mt: fieldsFromProps.length > 0 ? 2 : 0, display: 'flex', mx: 'auto' }}
      >
        Add Input Field
      </Button>
    </Box>
  )
}
