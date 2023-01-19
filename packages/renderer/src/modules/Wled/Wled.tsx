import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import type { FC } from 'react'
import { TextField } from '@mui/material'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import Host from '@/components/Host'

type WledConfigExample = {}

export const id = 'wled-module'

export const moduleConfig: ModuleConfig<WledConfigExample> = {
  menuLabel: 'Network',
  inputs: [],
  outputs: [
    {
      name: 'WLED',
      icon: 'wled',
    },
  ],
  config: {
    enabled: true,
  },
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  return (
    <>
      <DisplayButtons data={output} />
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return (
    <>
      <Host
        path='/json'
        onChange={onChange}
        msgConnected={(resp) => 'Got state from ' + resp?.info?.name}
      />
      <TextField
        fullWidth
        label={'Unique Name for this action'}
        value={
          output.data.text
            ?.replace(output.data.config.info.name, '')
            ?.replace(': ', '') ?? ''
        }
        onChange={(e) => {
          onChange({
            text: output.data.config.info.name + ': ' + e.target.value,
          })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
    </>
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = async (e: any) => {
      log.success2('row output triggered', row, e.detail)
      if (e.detail === row.id) {
        await fetch(`${row.output.data.host}/json`, {
          method: 'POST',
          body: JSON.stringify(row.output.data.config?.state),
        })
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'wled')
}
