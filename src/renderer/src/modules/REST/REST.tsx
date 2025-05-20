import type { InputData, ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { Button } from '@mui/material'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import RestEditor from '@/components/RestEditor/RestEditor'
import { useRowActivation } from '@/hooks/useRowActivation'
import { isElectron } from '@/utils/isElectron'

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
    // {
    //   name: 'REST',
    //   icon: 'webhook'
    // }
  ],
  outputs: [
    {
      name: 'REST',
      icon: 'webhook',
      editable: true,
      supportedContexts: ['electron', 'web']
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
      console.debug(`[REST Output] Row ${rowId} is not active. Reason: ${inactiveReason}`)
      return // Do not attach listener if not active
    }

    if (!host || !method) {
      // Basic validation
      console.warn(
        `[REST Output] Row ${rowId}: Host or method not configured. Listener not attached.`
      )
      return
    }

    console.debug(
      `[REST Output] Attaching 'io_input' listener for Row ${rowId}. Target: ${method} ${host}`
    )

    const listener = async (event: Event) => {
      // Type guard for CustomEvent
      if (!(event instanceof CustomEvent && typeof event.detail === 'string')) {
        return
      }

      const triggerRowId = event.detail

      if (triggerRowId === rowId) {
        console.log(`[REST Output] Row ${rowId} TRIGGERED! Config:`, {
          host,
          method,
          headers: headers || {},
          body: body || null
        })

        try {
          if (isElectron() && ipcRenderer) {
            console.debug(`[REST Output Electron] Invoking 'rest-request' for row ${rowId}`)
            const result = await ipcRenderer.invoke('rest-request', {
              url: host,
              method: method,
              headers: headers || {}, // Send empty object if undefined
              body: body || null // Send null if undefined/empty
            })
            console.log(
              `[REST Output Electron] IPC 'rest-request' result for row ${rowId}:`,
              result
            )
            // Optionally, dispatch another event with the result:
            // window.dispatchEvent(new CustomEvent('io_rest_response', { detail: { rowId, success: true, data: result } }));
          } else {
            // Web Environment: Use fetch directly
            console.debug(`[REST Output Web] Performing direct fetch for row ${rowId}`)

            const fetchOptions: RequestInit = {
              method: method,
              headers: headers || {}
            }

            if (method !== 'GET' && method !== 'HEAD' && body) {
              fetchOptions.body = body
              // Ensure Content-Type is set if body is JSON and headers don't already have it
              if (
                !fetchOptions.headers!['Content-Type'] &&
                body.startsWith('{') &&
                body.endsWith('}')
              ) {
                fetchOptions.headers!['Content-Type'] = 'application/json'
              }
            }

            const response = await fetch(host, fetchOptions)
            console.log(`[REST Output Web] Fetch status for row ${rowId}: ${response.status}`)

            // Process response (optional, depends on if you need to react to it)
            // const responseData = response.headers.get('Content-Type')?.includes('application/json')
            //   ? await response.json()
            //   : await response.text();
            // console.log(`[REST Output Web] Fetch response data for row ${rowId}:`, responseData);
            // window.dispatchEvent(new CustomEvent('io_rest_response', { detail: { rowId, success: response.ok, data: responseData, status: response.status } }));

            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
            }
          }
        } catch (error) {
          console.error(`[REST Output] Error during REST request for row ${rowId}:`, error)
          // window.dispatchEvent(new CustomEvent('io_rest_response', { detail: { rowId, success: false, error: (error as Error).message } }));
        }
      }
    }

    window.addEventListener('io_input', listener)
    return () => {
      console.debug(`[REST Output] Removing 'io_input' listener for Row ${rowId}`)
      window.removeEventListener('io_input', listener)
    }
    // CORRECTED Dependency Array:
    // Depends on rowId, isActive, and all parts of the request configuration.
    // JSON.stringify for headers and body ensures effect re-runs if their content changes, not just reference.
  }, [rowId, isActive, host, method, JSON.stringify(headers), body, inactiveReason])
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
