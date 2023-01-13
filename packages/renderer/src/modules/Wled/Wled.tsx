import DisplayButtons from '@/components/DisplayButtons'
import IoIcon from '@/components/IoIcon/IoIcon'
import type { ModuleConfig, OutputData, Row } from '@/store/mainStore'
import { waitFor } from '@/utils'
import {
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material'
import Box from '@mui/material/Box'
import { FC, useEffect, useState } from 'react'

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
  const [wledConfig, setWledConfig] = useState({} as any)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(undefined as true | false | undefined)

  useEffect(() => {
    onChange({
      host: output.data.host,
      wledConfig,
    })
  }, [wledConfig])

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', marginRight: '10px' }}>
          <TextField
            fullWidth
            disabled={loading}
            error={success !== undefined ? !success : false}
            label='Host:Port'
            value={output.data.host ?? 'http://192.168.1.170'}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  {loading ? (
                    <CircularProgress size='1rem' />
                  ) : success === true ? (
                    <IoIcon name='check_circle_outlined' />
                  ) : success === false ? (
                    <IoIcon name='highlight_off' />
                  ) : (
                    <></>
                  )}
                </InputAdornment>
              ),
            }}
            onBlur={async (e) => {
              try {
                setLoading(true)
                const res = await waitFor(2000, fetch(e.target.value + '/json'))
                const resp = await (res as any).json()
                if (resp) {
                  setWledConfig(resp)
                  setLoading(false)
                  setSuccess(true)
                }
              } catch (error) {
                setLoading(false)
                setSuccess(false)
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
        </div>
        <Button
          size='small'
          color='secondary'
          sx={{
            alignSelf: 'stretch',
            fontSize: 16,
            marginTop: '1rem',
            pl: 2,
            pr: 2,
          }}
          onClick={async () => {
            try {
              setLoading(true)
              const res = await waitFor(2000, fetch(output.data.host + '/json'))
              const resp = await (res as any).json()
              if (resp) {
                setWledConfig(resp)
                setLoading(false)
                setSuccess(true)
              }
            } catch (error) {
              setLoading(false)
              setSuccess(false)
            }
          }}
        >
          {success ? 'Resync' : 'Connect'}
        </Button>
      </div>
      {Object.keys(wledConfig).length > 0 && success !== undefined ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Button
            size='small'
            color='inherit'
            variant='outlined'
            disabled
            sx={{
              fontSize: 16,
              textTransform: 'unset',
              flexGrow: 1,
              mt: 1,
            }}
          >
            <span style={{ marginRight: '10px', display: 'flex' }}>
              {loading ? (
                <CircularProgress size='1rem' />
              ) : success === true ? (
                <IoIcon name='check_circle_outlined' />
              ) : success === false ? (
                <IoIcon name='highlight_off' />
              ) : (
                <></>
              )}
            </span>
            {success
              ? 'Got state from ' + output.data.wledConfig?.info?.name
              : 'No connection'}
          </Button>
        </div>
      ) : (
        <></>
      )}
      {Object.keys(wledConfig).length > 0 && success ? (
        <TextField
          fullWidth
          label={'Unique Name for this action'}
          value={
            output.data.text
              ?.replace(output.data.wledConfig.info.name, '')
              ?.replace(': ', '') ?? ''
          }
          onChange={(e) => {
            onChange({
              text: output.data.wledConfig.info.name + ': ' + e.target.value,
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
        await fetch(`${row.output.data.host}/json`, {
          method: 'POST',
          body: JSON.stringify(row.output.data.wledConfig.state),
        })
      }
    }
    window.addEventListener('io_input', listener)
    return () => {
      window.removeEventListener('io_input', listener)
    }
  }, [row.output.data.text])
}
