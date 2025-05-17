import DisplayButtons from '@/components/Row/DisplayButtons'
import type { ModuleConfig, OutputData } from '@shared/types'
import { TextField } from '@mui/material'
import type { FC } from 'react'
import { log } from '@/utils'

type HassConfigExample = {}

export const id = 'homeassistant-module'

export const groupId = 'Network'

export const moduleConfig: ModuleConfig<HassConfigExample> = {
  menuLabel: 'Network',
  inputs: [],
  outputs: [
    {
      icon: 'homeassistant',
      name: 'HomeAssistant'
    }
  ],
  config: {
    enabled: false
  }
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return (
    <>
      <TextField
        fullWidth
        label="Host:Port"
        value={output.data.host ?? 'mqtt://localhost:1883'}
        onBlur={async () => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
          onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              height: '50px',
              paddingLeft: '10px'
            }
          }
        }}
      />
      <TextField
        fullWidth
        label="Username"
        defaultValue={'blade'}
        onBlur={async () => {
          // Connect to mqtt?
        }}
        onChange={() => {
          // onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              height: '50px',
              paddingLeft: '10px'
            }
          }
        }}
      />
      <TextField
        fullWidth
        label="Password"
        defaultValue={'ledfx'}
        onBlur={async () => {
          // Connect to mqtt?
        }}
        onChange={() => {
          // onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              height: '50px',
              paddingLeft: '10px'
            }
          }
        }}
      />
      <TextField
        fullWidth
        label="topic"
        defaultValue={'homeassistant'}
        onBlur={async () => {
          // Connect to mqtt?
        }}
        onChange={() => {
          // onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        variant="outlined"
        slotProps={{
          htmlInput: {
            style: {
              height: '50px',
              paddingLeft: '10px'
            }
          }
        }}
      />
    </>
  );
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <DisplayButtons data={output} />
    </>
  )
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'HomeAssistant')
}
