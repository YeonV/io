import DisplayButtons from '@/components/Row/DisplayButtons'
import type { ModuleConfig, InputData, Row } from '@shared/types'
import { useMainStore } from '@/store/mainStore'
import { TextField, useMediaQuery } from '@mui/material'
import type { FC } from 'react'
import { useEffect } from 'react'
import ToggleButton from '@mui/material/ToggleButton'
import Typography from '@mui/material/Typography'
import { Sync } from '@mui/icons-material'
import Shortkey from '../Keyboard/Shortkey'

const ipcRenderer = window.electron?.ipcRenderer || false

type AlexaConfigExample = {}

export const id = 'alexa-module'

export const moduleConfig: ModuleConfig<AlexaConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Alexa',
      icon: 'graphic_eq'
    }
  ],
  outputs: [],
  config: {
    enabled: !!ipcRenderer
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  // const updateRowInputValue = useMainStore(state => state.updateRowInputValue);
  // console.log(input)
  // Widget()
  return (
    <>
      <TextField
        fullWidth
        label="New AlexaDevice Name"
        value={input.data.value ?? ''}
        onChange={(event: any) => {
          onChange({ value: event.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px'
          }
        }}
        variant="outlined"
      />
    </>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  return (
    <>
      <DisplayButtons data={input} />
      {/* <Button
        variant='outlined'
        color={'inherit'}
        sx={{ pointerEvents: 'none' }}
      >
        {input.data.value}
      </Button> */}
      {desktop && <Shortkey value={input.data.value} />}
    </>
  )
}

export const useGlobalActions = () => {
  const rows = useMainStore((state) => state.rows)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.sendSync(
        'emulate-alexa-devices',
        Object.keys(rows)
          .filter((r) => rows[r].inputModule === 'alexa-module')
          .map((rk) => rows[rk].input.data.value)
      )
    }
  }, [])
  return
}

export const useInputActions = (row: Row) => {
  // const rows = useMainStore((state) => state.rows)
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.on('alexa-device', (_event: any, data: any) => {
        if (data.device === row.input.data.value)
          window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
      })
    }
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeAllListeners('alexa-device')
      }
    }
  }, [])
}

export const Settings = () => {
  return localStorage.getItem('io-restart-needed') === 'yes' ? (
    <ToggleButton
      size="large"
      value="restart"
      sx={{ '& .MuiSvgIcon-root': { fontSize: 50 } }}
      selected={localStorage.getItem('io-restart-needed') === 'yes'}
      onChange={() => {
        ipcRenderer?.sendSync('restart-app')
        localStorage.setItem('io-restart-needed', 'no')
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 90,
          height: 90,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" color={'#999'}>
          Restart
        </Typography>
        <Sync />
        <Typography variant="caption" color={'#999'}>
          Sync Alexa
        </Typography>
      </div>
    </ToggleButton>
  ) : (
    <></>
  )
}
