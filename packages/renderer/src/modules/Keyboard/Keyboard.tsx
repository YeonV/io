import type { ModuleConfig, InputData, Row } from '@/store/mainStore'
import type { FC } from 'react'
import { log } from '@/utils'
import { useMediaQuery } from '@mui/material'
import { useHotkeys } from 'react-hotkeys-hook'
import DisplayButtons from '@/components/DisplayButtons'
import Shortkey from '@/modules/Keyboard/Shortkey'

type KeyboardConfigExample = {}

export const id = 'keyboard-module'

export const moduleConfig: ModuleConfig<KeyboardConfigExample> = {
  menuLabel: 'Input Device',
  inputs: [
    {
      name: 'Keyboard',
      icon: 'keyboard',
    },
  ],
  outputs: [],
  config: {
    enabled: true,
  },
}

export const InputEdit: FC<{
  input: InputData
  onChange: (data: Record<string, any>) => void
}> = ({ input, onChange }) => {
  //   const updateRowInputValue = useMainStore(store.updateRowInputValue);
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
  // console.log(input)
  return (
    <>
      <DisplayButtons data={input} />
      {desktop && (
        <Shortkey
          value={input.data.value}
          trigger={() => {
            // console.log('SHORTKEY;')
          }}
        />
      )}
    </>
  )
}

export const useInputActions = (row: Row) => {
  log.info('per-row keyboard', row)

  useHotkeys(
    row.input.data.value,
    () => {
      // dispatch event on global event emitter
      log.success3('hotkey triggered', row.id)
      window.dispatchEvent(new CustomEvent(`io_input`, { detail: row.id }))
    },
    {},
    [row.input.data.value]
  )
}

export const useGlobalActions = () => {
  log.info1('useGlobalActions:', 'keyboard')
}
