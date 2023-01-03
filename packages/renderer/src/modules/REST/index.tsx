import RestEditor from '@/components/RestEditor'
import Shortkey from '@/components/Shortkey'
import type { ModuleConfig, OutputData, Row } from '@/mock-store'
import { useMainStore } from '@/mock-store'
import { Keyboard, RecordVoiceOver } from '@mui/icons-material'
import { Button, Icon, Input, TextField } from '@mui/material'
import { FC, useEffect } from 'react'

type RestConfigExample = {}

export const id = 'rest-module'

export const moduleConfig: ModuleConfig<RestConfigExample> = {
  menuLabel: 'Webhook (Rest)',
  inputs: [],
  outputs: [
    {
      name: 'rest',
      icon: 'webhook',
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
  return <RestEditor onChange={onChange} />
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
