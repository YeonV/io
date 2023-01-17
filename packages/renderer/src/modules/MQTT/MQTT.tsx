import type { InputData, ModuleConfig, OutputData } from '@/store/mainStore'
import { TextField } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { log } from '@/utils'

type MqttConnection = {
  host: string
  id: string
}

type MqttConfigExample = {
  connections: MqttConnection[]
}

export const id = 'mqtt-module'

export const groupId = 'Network'

export const moduleConfig: ModuleConfig<MqttConfigExample> = {
  menuLabel: 'Network',
  inputs: [
    {
      icon: 'mail',
      name: 'mqtt',
    },
  ],
  outputs: [
    {
      icon: 'mail',
      name: 'mqtt',
    },
  ],
  config: {
    enabled: false,
    connections: [
      { id: 'mqtt-local', host: 'mqtt://localhost:1883' },
      { id: 'remote-hass', host: 'mqtt://hass.blade.io:1883' },
    ],
  },
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <>
      <TextField
        fullWidth
        label='Host:Port'
        value={input.data.host ?? 'mqtt://localhost:1883'}
        onBlur={async (e) => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
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
            paddingLeft: '20px',
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
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
      <TextField
        fullWidth
        label='topic'
        defaultValue={'blade/ledfx'}
        onBlur={async (e) => {
          // Connect to mqtt?
        }}
        onChange={(e) => {
          // onChange({ host: e.target.value })
        }}
        sx={{ mt: 2 }}
        inputProps={{
          style: {
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
    </>
  )
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
            paddingLeft: '20px',
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
            paddingLeft: '20px',
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
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
      <TextField
        fullWidth
        label='Topic'
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
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
      <TextField
        fullWidth
        label='Message'
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
            paddingLeft: '20px',
          },
        }}
        variant='outlined'
      />
    </>
  )
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'mqtt')
}
