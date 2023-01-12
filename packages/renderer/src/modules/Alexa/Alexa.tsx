import ModuleButton from '@/components/ModuleButton'
import { ModuleConfig, InputData, Row, useMainStore } from '@/store/mainStore'
import { camelToSnake } from '@/utils'
import { Button, Icon, TextField } from '@mui/material'
import { FC, useEffect } from 'react'

const ipcRenderer = window.ipcRenderer || false

type AlexaConfigExample = {}

export const id = 'alexa-module'

export const moduleConfig: ModuleConfig<AlexaConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Alexa',
      icon: 'graphic_eq',
    },
  ],
  outputs: [],
  config: {
    enabled: !!ipcRenderer,
  },
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  // const updateRowInputValue = useMainStore(state => state.updateRowInputValue);
  console.log(input)
  // Widget()
  return (
    <>
      <TextField
        fullWidth
        value={input.data.value ?? ''}
        onChange={(event: any) => {
          onChange({ value: event.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            height: '50px',
            paddingLeft: '10px',
          },
        }}
        variant='standard'
      />
    </>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  // console.log(input)
  return (
    <>
      <ModuleButton data={input} />
      <Button
        variant='outlined'
        color={'inherit'}
        sx={{ pointerEvents: 'none' }}
      >
        {input.data.value}
      </Button>
    </>
  )
}

export const Widget = () => {
  const rows = useMainStore((state) => state.rows)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.sendSync(
        'emulate-alexa-devices',
        Object.keys(rows)
          .filter((r) => rows[r].inputModule === 'alexa-module')
          .map((rk) => rows[rk].input.data.value)
      )
    }
  }, [])
  return
}

export const useInputActions = (row: Row) => {
  const rows = useMainStore((state) => state.rows)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('alexa-device', (event: any, data: any) => {
        if (data.device === row.input.data.value)
          window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
      })
    }
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('alexa-device')
      }
    }
  }, [])
}
