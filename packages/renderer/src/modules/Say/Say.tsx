import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import { Button, Icon, TextField } from '@mui/material'
import { FC, useEffect } from 'react'
const ipcRenderer = window.ipcRenderer || false

type SayConfigExample = {}

export const id = 'say-module'

export const moduleConfig: ModuleConfig<SayConfigExample> = {
  menuLabel: 'Local',
  inputs: [],
  outputs: [
    {
      name: 'say',
      icon: 'record_voice_over',
    },
  ],
  config: {
    enabled: true,
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
        {moduleConfig.menuLabel}
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
      console.log('row output triggered', row, e.detail)
      if (e.detail === row.id) {
        const spk = new SpeechSynthesisUtterance()
        spk.text = row.output.data.text
        window.speechSynthesis.speak(spk)
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}
