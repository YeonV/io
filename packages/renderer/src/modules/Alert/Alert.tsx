import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import { FC, useState } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import EditButtons from '@/components/Row/EditButtons'
import { useSnackbar } from 'notistack'
import { Select, MenuItem } from '@mui/material'

const ipcRenderer = window.ipcRenderer || false

type AlertConfigExample = {}

export const id = 'alert-module'

export const moduleConfig: ModuleConfig<AlertConfigExample> = {
  menuLabel: 'Local',
  inputs: [],
  outputs: [
    {
      name: 'alert',
      icon: 'info',
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
      <DisplayButtons data={output} />
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  const [variant, setVariant] = useState(
    'info' as 'default' | 'error' | 'success' | 'warning' | 'info'
  )
  return (
    <>
      <div style={{ marginTop: '1rem', width: '100%' }} />
      <Select
        fullWidth
        label={'Variant'}
        value={variant}
        onChange={(e: any) => onChange({ variant: e.target.value })}
      >
        <MenuItem value={'success'}>Success</MenuItem>
        <MenuItem value={'info'}>Info</MenuItem>
        <MenuItem value={'warning'}>Warning</MenuItem>
        <MenuItem value={'error'}>Error</MenuItem>
      </Select>
      <EditButtons data={output} onChange={onChange} title='Message' />
    </>
    // <TextField
    //   fullWidth
    //   value={output.data.text ?? ''}
    //   onChange={(e) => {
    //     onChange({ text: e.target.value })
    //   }}
    //   sx={{ mt: 2 }}
    //   inputProps={{
    //     style: {
    //       height: '50px',
    //       paddingLeft: '10px',
    //     },
    //   }}
    //   variant='standard'
    // />
  )
}

export const useOutputActions = (row: Row) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  useEffect(() => {
    const listener = (e: any) => {
      log.success2('row output triggered', row, e.detail)
      const out = row.output.data.command || row.output.data.text
      if (e.detail === row.id) {
        enqueueSnackbar(out, {
          autoHideDuration: 3000,
          variant: row.output.data.variant,
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
  log.info1('useGlobalActions:', 'alert')
}
