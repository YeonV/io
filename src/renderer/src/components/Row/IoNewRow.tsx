import { produce } from 'immer'
import { FC, useCallback, useMemo, useState } from 'react'
import { Button, Stack, Box, Typography } from '@mui/material'
import { v4 as uuidv4 } from 'uuid'
import { InputSelector } from './InputSelector'
import { OutputSelector } from './OutputSelector'
import { useMainStore } from '@/store/mainStore'
import type { Row, InputData, OutputData, ModuleId } from '@shared/types'
import { moduleImplementations, ModuleImplementationMap } from '@/modules/moduleRegistry'

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

export const IoNewRow: FC<{
  onComplete: () => void
  startNewPrefilledRow: (prefill: PrefillData) => void
  initialPrefill?: PrefillData
  key?: string | number
}> = ({ onComplete, startNewPrefilledRow, initialPrefill }) => {
  const addRow = useMainStore((state) => state.addRow)

  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, 'id'>>(() => {
    console.debug('IoNewRow', 'initializing state with initialPrefill:', initialPrefill)
    const newRowId = uuidv4()
    if (initialPrefill) {
      return {
        id: newRowId,
        inputModule: initialPrefill.inputModule,
        input: {
          name: initialPrefill.input.name || '',
          icon: initialPrefill.input.icon || '',
          data: initialPrefill.input.data || {}
        } as InputData,
        outputModule: undefined,
        output: undefined
      }
    }
    return { id: newRowId }
  })

  const [isInputLocked, _setIsInputLocked] = useState(!!initialPrefill)
  const [separateOffAction, setSeparateOffAction] = useState(
    initialPrefill?.input?.data?.separateOffAction ?? false
  )

  const SelectedModuleInputEdit = useMemo(() => {
    if (isInputLocked || !templateRow.inputModule) return undefined
    return (moduleImplementations[templateRow.inputModule as keyof ModuleImplementationMap] as any)
      ?.InputEdit
  }, [templateRow.inputModule, isInputLocked])

  const SelectedModuleOutputEdit = useMemo(() => {
    if (!templateRow.outputModule) return undefined
    return (moduleImplementations[templateRow.outputModule as keyof ModuleImplementationMap] as any)
      ?.OutputEdit
  }, [templateRow.outputModule])

  const SelectedModuleInputDisplay = useMemo(() => {
    if (!templateRow.inputModule) return undefined
    return (moduleImplementations[templateRow.inputModule as keyof ModuleImplementationMap] as any)
      ?.InputDisplay
  }, [templateRow.inputModule])

  const handleInputSelect = useCallback((modId: ModuleId, inp: Omit<InputData, 'data'>) => {
    setRow((prevRow) => ({
      ...prevRow,
      inputModule: modId,
      input: { ...inp, data: {} }
    }))
    setSeparateOffAction(false)
    console.debug('Input selected:', modId, inp)
  }, [])

  const handleOutputSelect = useCallback((modId: ModuleId, outp: Omit<OutputData, 'data'>) => {
    setRow((prevRow) => ({
      ...prevRow,
      outputModule: modId,
      output: { ...outp, data: {} }
    }))
    console.debug('Output selected:', modId, outp)
  }, [])

  const handleInputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft: Partial<Row>) => {
        if (draft.input) {
          if (
            draft.inputModule === 'alexa-module' &&
            Object.prototype.hasOwnProperty.call(data, 'separateOffAction')
          ) {
            draft.input.data.value = data.value
            setSeparateOffAction(data.separateOffAction)
            draft.input.data.separateOffAction = data.separateOffAction
          } else {
            Object.assign(draft.input.data, data)
          }
        }
      })
    )
    console.debug('Input data changed:', data)
  }, [])

  const handleOutputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft: Partial<Row>) => {
        if (draft.output) {
          Object.assign(draft.output.data, data)
        }
      })
    )
    console.debug('Output data changed:', data)
  }, [])

  const handleSave = () => {
    if (
      !templateRow.input ||
      !templateRow.inputModule ||
      !templateRow.output ||
      !templateRow.outputModule
    ) {
      console.warn('IoNewRow: Cannot save, input or output missing.')
      return
    }

    const isAlexa = templateRow.inputModule === 'alexa-module'
    const useSeparateOff = isAlexa && separateOffAction // Use the local state flag
    const currentIsOffRow = isAlexa && templateRow.input?.data?.triggerState === 'off'
    let finalTriggerState: 'on' | 'off' | 'any' | undefined = undefined
    let triggerNextPrefill: PrefillData | null = null

    if (isAlexa) {
      if (useSeparateOff && !currentIsOffRow) {
        finalTriggerState = 'on'
        triggerNextPrefill = {
          inputModule: 'alexa-module',
          input: {
            name: templateRow.input.name,
            icon: templateRow.input.icon,
            data: {
              value: templateRow.input.data.value,
              triggerState: 'off'
            }
          }
        }
      } else if (!useSeparateOff && !currentIsOffRow) {
        finalTriggerState = 'any'
      } else if (currentIsOffRow) {
        finalTriggerState = 'off'
      }
    }

    const rowToSave: Row = {
      id: templateRow.id!,
      inputModule: templateRow.inputModule,
      enabled: true,
      input: {
        name: templateRow.input.name,
        icon: templateRow.input.icon,
        data: {
          ...templateRow.input.data,
          ...(finalTriggerState !== undefined && { triggerState: finalTriggerState }),
          separateOffAction: undefined
        }
      },
      outputModule: templateRow.outputModule,
      output: {
        name: templateRow.output.name,
        icon: templateRow.output.icon,
        data: { ...(templateRow.output.data || {}) },
        settings: { ...(templateRow.output.settings || {}) }
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(rowToSave.input.data, 'separateOffAction') &&
      rowToSave.input.data.separateOffAction === undefined
    ) {
      delete rowToSave.input.data.separateOffAction
    }

    if (rowToSave.inputModule === 'midi-module' && !rowToSave.input.data.value) {
      console.debug('MIDI row saved without a specific note value in input.data.value')
    }

    console.debug('Saving row:', rowToSave)
    addRow(rowToSave)

    if (triggerNextPrefill) {
      startNewPrefilledRow(triggerNextPrefill)
    } else {
      onComplete()
    }
  }

  const isOffConfiguration = isInputLocked && templateRow.input?.data?.triggerState === 'off'
  const isSaveDisabled =
    !templateRow.input ||
    !templateRow.inputModule ||
    !templateRow.output ||
    !templateRow.outputModule

  const inputSelectorValue: SelectorValue | undefined = useMemo(() => {
    if (templateRow.input && templateRow.inputModule) {
      return {
        name: templateRow.input.name,
        icon: templateRow.input.icon,
        inputModuleId: templateRow.inputModule
      }
    }
    return undefined
  }, [templateRow.input, templateRow.inputModule])

  const outputSelectorValue: SelectorValue | undefined = useMemo(() => {
    if (templateRow.output && templateRow.outputModule) {
      return {
        name: templateRow.output.name,
        icon: templateRow.output.icon,
        outputModuleId: templateRow.outputModule
      }
    }
    return undefined
  }, [templateRow.output, templateRow.outputModule])

  return (
    <>
      {isOffConfiguration && (
        <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', color: 'text.secondary' }}>
          Configure Off action for: {templateRow.input?.data.value}
        </Typography>
      )}
      <Stack
        direction={'row'}
        sx={{
          borderTop: '1px solid #bbb',
          borderBottom: '1px solid #bbb',
          width: '100%',
          justifyContent: 'space-between',
          mt: 2,
          mb: 2,
          pt: 2,
          pb: 2
        }}
      >
        <Box
          sx={{
            flexBasis: '50%',
            opacity: isInputLocked ? 0.6 : 1,
            pointerEvents: isInputLocked ? 'none' : 'auto'
          }}
        >
          <InputSelector
            onSelect={handleInputSelect}
            disabled={isInputLocked}
            value={inputSelectorValue}
          />
          {templateRow.input &&
            !SelectedModuleInputEdit &&
            isInputLocked &&
            SelectedModuleInputDisplay && (
              <Box
                sx={{
                  mt: isOffConfiguration ? 0 : 2,
                  p: 1,
                  border: '1px dashed grey',
                  borderRadius: 1
                }}
              >
                <SelectedModuleInputDisplay input={templateRow.input as InputData} />
              </Box>
            )}
          {templateRow.input && SelectedModuleInputEdit && (
            <SelectedModuleInputEdit
              input={templateRow.input as InputData}
              onChange={handleInputChange}
            />
          )}
          {!templateRow.input && !isInputLocked && (
            <Typography sx={{ mt: 2, color: 'text.disabled' }}>
              Select an input type above.
            </Typography>
          )}
        </Box>

        <Box sx={{ flexBasis: '50%', marginLeft: '10px', textAlign: 'left' }}>
          <OutputSelector onSelect={handleOutputSelect} value={outputSelectorValue} />
          {templateRow.output && SelectedModuleOutputEdit && (
            <SelectedModuleOutputEdit
              output={templateRow.output as OutputData}
              onChange={handleOutputChange}
            />
          )}
          {!templateRow.output && (
            <Typography sx={{ mt: 2, color: 'text.disabled' }}>
              Select an output type above.
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack direction={'row'} sx={{ justifyContent: 'center', mt: 2 }}>
        <Button
          variant="contained"
          sx={{ width: 90, mr: '2px' }}
          size="small"
          disabled={isSaveDisabled}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button sx={{ width: 90, ml: '10px' }} variant="outlined" size="small" onClick={onComplete}>
          Cancel
        </Button>
      </Stack>
    </>
  )
}

export default IoNewRow
