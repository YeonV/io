import DisplayButtons from '@/components/DisplayButtons'
import Host from '@/components/Host'
import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { FC, useEffect, useState } from 'react'

type LedFxConfigExample = {}

export const id = 'ledfx-module'

export const moduleConfig: ModuleConfig<LedFxConfigExample> = {
  menuLabel: 'LedFx',
  inputs: [],
  outputs: [
    {
      name: 'LedFx',
      icon: 'ledfx',
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
      <Host defaultHost='http://localhost:888' path='/api/scenes' onChange={onChange} msgConnected={() => 'Connected to LedFx '} />
      {output.data.config?.scenes && Object.keys(output.data.config.scenes).length > 0 ? (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id='ledfx-scene-label'>Scene</InputLabel>
          <Select
            labelId='ledfx-scene-label'
            id='ledfx-scene-select'
            sx={{ pl: 1 }}
            label='Scene'
            onChange={async (e) => {
              if (
                e.target.value &&
                typeof e.target.value === 'string' &&
                Object.keys(output.data.config.scenes).includes(e.target.value)
              ) {
                onChange({
                  host: output.data.host,
                  sceneId: e.target.value,
                  text: 'Scene: ' + output.data.config.scenes[e.target.value].name,
                })
              }
            }}
          >
            {Object.entries(output.data.config.scenes).map(([sid, s]: any) => (
              <MenuItem key={sid} value={sid}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : (
        <></>
      )}
    </>
  )
}

export const useOutputActions = (row: Row) => {
  useEffect(() => {
    const listener = async (e: any) => {
      console.log('row output triggered', row, e.detail)
      if (e.detail === row.id) {
        await fetch(
          `${row.output.data.host || 'http://localhost:8888'}/api/scenes`,
          {
            method: 'PUT',
            body: JSON.stringify({
              id: row.output.data.sceneId,
              action: 'activate',
            }),
          }
        )
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}
