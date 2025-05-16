import type { InputData, ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { Box, Button, Tooltip } from '@mui/material'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import RestEditor from '@/components/RestEditor/RestEditor'
import { useRowActivation } from '@/hooks/useRowActivation'

type RestConfigExample = {}
const ipcRenderer = window.electron?.ipcRenderer

export interface RestOutputRowDataFromEditor {
  text?: string // Label
  host: string // URL
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
    headers?: Record<string, string>
    body?: string // Stringified JSON
  }
}

export const id = 'rest-module'
export const groupId = 'Network'

export const moduleConfig: ModuleConfig<RestConfigExample> = {
  menuLabel: 'Network',
  inputs: [
    {
      name: 'REST',
      icon: 'webhook'
    }
  ],
  outputs: [
    {
      name: 'REST',
      icon: 'webhook'
    }
  ],
  config: {
    enabled: true
  }
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => <DisplayButtons data={output} />

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return (
    <div style={{ display: 'flex', marginTop: '1rem' }}>
      <RestEditor onChange={onChange} />
      {output.data.text && (
        <Button
          size="large"
          color="inherit"
          variant="outlined"
          disabled
          sx={{
            height: 56,
            fontSize: 16,
            fontWeight: 400,
            textTransform: 'unset',
            flexGrow: 1,
            justifyContent: 'flex-start',
            ml: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {output.data.text?.slice(-31)}
        </Button>
      )}
    </div>
  )
}

export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row
  const outputData = output.data as RestOutputRowDataFromEditor // CAST to our specific type
  const { isActive, inactiveReason } = useRowActivation(row)

  // Destructure for dependency array
  const { host, options } = outputData
  const method = options?.method
  const headers = options?.headers
  const body = options?.body

  useEffect(() => {
    if (!isActive) {
      log.info2(`REST.tsx: Row ${row.id} Output not active. Reason: ${inactiveReason}`)
      return // Do not attach listener if not active
    }
    const listener = async (e: any) => {
      log.success2('row output triggered', row, e.detail)
      if (e.detail === rowId) {
        // await fetch(row.output.data.host, row.output.data.options)
        await ipcRenderer.invoke('rest-request', {
          url: host,
          method: method,
          headers: headers,
          body: body
        })
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
      <DisplayButtons data={input} />
    </>
  )
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <div style={{ display: 'flex', marginTop: '1rem' }}>
      <RestEditor onChange={onChange} />
      {input.data.text && (
        <Button
          size="large"
          color="inherit"
          variant="outlined"
          disabled
          sx={{
            height: 56,
            fontSize: 16,
            fontWeight: 400,
            textTransform: 'unset',
            flexGrow: 1,
            justifyContent: 'flex-start',
            ml: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {input.data.text?.slice(-31)}
        </Button>
      )}
    </div>
  )
}

export const useInputActions = (row: Row) => {
  log.success3('hotkey triggered', row.id)
  window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'rest')
}
