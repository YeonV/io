import DisplayButtons from '@/components/DisplayButtons'
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
  const [scenes, setScenes] = useState({} as any)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(undefined as true | false | undefined)
  return (
    <>
      <TextField
        fullWidth
        disabled={loading}
        error={success !== undefined ? !success : false}
        label='Host:Port'
        value={output.data.host ?? 'http://localhost:8888'}
        onBlur={async (e) => {
          try {
            setLoading(true)
            const res = await fetch(e.target.value + '/api/scenes')
            const resp = await res.json()
            if (resp.status === 'success') {
              setScenes(resp.scenes)
              setLoading(false)
              setSuccess(true)
            }
          } catch (error) {
            setLoading(false)
            setSuccess(false)
            console.log('Yz was right')
          }
        }}
        onChange={(e) => {
          setSuccess(undefined)
          onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
      {Object.keys(scenes).length > 0 ? (
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
                Object.keys(scenes).includes(e.target.value)
              ) {
                onChange({
                  host: output.data.host,
                  sceneId: e.target.value,
                  text: 'Scene: ' + scenes[e.target.value].name,
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
