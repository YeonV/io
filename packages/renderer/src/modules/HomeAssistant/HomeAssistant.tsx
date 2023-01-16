import DisplayButtons from '@/components/DisplayButtons'
import type { InputData, ModuleConfig, OutputData } from '@/store/mainStore'
import { TextField } from '@mui/material'
import { FC, useEffect, useState } from 'react'
type MqttConnection = {
  host: string
  id: string
}

type HassConfigExample = {}

export const id = 'homeassistant-module'

export const groupId = 'Network'

export const moduleConfig: ModuleConfig<HassConfigExample> = {
  menuLabel: 'Network',
  inputs: [],
  outputs: [
    {
      icon: 'homeassistant',
      name: 'HomeAssistant',
    },
  ],
  config: {
    enabled: false,
  },
}

export const OutputEdit: FC<{
  output: OutputData
  onChange: (data: Record<string, any>) => void
}> = ({ output, onChange }) => {
  return (
    <>
      <TextField
        fullWidth
        label='Host:Port'
        value={output.data.host ?? 'mqtt://localhost:1883'}
        onBlur={async (e) => {
          // Connect to mqtt?
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
      <TextField
        fullWidth
        label='Username'
        defaultValue={'blade'}
        onBlur={async (e) => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
          // onChange({ host: e.target.value })
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
      <TextField
        fullWidth
        label='Password'
        defaultValue={'ledfx'}
        onBlur={async (e) => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
          // onChange({ host: e.target.value })
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
      <TextField
        fullWidth
        label='topic'
        defaultValue={'homeassistant'}
        onBlur={async (e) => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
          // onChange({ host: e.target.value })
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
    </>
  )
}

export const OutputDisplay: FC<{
  output: OutputData
}> = ({ output }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
  return (
    <>
      <DisplayButtons data={output} />
    </>
  )
}

export const useGlobalActions = () => {
  console.log('useGlobalActions: HomeAssistant')
}