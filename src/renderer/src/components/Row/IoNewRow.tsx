import { produce } from 'immer'
import { FC, useCallback, useMemo, useState } from 'react'
import { Button, Stack, Box, Typography, Divider, Collapse } from '@mui/material'
import { v4 as uuidv4 } from 'uuid'
import { InputSelector } from './InputSelector'
import { OutputSelector } from './OutputSelector'
import { useMainStore } from '@/store/mainStore'
import type { Row, InputData, OutputData, ModuleId } from '@shared/types'
import { moduleImplementations, type ModuleImplementationMap } from '@/modules/moduleRegistry'

export interface PrefillData {
  inputModule: ModuleId
  input: Partial<Omit<InputData, 'data'> & { data?: Record<string, any> }>
}

interface SelectorValue {
  name?: string
  icon?: string
  inputModuleId?: ModuleId
  outputModuleId?: ModuleId
}

interface IoNewRowProps {
  onComplete: () => void
  startNewPrefilledRow: (prefill: PrefillData) => void
  initialPrefill?: PrefillData
  edit?: Row | null | undefined
}

export const IoNewRow: FC<IoNewRowProps> = ({
  onComplete,
  startNewPrefilledRow,
  initialPrefill,
  edit: editRowProp
}) => {
  const addRowAction = useMainStore((state) => state.addRow)
  const editRowAction = useMainStore((state) => state.editRow)
  const allModulesFromStore = useMainStore((state) => state.modules)

  const isEditMode = !!editRowProp

  const [templateRow, setRow] = useState<Partial<Row> & { id: string }>(() => {
    if (isEditMode && editRowProp) {
      console.debug(
        '[IoNewRow] EDIT Mode Init. Row ID:',
        editRowProp.id,
        JSON.parse(JSON.stringify(editRowProp))
      )
      return { ...editRowProp }
    } else {
      const newRowId = uuidv4()
      if (initialPrefill) {
        console.debug(
          '[IoNewRow] ADD Mode with PREFILL:',
          JSON.parse(JSON.stringify(initialPrefill))
        )
        return {
          id: newRowId,
          inputModule: initialPrefill.inputModule,
          input: {
            name: initialPrefill.input.name || '',
            icon: initialPrefill.input.icon || '',
            data: { ...(initialPrefill.input.data || {}) }
          } as InputData,
          enabled: true
        }
      }
      console.debug('[IoNewRow] ADD Mode (blank). New ID:', newRowId)
      return { id: newRowId, enabled: true }
    }
  })

  const isInputTypeLocked = !!initialPrefill || isEditMode
  const isOutputTypeLocked = isEditMode

  const [separateOffAction, setSeparateOffAction] = useState(
    !isEditMode && initialPrefill?.inputModule === 'alexa-module'
      ? (initialPrefill?.input?.data?.separateOffAction ?? false)
      : false
  )

  const inputModuleStaticConfig = useMemo(() => {
    if (!templateRow.inputModule) return undefined
    return allModulesFromStore[templateRow.inputModule]
  }, [templateRow.inputModule, allModulesFromStore])

  const outputModuleStaticConfig = useMemo(() => {
    if (!templateRow.outputModule) return undefined
    return allModulesFromStore[templateRow.outputModule]
  }, [templateRow.outputModule, allModulesFromStore])

  const isCurrentInputActuallyEditableByModuleDef = useMemo(() => {
    if (!templateRow.inputModule || !templateRow.input || !inputModuleStaticConfig) return false
    const inputsArray = Array.isArray(inputModuleStaticConfig.inputs)
      ? inputModuleStaticConfig.inputs
      : []
    const inputDefinition = inputsArray.find((i) => i.name === templateRow.input!.name)
    return inputDefinition?.editable === true
  }, [templateRow.inputModule, templateRow.input, inputModuleStaticConfig])

  const isCurrentOutputActuallyEditableByModuleDef = useMemo(() => {
    if (!templateRow.outputModule || !templateRow.output || !outputModuleStaticConfig) return false
    const outputsArray = Array.isArray(outputModuleStaticConfig.outputs)
      ? outputModuleStaticConfig.outputs
      : []
    const outputDefinition = outputsArray.find((o) => o.name === templateRow.output!.name)
    return outputDefinition?.editable === true
  }, [templateRow.outputModule, templateRow.output, outputModuleStaticConfig])

  const SelectedModuleInputEdit = useMemo(() => {
    if (!templateRow.inputModule) return undefined
    return (moduleImplementations[templateRow.inputModule as keyof ModuleImplementationMap] as any)
      ?.InputEdit
  }, [templateRow.inputModule])

  const SelectedModuleOutputEdit = useMemo(() => {
    if (!templateRow.outputModule) return undefined
    return (moduleImplementations[templateRow.outputModule as keyof ModuleImplementationMap] as any)
      ?.OutputEdit
  }, [templateRow.outputModule])

  const handleInputSelect = useCallback(
    (modId: ModuleId, inp: Omit<InputData, 'data'>) => {
      if (isInputTypeLocked) return
      setRow((prevRow) =>
        produce(prevRow, (draft) => {
          draft.inputModule = modId
          draft.input = { ...inp, data: {} }
        })
      )
      if (modId !== 'alexa-module') setSeparateOffAction(false)
    },
    [isInputTypeLocked]
  )

  const handleOutputSelect = useCallback(
    (modId: ModuleId, outp: Omit<OutputData, 'data'>) => {
      if (isOutputTypeLocked) return
      setRow((prevRow) =>
        produce(prevRow, (draft) => {
          draft.outputModule = modId
          draft.output = { ...outp, data: {}, settings: {} }
        })
      )
    },
    [isOutputTypeLocked]
  )

  const handleInputChange = useCallback(
    (dataChanges: Record<string, any>) => {
      setRow(
        produce((draft) => {
          if (!draft.input) draft.input = { name: '', icon: '', data: {} }
          draft.input.data = { ...(draft.input.data || {}), ...dataChanges }
          if (
            !isEditMode &&
            draft.inputModule === 'alexa-module' &&
            Object.prototype.hasOwnProperty.call(dataChanges, 'separateOffAction')
          ) {
            draft.input.data.value = dataChanges.value
            setSeparateOffAction(dataChanges.separateOffAction)
          }
        })
      )
    },
    [isEditMode]
  )

  const handleOutputChange = useCallback((dataChanges: Record<string, any>) => {
    setRow(
      produce((draft) => {
        if (!draft.output) draft.output = { name: '', icon: '', data: {}, settings: {} }
        draft.output.data = { ...(draft.output.data || {}), ...dataChanges }
      })
    )
  }, [])

  const handleSave = () => {
    if (!templateRow.inputModule || !templateRow.outputModule) {
      console.warn(
        '[IoNewRow] Cannot save, input or output module type missing.',
        JSON.parse(JSON.stringify(templateRow))
      )
      alert('Please select both an Input and an Output module type.')
      return
    }

    const finalInput: InputData = {
      name:
        templateRow.input?.name ||
        (templateRow.inputModule &&
          allModulesFromStore[templateRow.inputModule]?.inputs[0]?.name) ||
        'Input',
      icon:
        templateRow.input?.icon ||
        (templateRow.inputModule &&
          allModulesFromStore[templateRow.inputModule]?.inputs[0]?.icon) ||
        'help',
      data: templateRow.input?.data || {}
    }
    const finalOutput: OutputData = {
      name:
        templateRow.output?.name ||
        (templateRow.outputModule &&
          allModulesFromStore[templateRow.outputModule]?.outputs[0]?.name) ||
        'Output',
      icon:
        templateRow.output?.icon ||
        (templateRow.outputModule &&
          allModulesFromStore[templateRow.outputModule]?.outputs[0]?.icon) ||
        'help',
      label: templateRow.output?.label || '',
      data: templateRow.output?.data || {},
      settings: templateRow.output?.settings || {}
    }

    let triggerNextPrefill: PrefillData | null = null
    if (!isEditMode && templateRow.inputModule === 'alexa-module' && finalInput.data) {
      if (separateOffAction) {
        finalInput.data.triggerState = 'on'
        triggerNextPrefill = {
          inputModule: 'alexa-module',
          input: {
            name: finalInput.name,
            icon: finalInput.icon,
            data: { value: finalInput.data.value, triggerState: 'off' }
          }
        }
      } else {
        finalInput.data.triggerState = 'any'
      }
      if (finalInput.data.separateOffAction !== undefined) {
        delete finalInput.data.separateOffAction
      }
    }

    if (isEditMode && editRowProp) {
      const updatesForEdit: Partial<Row> = {
        input: finalInput,
        output: finalOutput,
        enabled: isEditMode && editRowProp ? editRowProp.enabled : true
      }
      console.debug(
        '[IoNewRow] Calling editRowAction for ID:',
        editRowProp.id,
        JSON.parse(JSON.stringify(updatesForEdit))
      )
      editRowAction(editRowProp.id, updatesForEdit)
    } else {
      const newRowToAdd: Row = {
        id: templateRow.id!,
        inputModule: templateRow.inputModule!,
        input: finalInput,
        outputModule: templateRow.outputModule!,
        output: finalOutput,
        enabled: true
      }
      console.debug('[IoNewRow] Calling addRowAction:', JSON.parse(JSON.stringify(newRowToAdd)))
      addRowAction(newRowToAdd)
    }

    if (triggerNextPrefill && !isEditMode) {
      startNewPrefilledRow(triggerNextPrefill)
    } else {
      onComplete()
    }
  }

  const isSaveDisabled = !templateRow.inputModule || !templateRow.outputModule

  const inputSelectorValue: SelectorValue | undefined = useMemo(() => {
    if (templateRow.inputModule && templateRow.input) {
      return {
        name: templateRow.input.name,
        icon: templateRow.input.icon,
        inputModuleId: templateRow.inputModule
      }
    }
    return undefined
  }, [templateRow.inputModule, templateRow.input])

  const outputSelectorValue: SelectorValue | undefined = useMemo(() => {
    if (templateRow.outputModule && templateRow.output) {
      return {
        name: templateRow.output.name,
        icon: templateRow.output.icon,
        outputModuleId: templateRow.outputModule
      }
    }
    return undefined
  }, [templateRow.outputModule, templateRow.output])

  const showInputEditComponent =
    templateRow.inputModule &&
    SelectedModuleInputEdit &&
    (isEditMode ? isCurrentInputActuallyEditableByModuleDef : true)
  const showOutputEditComponent =
    templateRow.outputModule &&
    SelectedModuleOutputEdit &&
    (isEditMode ? isCurrentOutputActuallyEditableByModuleDef : true)

  let inputConfigMessage = ''
  if (templateRow.inputModule) {
    if (isEditMode && !isCurrentInputActuallyEditableByModuleDef) {
      inputConfigMessage = "This input's configuration cannot be edited."
    } else if (!isEditMode && !SelectedModuleInputEdit) {
      inputConfigMessage = 'This input type has no specific options to configure.'
    }
  }

  let outputConfigMessage = ''
  if (templateRow.outputModule) {
    if (isEditMode && !isCurrentOutputActuallyEditableByModuleDef) {
      outputConfigMessage = "This output's configuration cannot be edited."
    } else if (!isEditMode && !SelectedModuleOutputEdit) {
      outputConfigMessage = 'This output type has no specific options to configure.'
    }
  }

  return (
    <Box
      sx={{
        my: 2,
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: isEditMode ? 'primary.main' : 'grey.300',
        borderRadius: 2,
        boxShadow: isEditMode ? 2 : 0
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          textAlign: 'center',
          color: isEditMode ? 'primary.main' : 'text.primary',
          fontSize: '1.1rem',
          fontWeight: 500
        }}
      >
        {isEditMode ? `Edit Row` : 'Add New IO Row'}
      </Typography>
      {isEditMode && editRowProp && (
        <Typography
          variant="caption"
          display="block"
          sx={{ textAlign: 'center', mb: 1.5, color: 'text.secondary', fontStyle: 'italic' }}
        >
          Input: {editRowProp.input.name} ({editRowProp.inputModule})
          <Typography component="span" sx={{ mx: 0.5 }}>
            →
          </Typography>
          Output: {editRowProp.output.name} ({editRowProp.outputModule})
        </Typography>
      )}
      <Divider sx={{ mb: 2.5 }} />

      {templateRow.inputModule === 'alexa-module' &&
        templateRow.input?.data?.triggerState === 'off' && (
          <Typography
            variant="subtitle2"
            sx={{
              mb: 2,
              textAlign: 'center',
              color: 'info.dark',
              bgcolor: 'info.lightest',
              p: 1,
              borderRadius: 1
            }}
          >
            Configuring &quot;OFF&quot; action for Alexa device:
            {templateRow.input?.data.value || 'Unknown Device'}
          </Typography>
        )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 2 }}>
        <Box sx={{ flexBasis: { md: '50%', maxWidth: '50%' } }}>
          <Typography
            variant="overline"
            display="block"
            sx={{ mb: 0.5, color: isInputTypeLocked ? 'text.disabled' : 'text.primary' }}
          >
            Input Module
          </Typography>
          <InputSelector
            onSelect={handleInputSelect}
            disabled={isInputTypeLocked}
            value={inputSelectorValue}
          />

          <Collapse in={showInputEditComponent} timeout="auto" unmountOnExit>
            <Box mt={1.5}>
              <SelectedModuleInputEdit
                input={templateRow.input as InputData}
                onChange={handleInputChange}
              />
            </Box>
          </Collapse>
          {inputConfigMessage && !showInputEditComponent && (
            <Typography
              sx={{
                mt: 1,
                p: 1,
                color: 'text.secondary',
                fontSize: '0.8rem',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {inputConfigMessage}
            </Typography>
          )}
          {!templateRow.inputModule && !isInputTypeLocked && (
            <Typography sx={{ mt: 1, color: 'text.disabled', fontSize: '0.8rem' }}>
              Select an input module.
            </Typography>
          )}
        </Box>

        <Box sx={{ flexBasis: { md: '50%', maxWidth: '50%' } }}>
          <Typography
            variant="overline"
            display="block"
            sx={{ mb: 0.5, color: isOutputTypeLocked ? 'text.disabled' : 'text.primary' }}
          >
            Output Module
          </Typography>
          <OutputSelector
            onSelect={handleOutputSelect}
            disabled={isOutputTypeLocked}
            value={outputSelectorValue}
          />

          <Collapse in={showOutputEditComponent} timeout="auto" unmountOnExit>
            <Box mt={1.5}>
              <SelectedModuleOutputEdit
                output={templateRow.output as OutputData}
                onChange={handleOutputChange}
              />
            </Box>
          </Collapse>
          {outputConfigMessage && !showOutputEditComponent && (
            <Typography
              sx={{
                mt: 1,
                p: 1,
                color: 'text.secondary',
                fontSize: '0.8rem',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              {outputConfigMessage}
            </Typography>
          )}
          {!templateRow.outputModule && !isOutputTypeLocked && (
            <Typography sx={{ mt: 1, color: 'text.disabled', fontSize: '0.8rem' }}>
              Select an output module.
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3, gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onComplete} sx={{ minWidth: 90 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          size="small"
          disabled={isSaveDisabled}
          onClick={handleSave}
          sx={{ minWidth: 90 }}
        >
          {isEditMode ? 'Update Row' : 'Save Row'}
        </Button>
      </Stack>
    </Box>
  )
}

export default IoNewRow
