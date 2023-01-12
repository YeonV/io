import ModuleButton from '@/components/ModuleButton'
import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import {
  Button,
  Icon,
  FormControl,
  TextField,
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
      name: 'LedFx-Scene',
      icon: 'developer_mode',
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
      <ModuleButton data={output} />
      <Button
        size='small'
        color='inherit'
        variant='outlined'
        sx={{
          fontSize: 12,
          textTransform: 'unset',
          flexGrow: 1,
          justifyContent: 'flex-start',
          mr: 2,
        }}
      >
        {output.data.sceneName}
      </Button>
    </>
  )
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  const [scenes, setScenes] = useState({} as any)
  return (
    <>
      <TextField
        fullWidth
        label='Host:Port'
        value={output.data.host ?? 'http://localhost:8888'}
        onBlur={async (e) => {
          const res = await fetch(e.target.value + '/api/scenes')
          const resp = await res.json()
          if (resp.status === 'success') {
            setScenes(resp.scenes)
          }
        }}
        onChange={(e) => {
          onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            height: '50px',
            paddingLeft: '10px',
          },
        }}
        variant='outlined'
      />
      {Object.keys(scenes).length > 0 ? (
        <FormControl fullWidth>
          <InputLabel id='ledfx-scene-label'>Scene</InputLabel>
          <Select
            labelId='ledfx-scene-label'
            id='ledfx-scene-select'
            label='Scene'
            onChange={async (e) => {
              console.log('123', e.target.value, scenes)
              if (
                e.target.value &&
                typeof e.target.value === 'string' &&
                Object.keys(scenes).includes(e.target.value)
              ) {
                onChange({
                  host: output.data.host,
                  sceneId: e.target.value,
                  sceneName: scenes[e.target.value].name,
                })
              }
            }}
          >
            {Object.entries(scenes).map(([sid, s]: any) => (
              <MenuItem value={sid}>{s.name}</MenuItem>
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
