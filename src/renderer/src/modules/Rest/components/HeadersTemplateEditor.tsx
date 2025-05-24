// src/renderer/src/modules/REST/HeadersTemplateEditor.tsx
import { useEffect, useState, type FC } from 'react'
import { TextField, IconButton, Stack, Button, Typography, Paper } from '@mui/material'
import { AddCircleOutline as AddIcon, RemoveCircleOutline as RemoveIcon } from '@mui/icons-material'
import { Placeholder, DynamicInput } from '@/components/MagicInput/MagicInput'
import { v4 as uuidv4 } from 'uuid' // For generating unique keys for new fields

interface HeaderItem {
  id: string // For React key, e.g., uuid
  keyName: string
  valueTemplate: string
}

interface HeadersTemplateEditorProps {
  value: Record<string, string> // Current headersTemplate (object: { "Header-Name": "Value or {{placeholder}}" })
  onChange: (updatedHeaders: Record<string, string>) => void
  availablePlaceholders: Placeholder[]
}

// Helper to convert Record<string, string> to HeaderItem[] for internal list management
const objectToHeaderList = (headersObj: Record<string, string>): HeaderItem[] => {
  return Object.entries(headersObj).map(([key, value]) => ({
    id: uuidv4(), // Assign a unique ID for list item stability
    keyName: key,
    valueTemplate: value
  }))
}

// Helper to convert HeaderItem[] back to Record<string, string> for parent
const headerListToObject = (headerList: HeaderItem[]): Record<string, string> => {
  const obj: Record<string, string> = {}
  headerList.forEach((item) => {
    if (item.keyName.trim()) {
      // Only include if key is not empty
      obj[item.keyName.trim()] = item.valueTemplate
    }
  })
  return obj
}

// Generate a unique key for new headers to avoid conflicts before user names it
let newHeaderKeyCounter = 0
const getNewHeaderKey = (existingKeys: string[]): string => {
  let key = `New-Header-${newHeaderKeyCounter++}`
  while (existingKeys.includes(key)) {
    key = `New-Header-${newHeaderKeyCounter++}`
  }
  return key
}

export const HeadersTemplateEditor: FC<HeadersTemplateEditorProps> = ({
  value: headersObjectFromProps,
  onChange,
  availablePlaceholders
}) => {
  // Manage headers as a list of objects for easier UI rendering and key stability
  const [headerList, setHeaderList] = useState<HeaderItem[]>([])

  useEffect(() => {
    setHeaderList(objectToHeaderList(headersObjectFromProps || {}))
    newHeaderKeyCounter = 0 // Reset counter when props change
  }, [headersObjectFromProps])

  const handleItemChange = (index: number, prop: 'keyName' | 'valueTemplate', newValue: string) => {
    const newList = [...headerList]
    if (newList[index]) {
      // Basic sanitization for keyName: prevent common problematic chars, allow standard HTTP header chars
      const sanitizedNewValue =
        prop === 'keyName' ? newValue.replace(/[^a-zA-Z0-9!#$%&'*+\-.^_`|~:]/g, '') : newValue
      newList[index] = { ...newList[index], [prop]: sanitizedNewValue }
      setHeaderList(newList)
      onChange(headerListToObject(newList)) // Propagate changes as object
    }
  }

  const handleAddItem = () => {
    const currentKeys = headerList.map((h) => h.keyName)
    const newItem: HeaderItem = {
      id: uuidv4(),
      keyName: getNewHeaderKey(currentKeys), // Start with a unique placeholder key
      valueTemplate: ''
    }
    const newList = [...headerList, newItem]
    setHeaderList(newList)
    onChange(headerListToObject(newList))
  }

  const handleRemoveItem = (idToRemove: string) => {
    const newList = headerList.filter((item) => item.id !== idToRemove)
    setHeaderList(newList)
    onChange(headerListToObject(newList))
  }

  return (
    <Stack spacing={1.5}>
      {headerList.length === 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
          No headers defined. Click &quot;Add Header&quot; to start.
        </Typography>
      )}
      {headerList.map((item, index) => (
        <Paper
          key={item.id}
          variant="outlined"
          sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}
        >
          <TextField
            label={`Header ${index + 1} Name`}
            value={item.keyName}
            onChange={(e) => handleItemChange(index, 'keyName', e.target.value)}
            size="small"
            sx={{ flexGrow: 2, minWidth: '150px' }}
            placeholder="e.g., Content-Type"
          />
          <DynamicInput
            label={`Header ${index + 1} Value Template`}
            value={item.valueTemplate}
            onChange={(val) => handleItemChange(index, 'valueTemplate', val)}
            availablePlaceholders={availablePlaceholders}
            fullWidth // Will be constrained by parent Stack/Grid
            size="small"
            sx={{ flexGrow: 3, minWidth: '200px' }}
            placeholder="e.g., application/json or {{blueprintInput.token}}"
          />
          <IconButton
            onClick={() => handleRemoveItem(item.id)}
            size="small"
            sx={{ mt: '4px' }}
            color="warning"
          >
            <RemoveIcon />
          </IconButton>
        </Paper>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddItem}
        size="small"
        variant="text"
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Header
      </Button>
    </Stack>
  )
}
