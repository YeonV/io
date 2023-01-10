import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import { Button, Icon, TextField } from '@mui/material'
import { FC, useEffect } from 'react'
const ipcRenderer = window.ipcRenderer || false

type ShellConfigExample = {}

export const id = 'shell-module'

export const moduleConfig: ModuleConfig<ShellConfigExample> = {
  menuLabel: 'Local',
  inputs: [],
  outputs: [
    {
      name: 'shell',
      icon: 'terminal',
    },
  ],
  config: {
    enabled: !!ipcRenderer,
  },
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <Button disabled variant='outlined' sx={{ mr: 2 }}>
        <Icon style={{ marginRight: '10px' }}>{output.icon}</Icon>
        {output.name}
      </Button>
      {output.data.text}
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <TextField
      fullWidth
      value={output.data.text ?? ''}
      onChange={(e) => {
        onChange({ text: e.target.value })
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
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = (e: any) => {
      if (e.detail === row.id) {
        console.log('row output triggered', row, e.detail)
        ipcRenderer.sendSync('run-shell', row.output.data.text)
      }
    }
    ipcRenderer.on('run-shell-answer', (event: any, data: any) => {
      console.log(JSON.stringify(data.result))
    })
    window.addEventListener('io_input', listener)
    return () => {
      ipcRenderer.removeAllListeners('run-shell-answer')
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}
