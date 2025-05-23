import { useEffect, useState, useMemo, FC } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Divider,
  SelectChangeEvent
} from '@mui/material'
import {
  ExpandMore as ExpandMoreIcon,
  SaveAlt as SaveAsPresetIcon,
  ContentPasteGo as LoadPresetIcon,
  Extension as BlueprintIcon
} from '@mui/icons-material'
import JSONInput from 'react-json-editor-ajrm'
import locale from './en'
import { useMainStore } from '@/store/mainStore'
import type {
  RestPresetDefinition,
  RestOutputRowData,
  RestModuleCustomConfig,
  BlueprintDefinition,
  SimpleInputFieldValue
} from '../Rest.types'
import { id as restModuleId } from '../Rest'
import { v4 as uuidv4 } from 'uuid'
import { BlueprintRunnerDialog } from './BlueprintRunnerDialog'
import IoIcon from '@/components/IoIcon/IoIcon'

interface RestEditorProps {
  open: boolean
  setOpen: (e: boolean) => void
  initialData?: Partial<RestOutputRowData>
  onChange: (data: RestOutputRowData) => void
}

const NamePresetDialog: FC<{
  open: boolean
  onClose: () => void
  onSave: (name: string, icon?: string, description?: string) => void
}> = ({ open, onClose, onSave }) => {
  const [presetName, setPresetName] = useState('')
  const [presetIcon, setPresetIcon] = useState('')
  const [presetDescription, setPresetDescription] = useState('')

  useEffect(() => {
    if (open) {
      setPresetName('')
      setPresetIcon('')
      setPresetDescription('')
    }
  }, [open])

  const handleInternalSave = () => {
    if (!presetName.trim()) {
      alert('Preset name is required.')
      return
    }
    onSave(presetName.trim(), presetIcon.trim() || undefined, presetDescription.trim() || undefined)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Save as New Global Preset</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Global Preset Name *"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            autoFocus
            fullWidth
            required
          />
          <TextField
            label="Global Preset Icon (Optional)"
            value={presetIcon}
            onChange={(e) => setPresetIcon(e.target.value)}
            placeholder="e.g., mdi:cog"
            fullWidth
          />
          <TextField
            label="Global Preset Description (Optional)"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleInternalSave} variant="contained">
          Save Global Preset
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function RestEditor({ open, setOpen, initialData, onChange }: RestEditorProps) {
  const [label, setLabel] = useState('')
  const [host, setHost] = useState('https://')
  const [method, setMethod] = useState<RestOutputRowData['options']['method']>('GET')
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [body, setBody] = useState<string>('')

  const [headersExpanded, setHeadersExpanded] = useState(false)
  const [bodyExpanded, setBodyExpanded] = useState(false)

  const [blueprintIdUsedOnRow, setBlueprintIdUsedOnRow] = useState<string | undefined>(undefined)
  const [blueprintInputsSnapshotOnRow, setBlueprintInputsSnapshotOnRow] = useState<
    Record<string, SimpleInputFieldValue> | undefined
  >(undefined)

  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('')
  const [namePresetDialogOpen, setNamePresetDialogOpen] = useState(false)
  const [runningBlueprint, setRunningBlueprint] = useState<BlueprintDefinition | null>(null)
  const [blueprintRunnerDialogOpen, setBlueprintRunnerDialogOpen] = useState(false)

  const moduleCfg = useMainStore(
    (state) => state.modules[restModuleId]?.config as RestModuleCustomConfig | undefined
  )
  const globalPresets = moduleCfg?.presets || []
  const globalBlueprints = moduleCfg?.blueprints || []
  const setModuleConfig = useMainStore((state) => state.setModuleConfigValue)

  const parsedBodyForEditor = useMemo(() => {
    try {
      return body ? JSON.parse(body) : {}
    } catch {
      return {}
    }
  }, [body])

  const populateEditorFields = (
    data:
      | Partial<RestOutputRowData>
      | Partial<RestPresetDefinition>
      | Omit<RestPresetDefinition, 'id'>,
    source?: 'initial' | 'preset' | 'blueprint'
  ) => {
    let newLabel = ''
    if (source === 'initial' && (data as Partial<RestOutputRowData>).label) {
      newLabel = (data as Partial<RestOutputRowData>).label!
    } else if ((data as Partial<RestPresetDefinition>).name) {
      newLabel = (data as Partial<RestPresetDefinition>).name!
    }
    setLabel(newLabel)

    setHost(
      (data as Partial<RestOutputRowData>).host ||
        (data as Partial<RestPresetDefinition>).url ||
        'https://'
    )
    setMethod(
      (data as Partial<RestOutputRowData>).options?.method ||
        (data as Partial<RestPresetDefinition>).method ||
        'GET'
    )

    const newHeaders =
      (data as Partial<RestOutputRowData>).options?.headers ||
      (data as Partial<RestPresetDefinition>).headers ||
      {}
    setHeaders(newHeaders)
    setHeadersExpanded(Object.keys(newHeaders).length > 0)

    const newBody =
      (data as Partial<RestOutputRowData>).options?.body ||
      (data as Partial<RestPresetDefinition>).bodyTemplate ||
      ''
    setBody(newBody)
    setBodyExpanded(!!newBody)

    if (source !== 'initial') {
      setBlueprintIdUsedOnRow(undefined)
      setBlueprintInputsSnapshotOnRow(undefined)
    }
  }

  useEffect(() => {
    if (open) {
      if (initialData) {
        populateEditorFields(initialData, 'initial')
        setBlueprintIdUsedOnRow(initialData.blueprintIdUsed)
        setBlueprintInputsSnapshotOnRow(initialData.blueprintInputsSnapshot)
        setSelectedPresetId('')
        setSelectedBlueprintId('')
      } else {
        populateEditorFields({})
        setBlueprintIdUsedOnRow(undefined)
        setBlueprintInputsSnapshotOnRow(undefined)
      }
    }
  }, [open, initialData])

  const handleEditorClose = () => setOpen(false)

  const handleSaveToRow = () => {
    if (!host.trim() || !host.match(/^https?:\/\/.+/)) {
      alert('A valid URL (starting with http:// or https://) is required.')
      return
    }
    const outputRowData: RestOutputRowData = {
      label: label.trim() || undefined,
      host: host.trim(),
      options: {
        method: method,
        headers: headersExpanded && Object.keys(headers).length > 0 ? headers : undefined,
        body: bodyExpanded && body.trim() ? body.trim() : undefined
      },
      blueprintIdUsed: blueprintIdUsedOnRow,
      blueprintInputsSnapshot: blueprintInputsSnapshotOnRow
    }
    onChange(outputRowData)
    handleEditorClose()
  }

  const handleTestRequest = async () => {
    if (!host.trim() || !host.match(/^https?:\/\/.+/)) {
      alert('A valid URL is required to test.')
      return
    }
    console.log('Testing REST Request:', {
      url: host,
      method,
      headers: headersExpanded ? headers : undefined,
      body: bodyExpanded ? body : undefined
    })
    try {
      const response = await fetch(host, {
        method: method,
        headers: headersExpanded && Object.keys(headers).length > 0 ? headers : undefined,
        body: bodyExpanded && body.trim() ? body.trim() : undefined
      })
      alert(`Test Request Status: ${response.status} ${response.statusText}`)
    } catch (e) {
      alert(`Test Request Failed: ${(e as Error).message}`)
    }
  }

  const handleLoadPreset = (event: SelectChangeEvent<string>) => {
    const presetId = event.target.value
    setSelectedPresetId(presetId)
    setSelectedBlueprintId('')
    const preset = globalPresets.find((p) => p.id === presetId)
    if (preset) {
      populateEditorFields(preset)

      setLabel(preset.name)
      setBlueprintIdUsedOnRow(undefined)
      setBlueprintInputsSnapshotOnRow(undefined)
    }
  }
  const handleInitiateBlueprintRun = (event: SelectChangeEvent<string>) => {
    const bpId = event.target.value
    setSelectedBlueprintId(bpId)
    setSelectedPresetId('')
    const blueprintToRun = globalBlueprints.find((bp) => bp.id === bpId)
    if (blueprintToRun) {
      setRunningBlueprint(blueprintToRun)
      setBlueprintRunnerDialogOpen(true)
    }
  }

  const handleBlueprintApplyToEditor = (
    generatedPresetConfig: Omit<RestPresetDefinition, 'id'>,
    inputSnapshot: Record<string, SimpleInputFieldValue>,
    saveAsGlobalPresetChosen: boolean
  ) => {
    populateEditorFields(generatedPresetConfig, 'blueprint')

    setBlueprintIdUsedOnRow(runningBlueprint?.id)
    setBlueprintInputsSnapshotOnRow(inputSnapshot)

    if (saveAsGlobalPresetChosen && runningBlueprint) {
      const newGlobalPreset: RestPresetDefinition = {
        ...generatedPresetConfig,
        id: uuidv4()
      }
      setModuleConfig(restModuleId, 'presets', [...globalPresets, newGlobalPreset])
      alert(`Global Preset "${newGlobalPreset.name}" also created!`)
      setSelectedPresetId(newGlobalPreset.id)
    }
    setBlueprintRunnerDialogOpen(false)
    setRunningBlueprint(null)
  }

  const handleSaveAsNewGlobalPreset = (
    presetName: string,
    presetIcon?: string,
    presetDescription?: string
  ) => {
    if (!host.trim() || !host.match(/^https?:\/\/.+/)) {
      alert('A valid URL is required to save as a global preset.')
      return
    }
    const newGlobalPresetDef: RestPresetDefinition = {
      id: uuidv4(),
      name: presetName,
      icon: presetIcon,
      description: presetDescription,
      url: host.trim(),
      method: method,
      headers: headersExpanded && Object.keys(headers).length > 0 ? headers : undefined,
      bodyTemplate: bodyExpanded && body.trim() ? body.trim() : undefined
    }
    setModuleConfig(restModuleId, 'presets', [...globalPresets, newGlobalPresetDef])
    alert(`Global Preset "${presetName}" saved!`)
    setNamePresetDialogOpen(false)
    setSelectedPresetId(newGlobalPresetDef.id)

    setBlueprintIdUsedOnRow(undefined)
    setBlueprintInputsSnapshotOnRow(undefined)
  }

  const handleHeaderChange = (data: { jsObject?: Record<string, string>; error?: any }) => {
    if (data.jsObject && !data.error) {
      setHeaders(data.jsObject)
    } else if (!data.jsObject && Object.keys(headers).length > 0 && !data.error) {
      setHeaders({})
    }

    if (blueprintIdUsedOnRow) {
      setBlueprintIdUsedOnRow(undefined)
      setBlueprintInputsSnapshotOnRow(undefined)
      setSelectedBlueprintId('')
    }
  }

  const handleBodyJsonInputChange = (data: { json?: string; error?: any }) => {
    if (typeof data.json === 'string' && !data.error) {
      setBody(data.json)
    } else if (body.trim() !== '' && !data.json && !data.error) {
      setBody('')
    }
    if (blueprintIdUsedOnRow) {
      setBlueprintIdUsedOnRow(undefined)
      setBlueprintInputsSnapshotOnRow(undefined)
      setSelectedBlueprintId('')
    }
  }

  useEffect(() => {
    if (blueprintIdUsedOnRow && open) {
      // --
    }
  }, [host, method, headersExpanded, bodyExpanded])

  const createDirectEditHandler = <T extends (...args: any[]) => void>(originalHandler: T) => {
    return (...args: Parameters<T>): ReturnType<T> => {
      if (blueprintIdUsedOnRow) {
        console.log(
          '[RestEditor] Direct edit detected, clearing blueprint linkage for current row config.'
        )
        setBlueprintIdUsedOnRow(undefined)
        setBlueprintInputsSnapshotOnRow(undefined)
        setSelectedBlueprintId('')
      }
      return originalHandler(...args) as ReturnType<T>
    }
  }

  const setHostDirect = createDirectEditHandler(setHost)
  const setMethodDirect = createDirectEditHandler(setMethod)
  const toggleHeadersExpandedDirect = createDirectEditHandler(() =>
    setHeadersExpanded((prev) => !prev)
  )

  const showBodyAccordion = method === 'POST' || method === 'PUT' || method === 'PATCH'

  return (
    <div>
      <Dialog onClose={handleEditorClose} open={open} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            Configure REST Call
            <Tooltip title="Save current configuration as a new Global Preset">
              <IconButton
                onClick={() => setNamePresetDialogOpen(true)}
                color="primary"
                size="small"
              >
                <SaveAsPresetIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="load-preset-label">Load from Global Preset</InputLabel>
                <Select
                  labelId="load-preset-label"
                  label="Load from Global Preset"
                  value={selectedPresetId}
                  onChange={handleLoadPreset}
                  IconComponent={globalPresets.length > 0 ? LoadPresetIcon : undefined}
                  displayEmpty
                >
                  <MenuItem value="" disabled={globalPresets.length === 0}>
                    <em>{globalPresets.length > 0 ? 'Select a preset...' : 'No global presets'}</em>
                  </MenuItem>
                  {globalPresets.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.icon && (
                        <IoIcon name={p.icon} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      )}
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel id="generate-from-blueprint-label">Generate from Blueprint</InputLabel>
                <Select
                  labelId="generate-from-blueprint-label"
                  label="Generate from Blueprint"
                  value={selectedBlueprintId}
                  onChange={handleInitiateBlueprintRun}
                  IconComponent={globalBlueprints.length > 0 ? BlueprintIcon : undefined}
                  displayEmpty
                >
                  <MenuItem value="" disabled={globalBlueprints.length === 0}>
                    <em>
                      {globalBlueprints.length > 0
                        ? 'Select a blueprint...'
                        : 'No blueprints available'}
                    </em>
                  </MenuItem>
                  {globalBlueprints.map((bp) => (
                    <MenuItem key={bp.id} value={bp.id}>
                      {bp.icon && (
                        <IoIcon
                          name={bp.icon}
                          style={{ marginRight: 8, verticalAlign: 'middle' }}
                        />
                      )}
                      {bp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ my: 1 }} />

            {/* Main Configuration Fields */}
            <TextField
              label="Label for this Row (Optional)"
              value={label}
              onChange={createDirectEditHandler((e) => setLabel(e.target.value))}
              fullWidth
              size="small"
              helperText="A friendly name for this specific action in the row list."
            />
            <Stack direction={'row'} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="rest-method-label">Method</InputLabel>
                <Select
                  labelId="rest-method-label"
                  label="Method"
                  value={method}
                  onChange={(e) =>
                    setMethodDirect(e.target.value as RestOutputRowData['options']['method'])
                  }
                >
                  {/* ... MenuItems for methods ... */}
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
                value={host}
                onChange={(e) => setHostDirect(e.target.value)}
                fullWidth
                required
                size="small"
                placeholder="https://api.example.com/data"
              />
            </Stack>

            <Accordion expanded={headersExpanded} onChange={toggleHeadersExpandedDirect}>
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
                  id="rest-editor-headers"
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
                  <Typography variant="body2">Body</Typography>
                  {!bodyExpanded && body.trim() && (
                    <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                      (Configured)
                    </Typography>
                  )}
                </AccordionSummary>
                <AccordionDetails
                  sx={{ p: 0, '& .jsoneditor-outer': { border: 'none !important' } }}
                >
                  <JSONInput
                    id="rest-editor-body"
                    placeholder={parsedBodyForEditor}
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
                      container: {
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.23)'
                      },
                      body: { fontSize: '13px' }
                    }}
                    height="200px"
                    width="100%"
                    onChange={handleBodyJsonInputChange}
                    waitAfterKeyPress={1000}
                    confirmGood={false}
                  />
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ m: 1, justifyContent: 'space-between' }}>
          <Button onClick={handleTestRequest} color="info">
            Test Request
          </Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={handleEditorClose}>Cancel</Button>
            <Button onClick={handleSaveToRow} variant="contained">
              Save to Row
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Name Preset Dialog (for saving as new global preset) */}
      <NamePresetDialog
        open={namePresetDialogOpen}
        onClose={() => setNamePresetDialogOpen(false)}
        onSave={handleSaveAsNewGlobalPreset}
      />

      {/* Blueprint Runner Dialog */}
      {runningBlueprint && (
        <BlueprintRunnerDialog
          open={blueprintRunnerDialogOpen}
          onClose={() => {
            setBlueprintRunnerDialogOpen(false)
            setRunningBlueprint(null)
            setSelectedBlueprintId('')
          }}
          blueprint={runningBlueprint}
          onApply={handleBlueprintApplyToEditor}
        />
      )}
    </div>
  )
}
