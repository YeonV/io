import RestEditor from '@/components/OLD/RestEditor/RestEditor'
import type {
  InputData,
  ModuleConfig,
  OutputData,
  Row,
} from '@/store/mainStore'
import { Button, Icon } from '@mui/material'
import { FC, useEffect } from 'react'

type RestConfigExample = {}

export const id = 'rest-module'
export const groupId = 'Network'

export const moduleConfig: ModuleConfig<RestConfigExample> = {
  menuLabel: 'Network',
  inputs: [
    {
      name: 'REST',
      icon: 'webhook',
    },
  ],
  outputs: [
    {
      name: 'REST',
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
  console.log(output)
  return (
    <>
      <Button disabled variant='outlined' sx={{ mr: 2 }}>
        <Icon style={{ marginRight: '10px' }}>{output.icon}</Icon>
        {output.name}
      </Button>
      {output.data.name}
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return (
    <div style={{ display: 'flex' }}>
      <RestEditor onChange={onChange} />
      {output.data.name}
    </div>
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = async (e: any) => {
      console.log('row output triggered', row, e.detail)
      if (e.detail === row.id) {
        await fetch(row.output.data.host, row.output.data.options)
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}

export const InputDisplay: FC<{
  input: InputData
}> = ({ input }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <Button disabled variant='outlined' sx={{ mr: 2 }}>
        <Icon style={{ marginRight: '10px' }}>{input.icon}</Icon>
        {moduleConfig.menuLabel}
      </Button>
      {input.data.text}
    </>
  )
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return <RestEditor onChange={onChange} />
}

export const useInputActions = (row: Row) => {
  console.log('hotkey triggered', row.id)
  window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
}
