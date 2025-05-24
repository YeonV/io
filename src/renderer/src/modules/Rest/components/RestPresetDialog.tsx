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
  // IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material'
import { ExpandMore as ExpandMoreIcon, InfoOutlined } from '@mui/icons-material'
import JSONInput from 'react-json-editor-ajrm'

import locale from '@/modules/Rest/components/en'
import { v4 as uuidv4 } from 'uuid'
import type { RestPresetDefinition } from '../Rest.types'
import IoIcon from '@/components/IoIcon/IoIcon'

// const EMPTY_JSON_OBJECT_STRING = '{}'
// const EMPTY_STRING = ''

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
  const [icon, setIcon] = useState<string | undefined>(undefined)
  const [description, setDescription] = useState('')

  const [url, setUrl] = useState('')
  const [method, setMethod] = useState<RestPresetDefinition['method']>('GET')

  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [bodyTemplate, setBodyTemplate] = useState<string>('')

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

        setHeadersExpanded(
          !!(initialPreset.headers && Object.keys(initialPreset.headers).length > 0)
        )
        setBodyExpanded(!!initialPreset.bodyTemplate)
      } else {
        setPresetId(uuidv4())
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
      alert('Preset Name is required.')
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
      setHeaders({})
    }
  }

  const handleBodyChange = (data: { json?: string; error?: any }) => {
    if (typeof data.json === 'string' && !data.error) {
      setBodyTemplate(data.json)
    } else if (bodyTemplate.trim() !== '' && !data.json && !data.error) {
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
                placeholder={headers}
                locale={locale}
                colors={{
                  background: 'transparent',
                  default: '#e0e0e0',
                  string: '#ce9178',
                  number: '#b5cea8',
                  colon: '#e0e0e0',
                  keys: '#9cdcfe'
                }}
                style={{
                  outerBox: { width: '100%' },
                  container: { borderRadius: '4px', border: '1px solid rgba(255,255,255,0.23)' },
                  body: { fontSize: '13px' }
                }}
                height="150px"
                width="100%"
                onChange={handleHeaderChange}
                waitAfterKeyPress={1000}
                confirmGood={false}
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
                  placeholder={
                    bodyTemplate
                      ? (() => {
                          try {
                            return JSON.parse(bodyTemplate)
                          } catch (e) {
                            return {}
                          }
                        })()
                      : {}
                  }
                  locale={locale}
                  colors={{
                    background: 'transparent',
                    default: '#e0e0e0',
                    string: '#ce9178',
                    number: '#b5cea8',
                    colon: '#e0e0e0',
                    keys: '#9cdcfe'
                  }}
                  style={{
                    outerBox: { width: '100%' },
                    container: { borderRadius: '4px', border: '1px solid rgba(255,255,255,0.23)' },
                    body: { fontSize: '13px' }
                  }}
                  viewOnly={false}
                  height="200px"
                  width="100%"
                  onChange={handleBodyChange}
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
