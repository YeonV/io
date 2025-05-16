import type { ModuleConfig, InputData, Row } from '@shared/types'
import type { FC } from 'react'
import { log } from '@/utils'
import { useMediaQuery } from '@mui/material'
import DisplayButtons from '@/components/Row/DisplayButtons'
import Shortkey from '@/modules/Keyboard/Shortkey'

type KeyboardConfigExample = {}

export const id = 'keyboard-module'

export const moduleConfig: ModuleConfig<KeyboardConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Keyboard',
      icon: 'keyboard'
    }
  ],
  outputs: [],
  config: {
    enabled: true
  }
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  return (
    <>
      <Shortkey
        value={input.data.value}
        onChange={(value) => {
          onChange({ value })
        }}
        edit
      />
    </>
  )
}

export const InputDisplay: FC<{ input: InputData }> = ({ input }) => {
  const desktop = useMediaQuery('(min-width:980px)')
  return (
    <>
      <DisplayButtons data={input} />
      {desktop && <Shortkey value={input.data.value} />}
    </>
  )
}

export const useInputActions = (row: Row) => {
  log.info('per-row keyboard', row)
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'keyboard')
}
