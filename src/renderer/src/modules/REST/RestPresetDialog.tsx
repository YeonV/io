// src/renderer/src/modules/REST/RestPresetDialog.tsx
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
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon, InfoOutlined } from '@mui/icons-material' // Standard expand icon
import JSONInput from 'react-json-editor-ajrm'
// Assuming 'en' locale is standard for JSONInput, adjust path if moved
import locale from '@/modules/REST/en'
import { v4 as uuidv4 } from 'uuid'
import type { RestPresetDefinition } from './REST.types'
import IoIcon from '@/components/IoIcon/IoIcon'

// Helper for JSONInput placeholder (empty object string for valid JSON)
const EMPTY_JSON_OBJECT_STRING = '{}'
const EMPTY_STRING = ''

interface RestPresetDialogProps {
  open: boolean
  onClose: () => void
  onSave: (preset: RestPresetDefinition) => void
  initialPreset?: RestPresetDefinition | null
}

export const RestPresetDialog: FC<RestPresetDialogProps> = ({
  open,
  onClose,
  onSave,
  initialPreset
}) => {
  const [presetId, setPresetId] = useState<string>('')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string | undefined>(undefined) // TODO: Icon picker integration
  const [description, setDescription] = useState('')

  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<RestPresetDefinition['method']>('GET')

  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [bodyTemplate, setBodyTemplate] = useState<string>('') // Stored as string

  const [headersExpanded, setHeadersExpanded] = useState(false)
  const [bodyExpanded, setBodyExpanded] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialPreset) {
        setPresetId(initialPreset.id)
        setName(initialPreset.name || '')
        setIcon(initialPreset.icon || undefined)
        setDescription(initialPreset.description || '')
        setUrl(initialPreset.url || '')
        setMethod(initialPreset.method || 'GET')
        setHeaders(initialPreset.headers || {})
        setBodyTemplate(initialPreset.bodyTemplate || '')
        // Expand sections if they have content
        setHeadersExpanded(
          !!(initialPreset.headers && Object.keys(initialPreset.headers).length > 0)
        )
        setBodyExpanded(!!initialPreset.bodyTemplate)
      } else {
        // New preset
        setPresetId(uuidv4()) // Pre-generate ID for a new preset
        setName('')
        setIcon(undefined)
        setDescription('')
        setUrl('https://')
        setMethod('GET')
        setHeaders({})
        setBodyTemplate('')
        setHeadersExpanded(false)
        setBodyExpanded(false)
      }
    }
  }, [open, initialPreset])

  const handleSaveAction = () => {
    if (!name.trim()) {
      alert('Preset Name is required.') // Basic validation
      return
    }
    if (!url.trim() || !url.match(/^https?:\/\/.+/)) {
      alert('A valid URL (starting with http:// or https://) is required.')
      return
    }

    const presetToSave: RestPresetDefinition = {
      id: presetId,
      name: name.trim(),
      icon,
      description: description.trim(),
      url: url.trim(),
      method,
      headers: headersExpanded && Object.keys(headers).length > 0 ? headers : undefined,
      bodyTemplate: bodyExpanded && bodyTemplate.trim() ? bodyTemplate.trim() : undefined
    }
    onSave(presetToSave)
    onClose()
  }

  const handleHeaderChange = (data: { jsObject?: Record<string, string>; error?: any }) => {
    if (data.jsObject && !data.error) {
      setHeaders(data.jsObject)
    } else if (!data.jsObject && Object.keys(headers).length > 0 && !data.error) {
      // If user clears the input, JSONInput might send undefined jsObject but no error
      // if the input was valid before clearing (e.g. just '{}').
      // We interpret this as clearing the headers.
      setHeaders({})
    }
  }

  const handleBodyChange = (data: { json?: string; error?: any }) => {
    // For bodyTemplate, we store it as a string. JSONInput gives `json` (string) or `text` (string).
    // We'll use `json` as it implies the editor tried to maintain JSON structure if possible.
    if (typeof data.json === 'string' && !data.error) {
      setBodyTemplate(data.json)
    } else if (bodyTemplate.trim() !== '' && !data.json && !data.error) {
      // If user clears the input
      setBodyTemplate('')
    }
  }

  const showBodyAccordion = method === 'POST' || method === 'PUT' || method === 'PATCH'

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
          handleSaveAction()
        }
      }}
    >
      <DialogTitle>{initialPreset ? 'Edit' : 'Create New'} REST Preset</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Preset Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            required
          />
          {/* TODO: Icon Picker Integration - For now, a text field for icon name */}
          <TextField
            label="Icon Name (Optional)"
            value={icon || ''}
            onChange={(e) => setIcon(e.target.value || undefined)}
            InputProps={{
              startAdornment: icon ? <IoIcon name={icon} style={{ marginRight: '1rem' }} /> : null
            }}
            placeholder="e.g., mdi:cog or homeassistant:lightbulb"
            fullWidth
          />
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />

          <Typography variant="subtitle2" sx={{ pt: 1 }}>
            Request Configuration
          </Typography>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="rest-preset-method-label">Method</InputLabel>
              <Select
                labelId="rest-preset-method-label"
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as RestPresetDefinition['method'])}
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
            <TextField
              label="URL *"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              fullWidth
              required
              size="small"
              placeholder="https://api.example.com/data"
            />
          </Stack>

          <Accordion
            expanded={headersExpanded}
            onChange={() => setHeadersExpanded(!headersExpanded)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2">Headers</Typography>
              {!headersExpanded && Object.keys(headers).length > 0 && (
                <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                  ({Object.keys(headers).length} configured)
                </Typography>
              )}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, '& .jsoneditor-outer': { border: 'none !important' } }}>
              <JSONInput
                id={`rest-preset-headers-${presetId}`}
                placeholder={headers} // This is the initial value
                locale={locale}
                colors={{
                  background: 'transparent', // Match dialog background
                  default: '#e0e0e0', // Text color
                  string: '#ce9178', // String color
                  number: '#b5cea8',
                  colon: '#e0e0e0',
                  keys: '#9cdcfe'
                  //   error: '#f44747'
                }}
                style={{
                  outerBox: { width: '100%' },
                  container: { borderRadius: '4px', border: '1px solid rgba(255,255,255,0.23)' },
                  body: { fontSize: '13px' }
                }}
                height="150px"
                width="100%"
                onChange={handleHeaderChange}
                waitAfterKeyPress={1000} // Delay before onChange is called
                confirmGood={false} // Don't show "good" checkmark
              />
            </AccordionDetails>
          </Accordion>

          {showBodyAccordion && (
            <Accordion expanded={bodyExpanded} onChange={() => setBodyExpanded(!bodyExpanded)}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">
                  Body Template
                  <Tooltip title="This body will be used as a template. You can use placeholders like {{value}} in the future, which could be replaced by data from trigger inputs.">
                    <InfoOutlined
                      fontSize="small"
                      sx={{ ml: 0.5, verticalAlign: 'middle', opacity: 0.7 }}
                    />
                  </Tooltip>
                </Typography>
                {!bodyExpanded && bodyTemplate.trim() && (
                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                    (Configured)
                  </Typography>
                )}
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, '& .jsoneditor-outer': { border: 'none !important' } }}>
                {/* For bodyTemplate string, we might want a plain text editor if it's not always JSON.
                                    Using JSONInput for now, assuming common case is JSON. If it can be other text types,
                                    a simple TextField multiline might be better. Or, offer a type selector.
                                */}
                <JSONInput
                  id={`rest-preset-body-${presetId}`}
                  // placeholder should be a JS object. Parse bodyTemplate, or use an empty object if invalid/empty.
                  placeholder={
                    bodyTemplate
                      ? (() => {
                          try {
                            return JSON.parse(bodyTemplate)
                          } catch (e) {
                            // If bodyTemplate is not valid JSON (e.g. plain text, or user is typing)
                            // we can't directly set it as a JS object placeholder.
                            // The editor will show the raw bodyTemplate string and an error if it's not JSON.
                            // To avoid JSONInput throwing an error on its initial render due to an invalid placeholder object,
                            // give it a valid empty object if bodyTemplate itself isn't parseable JSON.
                            // The actual content string is handled by how JSONInput displays non-JSON content.
                            // A more robust way might be needed if non-JSON body templates are common.
                            return {} // Fallback to empty object for placeholder if bodyTemplate is not valid JSON
                          }
                        })()
                      : {} // Default to empty object if bodyTemplate is empty
                  }
                  // The library itself will display the raw bodyTemplate string in the editor.
                  // If bodyTemplate is not valid JSON, the editor will show an error state for its content.
                  // There isn't a separate 'text' prop to directly inject arbitrary string content
                  // that bypasses the JSON parsing for display. The content is managed via its internal state
                  // based on the initial placeholder and user edits.
                  // What we pass to placeholder IS the initial content.
                  locale={locale}
                  colors={{
                    background: 'transparent',
                    default: '#e0e0e0',
                    string: '#ce9178',
                    number: '#b5cea8',
                    colon: '#e0e0e0',
                    keys: '#9cdcfe'
                    // error: '#f44747'
                  }}
                  style={{
                    outerBox: { width: '100%' },
                    container: { borderRadius: '4px', border: '1px solid rgba(255,255,255,0.23)' },
                    body: { fontSize: '13px' }
                  }}
                  viewOnly={false}
                  height="200px"
                  width="100%"
                  onChange={handleBodyChange} // This correctly receives { json: stringValue, ... }
                  waitAfterKeyPress={1000}
                  confirmGood={false}
                />
              </AccordionDetails>
            </Accordion>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained">
          {initialPreset ? 'Save Changes' : 'Create Preset'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
