import type { ModuleConfig, OutputData, Row } from '@shared/types'
import type { FC } from 'react'
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { useEffect } from 'react'
import { log } from '@/utils'
import DisplayButtons from '@/components/Row/DisplayButtons'
import Host from '@/components/Host'

type LedFxConfigExample = {}

export const id = 'ledfx-module'

export const moduleConfig: ModuleConfig<LedFxConfigExample> = {
  menuLabel: 'Network',
  description: 'Control LedFx scenes',
  inputs: [],
  outputs: [
    {
      name: 'LedFx',
      icon: 'ledfx',
      editable: true
    }
  ],
  config: {
    enabled: true
  }
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
        defaultHost="http://localhost:888"
        path="/api/scenes"
        onChange={onChange}
        msgConnected={() => 'Connected to LedFx '}
      />
      {output.data.config?.scenes && Object.keys(output.data.config.scenes).length > 0 ? (
        <>
          {/* <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="ledfx-scene-label">Scene</InputLabel>
            <Select
              labelId="ledfx-action-label"
              id="ledfx-action-select"
              sx={{ pl: 1 }}
              label="Action"
              onChange={async (e) => {
                if (
                  e.target.value &&
                  typeof e.target.value === 'string' &&
                  Object.keys(output.data.config.scenes).includes(e.target.value)
                ) {
                  onChange({
                    host: output.data.host,
                    sceneId: e.target.value,
                    text: 'Scene: ' + output.data.config.scenes[e.target.value].name
                  })
                }
              }}
            >
              <MenuItem value={'scene'}>Scene</MenuItem>
              <MenuItem value={'command'}>Command</MenuItem>
            </Select>
          </FormControl> */}
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="ledfx-scene-label">Scene</InputLabel>
            <Select
              labelId="ledfx-scene-label"
              id="ledfx-scene-select"
              sx={{ pl: 1 }}
              label="Scene"
              onChange={async (e) => {
                if (
                  e.target.value &&
                  typeof e.target.value === 'string' &&
                  Object.keys(output.data.config.scenes).includes(e.target.value)
                ) {
                  onChange({
                    host: output.data.host,
                    sceneId: e.target.value,
                    text: 'Scene: ' + output.data.config.scenes[e.target.value].name
                  })
                }
              }}
            >
              {Object.entries(output.data.config.scenes).map(([sid, s]: any) => (
                <MenuItem key={sid} value={sid}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      ) : (
        <></>
      )}
    </>
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = async (e: any) => {
      log.success2('row output triggered', row, e.detail)
      if (e.detail.rowId === row.id) {
        await fetch(`${row.output.data.host || 'http://localhost:8888'}/api/scenes`, {
          method: 'PUT',
          body: JSON.stringify({
            id: row.output.data.sceneId,
            action: 'activate'
          })
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
  log.info1('useGlobalActions:', 'ledfx')
}
