// src/renderer/src/modules/REST/REST.tsx
import type { InputData, ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { Button } from '@mui/material'
import { useEffect, useState } from 'react'
import DisplayButtons from '@/components/Row/DisplayButtons'
import { useRowActivation } from '@/hooks/useRowActivation'
import { isElectron } from '@/utils/isElectron'
import { RestModuleCustomConfig, RestOutputRowData } from './REST.types' // Updated import
import RestEditor from './RestEditor'
import { RestSettings } from './RestSettings'
import { v4 as uuidv4 } from 'uuid'
import { exampleGitHubStatsBlueprint } from './Blueprints/Example'
import { RestOutputEdit } from './RestOutputEdit'

const ipcRenderer = window.electron?.ipcRenderer

export const id = 'rest-module'
export const groupId = 'Network' // Added groupId as per your file tree (not in original snippet but good practice)

// Updated ModuleConfig to use RestModuleCustomConfig
export const moduleConfig: ModuleConfig<RestModuleCustomConfig> = {
  menuLabel: 'Network',
  inputs: [],
  outputs: [
    {
      name: 'REST Call',
      icon: 'webhook',
      editable: true,
      supportedContexts: ['electron', 'web']
    }
  ],
  config: {
    enabled: true,
    presets: [
      {
        id: uuidv4(),
        name: 'Example GET Unsplash',
        icon: 'mdi:image',
        description: 'Fetches a random image from Unsplash API (requires API key).',
        url: 'https://api.unsplash.com/photos/random',
        method: 'GET',
        headers: {
          Authorization: 'Client-ID YOUR_UNSPLASH_ACCESS_KEY',
          'Accept-Version': 'v1'
        }
      }
    ],
    blueprints: [exampleGitHubStatsBlueprint] // Initialize with our example blueprint
  }
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  const outputData = output.data as RestOutputRowData
  const isBlueprintConfigured = !!outputData.blueprintIdUsed

  let displayText =
    outputData.label || `${outputData.options.method} ${outputData.host.substring(0, 20)}...`
  if (isBlueprintConfigured && outputData.label) {
    displayText = outputData.label // Prefer label if set
  } else if (isBlueprintConfigured) {
    // Try to find blueprint name as a fallback if no label on row
    // This might require accessing globalBlueprints if not too complex
    // For now, just indicate it's blueprint based if no label
    displayText = `Blueprint: ${outputData.blueprintIdUsed?.substring(0, 15)}...`
  }

  return (
    <DisplayButtons
      data={{
        ...output,
        name: displayText,
        icon: isBlueprintConfigured ? output.icon || 'api' : output.icon
      }}
    />
  )
}

// --- OutputEdit ---
export const OutputEdit = RestOutputEdit

export const Settings = RestSettings

export const useOutputActions = (row: Row) => {
  const { id: rowId, output } = row
  const outputData = output.data as RestOutputRowData // CAST to our specific type
  const { isActive, inactiveReason } = useRowActivation(row)

  // Destructure for dependency array
  const { host, options } = outputData
  const method = options?.method
  const headers = options?.headers // This is an object
  const body = options?.body // This is a stringified body

  useEffect(() => {
    if (!isActive) {
      console.debug(`[REST Output] Row ${rowId} is not active. Reason: ${inactiveReason}`)
      return // Do not attach listener if not active
    }

    if (!host || !method) {
      console.warn(
        `[REST Output] Row ${rowId}: Host or method not configured for row. Listener not attached.`
      )
      return
    }

    console.debug(
      `[REST Output] Attaching 'io_input' listener for Row ${rowId}. Target: ${method} ${host}`
    )

    const listener = async (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      // Ensure detail has rowId, handle object or direct string for compatibility
      const triggerRowId =
        typeof event.detail === 'object' && event.detail !== null
          ? event.detail.rowId
          : event.detail

      if (triggerRowId === rowId) {
        // Validate again, as config might have changed if not properly handled by deps
        if (!outputData.host || !outputData.options?.method) {
          console.warn(
            `[REST Output] Row ${rowId} triggered but host/method is missing post-init. Aborting.`
          )
          return
        }

        console.log(`[REST Output] Row ${rowId} TRIGGERED! Config:`, {
          host: outputData.host,
          method: outputData.options.method,
          headers: outputData.options.headers || {},
          body: outputData.options.body || null
        })

        try {
          if (isElectron() && ipcRenderer) {
            console.debug(`[REST Output Electron] Invoking 'rest-request' for row ${rowId}`)
            const result = await ipcRenderer.invoke('rest-request', {
              url: outputData.host,
              method: outputData.options.method,
              headers: outputData.options.headers || {},
              body: outputData.options.body || null
            })
            console.log(
              `[REST Output Electron] IPC 'rest-request' result for row ${rowId}:`,
              result
            )
          } else {
            console.debug(`[REST Output Web] Performing direct fetch for row ${rowId}`)
            const fetchOptions: RequestInit = {
              method: outputData.options.method,
              headers: outputData.options.headers || {}
            }

            if (
              outputData.options.method !== 'GET' &&
              outputData.options.method !== 'HEAD' &&
              outputData.options.body
            ) {
              fetchOptions.body = outputData.options.body
              // Content-Type is expected to be in outputData.options.headers if needed
            }

            const response = await fetch(outputData.host, fetchOptions)
            console.log(`[REST Output Web] Fetch status for row ${rowId}: ${response.status}`)

            if (!response.ok) {
              const errorBody = await response.text()
              throw new Error(
                `HTTP error ${response.status}: ${response.statusText}. Body: ${errorBody}`
              )
            }
            // Optional: Process response data
            // const responseData = response.headers.get('Content-Type')?.includes('application/json')
            //   ? await response.json()
            //   : await response.text();
            // console.log(`[REST Output Web] Fetch response data for row ${rowId}:`, responseData);
          }
        } catch (error) {
          console.error(`[REST Output] Error during REST request for row ${rowId}:`, error)
        }
      }
    }

    window.addEventListener('io_input', listener as EventListener) // Cast for CustomEvent
    return () => {
      console.debug(`[REST Output] Removing 'io_input' listener for Row ${rowId}`)
      window.removeEventListener('io_input', listener as EventListener) // Cast for CustomEvent
    }
  }, [rowId, isActive, host, method, JSON.stringify(headers), body, inactiveReason, outputData]) // Added outputData for safety
}

// --- Input Components (Placeholder/To be removed if no REST Input is planned) ---
export const InputDisplay: FC<{
  input: InputData
}> = ({ input }) => {
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
  const [restEditorOpen, setRestEditorOpen] = useState(false)
  return (
    <div style={{ display: 'flex', marginTop: '1rem' }}>
      {/* If RestEditor is specific to Output, this would need a different editor or be removed */}
      <RestEditor
        initialData={input.data as Partial<RestOutputRowData>} // Placeholder, type mismatch
        onChange={onChange}
        open={restEditorOpen}
        setOpen={setRestEditorOpen}
      />
      {input.data.text && ( // 'text' property might not exist on generic input.data
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
  // This is placeholder logic if no REST input is defined
  // log.success3('hotkey triggered', row.id)
  // window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
}

export const useGlobalActions = () => {
  // log.info1('useGlobalActions:', 'rest')
}

// TODO: Add Settings component for managing presets
