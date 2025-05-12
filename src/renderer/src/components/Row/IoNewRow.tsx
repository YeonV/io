import { produce } from 'immer'
import { useCallback, useMemo, useState } from 'react'
import { Button, Stack, Box, Typography } from '@mui/material'
import { v4 as uuidv4 } from 'uuid'
import { InputSelector } from './InputSelector'
import { OutputSelector } from './OutputSelector'
import { useMainStore } from '@/store/mainStore'
import type { Row, InputData, OutputData } from '@shared/types'
import { useShallow } from 'zustand/react/shallow'
import { log } from '@/utils'

export interface PrefillData {
  inputModule: Row['inputModule']
  input: Partial<InputData>
}

export const IoNewRow = ({
  onComplete,
  startNewPrefilledRow,
  initialPrefill
}: {
  onComplete: () => void
  startNewPrefilledRow: (prefill: PrefillData) => void
  initialPrefill?: PrefillData
}) => {
  const addRow = useMainStore(useShallow((state) => state.addRow))

  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, 'id'>>(() => {
    log.info('IoNewRow initializing state with initialPrefill:', initialPrefill)
    const newRowId = uuidv4()
    if (initialPrefill) {
      return {
        id: newRowId,
        inputModule: initialPrefill.inputModule,
        input: { ...(initialPrefill.input as InputData) },

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

  const modules = useMainStore((state) => state.modules)

  const selectedInputModule = useMemo(() => {
    if (!templateRow.inputModule) return undefined
    return modules[templateRow.inputModule]
  }, [modules, templateRow.inputModule])

  const selectedOutputModule = useMemo(() => {
    if (!templateRow.outputModule) return undefined
    return modules[templateRow.outputModule]
  }, [modules, templateRow.outputModule])

  const SelectedModuleInputEdit = useMemo(() => {
    if (isInputLocked) return undefined
    return selectedInputModule?.InputEdit
  }, [selectedInputModule, isInputLocked])

  const SelectedModuleOutputEdit = useMemo(() => {
    return selectedOutputModule?.OutputEdit
  }, [selectedOutputModule])

  const handleInputSelect = useCallback(
    (modId: Row['inputModule'], inp: Omit<InputData, 'data'>) => {
      setRow((row) => ({
        ...row,
        inputModule: modId,
        input: { ...inp, data: {} }
      }))
      setSeparateOffAction(false)
      log.info('Input selected:', modId, inp)
    },
    []
  )

  const handleOutputSelect = useCallback(
    (modId: Row['outputModule'], outp: Omit<OutputData, 'data'>) => {
      setRow((row) => ({
        ...row,
        outputModule: modId,
        output: { ...outp, data: {} }
      }))
      log.info('Output selected:', modId, outp)
    },
    []
  )

  const handleInputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft) => {
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
    log.info('Input data changed:', data)
  }, [])

  const handleOutputChange = useCallback((data: Record<string, any>) => {
    setRow(
      produce((draft) => {
        if (draft.output) {
          Object.assign(draft.output.data, data)
        }
      })
    )
    log.info('Output data changed:', data)
  }, [])

  const handleSave = () => {
    if (
      !templateRow.input ||
      !templateRow.inputModule ||
      !templateRow.output ||
      !templateRow.outputModule
    ) {
      return
    }

    const isAlexa = templateRow.inputModule === 'alexa-module'
    const useSeparateOff = isAlexa && separateOffAction
    const currentIsOffRow = isAlexa && templateRow.input?.data.triggerState === 'off'
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
      id: templateRow.id,
      inputModule: templateRow.inputModule,
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
        ...templateRow.output,
        data: { ...templateRow.output.data }
      }
    }

    if (rowToSave.input.data.separateOffAction === undefined) {
      delete rowToSave.input.data.separateOffAction
    }

    if (rowToSave.inputModule === 'midi-module') {
      /* ... */
    }

    log.success('Saving row:', rowToSave)
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
            value={templateRow.input}
          />
          {templateRow.input &&
            !SelectedModuleInputEdit &&
            isInputLocked &&
            selectedInputModule?.InputDisplay && (
              <Box
                sx={{
                  mt: isOffConfiguration ? 0 : 2,
                  p: 1,
                  border: '1px dashed grey',
                  borderRadius: 1
                }}
              >
                <selectedInputModule.InputDisplay input={templateRow.input} />
              </Box>
            )}
          {templateRow.input && SelectedModuleInputEdit && (
            <SelectedModuleInputEdit input={templateRow.input} onChange={handleInputChange} />
          )}
          {!templateRow.input && !isInputLocked && (
            <Typography sx={{ mt: 2, color: 'text.disabled' }}>
              Select an input type above.
            </Typography>
          )}
        </Box>

        <Box sx={{ flexBasis: '50%', marginLeft: '10px', textAlign: 'left' }}>
          <OutputSelector onSelect={handleOutputSelect} />
          {templateRow.output && SelectedModuleOutputEdit && (
            <SelectedModuleOutputEdit output={templateRow.output} onChange={handleOutputChange} />
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
