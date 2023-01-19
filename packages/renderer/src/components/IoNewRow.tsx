import produce from 'immer'
import type { Row } from '@/store/mainStore'
import { Button, Stack } from '@mui/material'
import { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { InputSelector } from '@/components/InputSelector'
import { OutputSelector } from '@/components/OutputSelector'
import { useMainStore } from '@/store/mainStore'
import { useStore } from '@/store/OLD/useStore'

export const IoNewRow = ({ onComplete }: { onComplete: () => void }) => {
  const addRow = useMainStore((state) => state.addRow)
  const setInput = useStore((state) => state.setInput)

  const [templateRow, setRow] = useState<Partial<Row> & Pick<Row, 'id'>>({
    id: uuidv4(),
  })
  const modules = useMainStore((state) => state.modules)
  const selectedInputModule = useMemo(() => {
    if (!templateRow.input || !templateRow.inputModule) {
      return undefined
    }
    return modules[templateRow.inputModule]
  }, [modules, templateRow])

  const selectedOutputModule = useMemo(() => {
    if (!templateRow.output || !templateRow.outputModule) {
      return undefined
    }
    return modules[templateRow.outputModule]
  }, [modules, templateRow])

  const SelectedModuleInputEdit = useMemo(() => {
    return selectedInputModule?.InputEdit
  }, [selectedInputModule])

  const SelectedModuleOutputEdit = useMemo(() => {
    return selectedOutputModule?.OutputEdit
  }, [selectedOutputModule])

  return (
    <>
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
          pb: 2,
        }}
      >
        <div style={{ flexBasis: '50%', textAlign: 'left' }}>
          <InputSelector
            onSelect={(modId, inp) => {
              setRow((row) => {
                return {
                  ...row,
                  input: {
                    ...inp,
                    data: {},
                  },
                  inputModule: modId,
                }
              })
            }}
          />
          {templateRow.input && SelectedModuleInputEdit ? (
            <SelectedModuleInputEdit
              input={templateRow.input}
              onChange={(data: Record<string, any>) => {
                setRow(
                  produce((row) => {
                    if (row.input) {
                      Object.assign(row.input?.data, data)
                    }
                  })
                )
              }}
            ></SelectedModuleInputEdit>
          ) : (
            <></>
          )}
        </div>
        <div
          style={{ flexBasis: '50%', marginLeft: '10px', textAlign: 'left' }}
        >
          <>
            <OutputSelector
              onSelect={(modId, output) => {
                setRow((row) => {
                  return {
                    ...row,
                    output: {
                      ...output,
                      data: {},
                    },
                    outputModule: modId,
                  }
                })
              }}
            />
            {templateRow.output && SelectedModuleOutputEdit && (
              <SelectedModuleOutputEdit
                output={templateRow.output}
                onChange={(data: Record<string, any>) => {
                  setRow(
                    produce((row) => {
                      if (row.output) {
                        Object.assign(row.output?.data, data)
                      }
                    })
                  )
                }}
              ></SelectedModuleOutputEdit>
            )}
          </>
        </div>
      </Stack>
      <Stack direction={'row'} sx={{ justifyContent: 'center' }}>
        <Button
          variant='contained'
          sx={{ width: 90, mr: '2px' }}
          size='small'
          disabled={
            !templateRow.input ||
            !templateRow.inputModule ||
            !templateRow.output ||
            !templateRow.outputModule
          }
          onClick={() => {
            if (
              templateRow.input &&
              templateRow.inputModule &&
              templateRow.output &&
              templateRow.outputModule
            ) {
              addRow({
                id: templateRow.id,
                input: templateRow.input,
                inputModule: templateRow.inputModule,
                output: templateRow.output,
                outputModule: templateRow.outputModule,
              })
              onComplete()
              if (templateRow.inputModule === 'alexa-module') {
                localStorage.setItem('io-restart-needed', 'yes')
              }

              if (templateRow.inputModule === 'midi-module') {
                setInput('midi', false)
              }
            }
          }}
        >
          save
        </Button>
        <Button
          sx={{ width: 90, ml: '10px' }}
          variant='contained'
          size='small'
          onClick={() => onComplete()}
        >
          Cancel
        </Button>
      </Stack>
    </>
  )
}

export default IoNewRow
