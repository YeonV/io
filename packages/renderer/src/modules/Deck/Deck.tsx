import DisplayButtons from '@/components/Row/DisplayButtons'
import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import { useMainStore } from '@/store/mainStore'
import { Button, Icon, TextField, useMediaQuery } from '@mui/material'
import type { FC } from 'react'
import { useEffect } from 'react'
import { log } from '@/utils'
import ToggleButton from '@mui/material/ToggleButton'
import Typography from '@mui/material/Typography'
import { Sync } from '@mui/icons-material'
import Shortkey from '../Keyboard/Shortkey'

const ipcRenderer = window.ipcRenderer || false

type AlexaConfigExample = {}

interface DeckButton {
  color?: string
  icon?: string
  label?: string
}

export const id = 'alexa-module'

export const moduleConfig: ModuleConfig<AlexaConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Alexa',
      icon: 'graphic_eq',
    },
  ],
  outputs: [],
  config: {
    enabled: !!ipcRenderer,
  },
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

export const Settings = () => {
  return localStorage.getItem('io-restart-needed') === 'deck' ? (
    <ToggleButton
      size='large'
      value='restart'
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
          justifyContent: 'center',
        }}
      >
        <Typography variant='caption' color={'#999'}>
          Restart
        </Typography>
        <Sync />
        <Typography variant='caption' color={'#999'}>
          Sync Deck
        </Typography>
      </div>
    </ToggleButton>
  ) : (
    <></>
  )
}
